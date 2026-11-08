import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { getPendingApprovals, approveStaffUser, rejectStaffUser } from "../api.js";

export default function StaffApprovalsModal({ onClose, currentUser, onApprovalChange }) {
  const [pendings, setPendings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionId, setActionId] = useState(null);

  const loadPending = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPendingApprovals();
      setPendings(data);
    } catch (err) {
      setError(err.message || "Failed to load pending requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleApprove = async (id) => {
    setActionId(id);
    try {
      await approveStaffUser(id);
      setPendings((list) => list.filter((u) => u._id !== id && u.id !== id));
      if (onApprovalChange) onApprovalChange();
    } catch (err) {
      alert(err.message || "Failed to approve user");
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Reject this staff registration request?")) return;
    setActionId(id);
    try {
      await rejectStaffUser(id);
      setPendings((list) => list.filter((u) => u._id !== id && u.id !== id));
      if (onApprovalChange) onApprovalChange();
    } catch (err) {
      alert(err.message || "Failed to reject user");
    } finally {
      setActionId(null);
    }
  };

  return (
    <Modal
      title={`Staff Registration Approvals (${currentUser.adminType} Authority)`}
      onClose={onClose}
    >
      <p style={{ fontSize: "0.88rem", color: "var(--mute)", margin: "0 0 12px" }}>
        {currentUser.adminType === "Dean"
          ? "As Dean, you have authority to approve or reject Faculty and HOD accounts across all departments."
          : `As HOD of ${currentUser.department}, you have authority to approve or reject Faculty applicants in your department.`}
      </p>

      {loading && <p style={{ color: "var(--mute)" }}>Checking for pending staff registrations...</p>}

      {error && (
        <div className="error-banner" role="alert">
          <span>⚠️ {error}</span>
          <button type="button" className="btn btn--sm" onClick={loadPending}>Retry</button>
        </div>
      )}

      {!loading && pendings.length === 0 && (
        <div className="empty" style={{ padding: "24px 0" }}>
          <span className="empty__icon">✨</span>
          <h3>No Pending Approvals</h3>
          <p>All staff registrations in your purview have been reviewed.</p>
        </div>
      )}

      <div style={{ display: "grid", gap: "10px" }}>
        {pendings.map((p) => {
          const id = p._id || p.id;
          const isActing = actionId === id;

          return (
            <div key={id} className="approval-card">
              <div className="approval-card__info">
                <strong>{p.name}</strong>
                <span className="approval-pill">{p.adminType} • {p.department}</span>
                <span style={{ fontSize: "0.8rem", color: "var(--mute)" }}>{p.email}</span>
              </div>
              <div className="approval-card__actions">
                <button
                  type="button"
                  className="btn btn--sm btn--primary"
                  disabled={isActing}
                  onClick={() => handleApprove(id)}
                >
                  ✓ Approve
                </button>
                <button
                  type="button"
                  className="btn btn--sm btn--danger"
                  disabled={isActing}
                  onClick={() => handleReject(id)}
                >
                  ✕ Reject
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="modal__actions" style={{ marginTop: "16px" }}>
        <button type="button" className="btn btn--primary" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}
