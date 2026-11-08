import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { getAnalytics } from "../api.js";

export default function AnalyticsModal({ onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNoticeId, setSelectedNoticeId] = useState(null);
  const [filterQuery, setFilterQuery] = useState("");

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAnalytics();
      setData(res);
      if (res.notices?.length > 0) {
        setSelectedNoticeId(res.notices[0].id);
      }
    } catch (err) {
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const filteredNotices = data?.notices?.filter((n) =>
    n.title.toLowerCase().includes(filterQuery.toLowerCase())
  ) || [];

  const selectedNotice = data?.notices?.find((n) => n.id === selectedNoticeId);

  return (
    <Modal title="📊 Admin Analytics: Student Readership & Engagement" onClose={onClose}>
      {loading && <p style={{ color: "var(--mute)" }}>Loading analytics data...</p>}

      {error && (
        <div className="error-banner" role="alert">
          <span>⚠️ {error}</span>
          <button type="button" className="btn btn--sm" onClick={loadAnalytics}>
            Retry
          </button>
        </div>
      )}

      {data && (
        <div className="analytics-body">
          {/* Top Metric Cards */}
          <div className="analytics-metrics-grid">
            <div className="analytics-metric">
              <b>{data.summary.totalStudents}</b>
              <span>Registered Students</span>
            </div>
            <div className="analytics-metric">
              <b>{data.summary.totalNotices}</b>
              <span>Notices Published</span>
            </div>
            <div className="analytics-metric">
              <b>{data.summary.totalReadsAcrossAll}</b>
              <span>Total Notice Views</span>
            </div>
            <div className="analytics-metric" style={{ borderColor: "var(--brand)" }}>
              <b style={{ color: "var(--brand)" }}>{data.summary.overallReadRate}%</b>
              <span>Average Read Rate</span>
            </div>
          </div>

          {/* Branch Engagement */}
          {data.branchAnalytics?.length > 0 && (
            <div className="analytics-box">
              <span className="analytics-box-title">🏢 Engagement by Branch</span>
              <div className="branch-grid">
                {data.branchAnalytics.map((b) => (
                  <div key={b.branch} className="branch-card">
                    <strong>{b.branch}</strong>
                    <span>{b.students} student{b.students === 1 ? "" : "s"}</span>
                    <span className="branch-card__rate">{b.avgReadsPerStudent} reads/student</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notice-by-Notice Status */}
          <div className="analytics-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span className="analytics-box-title">📋 Individual Notice Read Status</span>
              <input
                type="search"
                placeholder="Filter by notice title..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                style={{ maxWidth: "220px", padding: "6px 10px", minHeight: "34px", fontSize: "0.85rem" }}
              />
            </div>

            <div className="analytics-layout">
              {/* Notice Selector List */}
              <div className="notice-analytics-list">
                {filteredNotices.map((n) => {
                  const isCur = n.id === selectedNoticeId;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      className={`notice-stat-item ${isCur ? "notice-stat-item--active" : ""}`}
                      onClick={() => setSelectedNoticeId(n.id)}
                    >
                      <div className="notice-stat-item__head">
                        <span className="notice-stat-title">{n.title}</span>
                        <span className="notice-stat-pct">{n.readRate}%</span>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${n.readRate}%`,
                            background: n.readRate > 60 ? "var(--low)" : n.readRate > 30 ? "var(--medium)" : "var(--high)",
                          }}
                        />
                      </div>
                      <div className="notice-stat-item__meta">
                        <span>Target: {n.targetBranch}-{n.targetSection}</span>
                        <span>{n.readCount} of {n.eligibleCount} read</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Notice Detail Inspector */}
              {selectedNotice ? (
                <div className="notice-detail-panel">
                  <h4>{selectedNotice.title}</h4>
                  <p style={{ fontSize: "0.85rem", color: "var(--mute)", margin: "4px 0 10px" }}>
                    Audience: <b>{selectedNotice.targetBranch}</b> (Section: <b>{selectedNotice.targetSection}</b>) • Date: <b>{selectedNotice.date}</b>
                  </p>

                  <div className="read-ratio-banner">
                    <div>
                      <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--brand)" }}>
                        {selectedNotice.readRate}%
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--mute)" }}>
                        {selectedNotice.readCount} Read / {selectedNotice.unreadCount} Unread
                      </div>
                    </div>
                    <div className="progress-track" style={{ flex: 1, height: "12px" }}>
                      <div
                        className="progress-fill"
                        style={{ width: `${selectedNotice.readRate}%`, background: "var(--brand)" }}
                      />
                    </div>
                  </div>

                  {/* Poll results if attached */}
                  {selectedNotice.poll && (
                    <div className="analytics-poll-card">
                      <strong>📊 Poll Results: {selectedNotice.poll.question}</strong>
                      <span style={{ fontSize: "0.8rem", color: "var(--mute)", display: "block", marginBottom: "6px" }}>
                        Total responses: {selectedNotice.poll.totalVotes}
                      </span>
                      <div style={{ display: "grid", gap: "6px" }}>
                        {selectedNotice.poll.options.map((opt, i) => (
                          <div key={i} className="poll-stat-row">
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                              <span>{opt.text}</span>
                              <b>{opt.percentage}% ({opt.votesCount})</b>
                            </div>
                            <div className="progress-track">
                              <div className="progress-fill" style={{ width: `${opt.percentage}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Student Lists: Read vs Unread */}
                  <div className="student-lists-split">
                    <div className="student-list-box">
                      <span className="student-list-header student-list-header--read">
                        🟢 Read by ({selectedNotice.readStudents.length}):
                      </span>
                      <div className="student-names-scroll">
                        {selectedNotice.readStudents.length === 0 ? (
                          <span className="empty-label">No students yet</span>
                        ) : (
                          selectedNotice.readStudents.map((s) => (
                            <div key={s.id} className="student-chip">
                              <b>{s.name}</b>
                              <span>{s.branch}-{s.section}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="student-list-box">
                      <span className="student-list-header student-list-header--unread">
                        🔴 Pending Unread ({selectedNotice.unreadStudents.length}):
                      </span>
                      <div className="student-names-scroll">
                        {selectedNotice.unreadStudents.length === 0 ? (
                          <span className="empty-label">All eligible students read! 🎉</span>
                        ) : (
                          selectedNotice.unreadStudents.map((s) => (
                            <div key={s.id} className="student-chip">
                              <b>{s.name}</b>
                              <span>{s.branch}-{s.section}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "20px", color: "var(--mute)" }}>Select a notice to view details</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="modal__actions" style={{ marginTop: "14px" }}>
        <button type="button" className="btn" onClick={loadAnalytics} disabled={loading}>
          🔄 Refresh Data
        </button>
        <button type="button" className="btn btn--primary" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
