// Reusable toggle button used by every filter row.
export default function FilterChip({ label, active, onClick }) {
  return (
    <button type="button" className={`chip${active ? " chip--on" : ""}`} aria-pressed={active} onClick={onClick}>
      {label}
    </button>
  );
}
