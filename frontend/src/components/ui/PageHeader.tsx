import type { ReactNode } from "react";
import { cx } from "./utils";

export interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, meta, className }: PageHeaderProps) {
  return (
    <header className={cx("sutra-page-header", className)}>
      <div className="sutra-page-header__copy">
        {eyebrow && <div className="sutra-page-header__eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        {meta && <div className="sutra-page-header__meta">{meta}</div>}
      </div>
      {actions && <div className="sutra-page-header__actions">{actions}</div>}
    </header>
  );
}
