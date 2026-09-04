import { useMemo, useState } from "react";
import { BrainCircuit, Plus, Scale, ShieldCheck } from "lucide-react";
import { hypothesisColumns, hypothesisRows } from "../features/demo/mockData";
import type { HypothesisRow, HypothesisVerdict } from "../features/demo/types";

const verdictLabel: Record<HypothesisVerdict, string> = { supports: "Supports", contradicts: "Contradicts", unknown: "Unknown" };

export function HypothesisWorkbenchPage() {
  const [showNewEvidence, setShowNewEvidence] = useState(false);
  const [selected, setSelected] = useState<{ row: HypothesisRow; hypothesisId: string }>();
  const rows = useMemo(() => showNewEvidence ? [...hypothesisRows, {
    id: "HR-04",
    evidenceId: "E-CHAT-104",
    reference: "CHAT-104-01",
    evidence: "A synthetic chat message mentions Rahul, Park Street, and 12 August; extraction requires review.",
    cells: {
      H1: { verdict: "unknown" as const, rationale: "The extracted text is contextual and does not establish a coordinated pattern." },
      H2: { verdict: "supports" as const, rationale: "The mention may justify checking whether a shared place or person is an intermediary, subject to corroboration." },
      H3: { verdict: "unknown" as const, rationale: "The message alone cannot distinguish meaningful overlap from ordinary coincidence." },
    },
  }] : hypothesisRows, [showNewEvidence]);
  const selectedCell = selected ? selected.row.cells[selected.hypothesisId] : undefined;
  const selectedColumn = selected ? hypothesisColumns.find((item) => item.id === selected.hypothesisId) : undefined;

  return (
    <div className="experience-page page-stack">
      <section className="experience-page-header"><div><span className="eyebrow">Hypothesis Workbench</span><h2>Compare competing explanations against the same evidence.</h2><p>Each cell is a review aid, not a system conclusion. The display separates what supports, contradicts, or remains unknown for every competing explanation.</p></div><button className="button button--primary" onClick={() => setShowNewEvidence(true)} disabled={showNewEvidence}><Plus size={16} /> {showNewEvidence ? "Evidence added" : "Add mock evidence"}</button></section>
      <section className="hypothesis-intro"><ShieldCheck size={18} /><p>No hypothesis expresses guilt, identity, or certainty. Open each rationale and inspect its linked record before acting.</p></section>
      <section className="hypothesis-layout">
        <article className="panel hypothesis-table-panel"><div className="panel__header"><div><span className="panel__eyebrow">Structured reasoning</span><h3>Evidence x competing explanations</h3></div><Scale size={18} /></div><div className="hypothesis-table-wrap"><table className="hypothesis-table"><thead><tr><th>Evidence reference</th>{hypothesisColumns.map((column) => <th key={column.id}><span>{column.shortLabel}</span><strong>{column.title}</strong><small>{column.qualifier}</small></th>)}</tr></thead><tbody>{rows.map((row) => <tr className={row.id === "HR-04" ? "hypothesis-row--new" : ""} key={row.id}><td><strong>{row.reference}</strong><span>{row.evidence}</span></td>{hypothesisColumns.map((column) => { const cell = row.cells[column.id]; return <td key={column.id}><button className={`hypothesis-cell hypothesis-cell--${cell.verdict}`} onClick={() => setSelected({ row, hypothesisId: column.id })}><i /><span>{verdictLabel[cell.verdict]}</span></button></td>; })}</tr>)}</tbody></table></div></article>
        <aside className="panel hypothesis-rationale"><div className="panel__header"><div><span className="panel__eyebrow">Cell rationale</span><h3>{selected ? `${selected.row.reference} x ${selectedColumn?.shortLabel}` : "Select a cell"}</h3></div><BrainCircuit size={18} /></div>{selected && selectedCell && selectedColumn ? <div className="hypothesis-rationale__body"><span className={`evidence-state evidence-state--${selectedCell.verdict === "supports" ? "verified" : selectedCell.verdict === "contradicts" ? "hypothesis" : "inferred"}`}>{verdictLabel[selectedCell.verdict]}</span><h4>{selectedColumn.title}</h4><p>{selectedCell.rationale}</p><dl><div><dt>Evidence reference</dt><dd>{selected.row.reference}</dd></div><div><dt>Evidence status</dt><dd>Review in Evidence workspace</dd></div></dl><p className="hypothesis-rationale__notice">This is an explainable comparison of limited synthetic records, not a prediction or determination.</p></div> : <div className="experience-empty">Choose a green, red, or neutral cell to read the scoped rationale behind that comparison.</div>}</aside>
      </section>
    </div>
  );
}
