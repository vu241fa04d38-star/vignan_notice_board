import { deadlineInfo } from "../utils.js";

// Conditional rendering: nothing is shown when the notice has no deadline.
export default function DeadlineTag({ deadline }) {
  const info = deadlineInfo(deadline);
  if (!info) return null;
  return <span className={`deadline deadline--${info.tone}`}>⏰ {info.label}</span>;
}
