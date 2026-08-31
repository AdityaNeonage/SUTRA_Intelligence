import type { ReactNode } from "react";
import { CheckCircle2, CircleAlert, CircleDashed, Radio } from "lucide-react";
import { titleCase } from "../lib/format";

type StatusTone = "healthy" | "warning" | "critical" | "neutral";

function getTone(status?: string): StatusTone {
  const normalized = status?.toUpperCase() ?? "UNKNOWN";
  if (["ONLINE", "HEALTHY", "OK", "READY", "ACTIVE", "UP"].includes(normalized)) return "healthy";
  if (["DEGRADED", "WARNING", "PENDING", "UNKNOWN"].includes(normalized)) return "warning";
  if (["OFFLINE", "DOWN", "FAILED", "ERROR", "UNHEALTHY"].includes(normalized)) return "critical";
  return "neutral";
}

export function StatusPill({ status, children }: { status?: string; children?: ReactNode }) {
  const tone = getTone(status);
  const Icon = tone === "healthy" ? CheckCircle2 : tone === "critical" ? CircleAlert : tone === "warning" ? CircleDashed : Radio;
  return (
    <span className={`status-pill status-pill--${tone}`} title={status ? titleCase(status) : undefined}>
      <Icon size={13} strokeWidth={2.2} aria-hidden="true" />
      {children ?? titleCase(status)}
    </span>
  );
}

export function EvidenceBadge({ status }: { status?: string }) {
  const normalized = status?.toUpperCase() ?? "INFERRED";
  const label = normalized === "VERIFIED" ? "Verified evidence" : normalized === "HYPOTHESIS" ? "AI hypothesis" : "Analytical inference";
  return <span className={`evidence-badge evidence-badge--${normalized.toLowerCase()}`}>{label}</span>;
}
