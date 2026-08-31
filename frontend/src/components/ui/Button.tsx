import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "quiet";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
}

export function Button({
  className,
  children,
  variant = "secondary",
  size = "md",
  leadingIcon,
  trailingIcon,
  loading = false,
  loadingLabel,
  type = "button",
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cx("sutra-button", `sutra-button--${variant}`, `sutra-button--${size}`, loading && "is-loading", className)}
    >
      {loading ? <span className="sutra-button__spinner" aria-hidden="true" /> : leadingIcon && <span className="sutra-button__icon" aria-hidden="true">{leadingIcon}</span>}
      <span className="sutra-button__label">{loadingLabel ?? children}</span>
      {!loading && trailingIcon && <span className="sutra-button__icon" aria-hidden="true">{trailingIcon}</span>}
    </button>
  );
}
