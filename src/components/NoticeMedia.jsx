import { useState } from "react";
import { createPortal } from "react-dom";

function openOriginalImage(event, dataUrl) {
  event.preventDefault();
  const imageWindow = window.open("about:blank", "_blank");
  if (!imageWindow) return;
  imageWindow.opener = null;

  fetch(dataUrl)
    .then((response) => response.blob())
    .then((blob) => {
      const imageUrl = URL.createObjectURL(blob);
      imageWindow.location.href = imageUrl;
      window.setTimeout(() => URL.revokeObjectURL(imageUrl), 60_000);
    })
    .catch(() => imageWindow.close());
}

export default function NoticeMedia({ notice, onVotePoll, isModal = false }) {
  const { photos, attachments, googleLinks, poll, id } = notice;
  const [voting, setVoting] = useState(false);
  const [activeImage, setActiveImage] = useState(null);

  const handleVote = async (optionIndex) => {
    if (!onVotePoll) return;
    setVoting(true);
    try {
      await onVotePoll(id, optionIndex);
    } finally {
      setVoting(false);
    }
  };

  const hasPhotos = Array.isArray(photos) && photos.length > 0;
  const hasFiles = Array.isArray(attachments) && attachments.length > 0;
  const hasLinks = Array.isArray(googleLinks) && googleLinks.length > 0;
  const hasPoll = poll && poll.question && Array.isArray(poll.options);

  if (!hasPhotos && !hasFiles && !hasLinks && !hasPoll) return null;

  return (
    <div className="notice-media-block">
      {/* Photos */}
      {hasPhotos && (
        <div className={`media-photos ${isModal ? "media-photos--modal" : ""}`}>
          {photos.map((src, i) => (
            <div key={i} className="photo-attachment">
              <a href={src} className="photo-card-link" aria-label={`View notice image ${i + 1}`} onClick={(event) => { event.preventDefault(); setActiveImage({ src, name: `notice-image-${i + 1}` }); }}>
                <img src={src} alt={`Notice attachment ${i + 1}`} className="media-photo" />
              </a>
              <a href={src} download={`notice-image-${i + 1}`} className="attachment-action" aria-label={`Download notice image ${i + 1}`}>
                Download
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Google Links */}
      {hasLinks && (
        <div className="google-links-container">
          {googleLinks.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="google-link-pill"
            >
              <span className="google-icon">📑</span>
              <span className="google-link-title">{link.title}</span>
              <span className="google-arrow">↗</span>
            </a>
          ))}
        </div>
      )}

      {/* File Attachments */}
      {hasFiles && (
        <div className="attachments-list">
          {attachments.map((file, i) => (
            <div key={i} className="attachment-download-chip">
              <span aria-hidden="true">File</span>
              <span className="att-name">{file.name}</span>
              {file.size > 0 && <span className="att-size">({Math.round(file.size / 1024)} KB)</span>}
              <a href={file.dataUrl} target="_blank" rel="noopener noreferrer" className="attachment-action" aria-label={`Open ${file.name}`}>
                Open
              </a>
              <a href={file.dataUrl} download={file.name} className="attachment-action" aria-label={`Download ${file.name}`}>
                Download
              </a>
            </div>
          ))}
        </div>
      )}

      {activeImage && createPortal(
        <div className="image-preview-backdrop" role="presentation" onClick={() => setActiveImage(null)}>
          <div className="image-preview-dialog" role="dialog" aria-modal="true" aria-label="Notice image preview" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="image-preview-close" onClick={() => setActiveImage(null)} aria-label="Close image preview">Close</button>
            <img src={activeImage.src} alt="Notice attachment preview" className="image-preview-full" />
            <div className="image-preview-actions">
              <a href={activeImage.src} target="_blank" rel="noopener noreferrer" className="attachment-action" onClick={(event) => openOriginalImage(event, activeImage.src)}>Open original</a>
              <a href={activeImage.src} download={activeImage.name} className="attachment-action">Download</a>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Interactive Poll */}
      {hasPoll && (
        <div className="poll-box">
          <div className="poll-head">
            <span className="poll-badge">📊 Poll</span>
            <span className="poll-question">{poll.question}</span>
            <span className="poll-total-votes">{poll.totalVotes} vote{poll.totalVotes === 1 ? "" : "s"}</span>
          </div>

          <div className="poll-options">
            {poll.options.map((opt) => {
              const isSelected = poll.userVotedIndex === opt.index;
              const hasVoted = poll.userVotedIndex !== -1;

              return (
                <div
                  key={opt.index}
                  className={`poll-option ${isSelected ? "poll-option--selected" : ""}`}
                >
                  <div
                    className="poll-option__bar"
                    style={{ width: `${opt.percentage}%` }}
                  />
                  <div className="poll-option__content">
                    <span className="poll-option__text">
                      {isSelected && "✓ "}
                      {opt.text}
                    </span>
                    <span className="poll-option__meta">
                      {hasVoted ? `${opt.percentage}% (${opt.votesCount})` : ""}
                    </span>
                  </div>
                  {onVotePoll && (
                    <button
                      type="button"
                      className={`btn btn--sm poll-vote-btn ${isSelected ? "btn--primary" : ""}`}
                      disabled={voting}
                      onClick={() => handleVote(opt.index)}
                    >
                      {isSelected ? "Voted" : "Vote"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
