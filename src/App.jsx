import { useEffect, useMemo, useState, useCallback } from "react";
import StatsBar from "./components/StatsBar.jsx";
import FilterBar from "./components/FilterBar.jsx";
import NoticeList from "./components/NoticeList.jsx";
import NoticeModal from "./components/NoticeModal.jsx";
import AddNoticeForm from "./components/AddNoticeForm.jsx";
import LoadingSkeleton from "./components/LoadingSkeleton.jsx";
import AuthPage from "./components/AuthPage.jsx";
import AnalyticsModal from "./components/AnalyticsModal.jsx";
import StaffApprovalsModal from "./components/StaffApprovalsModal.jsx";
import SettingsModal from "./components/SettingsModal.jsx";
import { filterNotices, sortNotices, readStorage, writeStorage } from "./utils.js";
import {
  getNotices,
  createNotice,
  deleteNotice,
  togglePin,
  toggleRead,
  markAllNoticesRead,
  getCurrentUser,
  logoutUser,
  votePoll,
} from "./api.js";

const DEFAULT_FILTERS = {
  category: "All",
  priority: "All",
  status: "All",
  importantOnly: false,
  query: "",
  sortBy: "priority",
};

export default function App() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Guest view mode toggle (allows visitors to preview board without signing in)
  const [guestMode, setGuestMode] = useState(false);

  // Modals
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [approvalsOpen, setApprovalsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState(null);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [dark, setDark] = useState(() => readStorage("nb-dark", false));

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((cur) => (cur?.message === message ? null : cur));
    }, 4000);
  }, []);

  // Theme effect
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    writeStorage("nb-dark", dark);
  }, [dark]);

  // Load current user on boot
  useEffect(() => {
    getCurrentUser()
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          setGuestMode(false);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setCheckingAuth(false));
  }, []);

  // Load notices from backend
  const loadNotices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNotices();
      setNotices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load notices failed:", err);
      setError(err.message || "Could not load notices. Please ensure the backend server is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user || guestMode) {
      loadNotices();
    }
  }, [loadNotices, user, guestMode]);

  const canManage = user?.role === "admin";
  const canApprove = user?.role === "admin" && (user?.adminType === "Dean" || user?.adminType === "HOD");

  const actions = {
    onOpen: (id) => {
      setSelectedId(id);
      if (user) {
        toggleRead(id, true)
          .then(() => {
            setNotices((ns) => ns.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
          })
          .catch(() => {});
      }
    },

    onToggleRead: async (id) => {
      if (!user) {
        showToast("Sign in with your student credentials to save read status", "info");
        setGuestMode(false);
        return;
      }
      const prev = notices;
      const target = notices.find((n) => n.id === id);
      if (!target) return;

      const nextRead = !target.isRead;
      setNotices((ns) => ns.map((n) => (n.id === id ? { ...n, isRead: nextRead } : n)));

      try {
        await toggleRead(id, nextRead);
      } catch (err) {
        setNotices(prev);
        showToast("Could not update read status. Rolled back.", "error");
      }
    },

    onTogglePin: async (id) => {
      if (!canManage) {
        showToast("Only authorized administrators can pin notices", "error");
        return;
      }
      const prev = notices;
      const target = notices.find((n) => n.id === id);
      if (!target) return;

      const nextPinned = !target.pinned;
      setNotices((ns) => ns.map((n) => (n.id === id ? { ...n, pinned: nextPinned } : n)));

      try {
        await togglePin(id, nextPinned);
      } catch (err) {
        setNotices(prev);
        showToast(err.message || "Could not update pin status. Rolled back.", "error");
      }
    },

    onDelete: async (id) => {
      if (!canManage) {
        showToast("Only authorized administrators can delete notices", "error");
        return;
      }
      if (!window.confirm("Delete this notice? This cannot be undone.")) return;

      const prev = notices;
      setNotices((ns) => ns.filter((n) => n.id !== id));
      if (selectedId === id) setSelectedId(null);

      try {
        await deleteNotice(id);
        showToast("Notice deleted successfully", "success");
      } catch (err) {
        setNotices(prev);
        showToast(err.message || "Could not delete notice. Rolled back.", "error");
      }
    },

    onVotePoll: async (id, optionIndex) => {
      if (!user) {
        showToast("Please sign in to vote in polls", "info");
        setGuestMode(false);
        return;
      }
      try {
        const res = await votePoll(id, optionIndex);
        setNotices((ns) => ns.map((n) => (n.id === id ? { ...n, poll: res.poll } : n)));
        showToast("Your vote has been recorded!", "success");
      } catch (err) {
        showToast(err.message || "Failed to submit vote", "error");
      }
    },
  };

  const addNotice = async (fields) => {
    try {
      const created = await createNotice(fields);
      setNotices((ns) => [created, ...ns]);
      setAdding(false);
      showToast("Notice posted successfully!", "success");
    } catch (err) {
      showToast(err.message || "Failed to create notice.", "error");
    }
  };

  const markAllRead = async () => {
    if (!user) {
      showToast("Please sign in to save read status across sessions", "info");
      setGuestMode(false);
      return;
    }
    const prev = notices;
    setNotices((ns) => ns.map((n) => ({ ...n, isRead: true })));

    try {
      await markAllNoticesRead();
      showToast("All notices marked as read", "success");
    } catch (err) {
      setNotices(prev);
      showToast("Could not mark all as read. Rolled back.", "error");
    }
  };

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  const handleLogout = async () => {
  try {
    await logoutUser();

    setAvatarOpen(false);
    setUser(null);
    setGuestMode(false);
    setNotices([]);
    setSelectedId(null);

    showToast("Signed out successfully", "success");
  } catch (error) {
    console.error("Logout failed:", error);
    showToast("Unable to sign out. Please try again.", "error");
  }
};

  const visible = useMemo(
    () => sortNotices(filterNotices(notices, filters), filters.sortBy),
    [notices, filters]
  );
  const selected = notices.find((n) => n.id === selectedId);
  const unread = notices.filter((n) => !n.isRead).length;
  const urgent = notices.filter((n) => n.priority === "High" && !n.isRead).length;

  // Short display name for header
  const headingCollege = "VFSTR Notice Board";

  // Dedicated Starting Page when not authenticated and not in guest preview
  if (!checkingAuth && !user && !guestMode) {
    return (
      <AuthPage
        onAuthSuccess={(u) => {
          setUser(u);
          setGuestMode(false);
          showToast(`Welcome, ${u.name}! Signed in as ${u.role === "student" ? u.regNo : u.adminType}.`, "success");
        }}
        onContinueAsGuest={() => setGuestMode(true)}
      />
    );
  }

  return (
    <main className="wrap">
      <header className="hero">
        {/* Top row: Brand (left) + Icon controls (right) */}
        <div className="hero__top">
          <div className="hero__brand">
            <img src="/vignan-logo.png" className="vignan-logo" alt="Vignan" />
            <div>
              <h1 className="hero__title">{headingCollege}</h1>
              {user && user.role === "student" ? (
                <p className="hero__subtitle">
                  Student Portal · <strong>{user.name}</strong> · {user.department} {user.year} · Sec {user.section}
                </p>
              ) : user && user.role === "admin" ? (
                <p className="hero__subtitle">
                  Staff Portal · <strong>{user.name}</strong> · {user.adminType}{user.department !== "ALL" ? ` ${user.department}` : ""}
                </p>
              ) : (
                <p className="hero__subtitle">Institutional Public Notice Feed · Guest Mode</p>
              )}
            </div>
          </div>

          <div className="hero__right-icons">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setDark(!dark)}
              title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle theme"
            >
              {dark ? "☀️" : "🌙"}
            </button>

            {user ? (
  <div
    className="user-avatar-menu"
    style={{ position: "relative" }}
  >
    <button
      type="button"
      className="icon-btn user-avatar-btn"
      title="Account details"
      onClick={() => setAvatarOpen((o) => !o)}
      aria-label="User menu"
      aria-expanded={avatarOpen}
    >
      👤
    </button>

    {avatarOpen && (
      <>
        {/* Click outside to close */}
        <div
          onClick={() => setAvatarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 199
          }}
        />

        {/* Profile Card */}
        <div
  className="avatar-dropdown"
  style={{
    position: "absolute",
    top: "calc(100% + 12px)",
    right: 0,
    width: "420px",
    maxWidth: "calc(100vw - 30px)",
    zIndex: 200,

    // Theme-based colors
    background: dark ? "#1C1C1E" : "#FFFFFF",
    color: dark ? "#F4F4F6" : "#252525",

    borderRadius: "20px",
    padding: "20px",
    boxShadow: dark
      ? "0 8px 30px rgba(0,0,0,0.4)"
      : "0 8px 30px rgba(0,0,0,0.12)"
  }}
>
          <div className="avatar-dropdown__header">
            <strong>{user.name}</strong>
            <span className="avatar-dropdown__role">
              {user.role === "student" ? "Student" : user.adminType}
            </span>
          </div>

          <div className="avatar-dropdown__rows">

            {user.regNo && (
              <div className="acc-row">
                <span className="acc-label">Reg No:</span>
                <b>{user.regNo.toUpperCase()}</b>
              </div>
            )}

            {user.department && (
              <div className="acc-row">
                <span className="acc-label">Dept &amp; Section:</span>
                <span>
                  {user.department}
                  {user.section && user.section !== "ALL"
                    ? ` • Sec ${user.section}`
                    : ""}
                  {user.year ? ` • ${user.year}` : ""}
                </span>
              </div>
            )}

            <div className="acc-row">
              <span className="acc-label">Institution:</span>
              <span style={{ fontSize: "0.8rem" }}>
                {user.college ||
                  "Vignan Foundation for Science, Technology and Research"}
              </span>
            </div>

            <div className="acc-row">
              <span className="acc-label">Email:</span>
              <span style={{ fontSize: "0.8rem" }}>
                {user.email}
              </span>
            </div>

          </div>

          <div className="avatar-dropdown__footer">
            <button
              type="button"
              className="btn btn--danger btn--sm"
              style={{
                width: "100%",
                cursor: "pointer"
              }}
              onClick={handleLogout}
            >
              Sign Out
            </button>
          </div>

        </div>
      </>
    )}
  </div>
) : (
  <button
    type="button"
    className="btn btn--light btn--sm"
    onClick={() => setGuestMode(false)}
  >
    Sign In
  </button>
)}
          
          </div>
        </div>

        {/* Action pill row */}
        <div className="hero__action-row">
          {canManage && (
            <>
              <button type="button" className="pill-btn pill-btn--primary" onClick={() => setAdding(true)}>
                + Post Notice
              </button>
              <button
                type="button"
                className="pill-btn"
                onClick={() => setAnalyticsOpen(true)}
              >
                Analytics
              </button>
            </>
          )}

          {canApprove && (
            <button
              type="button"
              className="pill-btn"
              onClick={() => setApprovalsOpen(true)}
            >
              Approvals
            </button>
          )}

          <button
            type="button"
            className="pill-btn"
            onClick={() => setSettingsOpen(true)}
            title="Institutional Settings & Support"
          >
            Settings
          </button>
        </div>
      </header>

      {toast && (
        <div className={`toast toast--${toast.type}`} role="status">
          <span>{toast.message}</span>
        </div>
      )}

      {error && (
        <div className="error-banner" role="alert">
          <div>
            <strong>⚠️ Could not load notices.</strong> {error}
          </div>
          <button type="button" className="btn btn--sm btn--primary" onClick={loadNotices}>
            Retry
          </button>
        </div>
      )}

      <StatsBar total={notices.length} unread={unread} urgent={urgent} />
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        onClear={clearFilters}
        onMarkAll={markAllRead}
      />

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <NoticeList
          notices={visible}
          actions={actions}
          onClear={clearFilters}
          currentUser={user}
        />
      )}

      <footer className="footer">
        <p style={{ color: "var(--mute)", fontSize: "0.85rem" }}>
          Notice Board · Vignan Foundation for Science, Technology and Research (Deemed to be University)
        </p>
      </footer>

      {selected && (
        <NoticeModal
          notice={selected}
          actions={actions}
          onClose={() => setSelectedId(null)}
          currentUser={user}
        />
      )}

      {adding && (
        <AddNoticeForm
          onAdd={addNotice}
          onClose={() => setAdding(false)}
          currentUser={user}
        />
      )}

      {analyticsOpen && (
        <AnalyticsModal onClose={() => setAnalyticsOpen(false)} />
      )}

      {approvalsOpen && (
        <StaffApprovalsModal
          currentUser={user}
          onClose={() => setApprovalsOpen(false)}
          onApprovalChange={() => showToast("Staff approval status updated", "success")}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          currentUser={user}
          dark={dark}
          onToggleTheme={() => setDark(!dark)}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </main>
  );
}
