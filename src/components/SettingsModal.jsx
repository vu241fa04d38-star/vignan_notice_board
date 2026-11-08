import { useState } from "react";
import Modal from "./Modal.jsx";

const COLLEGE_WEBSITES = {
  "Vignan Foundation for Science, Technology and Research (Deemed to be University)": "https://www.vignan.ac.in/",
  "Vignan's Institute of Information Technology (VIIT)": "https://vignaniit.edu.in/",
  "Vignan's Nirula Institute of Technology for Women (VNITW)": "https://www.vignannirula.org/",
};

export default function SettingsModal({ onClose, currentUser, dark, onToggleTheme }) {
  const [activeTab, setActiveTab] = useState("about"); // "about" | "feedback" | "support"
  const collegeName = currentUser?.college || "Vignan Foundation for Science, Technology and Research (Deemed to be University)";
  const collegeWebsite = COLLEGE_WEBSITES[collegeName] || "https://www.vignan.ac.in/";

  // Feedback form state
  const [fbCategory, setFbCategory] = useState("Suggestion");
  const [fbMessage, setFbMessage] = useState("");
  const [fbSending, setFbSending] = useState(false);
  const [fbSuccess, setFbSuccess] = useState(false);
  const [fbError, setFbError] = useState(null);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setFbError(null);
    setFbSuccess(false);

    if (fbMessage.trim().length < 5) {
      setFbError("Please write at least 5 characters in your feedback message.");
      return;
    }

    setFbSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: currentUser?.name || "Student / Guest",
          email: currentUser?.email || "anonymous@vignan.ac.in",
          category: fbCategory,
          message: fbMessage.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setFbSuccess(true);
      setFbMessage("");
    } catch (err) {
      setFbError(err.message || "Failed to submit feedback");
    } finally {
      setFbSending(false);
    }
  };

  return (
    <Modal title="⚙️ Institutional Settings & College Support" onClose={onClose}>
      {/* Settings Navigation Tabs */}
      <div className="settings-nav-tabs">
        <button
          type="button"
          className={`chip ${activeTab === "about" ? "chip--on" : ""}`}
          onClick={() => setActiveTab("about")}
        >
          🏛️ About Vignan
        </button>
        <button
          type="button"
          className={`chip ${activeTab === "feedback" ? "chip--on" : ""}`}
          onClick={() => setActiveTab("feedback")}
        >
          💬 Feedbacks
        </button>
        <button
          type="button"
          className={`chip ${activeTab === "support" ? "chip--on" : ""}`}
          onClick={() => setActiveTab("support")}
        >
          ❓ Help &amp; Support
        </button>
      </div>

      <div className="settings-tab-content">
        {/* ABOUT VIGNAN COLLEGE */}
        {activeTab === "about" && (
          <div className="about-vignan-block">
            <div className="about-hero-box">
              <h3>{collegeName}</h3>
              <span className="about-badge">Your registered college</span>
              <p>
                This is the college associated with your account. Visit its official website for institutional information, academic resources, and updates.
              </p>
            </div>

            <div className="about-section">
              <h4>Institutional Mission</h4>
              <ul>
                <li>Provide outcome-based education fostering critical inquiry and innovation.</li>
                <li>Engage students with live industrial projects, AI labs, and competitive hackathons.</li>
                <li>Maintain a transparent, timely academic notice and communication ecosystem.</li>
              </ul>
            </div>

            <div className="about-footer-link">
              <a href={collegeWebsite} target="_blank" rel="noopener noreferrer" className="btn btn--sm btn--primary">
                Visit Official College Website
              </a>
            </div>
          </div>
        )}

        {/* FEEDBACKS */}
        {activeTab === "feedback" && (
          <div className="feedback-block">
            <h4>💬 Institutional Feedback & Discrepancy Reporting</h4>
            <p style={{ fontSize: "0.88rem", color: "var(--mute)" }}>
              Have a suggestion to improve the Notice Priority Board? Found a discrepancy in exam dates or class notices? Let the administration know below.
            </p>

            {fbSuccess && (
              <div className="feedback-success-banner" role="status">
                <span>✓ Thank you! Your feedback has been sent directly to college administration.</span>
              </div>
            )}

            {fbError && (
              <div className="error-banner" role="alert">
                <span>⚠️ {fbError}</span>
              </div>
            )}

            <form onSubmit={handleFeedbackSubmit} className="form" style={{ marginTop: "10px" }}>
              <label>
                Feedback Type
                <select value={fbCategory} onChange={(e) => setFbCategory(e.target.value)}>
                  <option value="Suggestion">💡 Platform / Feature Suggestion</option>
                  <option value="Notice Discrepancy">⚠️ Notice Correction or Schedule Discrepancy</option>
                  <option value="Bug Report">🐛 Technical Issue or Bug</option>
                  <option value="Appreciation">👏 Appreciation & Feedback</option>
                  <option value="General">📝 General Inquiry</option>
                </select>
              </label>

              <label>
                Your Message / Details
                <textarea
                  rows="4"
                  required
                  placeholder="Describe your feedback, specify notice titles if relevant..."
                  value={fbMessage}
                  onChange={(e) => setFbMessage(e.target.value)}
                />
              </label>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--mute)" }}>
                  Submitting as: <b>{currentUser?.name || "Guest Student"}</b>
                </span>
                <button type="submit" className="btn btn--primary" disabled={fbSending}>
                  {fbSending ? "Submitting..." : "Send Feedback"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* HELP & SUPPORT */}
        {activeTab === "support" && (
          <div className="support-block">
            <h4>❓ Frequently Asked Questions & Operational Guide</h4>

            <div className="support-faq">
              <div className="faq-item">
                <b>📌 Why are some notices pinned to the top?</b>
                <p>
                  Notices pinned by the Dean or Department HOD always appear at the top of your feed, regardless of posting date, ensuring critical announcements like fee deadlines and mid-semester exams are never missed.
                </p>
              </div>

              <div className="faq-item">
                <b>🎯 How does Section Filtering work?</b>
                <p>
                  Students only receive notices relevant to their registered department, study year, and section (along with college-wide announcements). Faculty members post directly to specific sections to avoid irrelevant notifications.
                </p>
              </div>

              <div className="faq-item">
                <b>⏳ How are Staff Accounts verified?</b>
                <p>
                  Staff accounts require either a Dean's invite code during registration, or approval by the Department HOD / Dean Academics before login access is granted.
                </p>
              </div>

              <div className="faq-item">
                <b>⏰ What do the deadline tags mean?</b>
                <p>
                  Notices with approaching deadlines show color-coded tags: <b>Overdue</b> (red), <b>Due today / tomorrow</b> (amber), and <b>Due in N days</b> (blue).
                </p>
              </div>
            </div>

            <div className="support-contacts-box">
              <h4>📞 Institutional Emergency & Helpdesk Contacts</h4>
              <div className="contacts-grid">
                <div>
                  <strong>Examination Cell:</strong>
                  <span>exams@vignan.ac.in • Ext: 401</span>
                </div>
                <div>
                  <strong>Academic Affairs (Dean):</strong>
                  <span>dean.academics@vignan.ac.in • Ext: 102</span>
                </div>
                <div>
                  <strong>Student Affairs & Grievances:</strong>
                  <span>grievances@vignan.ac.in • Ext: 205</span>
                </div>
                <div>
                  <strong>IT Notice Board Support:</strong>
                  <span>support@vignan.ac.in</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ACCOUNT & PREFERENCES */}
        {activeTab === "account" && (
          <div className="account-settings-block">
            <h4>👤 Session & Display Preferences</h4>

            <div className="account-details-box">
              <div className="acc-row">
                <span className="acc-label">Logged In User:</span>
                <b>{currentUser ? currentUser.name : "Guest Visitor"}</b>
              </div>
              <div className="acc-row">
                <span className="acc-label">Account Role:</span>
                <span>{currentUser ? (currentUser.role === "student" ? "Student" : currentUser.adminType) : "Unauthenticated"}</span>
              </div>
              {currentUser?.regNo && (
                <div className="acc-row">
                  <span className="acc-label">Registration No:</span>
                  <b>{currentUser.regNo}</b>
                </div>
              )}
              {currentUser?.department && (
                <div className="acc-row">
                  <span className="acc-label">Department & Section:</span>
                  <span>{currentUser.department} {currentUser.section !== "ALL" ? `• Section ${currentUser.section}` : ""}</span>
                </div>
              )}
              <div className="acc-row">
                <span className="acc-label">Institution:</span>
                <span>{currentUser?.college || "Vignan's Institute of Information Technology"}</span>
              </div>
            </div>

            <div className="theme-toggle-box">
              <div>
                <strong>Theme Display Mode</strong>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--mute)" }}>
                  Currently using {dark ? "Dark Mode" : "Light Mode"}
                </p>
              </div>
              <button type="button" className="btn btn--glass" onClick={onToggleTheme}>
                {dark ? "☀️ Switch to Light Mode" : "🌙 Switch to Dark Mode"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="modal__actions" style={{ marginTop: "14px" }}>
        <button type="button" className="btn btn--primary" onClick={onClose}>
          Close Settings
        </button>
      </div>
    </Modal>
  );
}
