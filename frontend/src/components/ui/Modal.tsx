import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "./utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  placement?: "center" | "right";
  closeLabel?: string;
  className?: string;
  labelledBy?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  placement = "center",
  closeLabel = "Close dialog",
  className,
  labelledBy,
}: ModalProps) {
  const generatedTitleId = useId();
  const titleId = labelledBy ?? generatedTitleId;

  useEffect(() => {
    if (!open) return undefined;
    const originalOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={cx("sutra-modal", `sutra-modal--${placement}`)} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={cx("sutra-modal__dialog", `sutra-modal__dialog--${size}`, className)} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="sutra-modal__header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="sutra-modal__close" onClick={onClose} aria-label={closeLabel}><X size={18} /></button>
        </header>
        <div className="sutra-modal__body">{children}</div>
        {footer && <footer className="sutra-modal__footer">{footer}</footer>}
      </section>
    </div>,
    document.body,
  );
}
