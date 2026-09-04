import { useEffect, useRef, useState, type DragEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Database, FileText, LoaderCircle, Network, UploadCloud, X } from "lucide-react";
import { sutraApi } from "../api/client";
import { sutraQueryKeys, useCases, useIngestions } from "../api/queries";
import { ErrorState, LoadingState } from "../components/DataState";
import { errorMessage, formatDate } from "../lib/format";
import type { EvidenceUploadResponse } from "../types/api";

const ACCEPTED_FILES = ".csv,.json,.txt,.md,.pdf,.docx,.xlsx";

export function LiveEvidencePage({ token, onOpenDataStore, onOpenNetwork }: { token: string; onOpenDataStore: () => void; onOpenNetwork: (caseId?: string) => void }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const cases = useCases(token);
  const [caseId, setCaseId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [activeFile, setActiveFile] = useState("");
  const [results, setResults] = useState<EvidenceUploadResponse[]>([]);
  const ingestions = useIngestions(token, caseId || undefined);

  useEffect(() => {
    if (!caseId && cases.data?.[0]?.id) setCaseId(cases.data[0].id);
  }, [caseId, cases.data]);

  const upload = useMutation({
    mutationFn: async (selected: File[]) => {
      const completed: EvidenceUploadResponse[] = [];
      for (const file of selected) {
        setActiveFile(file.name);
        completed.push(await sutraApi.uploadEvidence(token, file, caseId || undefined));
      }
      return completed;
    },
    onSuccess: async (completed) => {
      setResults(completed);
      setFiles([]);
      setActiveFile("");
      if (inputRef.current) inputRef.current.value = "";
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ingestions"] }),
        queryClient.invalidateQueries({ queryKey: ["documents"] }),
        queryClient.invalidateQueries({ queryKey: ["graph"] }),
      ]);
    },
    onError: () => setActiveFile(""),
  });

  function addFiles(incoming: FileList | File[]) {
    const next = Array.from(incoming);
    setFiles((current) => [...current, ...next.filter((file) => !current.some((item) => item.name === file.name && item.size === file.size))]);
    setResults([]);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  if (cases.isLoading) return <LoadingState label="Preparing the evidence pipeline..." />;
  if (cases.isError) return <ErrorState error={cases.error} onRetry={() => void cases.refetch()} title="Cases could not be loaded" />;

  return (
    <div className="page-stack live-evidence-page">
      <section className="page-intro page-intro--split">
        <div><div className="eyebrow">Evidence ingestion</div><h2>Upload evidence into the live intelligence pipeline.</h2><p>Original bytes are retained in the evidence vault. Parsed records, entities, relationships, provenance, and hashes are committed to the configured database.</p></div>
        <label className="field-label live-evidence-case" htmlFor="evidence-case">Case context<select id="evidence-case" className="input" value={caseId} onChange={(event) => setCaseId(event.target.value)}><option value="">Unassigned evidence</option>{cases.data?.map((item) => <option key={item.id} value={item.id}>{item.case_number} - {item.title}</option>)}</select></label>
      </section>

      <section className="panel live-upload-card">
        <input ref={inputRef} className="visually-hidden" type="file" multiple accept={ACCEPTED_FILES} onChange={(event) => event.target.files && addFiles(event.target.files)} />
        <button type="button" className={`live-upload-dropzone${dragging ? " live-upload-dropzone--active" : ""}`} onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}>
          <span className="live-upload-dropzone__icon"><UploadCloud size={29} /></span>
          <strong>{dragging ? "Drop files to add them" : "Drag evidence here or browse your device"}</strong>
          <small>CSV · JSON · TXT · MD · PDF · DOCX · XLSX · maximum 25 MB each</small>
        </button>
        <div className="live-upload-samples"><FileText size={15} /><span>Designed for your samples:</span><strong>accounts.csv</strong><strong>transactions.csv</strong><strong>case_study.md</strong></div>
        {files.length > 0 && <div className="live-upload-queue">{files.map((file) => <div key={`${file.name}-${file.size}`}><FileText size={15} /><span><strong>{file.name}</strong><small>{(file.size / 1024).toFixed(1)} KB</small></span><button type="button" aria-label={`Remove ${file.name}`} disabled={upload.isPending} onClick={() => setFiles((current) => current.filter((item) => item !== file))}><X size={15} /></button></div>)}</div>}
        <div className="live-upload-actions">
          <p>{upload.isPending ? <><LoaderCircle className="spin" size={15} /> Processing {activeFile}…</> : "Each upload receives a SHA-256 hash and an auditable ingestion ID."}</p>
          <button className="button button--primary" type="button" disabled={files.length === 0 || upload.isPending} onClick={() => upload.mutate(files)}><UploadCloud size={16} /> {upload.isPending ? "Processing…" : `Upload ${files.length || ""} file${files.length === 1 ? "" : "s"}`}</button>
        </div>
        {upload.isError && <div className="inline-error" role="alert">{errorMessage(upload.error)}</div>}
        {results.length > 0 && <div className="live-upload-success"><CheckCircle2 size={18} /><div><strong>{results.length} file{results.length === 1 ? "" : "s"} stored successfully</strong><p>{results.reduce((total, item) => total + item.entity_ids.length, 0)} entities and {results.reduce((total, item) => total + item.relationship_ids.length, 0)} relationships are available for review.</p></div><button className="button button--quiet" onClick={() => onOpenNetwork(caseId || undefined)}><Network size={15} /> View graph</button></div>}
      </section>

      <section className="panel live-recent-uploads">
        <div className="panel__header"><div><span className="panel__eyebrow">Database receipt</span><h3>Recent evidence batches</h3></div><button className="button button--quiet" onClick={onOpenDataStore}><Database size={15} /> Open Data Store</button></div>
        {ingestions.isLoading ? <LoadingState label="Reading stored batches..." /> : ingestions.isError ? <ErrorState error={ingestions.error} onRetry={() => void ingestions.refetch()} title="Stored batches could not be read" /> : (ingestions.data?.length ?? 0) === 0 ? <p className="live-store-empty">No uploads have been stored for this context yet.</p> : <div className="table-wrap"><table className="data-table"><thead><tr><th>File</th><th>Status</th><th>Rows</th><th>Records</th><th>Stored</th></tr></thead><tbody>{ingestions.data?.slice(0, 8).map((item) => <tr key={item.id}><td><strong>{item.filename}</strong><small className="table-subline">{item.file_hash.slice(0, 12)}…</small></td><td><span className={`store-status store-status--${item.status}`}>{item.status}</span></td><td>{item.row_count}</td><td>{item.document_count}</td><td>{formatDate(item.created_at, true)}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
