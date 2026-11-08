import express from "express";
import mongoose from "mongoose";
import { Notice } from "../models/Notice.js";
import { User } from "../models/User.js";
import { authenticateToken, optionalAuth, requireAdmin } from "../middleware/auth.js";
import { DEPARTMENTS, YEARS, SECTIONS, AUDIENCE_SCOPES } from "../models/constants.js";

const router = express.Router();

const VALID_CATEGORIES = ["Exams", "Academics", "Events", "Placements", "Fees", "General"];
const VALID_PRIORITIES = ["High", "Medium", "Low"];

function formatPoll(poll, userId) {
  if (!poll || !poll.question || !Array.isArray(poll.options) || poll.options.length === 0) {
    return null;
  }
  const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votes ? opt.votes.length : 0), 0);
  const userVotedIndex = userId
    ? poll.options.findIndex((opt) => opt.votes && opt.votes.some((v) => v.toString() === userId.toString()))
    : -1;

  return {
    question: poll.question,
    totalVotes,
    userVotedIndex,
    options: poll.options.map((opt, idx) => ({
      index: idx,
      text: opt.text,
      votesCount: opt.votes ? opt.votes.length : 0,
      percentage: totalVotes > 0 ? Math.round(((opt.votes ? opt.votes.length : 0) / totalVotes) * 100) : 0,
    })),
  };
}

// GET /api/notices - List notices with server-enforced audience filtering
router.get("/", optionalAuth, async (req, res) => {
  try {
    const query = {};

    if (req.user && req.user.role === "student") {
      // Must match student's college
      query.college = req.user.college;

      // Audience rules for students:
      // 1. College-wide notices
      // 2. Department-wide notices for their dept
      // 3. Year-level notices for their dept + year
      // 4. Section-level notices for their dept + year + section
      query.$or = [
        { "audience.scope": "college" },
        {
          "audience.scope": "department",
          "audience.department": { $in: [req.user.department, "ALL"] },
        },
        {
          "audience.scope": "year",
          "audience.department": { $in: [req.user.department, "ALL"] },
          "audience.year": { $in: [req.user.year, "ALL"] },
        },
        {
          "audience.scope": "section",
          "audience.department": { $in: [req.user.department, "ALL"] },
          "audience.year": { $in: [req.user.year, "ALL"] },
          "audience.section": { $in: [req.user.section, "ALL"] },
        },
      ];
    } else if (req.user && req.user.role === "admin") {
      // Admins see all notices in their college
      query.college = req.user.college;
    } else {
      // Unauthenticated visitors only see college-wide notices
      query["audience.scope"] = "college";
    }

    const notices = await Notice.find(query).sort({ pinned: -1, createdAt: -1 });

    const readSet = new Set(
      req.user && req.user.readNoticeIds
        ? req.user.readNoticeIds.map((id) => id.toString())
        : []
    );

    const result = notices.map((n) => {
      const obj = n.toJSON();
      obj.isRead = readSet.has(n._id.toString());
      obj.poll = formatPoll(n.poll, req.user ? req.user._id : null);
      return obj;
    });

    return res.json(result);
  } catch (err) {
    console.error("GET /api/notices error:", err);
    return res.status(500).json({ error: "Failed to fetch notices" });
  }
});

