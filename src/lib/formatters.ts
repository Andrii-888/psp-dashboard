// src/lib/formatters.ts
const LOCALE = "de-CH" as const;
const TZ = "Europe/Zurich" as const;

// Parse ISO safely. Never create "now" here.
export function safeDate(iso?: string | null): Date | null {
  if (!iso || typeof iso !== "string") return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

const DT_LONG = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const D_ONLY = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const NUM_DEFAULT = new Intl.NumberFormat(LOCALE);

export function formatDateTimeCH(iso?: string | null): string {
  const d = safeDate(iso);
  return d ? DT_LONG.format(d) : "-";
}

export function formatDateCH(iso?: string | null): string {
  const d = safeDate(iso);
  return d ? D_ONLY.format(d) : "-";
}

export function formatNumberCH(
  value: number | string | null | undefined,
  opts?: Intl.NumberFormatOptions
): string {
  if (value === null || value === undefined || value === "") return "-";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "-";

  // Use a cached default formatter unless caller needs options.
  if (!opts) return NUM_DEFAULT.format(n);
  return new Intl.NumberFormat(LOCALE, opts).format(n);
}
