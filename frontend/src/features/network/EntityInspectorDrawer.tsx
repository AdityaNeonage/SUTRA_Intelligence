import {
  ArrowUpRight,
  ChevronRight,
  CircleHelp,
  Crosshair,
  Expand,
  FileText,
  Link2,
  MapPin,
  ShieldCheck,
  X,
} from "lucide-react";
import type { EvidenceRecord, MockNetworkEdge, MockNetworkNode } from "./networkTypes";
import { ENTITY_TYPE_LABELS, RELATIONSHIP_TYPE_LABELS } from "./networkTypes";
import { getConnectedEdges, getEvidenceCount, getNeighborNodes } from "./networkUtils";

interface EntityInspectorDrawerProps {
  node?: MockNetworkNode;
  selectedEdge?: MockNetworkEdge;
  nodes: readonly MockNetworkNode[];
  edges: readonly MockNetworkEdge[];
  canExpand: boolean;
  onClose: () => void;
  onCenter: (nodeId: string) => void;
  onExpand: () => void;
  onSelectNode: (nodeId: string) => void;
  onSelectEdge: (edgeId: string) => void;
  onNotice: (message: string) => void;
}

function formatTimestamp(value: string) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function uniqueEvidence(records: readonly EvidenceRecord[]) {
  const evidenceById = new Map<string, EvidenceRecord>();
  records.forEach((record) => {
    if (!evidenceById.has(record.id)) evidenceById.set(record.id, record);
  });
  return [...evidenceById.values()];
}

function EvidenceList({ evidence, onNotice }: { evidence: readonly EvidenceRecord[]; onNotice: (message: string) => void }) {
  if (evidence.length === 0) return <p className="network-drawer__empty-copy">No evidence metadata is attached to this synthetic item.</p>;
  return (
    <div className="network-evidence-list">
      {evidence.slice(0, 4).map((record) => (
        <article className="network-evidence" key={record.id}>
          <div className="network-evidence__head"><strong>{record.sourceLabel}</strong><span>{record.status}</span></div>
          <p>{record.summary}</p>
          <div className="network-evidence__meta">
            <span>{record.sourceReference}</span><span>{formatTimestamp(record.timestamp)}</span><span>{Math.round(record.confidence * 100)}%</span>
          </div>
          <button className="network-evidence-action" type="button" onClick={() => onNotice(`Evidence reference ${record.sourceReference} opened in mock review mode.`)}>
            <FileText size={12} /> Open source reference <ArrowUpRight size={11} />
          </button>
        </article>
      ))}
    </div>
  );
}

export function EntityInspectorDrawer({
  node,
  selectedEdge,
  nodes,
  edges,
  canExpand,
  onClose,
  onCenter,
  onExpand,
  onSelectNode,
  onSelectEdge,
  onNotice,
}: EntityInspectorDrawerProps) {
  if (!node) {
    return (
      <aside className="network-drawer network-drawer--empty" aria-label="Entity details">
        <div>
          <MapPin size={25} />
          <strong>Select an entity</strong>
          <p>Click a node to inspect synthetic evidence, related entities, and workspace actions. Selecting an edge opens its relationship context below.</p>
        </div>
      </aside>
    );
  }

  const incidentEdges = getConnectedEdges(node.id, edges);
  const neighbors = getNeighborNodes({ nodes: [...nodes], edges: [...edges] }, node.id);
  const evidence = uniqueEvidence([
    ...node.evidenceRecords,
    ...incidentEdges.flatMap((edge) => edge.evidenceRecords),
  ]);
  const selectedRelationship = selectedEdge && (selectedEdge.source === node.id || selectedEdge.target === node.id) ? selectedEdge : undefined;

  return (
    <aside className="network-drawer" aria-label={`${node.label} entity details`}>
      <div className="network-drawer__top">
        <div className="network-drawer__top-copy">
          <div className="network-drawer__kind"><ShieldCheck size={13} /> {ENTITY_TYPE_LABELS[node.entityType]}</div>
          <h3 title={node.label}>{node.label}</h3>
        </div>
        <button className="network-drawer__close" type="button" onClick={onClose} aria-label="Close entity details"><X size={16} /></button>
      </div>
      <div className="network-drawer__content">
        <div className="network-confidence"><span>Entity confidence</span><strong>{Math.round((node.confidence ?? 0) * 100)}%</strong></div>
        <p className="network-drawer__summary">{node.summary}</p>
        <dl className="network-drawer__facts">
          <div><dt>Entity ID</dt><dd>{node.id}</dd></div>
          <div><dt>First observed</dt><dd>{formatTimestamp(node.firstSeen)}</dd></div>
          <div><dt>Last observed</dt><dd>{formatTimestamp(node.lastSeen)}</dd></div>
          {Object.entries(node.details).slice(0, 3).map(([label, value]) => <div key={label}><dt>{label.replace(/_/g, " ")}</dt><dd>{value}</dd></div>)}
        </dl>
        {node.aliases.length > 0 && <div className="network-drawer__alias"><span>Aliases</span><p>{node.aliases.join(" · ")}</p></div>}
        <div className="network-drawer__actions">
          <button className="network-drawer__action" type="button" onClick={() => onCenter(node.id)}><Crosshair size={13} /> Center</button>
          <button className="network-drawer__action" type="button" onClick={onExpand} disabled={!canExpand}><Expand size={13} /> {canExpand ? "Expand" : "Expanded"}</button>
          <button className="network-drawer__action" type="button" onClick={() => onNotice(`${node.label} was queued for mock analyst review.`)}><CircleHelp size={13} /> Review</button>
          <button className="network-drawer__action" type="button" onClick={() => onNotice(`Copied ${node.id} to the mock workspace clipboard.`)}><Link2 size={13} /> Copy ID</button>
        </div>
        {selectedRelationship && (
          <section className="network-drawer__relationship">
            <div className="network-drawer__section-header"><strong>Selected relationship</strong><button type="button" onClick={() => onSelectEdge("")}>Clear</button></div>
            <button className="network-drawer__relationship-card" type="button" onClick={() => onSelectEdge(selectedRelationship.id)}>
              <span>{RELATIONSHIP_TYPE_LABELS[selectedRelationship.relationshipType]}</span><b>{Math.round((selectedRelationship.confidence ?? 0) * 100)}% confidence</b><em>{selectedRelationship.derivation}</em>
            </button>
          </section>
        )}
        <section>
          <div className="network-drawer__section-header"><strong>Direct connections</strong><span>{neighbors.length}</span></div>
          <div className="network-drawer__connections">
            {neighbors.slice(0, 5).map((neighbor) => {
              const relationship = incidentEdges.find((edge) => edge.source === neighbor.id || edge.target === neighbor.id);
              return (
                <button className="network-drawer__connection" type="button" key={neighbor.id} onClick={() => onSelectNode(neighbor.id)}>
                  <span><strong>{neighbor.label}</strong><span>{relationship ? RELATIONSHIP_TYPE_LABELS[relationship.relationshipType] : "Connected"}</span></span>
                  <em>{Math.round((neighbor.confidence ?? 0) * 100)}% <ChevronRight size={11} /></em>
                </button>
              );
            })}
          </div>
        </section>
        <section>
          <div className="network-drawer__section-header"><strong>Evidence first</strong><span>{getEvidenceCount({ evidenceRecords: evidence })} records</span></div>
          <EvidenceList evidence={evidence} onNotice={onNotice} />
        </section>
        <p className="network-drawer__notice">Synthetic demo data only. Analytical relationships are decision support and must be independently verified against source records.</p>
      </div>
    </aside>
  );
}