// GET /api/notices/analytics - Counts & Read Status (Admin only)
router.get("/analytics", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const studentQuery = { role: "student", college: req.user.college };
    // If HOD, focus on department students
    if (req.user.adminType === "HOD") {
      studentQuery.department = req.user.department;
    }

    const allStudents = await User.find(studentQuery).select(
      "name email department year section regNo readNoticeIds"
    );

    const noticeQuery = { college: req.user.college };
    if (req.user.adminType === "HOD") {
      noticeQuery.$or = [
        { "audience.scope": "college" },
        { "audience.department": req.user.department },
      ];
    } else if (req.user.adminType === "Faculty") {
      noticeQuery["createdBy.id"] = req.user._id;
    }

    const allNotices = await Notice.find(noticeQuery).sort({ createdAt: -1 });

    const totalStudents = allStudents.length;
    const totalNotices = allNotices.length;

    const noticeStats = allNotices.map((n) => {
      const nIdStr = n._id.toString();
      const scope = n.audience?.scope || "college";
      const targetDept = n.audience?.department || "ALL";
      const targetYear = n.audience?.year || "ALL";
      const targetSec = n.audience?.section || "ALL";

      // Match students who should see this notice
      const eligibleStudents = allStudents.filter((s) => {
        if (scope === "college") return true;
        if (scope === "department") return targetDept === "ALL" || s.department === targetDept;
        if (scope === "year") {
          return (
            (targetDept === "ALL" || s.department === targetDept) &&
            (targetYear === "ALL" || s.year === targetYear)
          );
        }
        if (scope === "section") {
          return (
            (targetDept === "ALL" || s.department === targetDept) &&
            (targetYear === "ALL" || s.year === targetYear) &&
            (targetSec === "ALL" || s.section === targetSec)
          );
        }
        return true;
      });

      const eligibleCount = eligibleStudents.length || totalStudents;

      const readStudents = eligibleStudents.filter((s) =>
        s.readNoticeIds.some((id) => id.toString() === nIdStr)
      );
      const unreadStudents = eligibleStudents.filter(
        (s) => !s.readNoticeIds.some((id) => id.toString() === nIdStr)
      );

      const readCount = readStudents.length;
      const readRate = eligibleCount > 0 ? Math.round((readCount / eligibleCount) * 100) : 0;

      let pollSummary = null;
      if (n.poll && n.poll.question && n.poll.options?.length > 0) {
        const totalVotes = n.poll.options.reduce((acc, opt) => acc + (opt.votes ? opt.votes.length : 0), 0);
        pollSummary = {
          question: n.poll.question,
          totalVotes,
          participationRate: eligibleCount > 0 ? Math.round((totalVotes / eligibleCount) * 100) : 0,
          options: n.poll.options.map((opt) => ({
            text: opt.text,
            votesCount: opt.votes ? opt.votes.length : 0,
            percentage: totalVotes > 0 ? Math.round(((opt.votes ? opt.votes.length : 0) / totalVotes) * 100) : 0,
          })),
        };
      }

      return {
        id: n._id.toString(),
        title: n.title,
        category: n.category,
        priority: n.priority,
        date: n.date,
        audience: n.audience,
        createdBy: n.createdBy,
        eligibleCount,
        readCount,
        unreadCount: unreadStudents.length,
        readRate,
        readStudents: readStudents.map((s) => ({
          id: s._id.toString(),
          name: s.name,
          email: s.email,
          regNo: s.regNo,
          department: s.department,
          year: s.year,
          section: s.section,
        })),
        unreadStudents: unreadStudents.map((s) => ({
          id: s._id.toString(),
          name: s.name,
          email: s.email,
          regNo: s.regNo,
          department: s.department,
          year: s.year,
          section: s.section,
        })),
        poll: pollSummary,
      };
    });

    // Department breakdown
    const deptMap = {};
    allStudents.forEach((s) => {
      const d = s.department || "General";
      if (!deptMap[d]) {
        deptMap[d] = { department: d, studentCount: 0, totalReads: 0 };
      }
      deptMap[d].studentCount += 1;
      deptMap[d].totalReads += s.readNoticeIds.length;
    });

    const departmentAnalytics = Object.values(deptMap).map((d) => ({
      department: d.department,
      branch: d.department,
      students: d.studentCount,
      avgReadsPerStudent: d.students > 0 ? +(d.totalReads / d.students).toFixed(1) : 0,
    }));

    const totalReadsAcrossAll = noticeStats.reduce((sum, n) => sum + n.readCount, 0);
    const totalEligibleSlots = noticeStats.reduce((sum, n) => sum + n.eligibleCount, 0);
    const overallReadRate = totalEligibleSlots > 0 ? Math.round((totalReadsAcrossAll / totalEligibleSlots) * 100) : 0;

    return res.json({
      summary: {
        totalStudents,
        totalNotices,
        totalReadsAcrossAll,
        overallReadRate,
      },
      branchAnalytics: departmentAnalytics,
      notices: noticeStats,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    return res.status(500).json({ error: "Failed to generate analytics report" });
  }
});

