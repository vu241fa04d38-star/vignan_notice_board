export default function StatsBar({ total, unread, urgent }) {
  return (
    <section className="stats" aria-label="Summary">
      <div className="stat"><b>{total}</b><span>Total notices</span></div>
      <div className="stat"><b>{unread}</b><span>Unread</span></div>
      <div className="stat stat--urgent"><b>{urgent}</b><span>Urgent unread</span></div>
    </section>
  );
}
