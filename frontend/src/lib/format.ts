export function formatDate(value?: string | null, includeTime = false) {
  if (!value) return " - ";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

export function formatPercent(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return " - ";
  const normalized = value <= 1 ? value * 100 : value;
  return `${Math.round(normalized)}%`;
}

export function formatScore(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return " - ";
  return value <= 1 ? value.toFixed(2) : value.toFixed(1);
}

export function titleCase(value?: string | null) {
  if (!value) return "Unknown";
  return value.replace(/[_-]+/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}
