import type { ReactNode } from "react";
import { AlertTriangle, Database, LoaderCircle, RefreshCw } from "lucide-react";
import { errorMessage } from "../lib/format";

export function LoadingState({ label = "Retrieving intelligence…", compact = false }: { label?: string; compact?: boolean }) {
  return (
    <div className={`data-state${compact ? " data-state--compact" : ""}`} role="status" aria-live="polite">
      <LoaderCircle className="spin" size={compact ? 17 : 26} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry, title = "Intelligence unavailable" }: { error: unknown; onRetry?: () => void; title?: string }) {
  return (
    <div className="data-state data-state--error" role="alert">
      <AlertTriangle size={25} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{errorMessage(error)}</p>
      </div>
      {onRetry && <button className="button button--quiet" onClick={onRetry}><RefreshCw size={15} /> Retry</button>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="data-state data-state--empty">
      <div className="empty-state__icon">{icon ?? <Database size={23} />}</div>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
