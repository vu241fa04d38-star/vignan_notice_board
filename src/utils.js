export const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };

const pad = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// ISO date string for "today + days" (use a negative number for the past).
export const offsetDate = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toISO(d);
};

export const todayISO = () => toISO(new Date());

export const formatDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

// Whole days from today until the deadline (negative when it has passed).
export const daysUntil = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(y, m - 1, d) - today) / 86400000);
};

// Label and tone for the deadline tag. Returns null when a notice has no deadline.
export function deadlineInfo(iso) {
  if (!iso) return null;
  const n = daysUntil(iso);
  if (n < 0) return { label: `Overdue by ${-n} day${n === -1 ? "" : "s"}`, tone: "overdue" };
  if (n === 0) return { label: "Due today", tone: "soon" };
  if (n === 1) return { label: "Due tomorrow", tone: "soon" };
  return { label: `Due in ${n} days`, tone: n <= 3 ? "soon" : "ok" };
}

export const readStorage = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const writeStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the app still works, just without saving */
  }
};

export function filterNotices(notices, { category, priority, status, importantOnly, query }) {
  const q = query.trim().toLowerCase();
  return notices.filter((n) => {
    if (category !== "All" && n.category !== category) return false;
    if (priority !== "All" && n.priority !== priority) return false;
    if (status === "Unread" && n.isRead) return false;
    if (status === "Read" && !n.isRead) return false;
    if (importantOnly && !(n.priority === "High" && !n.isRead)) return false;
    if (q && !`${n.title} ${n.description}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

// Pinned notices always come first, then the chosen sort order.
export function sortNotices(list, sortBy) {
  const byChoice = {
    newest: (a, b) => b.date.localeCompare(a.date),
    oldest: (a, b) => a.date.localeCompare(b.date),
    priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.date.localeCompare(a.date),
  }[sortBy];
  return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || byChoice(a, b));
}