// POST /api/notices - Create notice (Permission Table Enforced!)
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      details,
      category,
      priority,
      deadline,
      pinned,
      audience,
      attachments,
      photos,
      googleLinks,
      poll,
    } = req.body;

    const adminType = req.user.adminType;
    const errors = {};

    // 1. Validation
    if (!title || typeof title !== "string" || title.trim().length < 3) {
      errors.title = "Enter a title of at least 3 characters.";
    }
    if (!description || typeof description !== "string" || !description.trim()) {
      errors.description = "Add a short description.";
    }
    if (category && !VALID_CATEGORIES.includes(category)) {
      errors.category = `Category must be one of: ${VALID_CATEGORIES.join(", ")}`;
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      errors.priority = `Priority must be one of: ${VALID_PRIORITIES.join(", ")}`;
    }

    // 2. Audience structure
    const rawScope = audience?.scope || "college";
    let scope = AUDIENCE_SCOPES.includes(rawScope) ? rawScope : "college";
    let targetDept = audience?.department ? audience.department.toUpperCase() : "ALL";
    let targetYear = audience?.year || "ALL";
    let targetSec = audience?.section ? audience.section.toUpperCase() : "ALL";

    // 3. SERVER PERMISSION TABLE ENFORCEMENT
    if (adminType === "Faculty") {
      // Faculty MUST send to only a specific section and NOT for all classes / department-wide
      if (scope !== "section" || targetYear === "ALL" || !targetYear || targetSec === "ALL" || !targetSec) {
        return res.status(403).json({
          error: "Permission denied: Faculty members must target a specific section only (select a specific Year and Section). They cannot broadcast to all classes or department-wide.",
        });
      }
      // Faculty can only post to their OWN department
      if (targetDept !== req.user.department) {
        return res.status(403).json({
          error: `Permission denied: Faculty can only post notices to their own department (${req.user.department}).`,
        });
      }
      // Faculty CANNOT post High priority notices
      if (priority === "High") {
        return res.status(403).json({
          error: "Permission denied: Faculty can only post Medium or Low priority notices. High priority notices require HOD or Dean approval.",
        });
      }
      // Faculty CANNOT pin on creation
      if (pinned) {
        return res.status(403).json({
          error: "Permission denied: Pinning notices requires HOD or Dean authority.",
        });
      }
    } else if (adminType === "HOD") {
      // HOD cannot post college-wide (college-wide is Dean only)
      if (scope === "college") {
        return res.status(403).json({
          error: "Permission denied: HOD can only post within their department. College-wide notices require Dean privileges.",
        });
      }
      // HOD can only post to their OWN department
      if (targetDept !== req.user.department) {
        return res.status(403).json({
          error: `Permission denied: HOD can only post notices to their own department (${req.user.department}).`,
        });
      }
    } else if (adminType === "Dean") {
      // Dean can post to any scope, any department, any priority
    } else {
      return res.status(403).json({ error: "Invalid admin authorization level." });
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    // Sanitize poll
    let sanitizedPoll = { question: "", options: [] };
    if (poll && poll.question && Array.isArray(poll.options)) {
      const cleanOptions = poll.options
        .map((opt) => (typeof opt === "string" ? opt.trim() : opt?.text?.trim()))
        .filter(Boolean);
      if (cleanOptions.length >= 2) {
        sanitizedPoll = {
          question: poll.question.trim(),
          options: cleanOptions.map((text) => ({ text, votes: [] })),
        };
      }
    }

    const cleanGoogleLinks = Array.isArray(googleLinks)
      ? googleLinks
          .filter((link) => link && link.url && link.title)
          .map((link) => ({ title: link.title.trim(), url: link.url.trim() }))
      : [];

    const cleanAttachments = Array.isArray(attachments)
      ? attachments.filter((att) => att && att.name && att.dataUrl)
      : [];

    const cleanPhotos = Array.isArray(photos)
      ? photos.filter((p) => typeof p === "string" && p)
      : [];

    const notice = new Notice({
      title: title.trim(),
      description: description.trim(),
      details: details ? details.trim() : "",
      category: category || "General",
      priority: priority || "Medium",
      deadline: deadline || "",
      pinned: Boolean(pinned),
      college: req.user.college,
      createdBy: {
        id: req.user._id,
        name: req.user.name,
        adminType: req.user.adminType,
        department: req.user.department,
      },
      audience: {
        scope,
        department: scope === "college" ? "ALL" : targetDept,
        year: scope === "college" || scope === "department" ? "ALL" : targetYear,
        section: scope === "section" ? targetSec : "ALL",
      },
      attachments: cleanAttachments,
      photos: cleanPhotos,
      googleLinks: cleanGoogleLinks,
      poll: sanitizedPoll,
    });

    await notice.save();

    const result = notice.toJSON();
    result.isRead = false;
    result.poll = formatPoll(notice.poll, req.user._id);
    return res.status(201).json(result);
  } catch (err) {
    console.error("POST /api/notices error:", err);
    return res.status(500).json({ error: err.message || "Failed to create notice" });
  }
});

