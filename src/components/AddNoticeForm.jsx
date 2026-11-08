import { useState } from "react";
import Modal from "./Modal.jsx";
import {
  CATEGORIES,
  PRIORITIES,
  DEPARTMENTS,
  YEARS,
  SECTIONS,
  AUDIENCE_SCOPES,
} from "../data/constants.js";

export default function AddNoticeForm({ onAdd, onClose, currentUser }) {
  const adminType = currentUser?.adminType || "Faculty";
  const userDept = currentUser?.department || "CSE";

  // If faculty: scope is strictly "section" only
  const isFaculty = adminType === "Faculty";

  const availableScopes = AUDIENCE_SCOPES.filter((s) => {
    if (isFaculty) {
      return s.value === "section"; // Faculty can ONLY send to specific section
    }
    if (adminType === "HOD") {
      return s.value !== "college"; // HOD cannot post college-wide
    }
    return true; // Dean can post anything
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    details: "",
    category: "General",
    priority: "Medium",
    deadline: "",
    pinned: false,
    scope: isFaculty ? "section" : availableScopes[0].value,
    department: adminType === "Dean" ? "ALL" : userDept,
    year: isFaculty ? YEARS[2] : "ALL", // Faculty defaults to 3rd Year
    section: isFaculty ? SECTIONS[0] : "ALL", // Faculty defaults to Section A
  });

  const [errors, setErrors] = useState({});
  const [photos, setPhotos] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [googleLinks, setGoogleLinks] = useState([]);
  const [hasPoll, setHasPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  // Handle Photo files upload
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotos((prev) => [...prev, event.target.result]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle Any format document/file upload
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            fileType: file.type || "application/octet-stream",
            size: file.size,
            dataUrl: event.target.result,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Google Links handlers
  const addGoogleLinkRow = () => {
    setGoogleLinks((prev) => [...prev, { title: "", url: "" }]);
  };

  const updateGoogleLink = (index, field, value) => {
    setGoogleLinks((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeGoogleLink = (index) => {
    setGoogleLinks((prev) => prev.filter((_, i) => i !== index));
  };

  // Poll handlers
  const updatePollOption = (index, val) => {
    setPollOptions((prev) => prev.map((opt, i) => (i === index ? val : opt)));
  };

  const addPollOption = () => {
    setPollOptions((prev) => [...prev, ""]);
  };

  const removePollOption = (index) => {
    setPollOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (form.title.trim().length < 3) next.title = "Enter a title of at least 3 characters.";
    if (!form.description.trim()) next.description = "Add a short description.";

    if (isFaculty) {
      if (form.priority === "High") {
        next.priority = "Faculty can only set Medium or Low priority.";
      }
      if (form.year === "ALL" || !form.year) {
        next.year = "Faculty must select a specific Year.";
      }
      if (form.section === "ALL" || !form.section) {
        next.section = "Faculty must select a specific Section.";
      }
    }

    if (hasPoll) {
      if (!pollQuestion.trim()) next.poll = "Enter a poll question.";
      const validOptions = pollOptions.filter((o) => o.trim());
      if (validOptions.length < 2) next.poll = "Add at least 2 poll options.";
    }

    setErrors(next);
    if (Object.keys(next).length) return;

    let pollData = null;
    if (hasPoll && pollQuestion.trim()) {
      pollData = {
        question: pollQuestion.trim(),
        options: pollOptions.filter((o) => o.trim()).map((text) => ({ text })),
      };
    }

    onAdd({
      title: form.title.trim(),
      description: form.description.trim(),
      details: form.details.trim(),
      category: form.category,
      priority: form.priority,
      deadline: form.deadline,
      pinned: isFaculty ? false : Boolean(form.pinned),
      audience: {
        scope: isFaculty ? "section" : form.scope,
        department: isFaculty ? userDept : (form.scope === "college" ? "ALL" : (adminType === "Dean" ? form.department : userDept)),
        year: isFaculty ? form.year : (form.scope === "year" || form.scope === "section" ? form.year : "ALL"),
        section: isFaculty ? form.section : (form.scope === "section" ? form.section : "ALL"),
      },
      photos,
      attachments,
      googleLinks: googleLinks.filter((l) => l.title.trim() && l.url.trim()),
      poll: pollData,
    });
  };

  return (
    <Modal title={`Create Notice (${adminType} Portal)`} onClose={onClose}>
      <form className="form" onSubmit={submit} noValidate>
        <label>
          Title
          <input
            value={form.title}
            onChange={set("title")}
            placeholder="e.g. Mid-Semester Lab Exam Schedule"
            aria-invalid={!!errors.title}
          />
          {errors.title && <span className="error">{errors.title}</span>}
        </label>

        <label>
          Short description
          <input
            value={form.description}
            onChange={set("description")}
            placeholder="One line visible on the notice card"
            aria-invalid={!!errors.description}
          />
          {errors.description && <span className="error">{errors.description}</span>}
        </label>

        <label>
          Full details (optional)
          <textarea
            rows="3"
            value={form.details}
            onChange={set("details")}
            placeholder="Complete instructions, schedule, or room details"
          />
        </label>

        <div className="form__two">
          <label>
            Category
            <select value={form.category} onChange={set("category")}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select
              value={form.priority}
              onChange={set("priority")}
              aria-invalid={!!errors.priority}
            >
              {PRIORITIES.map((p) => {
                const disabled = isFaculty && p === "High";
                return (
                  <option key={p} value={p} disabled={disabled}>
                    {p} {disabled ? "(HOD / Dean Only)" : ""}
                  </option>
                );
              })}
            </select>
            {errors.priority && <span className="error">{errors.priority}</span>}
          </label>
        </div>

        {/* Audience Selection (Faculty is locked to specific section) */}
        <div className="form-box">
          <span className="form-box__title">🎯 Target Audience (Section Filtering)</span>

          {isFaculty ? (
            <div className="faculty-policy-banner">
              <strong>🔒 Faculty Policy Enforced:</strong>
              <p>Faculty notices must be sent to a <b>specific section</b> only. They cannot broadcast to all classes or department-wide.</p>
            </div>
          ) : (
            <label>
              Audience Reach
              <select value={form.scope} onChange={set("scope")}>
                {availableScopes.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>
          )}

          {/* Department, Year, Section Selectors */}
          <div className="form__two" style={{ marginTop: "6px" }}>
            <label>
              Department
              {adminType === "Dean" && !isFaculty ? (
                <select value={form.department} onChange={set("department")}>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              ) : (
                <input value={userDept} disabled readOnly style={{ background: "var(--soft)", opacity: 0.85 }} />
              )}
            </label>

            {(isFaculty || form.scope === "year" || form.scope === "section") && (
              <label>
                Year
                <select value={form.year} onChange={set("year")}>
                  {!isFaculty && <option value="ALL">All Years</option>}
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                {errors.year && <span className="error">{errors.year}</span>}
              </label>
            )}
          </div>

          {(isFaculty || form.scope === "section") && (
            <label style={{ marginTop: "6px" }}>
              Section
              <select value={form.section} onChange={set("section")}>
                {!isFaculty && <option value="ALL">All Sections</option>}
                {SECTIONS.map((s) => (
                  <option key={s} value={s}>Section {s}</option>
                ))}
              </select>
              {errors.section && <span className="error">{errors.section}</span>}
            </label>
          )}
        </div>

        {/* Photos Upload */}
        <div className="form-box">
          <span className="form-box__title">📷 Upload Photos / Images</span>
          <label className="file-uploader-btn">
            <span>Choose Photos (PNG, JPG, WEBP)</span>
            <input
              type="file"
              multiple
              accept="image/*"
              style={{ display: "none" }}
              onChange={handlePhotoUpload}
            />
          </label>
          {photos.length > 0 && (
            <div className="photo-preview-grid">
              {photos.map((src, i) => (
                <div key={i} className="photo-thumb-wrap">
                  <img src={src} alt="Upload preview" className="photo-thumb" />
                  <button type="button" className="thumb-remove" onClick={() => removePhoto(i)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Any Format File Upload */}
        <div className="form-box">
          <span className="form-box__title">📎 Attach Any Format Files (PDF, Docs, Excel, Zip)</span>
          <label className="file-uploader-btn">
            <span>Select Files to Attach</span>
            <input
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
          </label>
          {attachments.length > 0 && (
            <div className="file-chip-list">
              {attachments.map((file, i) => (
                <div key={i} className="file-chip">
                  <span className="file-chip__icon">📄</span>
                  <span className="file-chip__name">{file.name}</span>
                  <span className="file-chip__size">({Math.round(file.size / 1024)} KB)</span>
                  <button type="button" className="thumb-remove" onClick={() => removeAttachment(i)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Google Links */}
        <div className="form-box">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="form-box__title">🔗 Google Links (Forms, Docs, Drive, Meet)</span>
            <button type="button" className="btn btn--sm" onClick={addGoogleLinkRow}>
              ＋ Add Link
            </button>
          </div>
          {googleLinks.map((link, idx) => (
            <div key={idx} className="google-link-row">
              <input
                placeholder="Link Title (e.g. Registration Form)"
                value={link.title}
                onChange={(e) => updateGoogleLink(idx, "title", e.target.value)}
              />
              <input
                placeholder="URL (https://forms.gle/...)"
                value={link.url}
                onChange={(e) => updateGoogleLink(idx, "url", e.target.value)}
              />
              <button
                type="button"
                className="icon-btn icon-btn--danger"
                onClick={() => removeGoogleLink(idx)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Interactive Polls */}
        <div className="form-box">
          <label className="check" style={{ marginBottom: hasPoll ? "10px" : "0" }}>
            <input
              type="checkbox"
              checked={hasPoll}
              onChange={(e) => setHasPoll(e.target.checked)}
            />
            📊 Attach an Interactive Student Poll
          </label>

          {hasPoll && (
            <div style={{ display: "grid", gap: "8px", marginTop: "8px" }}>
              <input
                placeholder="Poll Question (e.g. Will you attend the workshop?)"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
              />
              {errors.poll && <span className="error">{errors.poll}</span>}
              <div style={{ display: "grid", gap: "6px" }}>
                {pollOptions.map((opt, i) => (
                  <div key={i} style={{ display: "flex", gap: "6px" }}>
                    <input
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={(e) => updatePollOption(i, e.target.value)}
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        className="icon-btn icon-btn--danger"
                        onClick={() => removePollOption(i)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn btn--sm"
                style={{ justifySelf: "start" }}
                onClick={addPollOption}
              >
                ＋ Add Poll Option
              </button>
            </div>
          )}
        </div>

        <label>
          Deadline (optional)
          <input type="date" value={form.deadline} onChange={set("deadline")} />
        </label>

        {!isFaculty && (
          <label className="check">
            <input type="checkbox" checked={form.pinned} onChange={set("pinned")} /> Pin to the top of the board
          </label>
        )}

        <div className="modal__actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary">
            Post Notice
          </button>
        </div>
      </form>
    </Modal>
  );
}
