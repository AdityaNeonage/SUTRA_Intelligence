import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type PanelTone = "default" | "elevated" | "critical" | "cyan" | "transparent";

export interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  eyebrow?: ReactNode;
  heading?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  tone?: PanelTone;
  padded?: boolean;
}

/** A consistent evidence-console card/panel with optional semantic header. */
export function Panel({
  eyebrow,
  heading,
  action,
  children,
  tone = "default",
  padded = true,
  className,
  ...props
}: PanelProps) {
  const hasHeader = eyebrow || heading || action;
  return (
    <section {...props} className={cx("sutra-panel", `sutra-panel--${tone}`, !padded && "sutra-panel--flush", className)}>
      {hasHeader && (
        <header className="sutra-panel__header">
          <div>
            {eyebrow && <div className="sutra-panel__eyebrow">{eyebrow}</div>}
            {heading && <h2 className="sutra-panel__heading">{heading}</h2>}
          </div>
          {action && <div className="sutra-panel__action">{action}</div>}
        </header>
      )}
      <div className="sutra-panel__body">{children}</div>
    </section>
  );
}
