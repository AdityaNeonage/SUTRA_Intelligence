import type { CSSProperties } from "react";
import { cx } from "./utils";

export interface SkeletonProps {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  variant?: "text" | "circle" | "rect";
  className?: string;
  label?: string;
}

export function Skeleton({ width, height, variant = "text", className, label = "Loading" }: SkeletonProps) {
  return <span aria-label={label} role="status" className={cx("sutra-skeleton", `sutra-skeleton--${variant}`, className)} style={{ width, height }} />;
}

export function SkeletonLines({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cx("sutra-skeleton-lines", className)} aria-label="Loading content" role="status">
      {Array.from({ length: lines }, (_, index) => <Skeleton key={index} width={index === lines - 1 ? "61%" : "100%"} />)}
    </div>
  );
}
