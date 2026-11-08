// Reusable pill. Pass `priority` for a colour-coded priority badge, or just `children` for a category tag.
export default function Badge({ priority, children }) {
  return priority ? (
    <span className={`badge badge--${priority.toLowerCase()}`}>{priority}</span>
  ) : (
    <span className="badge">{children}</span>
  );
}
