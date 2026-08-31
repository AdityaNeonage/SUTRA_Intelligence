import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "cyan",
}: {
  label: string;
  value: ReactNode;
  detail: string;
  icon: LucideIcon;
  tone?: "cyan" | "violet" | "amber" | "green";
}) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__top">
        <span>{label}</span>
        <div className="metric-card__icon"><Icon size={18} strokeWidth={1.9} /></div>
      </div>
      <strong className="metric-card__value">{value}</strong>
      <p>{detail}</p>
    </article>
  );
}