// PATCH /api/notices/:id - Edit or pin notice (Permission Table Enforced!)
router.patch("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid notice ID format" });
    }

    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({ error: "Notice not found" });
    }

    const adminType = req.user.adminType;
    const isOwner = notice.createdBy.id.toString() === req.user._id.toString();
    const isSameDept = notice.audience?.department === req.user.department || notice.createdBy.department === req.user.department;

    const { title, description, details, category, priority, deadline, pinned, audience } = req.body;

    // 1. PIN PERMISSION CHECK
    if (pinned !== undefined && pinned !== notice.pinned) {
      if (adminType === "Faculty") {
        return res.status(403).json({
          error: "Permission denied: Faculty cannot pin or unpin notices. Pinning requires HOD or Dean authority.",
        });
      }
      if (adminType === "HOD" && !isSameDept) {
        return res.status(403).json({
          error: "Permission denied: HODs can only pin notices within their department.",
        });
      }
      notice.pinned = Boolean(pinned);
    }

    // 2. CONTENT EDIT PERMISSION CHECK
    const isEditingContent = title !== undefined || description !== undefined || details !== undefined || category !== undefined || priority !== undefined || deadline !== undefined || audience !== undefined;

    if (isEditingContent) {
      if (adminType === "Faculty" && !isOwner) {
        return res.status(403).json({
          error: "Permission denied: Faculty can only edit notices they personally created.",
        });
      }
      if (adminType === "HOD" && !isSameDept) {
        return res.status(403).json({
          error: "Permission denied: HODs can only edit notices within their department.",
        });
      }

      if (title !== undefined) notice.title = title.trim();
      if (description !== undefined) notice.description = description.trim();
      if (details !== undefined) notice.details = details.trim();
      if (category !== undefined) notice.category = category;
      if (priority !== undefined) {
        if (adminType === "Faculty" && priority === "High") {
          return res.status(403).json({ error: "Faculty cannot set High priority." });
        }
        notice.priority = priority;
      }
      if (deadline !== undefined) notice.deadline = deadline;
    }

    await notice.save();

    const result = notice.toJSON();
    const isRead = req.user.readNoticeIds?.some((item) => item.toString() === id) || false;
    result.isRead = isRead;
    result.poll = formatPoll(notice.poll, req.user._id);
    return res.json(result);
  } catch (err) {
    console.error("PATCH /api/notices/:id error:", err);
    return res.status(500).json({ error: err.message || "Failed to update notice" });
  }
});

