import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Database, FileText, UploadCloud, X } from "lucide-react";
import { sutraApi } from "../api/client";
import { acceptedEvidence, processQueue, validateEvidence, type UploadItem } from "../features/evidence/uploadQueue";

export function EvidenceIntake({ token, caseId, onOpenStore, onBusyChange }: {
  token: string; caseId: string; onOpenStore: (ingestionId?: string) => void; onBusyChange?: (busy: boolean) => void;
}) {
  const client = useQueryClient();
  const picker = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [source, setSource] = useState("");
  const [items, setItems] = useState<UploadItem[]>([]);
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);
  function add(files: File[]) {
    if (busyRef.current) return;
    setItems(current => {
      const next = [...current];
      for (const file of files) {
        if (next.some(item => item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified)) continue;
        const error = validateEvidence(file);
        next.push({ id: crypto.randomUUID(), file, status: error ? "failed" : "queued", error });
      }
      return next;
    });
  }
  async function process() {
    if (busyRef.current || !caseId) return;
    busyRef.current = true; setBusy(true); onBusyChange?.(true);
    try {
      await processQueue(items, file => sutraApi.uploadEvidence(token, file, caseId, source || undefined),
        (id, patch) => setItems(current => current.map(item => item.id === id ? { ...item, ...patch } : item)));
    } finally {
      await Promise.all(["ingestions", "documents", "entities", "graph", "cases", "analytics", "cross-case"].map(key => client.invalidateQueries({ queryKey: [key] })));
      busyRef.current = false; setBusy(false); onBusyChange?.(false);
    }
  }
  return <section className="panel intake-panel" aria-label="Case evidence intake">
    <div className="panel__header"><div><span className="panel__eyebrow">Real backend / selected case</span><h3>Evidence intake</h3></div><UploadCloud size={20} /></div>
    <div className="intake-body">
      <input ref={picker} className="visually-hidden" type="file" multiple accept={acceptedEvidence} disabled={busy} onChange={e => { add(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      <button type="button" disabled={busy} className={`live-upload-dropzone${drag ? " live-upload-dropzone--active" : ""}`} onClick={() => picker.current?.click()} onDragOver={e => { e.preventDefault(); if (!busy) setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); add(Array.from(e.dataTransfer.files)); }}>
        <UploadCloud size={28} /><strong>Drop evidence here or choose files</strong><small>CSV / JSON / TXT / Markdown / PDF / DOCX — up to 25 MB each</small>
      </button>
      <p className="intake-help">XLSX is unsupported: export your sheet as CSV. PDFs must contain selectable text; scanned pages need OCR outside this workflow.</p>
      <label className="field-label">Source classification<select className="input" value={source} disabled={busy} onChange={e => setSource(e.target.value)}><option value="">Detect from file</option><option value="BANK_RECORD">Bank record</option><option value="CALL_DETAIL_RECORD">Call detail record</option><option value="FIELD_REPORT">Field report</option><option value="CASE_NOTE">Case note</option><option value="DOCUMENT">Document</option></select></label>
      <p className="intake-help">Classification labels the upload receipt; field mapping still follows the actual file contents. A retry creates a new batch—check Data Store first if a request timed out.</p>
      <div className="intake-queue" aria-live="polite">{items.map(item => <article key={item.id} className={`intake-item intake-item--${item.status}`}>
        <FileText size={17} /><div><strong>{item.file.name}</strong><small>{item.file.name.split(".").pop()?.toUpperCase()} / {(item.file.size / 1024).toFixed(1)} KB / {item.status}</small>{item.error && <p role="alert">{item.error}</p>}{item.result && <small>{item.result.document_ids.length} records / {item.result.entity_ids.length} entities / {item.result.relationship_ids.length} relationships</small>}{item.result?.warnings.map(warning => <p key={warning}>{warning}</p>)}</div>
        <div className="intake-item-actions">{item.result && <button type="button" className="text-button" onClick={() => onOpenStore(item.result!.ingestion_id)}>View records</button>}{item.status === "failed" && !validateEvidence(item.file) && <button disabled={busy} className="text-button" onClick={() => setItems(current => current.map(row => row.id === item.id ? { ...row, status: "queued", error: undefined } : row))}>Retry</button>}<button className="icon-button" disabled={busy} aria-label={`Remove ${item.file.name}`} onClick={() => setItems(current => current.filter(row => row.id !== item.id))}><X size={16} /></button></div>
      </article>)}</div>
      <div className="live-upload-actions"><span role="status">{busy ? "Processing files in order. Keep this page open." : `${items.filter(item => item.status === "completed").length} completed / ${items.filter(item => item.status === "failed").length} failed`}</span><button className="button button--primary" disabled={busy || !caseId || !items.some(item => item.status === "queued")} onClick={() => void process()}>{busy ? "Processing…" : "Process evidence"}</button><button className="button button--quiet" onClick={() => onOpenStore()}><Database size={15} /> Data Store</button></div>
    </div>
  </section>;
}
