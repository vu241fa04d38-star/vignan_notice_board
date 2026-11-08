export default function EmptyState({ onClear }) {
  return (
    <div className="empty">
      <div className="empty__icon" aria-hidden="true">🎉</div>
      <h3>No notices match these filters</h3>
      <p>Clear the filters to see every notice again.</p>
      <button type="button" className="btn btn--primary" onClick={onClear}>Clear filters</button>
    </div>
  );
}
