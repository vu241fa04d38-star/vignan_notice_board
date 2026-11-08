import express from "express";
import { User } from "../models/User.js";
import { signToken, authenticateToken, requireHODorDean } from "../middleware/auth.js";
import {
  ALLOWED_COLLEGES,
  DEPARTMENTS,
  YEARS,
  SECTIONS,
  ADMIN_TYPES,
  STAFF_INVITE_CODES,
} from "../models/constants.js";

const router = express.Router();

// In-memory failed login rate-limiter
const loginAttempts = new Map(); // ip -> { count, firstAttempt }
const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW = 15 * 60 * 1000; // 15 mins

function checkRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };

  if (now - record.firstAttempt > LOCKOUT_WINDOW) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const minutesLeft = Math.ceil((LOCKOUT_WINDOW - (now - record.firstAttempt)) / 60000);
    return { allowed: false, minutesLeft };
  }

  return { allowed: true };
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now - record.firstAttempt > LOCKOUT_WINDOW) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    record.count += 1;
  }
}

function clearAttempts(ip) {
  loginAttempts.delete(ip);
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      adminType,
      inviteCode,
      college,
      department,
      year,
      section,
      regNo,
    } = req.body;

    const errors = {};

    // 1. Basic validation
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters long.";
    }
    if (!email || typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      errors.password = "Password must be at least 8 characters long.";
    }

    const selectedCollege = college && ALLOWED_COLLEGES.includes(college.trim())
      ? college.trim()
      : ALLOWED_COLLEGES[0];

    // 2. Email uniqueness check
    const normalizedEmail = email ? email.trim().toLowerCase() : "";
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(409).json({ error: "An account with this email address already exists." });
    }

    let assignedRole = "student";
    let assignedAdminType = "None";
    let assignedStatus = "approved";
    let assignedDept = "ALL";
    let assignedYear = "ALL";
    let assignedSec = "ALL";
    let assignedRegNo = null;

    if (role === "admin") {
      assignedRole = "admin";

      if (!ADMIN_TYPES.includes(adminType)) {
        errors.adminType = `Please select a valid staff designation (${ADMIN_TYPES.join(", ")}).`;
      } else {
        assignedAdminType = adminType;
      }

      if (adminType === "Faculty" || adminType === "HOD") {
        if (!department || !DEPARTMENTS.includes(department.toUpperCase())) {
          errors.department = `Please select your department (${DEPARTMENTS.join(", ")}).`;
        } else {
          assignedDept = department.toUpperCase();
        }
      }

      // Check invite code for instant approval
      const expectedCode = STAFF_INVITE_CODES[adminType];
      if (inviteCode && inviteCode.trim() === expectedCode) {
        assignedStatus = "approved";
      } else {
        // Without matching dean's invite code, land in pending approval state!
        assignedStatus = "pending";
      }
    } else {
      // Student registration
      assignedRole = "student";
      assignedAdminType = "None";
      assignedStatus = "approved";

      if (!regNo || typeof regNo !== "string") {
        errors.regNo = "Registration number is required.";
      } else {
        const cleanReg = regNo.trim().toUpperCase();
        // 8 to 12 alphanumeric characters, starting with 2 digits for admission year
        if (!/^[0-9]{2}[A-Z0-9]{6,10}$/.test(cleanReg)) {
          errors.regNo = "Registration number must be 8-12 alphanumeric characters (e.g. 221FA04001).";
        } else {
          // Check uniqueness per college
          const duplicateReg = await User.findOne({ college: selectedCollege, regNo: cleanReg });
          if (duplicateReg) {
            return res.status(409).json({
              error: `Registration number ${cleanReg} is already registered in ${selectedCollege}.`,
            });
          }
          assignedRegNo = cleanReg;
        }
      }

      if (!department || !DEPARTMENTS.includes(department.toUpperCase())) {
        errors.department = `Please select a valid department (${DEPARTMENTS.join(", ")}).`;
      } else {
        assignedDept = department.toUpperCase();
      }

      if (!year || !YEARS.includes(year)) {
        errors.year = `Please select a valid study year (${YEARS.join(", ")}).`;
      } else {
        assignedYear = year;
      }

      if (!section || !SECTIONS.includes(section.toUpperCase())) {
        errors.section = `Please select a valid section (${SECTIONS.join(", ")}).`;
      } else {
        assignedSec = section.toUpperCase();
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: assignedRole,
      adminType: assignedAdminType,
      status: assignedStatus,
      college: selectedCollege,
      department: assignedDept,
      year: assignedYear,
      section: assignedSec,
      regNo: assignedRegNo,
    });

    await user.save();

    // If pending approval, do not issue immediate login token
    if (assignedStatus === "pending") {
      return res.status(201).json({
        message: `Account created successfully. Your ${assignedAdminType} account is pending approval by the Dean/HOD before you can log in.`,
        isPending: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          adminType: user.adminType,
          status: user.status,
          college: user.college,
        },
      });
    }

    const token = signToken(user);
    return res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        adminType: user.adminType,
        status: user.status,
        college: user.college,
        collegeName: user.college,
        department: user.department,
        branch: user.department,
        year: user.year,
        section: user.section,
        regNo: user.regNo,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: err.message || "Failed to register" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
  const rateStatus = checkRateLimit(ip);
  if (!rateStatus.allowed) {
    return res.status(429).json({
      error: `Too many failed login attempts. Please try again in ${rateStatus.minutesLeft} minute(s).`,
    });
  }

  try {
    const { email, password } = req.body;

    // Validate presence without leaking role
    if (!email || !password) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Use uniform error message to prevent account enumeration
    if (!user) {
      recordFailedAttempt(ip);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      recordFailedAttempt(ip);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check account approval status
    if (user.status === "pending") {
      return res.status(403).json({
        error: `Your ${user.adminType || "admin"} account is pending approval by the Dean or HOD. Please contact your department administration.`,
      });
    }

    if (user.status === "rejected") {
      return res.status(403).json({
        error: "Your account registration was not approved. Please contact your college administrator.",
      });
    }

    clearAttempts(ip);

    const token = signToken(user);
    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        adminType: user.adminType,
        status: user.status,
        college: user.college,
        collegeName: user.college,
        department: user.department,
        branch: user.department,
        year: user.year,
        section: user.section,
        regNo: user.regNo,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Failed to login" });
  }
});

