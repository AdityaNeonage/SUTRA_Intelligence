import { Filter, Search, SlidersHorizontal, X } from "lucide-react";
import {
  ENTITY_TYPES,
  ENTITY_TYPE_LABELS,
  RELATIONSHIP_TYPES,
  RELATIONSHIP_TYPE_LABELS,
  type NetworkEntityType,
  type NetworkRelationshipType,
} from "./networkTypes";

interface NetworkControlsProps {
  query: string;
  filtersOpen: boolean;
  entityTypes: readonly NetworkEntityType[];
  relationshipTypes: readonly NetworkRelationshipType[];
  onQueryChange: (value: string) => void;
  onRunSearch: () => void;
  onToggleFilters: () => void;
  onToggleEntityType: (entityType: NetworkEntityType) => void;
  onToggleRelationshipType: (relationshipType: NetworkRelationshipType) => void;
  onResetFilters: () => void;
}

function toggleArrayItem<T>(current: readonly T[], item: T) {
  return current.includes(item) ? current.filter((value) => value !== item) : [...current, item];
}

export function NetworkControls({
  query,
  filtersOpen,
  entityTypes,
  relationshipTypes,
  onQueryChange,
  onRunSearch,
  onToggleFilters,
  onToggleEntityType,
  onToggleRelationshipType,
  onResetFilters,
}: NetworkControlsProps) {
  const activeFilterCount = entityTypes.length + relationshipTypes.length;
  return (
    <>
      <section className="network-toolbar" aria-label="Network controls">
        <label className="network-toolbar__search">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onRunSearch();
              }
            }}
            placeholder="Search entities, aliases, identifiers, or evidence"
            aria-label="Search the visible network"
          />
          {query && (
            <button className="network-toolbar__clear" type="button" onClick={() => onQueryChange("")} aria-label="Clear network search">
              <X size={15} />
            </button>
          )}
        </label>
        <button
          className={`network-toolbar__button${filtersOpen || activeFilterCount > 0 ? " network-toolbar__button--active" : ""}`}
          type="button"
          onClick={onToggleFilters}
          aria-expanded={filtersOpen}
        >
          <Filter size={15} /> <span>Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}</span>
        </button>
        <button className="network-toolbar__button" type="button" onClick={onResetFilters} title="Clear all active network filters">
          <SlidersHorizontal size={15} /> <span>Clear</span>
        </button>
      </section>
      {filtersOpen && (
        <section className="network-filter-drawer" aria-label="Network filter controls">
          <div>
            <div className="network-filter-drawer__header">
              <strong>Entity types</strong><span>{entityTypes.length || "All"} selected</span>
            </div>
            <div className="network-filter-group">
              {ENTITY_TYPES.map((entityType) => {
                const active = entityTypes.includes(entityType);
                return (
                  <button
                    key={entityType}
                    className={`network-filter-chip${active ? " network-filter-chip--active" : ""}`}
                    type="button"
                    onClick={() => onToggleEntityType(entityType)}
                    aria-pressed={active}
                  >
                    {ENTITY_TYPE_LABELS[entityType]}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="network-filter-drawer__header">
              <strong>Relationship types</strong><span>{relationshipTypes.length || "All"} selected</span>
            </div>
            <div className="network-filter-group">
              {RELATIONSHIP_TYPES.map((relationshipType) => {
                const active = relationshipTypes.includes(relationshipType);
                return (
                  <button
                    key={relationshipType}
                    className={`network-filter-chip network-filter-chip--relationship${active ? " network-filter-chip--active" : ""}`}
                    type="button"
                    onClick={() => onToggleRelationshipType(relationshipType)}
                    aria-pressed={active}
                  >
                    {RELATIONSHIP_TYPE_LABELS[relationshipType]}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

export { toggleArrayItem };
