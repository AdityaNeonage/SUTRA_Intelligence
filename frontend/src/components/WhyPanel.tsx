import { Braces, FileText, Gauge, Link2, ShieldCheck } from "lucide-react";
import type { GraphEdge, GraphNode } from "../types/api";
import { formatPercent, titleCase } from "../lib/format";
import { EvidenceBadge } from "./StatusPill";

export function WhyPanel({ edge, source, target }: { edge?: GraphEdge; source?: GraphNode; target?: GraphNode }) {
  if (!edge) {
    return (
      <aside className="why-panel why-panel--empty">
        <div className="why-panel__eyebrow"><ShieldCheck size={15} /> Explainability</div>
        <h3>Select a relationship</h3>
        <p>Choose a link in the network to inspect its evidence status, confidence, provenance, and derivation.</p>
      </aside>
    );
  }

  return (
    <aside className="why-panel">
      <div className="why-panel__eyebrow"><ShieldCheck size={15} /> WHY THIS CONNECTION</div>
      <div className="why-panel__relationship">
        <span>{source?.label ?? edge.source}</span><Link2 size={15} /><span>{target?.label ?? edge.target}</span>
      </div>
      <h3>{titleCase(edge.label)}</h3>
      <EvidenceBadge status={edge.evidenceStatus} />
      <dl className="why-panel__facts">
        <div><dt><Gauge size={14} /> Relationship confidence</dt><dd>{formatPercent(edge.confidence)}</dd></div>
        {edge.caseId && <div><dt><FileText size={14} /> Case reference</dt><dd>{edge.caseId}</dd></div>}
        {edge.derivation && <div><dt><Braces size={14} /> Derivation</dt><dd>{edge.derivation}</dd></div>}
      </dl>
      <div className="why-panel__sources">
        <strong>Supporting records</strong>
        {edge.evidence && edge.evidence.length > 0 ? (
          <ul>{edge.evidence.map((record) => <li key={record}>{record}</li>)}</ul>
        ) : <p>No source-record identifiers were returned for this relationship.</p>}
      </div>
      <p className="why-panel__notice">Analytical findings are decision support. Verify inferred and hypothesis relationships against their originating records.</p>
    </aside>
  );
}
