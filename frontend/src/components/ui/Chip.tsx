import type { ReactNode } from "react";
import { cx } from "./utils";

export type ChipTone = "neutral" | "cyan" | "success" | "warning" | "danger" | "hypothesis";

export interface ChipProps {
  children: ReactNode;
  tone?: ChipTone;
  icon?: ReactNode;
  className?: string;
  title?: string;
}

export function Chip({ children, tone = "neutral", icon, className, title }: ChipProps) {
  return (
    <span title={title} className={cx("sutra-chip", `sutra-chip--${tone}`, className)}>
      {icon && <span className="sutra-chip__icon" aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}

export interface StatusIndicatorProps extends Omit<ChipProps, "tone"> {
  status?: "online" | "active" | "pending" | "warning" | "critical" | "offline" | "unknown";
}

export function StatusIndicator({ status = "unknown", children, icon, className, title }: StatusIndicatorProps) {
  const tone = status === "online" || status === "active" ? "success" : status === "warning" || status === "pending" ? "warning" : status === "critical" || status === "offline" ? "danger" : "neutral";
  return <Chip tone={tone} icon={icon ?? <span className={`sutra-status-dot sutra-status-dot--${status}`} />} className={className} title={title}>{children}</Chip>;
}
