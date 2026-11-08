import { useState } from "react";
import Modal from "./Modal.jsx";
import { loginUser, registerUser } from "../api.js";
import {
  ALLOWED_COLLEGES,
  DEPARTMENTS,
  YEARS,
  SECTIONS,
  ADMIN_TYPES,
} from "../data/constants.js";

export default function AuthModal({ onClose, onAuthSuccess }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [role, setRole] = useState("student"); // "student" | "admin" (register only)

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [college, setCollege] = useState(ALLOWED_COLLEGES[0]);

  // Student specific
  const [regNo, setRegNo] = useState("");
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [year, setYear] = useState(YEARS[2]); // Default 3rd Year
  const [section, setSection] = useState(SECTIONS[0]); // Default A

  // Admin specific
  const [adminType, setAdminType] = useState(ADMIN_TYPES[0]); // Faculty
  const [adminDept, setAdminDept] = useState(DEPARTMENTS[0]);
  const [inviteCode, setInviteCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [pendingNotice, setPendingNotice] = useState(null);

  // Handle Login (Unified login - role is determined by server!)
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    const errors = {};
    if (!loginEmail.trim()) errors.loginEmail = "Email is required.";
    if (!loginPassword) errors.loginPassword = "Password is required.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const res = await loginUser(loginEmail.trim(), loginPassword);
      onAuthSuccess(res.user);
      onClose();
    } catch (err) {
      setGeneralError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  // Handle Registration
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});
    setPendingNotice(null);

    const errors = {};
    if (name.trim().length < 2) errors.name = "Enter your full name (at least 2 characters).";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = "Enter a valid email address.";
    if (password.length < 8) errors.password = "Password must be at least 8 characters long.";

    if (role === "student") {
      const cleanReg = regNo.trim().toUpperCase();
      if (!/^[0-9]{2}[A-Z0-9]{6,10}$/.test(cleanReg)) {
        errors.regNo = "Enter a valid 8-12 character registration number (e.g. 221FA04001).";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        college,
        role,
      };

      if (role === "student") {
        payload.regNo = regNo.trim().toUpperCase();
        payload.department = department;
        payload.year = year;
        payload.section = section;
      } else {
        payload.adminType = adminType;
        payload.department = adminType === "Dean" ? "ALL" : adminDept;
        payload.inviteCode = inviteCode.trim();
      }

      const res = await registerUser(payload);

      if (res.isPending) {
        setPendingNotice(res.message);
      } else {
        onAuthSuccess(res.user);
        onClose();
      }
    } catch (err) {
      if (err.details) {
        setFieldErrors(err.details);
      }
      setGeneralError(err.message || "Registration failed. Please check the fields.");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (demoEmail, demoPassword) => {
    setGeneralError(null);
    setFieldErrors({});
    setLoginEmail(demoEmail);
    setLoginPassword(demoPassword);
    setLoading(true);
    try {
      const res = await loginUser(demoEmail, demoPassword);
      onAuthSuccess(res.user);
      onClose();
    } catch (err) {
      setGeneralError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={mode === "login" ? "Sign In to Your Account" : "Create an Account"} onClose={onClose}>
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <button
          type="button"
          className={`chip ${mode === "login" ? "chip--on" : ""}`}
          onClick={() => {
            setMode("login");
            setGeneralError(null);
            setFieldErrors({});
            setPendingNotice(null);
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          className={`chip ${mode === "register" ? "chip--on" : ""}`}
          onClick={() => {
            setMode("register");
            setGeneralError(null);
            setFieldErrors({});
            setPendingNotice(null);
          }}
        >
          Register
        </button>
      </div>

      {generalError && (
        <div className="error-banner" role="alert">
          <span>⚠️ {generalError}</span>
        </div>
      )}

      {pendingNotice && (
        <div className="pending-banner" role="alert">
          <strong>⏳ Approval Pending:</strong>
          <p>{pendingNotice}</p>
          <small>Once the Dean or HOD approves your account, you will be able to log in immediately.</small>
        </div>
      )}

      {/* LOGIN FORM (Unified Login - Never ask for role at login!) */}
      {mode === "login" && (
        <form className="form" onSubmit={handleLoginSubmit} noValidate>
          <label>
            Institutional Email Address
            <input
              type="email"
              required
              placeholder="e.g. 221fa04001@vignan.ac.in or dean@vignan.ac.in"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              aria-invalid={!!fieldErrors.loginEmail}
            />
            {fieldErrors.loginEmail && <span className="error">{fieldErrors.loginEmail}</span>}
          </label>

          <label>
            Password
            <div className="password-input-wrap">
              <input
                type={showLoginPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                aria-invalid={!!fieldErrors.loginPassword}
              />
              <button
                type="button"
                className="pwd-toggle-btn"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                title={showLoginPassword ? "Hide password" : "Show password"}
              >
                {showLoginPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {fieldErrors.loginPassword && <span className="error">{fieldErrors.loginPassword}</span>}
          </label>

          <div className="modal__actions" style={{ marginTop: "12px" }}>
            <button type="button" className="btn" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </div>
        </form>
      )}

      {/* REGISTER FORM */}
      {mode === "register" && !pendingNotice && (
        <form className="form" onSubmit={handleRegisterSubmit} noValidate>
          <label>
            College / Institution
            <select value={college} onChange={(e) => setCollege(e.target.value)}>
              {ALLOWED_COLLEGES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label>
            Full Name
            <input
              type="text"
              required
              placeholder="e.g. Basheer Shaik"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!fieldErrors.name}
            />
            {fieldErrors.name && <span className="error">{fieldErrors.name}</span>}
          </label>

          <label>
            Email Address
            <input
              type="email"
              required
              placeholder="student@vignan.ac.in or staff@vignan.ac.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!fieldErrors.email}
            />
            {fieldErrors.email && <span className="error">{fieldErrors.email}</span>}
          </label>

          <label>
            Password (minimum 8 characters)
            <div className="password-input-wrap">
              <input
                type={showRegisterPassword ? "text" : "password"}
                required
                minLength={8}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!fieldErrors.password}
              />
              <button
                type="button"
                className="pwd-toggle-btn"
                onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                title={showRegisterPassword ? "Hide password" : "Show password"}
              >
                {showRegisterPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {fieldErrors.password && <span className="error">{fieldErrors.password}</span>}
          </label>

          {/* Role selector to toggle fields (server still verifies role and permissions!) */}
          <div className="form-box">
            <span className="form-box__title">I am registering as:</span>
            <div style={{ display: "flex", gap: "10px" }}>
              <label className="check" style={{ cursor: "pointer" }}>
                <input
                  type="radio"
                  name="userRole"
                  checked={role === "student"}
                  onChange={() => setRole("student")}
                />
                Student
              </label>
              <label className="check" style={{ cursor: "pointer" }}>
                <input
                  type="radio"
                  name="userRole"
                  checked={role === "admin"}
                  onChange={() => setRole("admin")}
                />
                Faculty / Staff / HOD
              </label>
            </div>
          </div>

          {/* Student Specific Fields */}
          {role === "student" && (
            <div className="form-box">
              <span className="form-box__title">🎓 Student Academic Credentials</span>
              <label>
                Registration Number
                <input
                  type="text"
                  required
                  placeholder="e.g. 221FA04001"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value.toUpperCase())}
                  aria-invalid={!!fieldErrors.regNo}
                />
                <small style={{ color: "var(--mute)", fontSize: "0.76rem" }}>
                  Format: 8-12 alphanumeric characters (validated & unique per college)
                </small>
                {fieldErrors.regNo && <span className="error">{fieldErrors.regNo}</span>}
              </label>

              <div className="form__two">
                <label>
                  Department
                  <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Year of Study
                  <select value={year} onChange={(e) => setYear(e.target.value)}>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Section
                <select value={section} onChange={(e) => setSection(e.target.value)}>
                  {SECTIONS.map((s) => (
                    <option key={s} value={s}>Section {s}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {/* Admin Specific Fields */}
          {role === "admin" && (
            <div className="form-box">
              <span className="form-box__title">🏛️ Staff / Admin Position</span>
              <label>
                Designation
                <select value={adminType} onChange={(e) => setAdminType(e.target.value)}>
                  {ADMIN_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>

              {adminType !== "Dean" && (
                <label>
                  Department
                  <select value={adminDept} onChange={(e) => setAdminDept(e.target.value)}>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>
              )}

              <label>
                Dean's Staff Invite Code (Optional)
                <input
                  type="text"
                  placeholder="e.g. FACULTY2026 or HOD2026"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                />
                <small style={{ color: "var(--mute)", fontSize: "0.76rem" }}>
                  Staff with a Dean's invite code are approved instantly. Without an invite code, your account will be placed in pending status awaiting Dean/HOD approval.
                </small>
              </label>
            </div>
          )}

          <div className="modal__actions" style={{ marginTop: "12px" }}>
            <button type="button" className="btn" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? "Registering..." : "Create Account"}
            </button>
          </div>
        </form>
      )}

      {/* Quick Demo Sign-In Box */}
      <div className="demo-credentials-box">
        <p className="demo-title">⚡ Quick Demo Logins (Click to test roles & audience filters):</p>
        <div className="demo-btn-group">
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => quickLogin("dean@vignan.ac.in", "password123")}
            disabled={loading}
          >
            👑 Dean (College-wide Post, All-Access, Approvals)
          </button>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => quickLogin("hod.cse@vignan.ac.in", "password123")}
            disabled={loading}
          >
            🏛️ HOD - CSE (High Priority, CSE Dept Pins/Deletes, Approvals)
          </button>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => quickLogin("faculty.cse@vignan.ac.in", "password123")}
            disabled={loading}
          >
            👨‍🏫 Faculty - CSE (Med/Low Priority, Own Notice Edits)
          </button>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => quickLogin("221fa04001@vignan.ac.in", "password123")}
            disabled={loading}
          >
            🎓 Student: Basheer (CSE • 3rd Year • Sec-A)
          </button>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => quickLogin("231fa05001@vignan.ac.in", "password123")}
            disabled={loading}
          >
            🎓 Student: Priya (ECE • 2nd Year • Sec-A)
          </button>
          <button
            type="button"
            className="btn btn--sm"
            style={{ color: "var(--high)" }}
            onClick={() => quickLogin("pending.faculty@vignan.ac.in", "password123")}
            disabled={loading}
          >
            ⏳ Pending Faculty (Test Server Approval Block)
          </button>
        </div>
      </div>
    </Modal>
  );
}
