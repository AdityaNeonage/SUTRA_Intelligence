import type { ReactNode } from "react";
import { cx } from "./utils";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: "top" | "right" | "bottom" | "left";
  className?: string;
}

/** CSS-only tooltip that remains available to keyboard users. */
export function Tooltip({ content, children, placement = "top", className }: TooltipProps) {
  return (
    <span className={cx("sutra-tooltip", `sutra-tooltip--${placement}`, className)} tabIndex={0} aria-label={typeof content === "string" ? content : undefined}>
      {children}
      <span className="sutra-tooltip__bubble" role="tooltip">{content}</span>
    </span>
  );
}
