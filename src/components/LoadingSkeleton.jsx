export default function LoadingSkeleton() {
  return (
    <div className="grid" aria-busy="true" aria-label="Loading notices">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="card skeleton-card">
          <div className="card__top">
            <div className="skeleton skeleton--badge" />
            <div className="skeleton skeleton--badge" />
          </div>
          <div className="skeleton skeleton--title" />
          <div className="skeleton skeleton--line" />
          <div className="skeleton skeleton--line skeleton--line-short" />
          <div className="skeleton skeleton--tag" />
          <div className="card__foot" style={{ marginTop: "12px" }}>
            <div className="skeleton skeleton--date" />
            <div className="skeleton skeleton--btn" />
          </div>
        </div>
      ))}
    </div>
  );
}
