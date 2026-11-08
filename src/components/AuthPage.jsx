import { useState } from "react";
import { loginUser, registerUser } from "../api.js";
import {
  ALLOWED_COLLEGES,
  DEPARTMENTS,
  YEARS,
  SECTIONS,
  ADMIN_TYPES,
} from "../data/constants.js";

export default function AuthPage({ onAuthSuccess, onContinueAsGuest }) {
  const [tab, setTab] = useState("login"); // "login" | "register"
  const [role, setRole] = useState("student"); // "student" | "admin"

  // Login inputs
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPwd, setShowLoginPwd] = useState(false);

  // Register inputs
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showRegPwd, setShowRegPwd] = useState(false);
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
  const [showDemo, setShowDemo] = useState(false);

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
    } catch (err) {
      setGeneralError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});
    setPendingNotice(null);

    const errors = {};
    if (name.trim().length < 2) errors.name = "Enter your full name (at least 2 characters).";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = "Enter a valid institutional email.";
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
      }
    } catch (err) {
      if (err.details) setFieldErrors(err.details);
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
    } catch (err) {
      setGeneralError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrap">
      <div className="auth-card">
        {/* Header Branding */}
        <div className="auth-header">
          <img src="/vignan-logo.png" className="auth-logo-img" alt="Vignan Logo" />
          <h1>VFSTR Notice Board</h1>
          <p>Vignan Foundation for Science, Technology and Research · Student & Staff Portal</p>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${tab === "login" ? "auth-tab--active" : ""}`}
            onClick={() => {
              setTab("login");
              setGeneralError(null);
              setFieldErrors({});
              setPendingNotice(null);
            }}
          >
            🔑 Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === "register" ? "auth-tab--active" : ""}`}
            onClick={() => {
              setTab("register");
              setGeneralError(null);
              setFieldErrors({});
              setPendingNotice(null);
            }}
          >
            📝 Register
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
            <small>Once approved by the Dean or HOD, you will be able to log in immediately.</small>
          </div>
        )}

        {/* Sign In Form */}
        {tab === "login" && (
          <form className="form" onSubmit={handleLoginSubmit} noValidate>
            <label>
              Institutional Email
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
                  type={showLoginPwd ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  aria-invalid={!!fieldErrors.loginPassword}
                />
                <button
                  type="button"
                  className="pwd-toggle-btn"
                  onClick={() => setShowLoginPwd(!showLoginPwd)}
                  title={showLoginPwd ? "Hide password" : "Show password"}
                >
                  {showLoginPwd ? "🙈" : "👁️"}
                </button>
              </div>
              {fieldErrors.loginPassword && <span className="error">{fieldErrors.loginPassword}</span>}
            </label>

            <button
              type="submit"
              className="btn btn--primary auth-submit-btn"
              disabled={loading}
            >
              {loading ? "Verifying Credentials..." : "Sign In"}
            </button>
          </form>
        )}

        {/* Register Form */}
        {tab === "register" && !pendingNotice && (
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
              Institutional Email
              <input
                type="email"
                required
                placeholder="e.g. student@vignan.ac.in or staff@vignan.ac.in"
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
                  type={showRegPwd ? "text" : "password"}
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
                  onClick={() => setShowRegPwd(!showRegPwd)}
                  title={showRegPwd ? "Hide password" : "Show password"}
                >
                  {showRegPwd ? "🙈" : "👁️"}
                </button>
              </div>
              {fieldErrors.password && <span className="error">{fieldErrors.password}</span>}
            </label>

            {/* Role Radio */}
            <div className="form-box">
              <span className="form-box__title">Select Your Academic Role:</span>
              <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
                <label className="check" style={{ cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="pageRole"
                    checked={role === "student"}
                    onChange={() => setRole("student")}
                  />
                  Student
                </label>
                <label className="check" style={{ cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="pageRole"
                    checked={role === "admin"}
                    onChange={() => setRole("admin")}
                  />
                  Staff / Faculty / HOD
                </label>
              </div>
            </div>

            {/* Student Specific */}
            {role === "student" && (
              <div className="form-box">
                <span className="form-box__title">🎓 Student Academic Placement</span>
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
                    8–12 alphanumeric characters (validated & unique per college)
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

            {/* Staff / Admin Specific */}
            {role === "admin" && (
              <div className="form-box">
                <span className="form-box__title">🏛️ Staff Designation</span>
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
                  Dean's Invite Code (Optional)
                  <input
                    type="text"
                    placeholder="e.g. FACULTY2026 or HOD2026"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                  />
                  <small style={{ color: "var(--mute)", fontSize: "0.76rem" }}>
                    Staff with Dean's invite code are approved instantly. Without it, your account is queued for Dean/HOD review.
                  </small>
                </label>
              </div>
            )}

            <button
              type="submit"
              className="btn btn--primary auth-submit-btn"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Complete Registration"}
            </button>
          </form>
        )}

        {/* Quick Demo Logins Box — hidden by default */}
        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <button
            type="button"
            className="link-btn"
            style={{ fontSize: "0.82rem", color: "var(--mute)" }}
            onClick={() => setShowDemo(!showDemo)}
          >
            {showDemo ? "▲ Hide Demo Accounts" : "▼ Show Demo Sign-In (Testing)"}
          </button>
        </div>
        {showDemo && (
          <div className="demo-credentials-box" style={{ marginTop: "10px" }}>
            <p className="demo-title">⚡ Quick Demo Sign-In:</p>
            <div className="demo-grid-btns">
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => quickLogin("dean@vignan.ac.in", "password123")}
                disabled={loading}
              >
                👑 Dean (College-Wide)
              </button>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => quickLogin("hod.cse@vignan.ac.in", "password123")}
                disabled={loading}
              >
                🏛️ HOD (CSE Dept)
              </button>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => quickLogin("faculty.cse@vignan.ac.in", "password123")}
                disabled={loading}
              >
                👨‍🏫 Faculty (CSE 3rd Yr A)
              </button>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => quickLogin("221fa04001@vignan.ac.in", "password123")}
                disabled={loading}
              >
                🎓 Student: Basheer (CSE 3-A)
              </button>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => quickLogin("221fa04002@vignan.ac.in", "password123")}
                disabled={loading}
              >
                🎓 Student: Rahul (CSE 3-B)
              </button>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => quickLogin("231fa05001@vignan.ac.in", "password123")}
                disabled={loading}
              >
                🎓 Student: Priya (ECE 2-A)
              </button>
            </div>
          </div>
        )}

        {/* Continue as Guest option */}
        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <button
            type="button"
            className="link-btn"
            style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--brand)" }}
            onClick={onContinueAsGuest}
          >
            👁️ Browse Public College Notices as Guest →
          </button>
        </div>
      </div>
    </div>
  );
}