// DELETE /api/notices/:id - Delete notice (Permission Table Enforced!)
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid notice ID format" });
    }

    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({ error: "Notice not found" });
    }

    const adminType = req.user.adminType;
    const isOwner = notice.createdBy.id.toString() === req.user._id.toString();
    const isSameDept = notice.audience?.department === req.user.department || notice.createdBy.department === req.user.department;

    if (adminType === "Faculty" && !isOwner) {
      return res.status(403).json({
        error: "Permission denied: Faculty can only delete notices they personally created.",
      });
    }

    if (adminType === "HOD" && !isSameDept) {
      return res.status(403).json({
        error: "Permission denied: HODs can only delete notices in their department.",
      });
    }

    await Notice.findByIdAndDelete(id);

    await User.updateMany({ readNoticeIds: id }, { $pull: { readNoticeIds: id } });

    return res.json({ message: "Notice deleted successfully", id });
  } catch (err) {
    console.error("DELETE /api/notices/:id error:", err);
    return res.status(500).json({ error: "Failed to delete notice" });
  }
});

// POST /api/notices/:id/poll/vote - Vote on a notice poll
router.post("/:id/poll/vote", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { optionIndex } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid notice ID format" });
    }

    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({ error: "Notice not found" });
    }

    if (!notice.poll || !notice.poll.question || !Array.isArray(notice.poll.options)) {
      return res.status(400).json({ error: "This notice does not have an active poll" });
    }

    if (typeof optionIndex !== "number" || optionIndex < 0 || optionIndex >= notice.poll.options.length) {
      return res.status(400).json({ error: "Invalid poll option selected" });
    }

    const userIdStr = req.user._id.toString();

    notice.poll.options.forEach((opt) => {
      opt.votes = (opt.votes || []).filter((v) => v.toString() !== userIdStr);
    });

    notice.poll.options[optionIndex].votes.push(req.user._id);

    await notice.save();

    return res.json({
      message: "Vote registered successfully",
      poll: formatPoll(notice.poll, req.user._id),
    });
  } catch (err) {
    console.error("Poll vote error:", err);
    return res.status(500).json({ error: "Failed to record vote" });
  }
});

// POST /api/notices/mark-all-read - Mark all notices as read for logged in user
router.post("/mark-all-read", authenticateToken, async (req, res) => {
  try {
    const notices = await Notice.find({ college: req.user.college }, "_id");
    const allNoticeIds = notices.map((n) => n._id);

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { readNoticeIds: { $each: allNoticeIds } },
    });

    return res.json({ message: "All notices marked as read", count: allNoticeIds.length });
  } catch (err) {
    console.error("mark-all-read error:", err);
    return res.status(500).json({ error: "Failed to mark all notices as read" });
  }
});

// PATCH /api/notices/:id/read - Toggle or set read status for logged in user
router.patch("/:id/read", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid notice ID format" });
    }

    const noticeExists = await Notice.exists({ _id: id });
    if (!noticeExists) {
      return res.status(404).json({ error: "Notice not found" });
    }

    const { isRead } = req.body;
    const user = await User.findById(req.user._id);

    const alreadyRead = user.readNoticeIds.some((item) => item.toString() === id);
    let nextIsRead;

    if (typeof isRead === "boolean") {
      nextIsRead = isRead;
      if (isRead && !alreadyRead) {
        user.readNoticeIds.push(id);
      } else if (!isRead && alreadyRead) {
        user.readNoticeIds = user.readNoticeIds.filter((item) => item.toString() !== id);
      }
    } else {
      nextIsRead = !alreadyRead;
      if (nextIsRead) {
        user.readNoticeIds.push(id);
      } else {
        user.readNoticeIds = user.readNoticeIds.filter((item) => item.toString() !== id);
      }
    }

    await user.save();
    return res.json({ id, isRead: nextIsRead });
  } catch (err) {
    console.error("PATCH read status error:", err);
    return res.status(500).json({ error: "Failed to update read status" });
  }
});

export default router;
