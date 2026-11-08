import Modal from "./Modal.jsx";
import Badge from "./Badge.jsx";
import DeadlineTag from "./DeadlineTag.jsx";
import NoticeMedia from "./NoticeMedia.jsx";
import { formatDate } from "../utils.js";

export default function NoticeModal({ notice, actions, onClose, currentUser }) {
  const {
    id,
    title,
    description,
    details,
    category,
    priority,
    date,
    deadline,
    isRead,
    pinned,
    audience,
    createdBy,
  } = notice;

  const adminType = currentUser?.adminType;
  const isOwner = createdBy?.id === currentUser?.id || createdBy?.id === currentUser?._id;
  const isSameDept =
    audience?.department === currentUser?.department || createdBy?.department === currentUser?.department;

  const canPin =
    adminType === "Dean" || (adminType === "HOD" && isSameDept);

  const canDelete =
    adminType === "Dean" || (adminType === "HOD" && isSameDept) || (adminType === "Faculty" && isOwner);

  let audienceLabel = "🌐 College-Wide";
  if (audience?.scope === "department") {
    audienceLabel = `🏢 Dept: ${audience.department}`;
  } else if (audience?.scope === "year") {
    audienceLabel = `📅 ${audience.department} • ${audience.year}`;
  } else if (audience?.scope === "section") {
    audienceLabel = `🎯 ${audience.department} • ${audience.year} • Sec ${audience.section}`;
  }

  return (
    <Modal title={title} onClose={onClose}>
      <div className="card__top">
        <Badge priority={priority} />
        <Badge>{category}</Badge>
        {pinned && <span className="pin-flag">📌 Pinned</span>}
        <span className="target-pill">{audienceLabel}</span>
      </div>

      <p className="modal__text">{details || description}</p>

      {/* Author line */}
      {createdBy?.name && (
        <div className="notice-author-line">
          <span>Posted by: <b>{createdBy.name}</b> ({createdBy.adminType}{createdBy.department !== "ALL" ? ` - ${createdBy.department}` : ""})</span>
        </div>
      )}

      {/* Photos, Files, Google Links, Polls */}
      <NoticeMedia notice={notice} onVotePoll={actions.onVotePoll} isModal={true} />

      <dl className="meta">
        <div>
          <dt>Posted</dt>
          <dd>{formatDate(date)}</dd>
        </div>
        {deadline && (
          <div>
            <dt>Deadline</dt>
            <dd>{formatDate(deadline)}</dd>
          </div>
        )}
        <div>
          <dt>Audience</dt>
          <dd>{audienceLabel}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{isRead ? "Read" : "Unread"}</dd>
        </div>
      </dl>

      <DeadlineTag deadline={deadline} />

      <div className="modal__actions">
        <button type="button" className="btn" onClick={() => actions.onToggleRead(id)}>
          {isRead ? "Mark as unread" : "Mark as read"}
        </button>
        {canPin && (
          <button type="button" className="btn" onClick={() => actions.onTogglePin(id)}>
            {pinned ? "Unpin" : "Pin to top"}
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => {
              actions.onDelete(id);
              onClose();
            }}
          >
            Delete
          </button>
        )}
      </div>
    </Modal>
  );
}
