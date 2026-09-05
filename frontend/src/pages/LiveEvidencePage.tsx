import { useState } from "react";
import { useCases, useIngestions } from "../api/queries";
import { ErrorState, LoadingState } from "../components/DataState";
import { EvidenceIntake } from "../components/EvidenceIntake";
import { formatDate } from "../lib/format";

export function LiveEvidencePage({ token, initialCaseId, onOpenDataStore, onOpenNetwork }: {
  token: string; initialCaseId?: string; onOpenDataStore: (caseId?: string, ingestionId?: string) => void; onOpenNetwork: (caseId?: string) => void;
}) {
  const cases = useCases(token);
  const [chosenCase, setChosenCase] = useState(initialCaseId ?? "");
  const [busy, setBusy] = useState(false);
  const caseId = chosenCase || cases.data?.[0]?.id || "";
  const batches = useIngestions(token, caseId);
  if (cases.isLoading) return <LoadingState label="Loading authorised cases…" />;
  if (cases.isError) return <ErrorState error={cases.error} onRetry={() => void cases.refetch()} />;
  return <div className="page-stack">
    <section className="page-intro page-intro--split"><div><span className="eyebrow">Real backend</span><h2>Evidence belongs with its case.</h2><p>Choose the investigation, then process each file with its source and upload receipt.</p></div><label className="field-label">Case<select className="input" value={caseId} disabled={busy} onChange={e => setChosenCase(e.target.value)}>{cases.data?.map(item => <option key={item.id} value={item.id}>{item.case_number} — {item.title}</option>)}</select></label></section>
    {caseId ? <EvidenceIntake key={caseId} token={token} caseId={caseId} onBusyChange={setBusy} onOpenStore={id => onOpenDataStore(caseId, id)} /> : <p className="notice-card">No authorised cases available. Open Live Cases or initialise the synthetic dataset as an administrator.</p>}
    <section className="panel"><div className="panel__header"><h3>Case upload receipts</h3><button className="button button--quiet" disabled={!caseId} onClick={() => onOpenNetwork(caseId)}>Open network</button></div>{batches.isError ? <ErrorState error={batches.error} onRetry={() => void batches.refetch()} /> : <div className="intake-body">{batches.data?.map(item => <button className="receipt-row" key={item.id} onClick={() => onOpenDataStore(caseId, item.id)}><strong>{item.filename}</strong><span>{item.status} / {item.row_count} rows / {formatDate(item.created_at, true)}</span></button>)}{!batches.data?.length && <p>No uploads for this case yet.</p>}</div>}</section>
  </div>;
}
