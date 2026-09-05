import { useState } from "react";
import { LockKeyhole, UploadCloud } from "lucide-react";
export function DemoUploadGate({ onOpenLive }: { onOpenLive: () => void }) {
  const [open, setOpen] = useState(false);
  return <div className="demo-upload-gate"><button className="button button--quiet" onClick={() => setOpen(value => !value)} aria-expanded={open}><UploadCloud size={16} /> Upload Evidence</button>{open && <div className="notice-card" role="status"><LockKeyhole size={20} /><div><strong>Live evidence ingestion requires investigator authentication.</strong><p>Choose an authorised case in the live console to upload and store evidence.</p></div><button className="button button--primary" onClick={onOpenLive}>Open live console</button></div>}</div>;
}
