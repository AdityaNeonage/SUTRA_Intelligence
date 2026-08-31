import { CalendarClock, ExternalLink, FileText, LocateFixed, ScanSearch, ShieldCheck } from "lucide-react";
import { formatDate, formatPercent, titleCase } from "../../lib/format";
import type { DemoActivity, EvidenceReference } from "./types";

export function EvidenceReferenceCard({
  item,
  onInspect,
  compact = false,
}: {
  item: EvidenceReference;
  onInspect?: (item: EvidenceReference) => void;
  compact?: boolean;
}) {
  return (
    <article className={`evidence-reference${compact ? " evidence-reference--compact" : ""}`}>
      <div className="evidence-reference__head">
        <div><span className="eyebrow">{titleCase(item.kind)}</span><h3>{item.title}</h3></div>
        <span className={`evidence-state evidence-state--${item.status.toLowerCase()}`}>{titleCase(item.status)}</span>
      </div>
      {!compact && <p>{item.excerpt}</p>}
      <dl className="evidence-reference__meta">
        <div><dt><FileText size={13} /> Document ref</dt><dd>{item.documentRef}</dd></div>
        <div><dt><ShieldCheck size={13} /> Source / confidence</dt><dd>{item.source} · {formatPercent(item.confidence)}</dd></div>
        <div><dt><CalendarClock size={13} /> Timestamp</dt><dd>{formatDate(item.timestamp, true)}</dd></div>
      </dl>
      {onInspect && <button className="text-button" onClick={() => onInspect(item)}>Inspect source context <ExternalLink size={14} /></button>}
    </article>
  );
}

export function EvidenceList({ items, onInspect }: { items: EvidenceReference[]; onInspect?: (item: EvidenceReference) => void }) {
  if (items.length === 0) return <div className="experience-empty">No synthetic evidence matches the current context.</div>;
  return <div className="evidence-list">{items.map((item) => <EvidenceReferenceCard item={item} key={item.id} onInspect={onInspect} />)}</div>;
}

const categoryIcon = {
  NETWORK: LocateFixed,
  EVIDENCE: FileText,
  CASE: ScanSearch,
  ANALYSIS: ShieldCheck,
};

export function TimelineFeed({
  items,
  selectedActivityId,
  onSelect,
  onHighlight,
  onOpenEvidence,
}: {
  items: DemoActivity[];
  selectedActivityId?: string;
  onSelect?: (item: DemoActivity) => void;
  onHighlight?: (item: DemoActivity) => void;
  onOpenEvidence?: (item: DemoActivity) => void;
}) {
  if (items.length === 0) return <div className="experience-empty">No activity has been recorded for this local case context.</div>;
  return (
    <ol className="experience-timeline">
      {items.map((item) => {
        const Icon = categoryIcon[item.category];
        return (
          <li className={selectedActivityId === item.id ? "experience-timeline__item experience-timeline__item--selected" : "experience-timeline__item"} key={item.id}>
            <button className="experience-timeline__main" onClick={() => onSelect?.(item)}>
              <span className="experience-timeline__icon"><Icon size={15} /></span>
              <span><strong>{item.title}</strong><small>{formatDate(item.timestamp, true)} · {titleCase(item.category)}</small><em>{item.description}</em></span>
            </button>
            <div className="experience-timeline__actions">
              {item.entityIds.length > 0 && <button className="icon-button" title="Highlight related entities in Network Explorer" onClick={() => onHighlight?.(item)}><LocateFixed size={15} /></button>}
              {item.evidenceId && <button className="icon-button" title="Open supporting evidence" onClick={() => onOpenEvidence?.(item)}><FileText size={15} /></button>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
