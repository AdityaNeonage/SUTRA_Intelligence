import type { CSSProperties, ReactNode } from "react";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { cx } from "./utils";

export interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "scale";
  once?: boolean;
  threshold?: number;
}

export function Reveal({ children, className, delay = 0, direction = "up", once, threshold }: RevealProps) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ once, threshold });
  const style = { "--sutra-reveal-delay": `${Math.max(0, delay)}ms` } as CSSProperties;

  return (
    <div ref={ref} style={style} className={cx("sutra-reveal", `sutra-reveal--${direction}`, isVisible && "is-visible", className)}>
      {children}
    </div>
  );
}
