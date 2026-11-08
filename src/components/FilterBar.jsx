import { useState } from "react";
import FilterChip from "./FilterChip.jsx";
import { CATEGORIES, PRIORITIES } from "../data/notices.js";

const MAIN_CATEGORIES = ["All", "Exams", "Academics", "Events"];
const MORE_CATEGORIES = CATEGORIES.filter((category) => !MAIN_CATEGORIES.includes(category));

export default function FilterBar({ filters, setFilters, onClear, onMarkAll }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const set = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }));
  const hasActiveFilters = Boolean(
    filters.query.trim() || filters.importantOnly || filters.category !== "All" ||
    filters.priority !== "All" || filters.status !== "All"
  );
  const activeFilterCount = [
    Boolean(filters.query.trim()), filters.importantOnly, filters.category !== "All",
    filters.priority !== "All", filters.status !== "All",
  ].filter(Boolean).length;

  const clearFilters = () => {
    onClear();
  };

  return (
    <section className="panel filter-panel" aria-label="Notice search and filters">
      <div className="filter-toolbar">
        <input
          type="search"
          placeholder="Search notices"
          value={filters.query}
          onChange={(e) => set("query")(e.target.value)}
          aria-label="Search notices"
        />
        <select value={filters.sortBy} onChange={(e) => set("sortBy")(e.target.value)} aria-label="Sort notices">
          <option value="priority">Sort by priority</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <button
          type="button"
          className={`btn important-toggle${filters.importantOnly ? " btn--primary" : ""}`}
          aria-pressed={filters.importantOnly}
          onClick={() => set("importantOnly")(!filters.importantOnly)}
        >
          Important only
        </button>
        <button
          type="button"
          className={`btn filters-toggle${filtersOpen ? " filters-toggle--open" : ""}`}
          aria-expanded={filtersOpen}
          aria-controls="notice-filter-options"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <svg className="filter-icon" aria-hidden="true" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M5.5 10h9M8 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Filters
          {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
        </button>
      </div>

      <div className="category-toolbar" aria-label="Filter by category">
        <span className="row__label">Category</span>
        <div className="category-chips">
          {MAIN_CATEGORIES.map((category) => (
            <FilterChip key={category} label={category} active={filters.category === category} onClick={() => set("category")(category)} />
          ))}
          <select
            className="more-category-select"
            value={MORE_CATEGORIES.includes(filters.category) ? filters.category : ""}
            onChange={(event) => event.target.value && set("category")(event.target.value)}
            aria-label="More categories"
          >
            <option value="">More</option>
            {MORE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
      </div>

      {filtersOpen && (
        <div className="filter-options" id="notice-filter-options">
          <div className="filter-option-group">
            <span className="row__label">Priority</span>
            <div className="chips">
              {["All", ...PRIORITIES].map((priority) => (
                <FilterChip key={priority} label={priority} active={filters.priority === priority} onClick={() => set("priority")(priority)} />
              ))}
            </div>
          </div>
          <div className="filter-option-group">
            <span className="row__label">Status</span>
            <div className="chips">
              {["All", "Unread", "Read"].map((status) => (
                <FilterChip key={status} label={status} active={filters.status === status} onClick={() => set("status")(status)} />
              ))}
            </div>
          </div>
          <div className="filter-panel-actions">
            {hasActiveFilters && <button type="button" className="link-btn" onClick={clearFilters}>Clear filters</button>}
            <button type="button" className="btn btn--sm btn--primary" onClick={() => setFiltersOpen(false)}>Apply</button>
          </div>
        </div>
      )}

      <div className="filter-secondary-actions">
        <button type="button" className="link-btn" onClick={onMarkAll}>Mark all as read</button>
      </div>
    </section>
  );
}
