import Badge from "./Badge.jsx";
import DeadlineTag from "./DeadlineTag.jsx";
import NoticeMedia from "./NoticeMedia.jsx";
import { formatDate } from "../utils.js";

export default function NoticeCard({ notice, actions, currentUser }) {
  const {
    id,
    title,
    description,
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

  // Audience tag text
  let audienceLabel = "🌐 College-Wide";
  if (audience?.scope === "department") {
    audienceLabel = `🏢 Dept: ${audience.department}`;
  } else if (audience?.scope === "year") {
    audienceLabel = `📅 ${audience.department} • ${audience.year}`;
  } else if (audience?.scope === "section") {
    audienceLabel = `🎯 ${audience.department} • ${audience.year} • Sec ${audience.section}`;
  }

  return (
    <article
      className={`card card--${priority.toLowerCase()} ${
        isRead ? "card--read" : "card--unread"
      }${pinned ? " card--pinned" : ""}`}
    >
      <div className="card__top">
        {pinned && <span className="pin-flag">📌 Pinned</span>}
        <Badge priority={priority} />
        <Badge>{category}</Badge>
        <span className="target-pill">{audienceLabel}</span>
        {!isRead && <span className="dot" role="img" aria-label="Unread" />}
      </div>

      <h3>
        <button type="button" className="card__title" onClick={() => actions.onOpen(id)}>
          {title}
        </button>
      </h3>

      <p>{description}</p>

      {/* Author attribution */}
      {createdBy?.name && (
        <div className="notice-author-line">
          <span>By: {createdBy.name}</span>
          <span className="author-role-tag">{createdBy.adminType}</span>
        </div>
      )}

      {/* Photos, Files, Google Links, Polls */}
      <NoticeMedia notice={notice} onVotePoll={actions.onVotePoll} />

      <DeadlineTag deadline={deadline} />

      <div className="card__foot">
        <time dateTime={date}>{formatDate(date)}</time>
        <div className="card__actions">
          <button type="button" className="btn btn--sm" onClick={() => actions.onToggleRead(id)}>
            {isRead ? "Mark unread" : "Mark read"}
          </button>
          {canPin && (
            <button
              type="button"
              className={`icon-btn${pinned ? " icon-btn--on" : ""}`}
              aria-pressed={pinned}
              aria-label={pinned ? "Unpin notice" : "Pin notice to top"}
              title={pinned ? "Unpin" : "Pin to top"}
              onClick={() => actions.onTogglePin(id)}
            >
              📌
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              className="icon-btn icon-btn--danger"
              aria-label="Delete notice"
              title="Delete"
              onClick={() => actions.onDelete(id)}
            >
              🗑
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