// GET /api/auth/me
router.get("/me", authenticateToken, async (req, res) => {
  try {
    return res.json({
      user: {
        id: req.user._id.toString(),
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        adminType: req.user.adminType,
        status: req.user.status,
        college: req.user.college,
        collegeName: req.user.college,
        department: req.user.department,
        branch: req.user.department,
        year: req.user.year,
        section: req.user.section,
        regNo: req.user.regNo,
        readCount: (req.user.readNoticeIds || []).length,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to retrieve user info" });
  }
});

// GET /api/auth/pending-approvals (Dean sees all; HOD sees department faculty)
router.get("/pending-approvals", authenticateToken, requireHODorDean, async (req, res) => {
  try {
    const filter = { status: "pending", college: req.user.college };
    if (req.user.adminType === "HOD") {
      filter.department = req.user.department;
      filter.adminType = "Faculty";
    }

    const pendings = await User.find(filter)
      .select("name email role adminType department college createdAt")
      .sort({ createdAt: -1 });

    return res.json(pendings);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch pending approvals" });
  }
});

// PATCH /api/auth/approve-user/:id (Approve a staff member)
router.patch("/approve-user/:id", authenticateToken, requireHODorDean, async (req, res) => {
  try {
    const { id } = req.params;
    const target = await User.findById(id);
    if (!target) {
      return res.status(404).json({ error: "User not found" });
    }

    // Permission check: HOD can only approve Faculty in own department
    if (req.user.adminType === "HOD") {
      if (target.adminType !== "Faculty" || target.department !== req.user.department) {
        return res.status(403).json({ error: "HODs can only approve Faculty in their own department." });
      }
    }

    target.status = "approved";
    target.approvedBy = req.user._id;
    await target.save();

    return res.json({ message: `Approved ${target.name} (${target.adminType})`, user: target });
  } catch (err) {
    return res.status(500).json({ error: "Failed to approve user" });
  }
});

// DELETE /api/auth/reject-user/:id
router.delete("/reject-user/:id", authenticateToken, requireHODorDean, async (req, res) => {
  try {
    const { id } = req.params;
    const target = await User.findById(id);
    if (!target) {
      return res.status(404).json({ error: "User not found" });
    }

    if (req.user.adminType === "HOD") {
      if (target.adminType !== "Faculty" || target.department !== req.user.department) {
        return res.status(403).json({ error: "HODs can only reject Faculty in their own department." });
      }
    }

    target.status = "rejected";
    await target.save();

    return res.json({ message: `Rejected registration for ${target.name}` });
  } catch (err) {
    return res.status(500).json({ error: "Failed to reject user" });
  }
});

export default router;
