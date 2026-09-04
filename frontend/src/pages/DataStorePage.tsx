import { useEffect, useMemo, useState } from "react";
import { Database, FileJson2, FileSearch, Hash, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { sutraApi } from "../api/client";
import { useCases, useDocuments, useIngestions } from "../api/queries";
import { ErrorState, LoadingState } from "../components/DataState";
import { errorMessage, formatDate, titleCase } from "../lib/format";
import type { EvidenceDocumentRecord } from "../types/api";

export function DataStorePage({ token }: { token: string }) {
  const cases = useCases(token);
  const [caseId, setCaseId] = useState("");
  const [ingestionId, setIngestionId] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selected, setSelected] = useState<EvidenceDocumentRecord>();
  const [detailError, setDetailError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const ingestions = useIngestions(token, caseId || undefined);
  const documents = useDocuments(token, { caseId: caseId || undefined, ingestionId: ingestionId || undefined, q: appliedSearch || undefined });

  useEffect(() => {
    if (ingestionId && !ingestions.data?.some((item) => item.id === ingestionId)) setIngestionId("");
  }, [ingestionId, ingestions.data]);

  const totals = useMemo(() => ({
    batches: ingestions.data?.length ?? 0,
    records: documents.data?.length ?? 0,
    rows: ingestions.data?.reduce((total, item) => total + item.row_count, 0) ?? 0,
    complete: ingestions.data?.filter((item) => item.status === "completed").length ?? 0,
  }), [documents.data?.length, ingestions.data]);

  async function inspect(documentId: string) {
    setDetailLoading(true);
    setDetailError("");
    try {
      setSelected(await sutraApi.getDocument(token, documentId));
    } catch (error) {
      setDetailError(errorMessage(error));
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="page-stack data-store-page">
      <section className="page-intro page-intro--split"><div><div className="eyebrow">Persistent data layer</div><h2>Inspect what the evidence pipeline stored.</h2><p>This is the database view: upload batches, cryptographic hashes, extracted records, processing metadata, and source text remain traceable.</p></div><div className="data-store-seal"><ShieldCheck size={18} /><span><strong>Audit-ready</strong>Authorised records only</span></div></section>
      <section className="data-store-metrics">
        <article><Database size={17} /><span><strong>{totals.batches}</strong>Upload batches</span></article>
        <article><FileJson2 size={17} /><span><strong>{totals.records}</strong>Visible records</span></article>
        <article><Hash size={17} /><span><strong>{totals.rows}</strong>Structured rows</span></article>
        <article><RefreshCw size={17} /><span><strong>{totals.complete}</strong>Completed</span></article>
      </section>
      <section className="panel data-store-toolbar">
        <label>Case<select className="input" value={caseId} onChange={(event) => { setCaseId(event.target.value); setIngestionId(""); setSelected(undefined); }}><option value="">All accessible data</option>{cases.data?.map((item) => <option key={item.id} value={item.id}>{item.case_number}</option>)}</select></label>
        <label>Upload batch<select className="input" value={ingestionId} onChange={(event) => { setIngestionId(event.target.value); setSelected(undefined); }}><option value="">All batches</option>{ingestions.data?.map((item) => <option key={item.id} value={item.id}>{item.filename} · {item.id.slice(0, 8)}</option>)}</select></label>
        <form onSubmit={(event) => { event.preventDefault(); setAppliedSearch(search.trim()); }}><label>Search records<span className="input-with-icon"><Search size={15} /><input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filename, evidence ID, or content" /></span></label><button className="button button--quiet" type="submit">Search</button></form>
      </section>
      <section className="data-store-layout">
        <article className="panel data-store-table"><div className="panel__header"><div><span className="panel__eyebrow">Stored documents</span><h3>Database records</h3></div><span className="panel__hint">{totals.records} visible</span></div>{documents.isLoading ? <LoadingState label="Reading database records..." /> : documents.isError ? <ErrorState error={documents.error} onRetry={() => void documents.refetch()} title="Data Store could not be read" /> : totals.records === 0 ? <div className="live-store-empty">No records match the selected filters. Upload evidence first or clear the search.</div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Evidence ID</th><th>Source record</th><th>Type</th><th>Stored</th><th /></tr></thead><tbody>{documents.data?.map((item) => <tr key={item.id} className={selected?.id === item.id ? "data-store-row--selected" : ""}><td><strong>{item.evidence_id}</strong><small className="table-subline">{item.id.slice(0, 12)}</small></td><td>{item.filename}</td><td>{titleCase(String(item.extraction_metadata?.record_kind ?? item.language ?? "document"))}</td><td>{formatDate(item.created_at, true)}</td><td><button className="icon-button" onClick={() => void inspect(item.id)} aria-label={`Inspect ${item.evidence_id}`}><FileSearch size={16} /></button></td></tr>)}</tbody></table></div>}</article>
        <aside className="panel data-store-inspector"><div className="panel__header"><div><span className="panel__eyebrow">Record inspector</span><h3>{selected?.evidence_id ?? "Select a record"}</h3></div><FileSearch size={18} /></div>{detailLoading ? <LoadingState label="Loading full source record..." /> : detailError ? <div className="inline-error">{detailError}</div> : selected ? <div className="data-store-inspector__body"><dl><div><dt>Filename</dt><dd>{selected.filename}</dd></div><div><dt>Ingestion</dt><dd>{selected.ingestion_id}</dd></div><div><dt>Language</dt><dd>{selected.language}</dd></div><div><dt>Created</dt><dd>{formatDate(selected.created_at, true)}</dd></div></dl><div><span>Extraction metadata</span><pre>{JSON.stringify(selected.extraction_metadata, null, 2)}</pre></div><div><span>Stored source content</span><pre>{selected.raw_text || selected.raw_preview || "No textual representation was extracted."}</pre></div></div> : <div className="experience-empty">Select a database record to inspect its full stored source representation and extraction metadata.</div>}</aside>
      </section>
    </div>
  );
}
