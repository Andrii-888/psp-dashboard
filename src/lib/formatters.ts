// src/lib/formatters.ts

const LOCALE = "de-CH" as const;
const TZ = "Europe/Zurich" as const;

/**
 * Normalize locale-dependent output to be deterministic between SSR (Node)
 * and the browser to avoid hydration mismatches.
 *
 * In de-CH:
 * - Node may use `'` (U+0027)
 * - Browser may use `’` (U+2019)
 */
function normalizeIntlOutput(s: string): string {
  return s.replace(/'/g, "’");
}

// Parse ISO safely. Never create "now" here.
export function safeDate(iso?: string | null): Date | null {
  if (!iso || typeof iso !== "string") return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* =======================
   DATE FORMATTERS
======================= */

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

export function formatDateTimeCH(iso?: string | null): string {
  const d = safeDate(iso);
  return d ? normalizeIntlOutput(DT_LONG.format(d)) : "-";
}

export function formatDateCH(iso?: string | null): string {
  const d = safeDate(iso);
  return d ? normalizeIntlOutput(D_ONLY.format(d)) : "-";
}

/* =======================
   NUMBER FORMATTERS
======================= */

const NUM_DEFAULT = new Intl.NumberFormat(LOCALE);

export function formatNumberCH(
  value: number | string | null | undefined,
  opts?: Intl.NumberFormatOptions
): string {
  if (value === null || value === undefined || value === "") return "-";

  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "-";

  if (!opts) {
    return normalizeIntlOutput(NUM_DEFAULT.format(n));
  }

  return normalizeIntlOutput(new Intl.NumberFormat(LOCALE, opts).format(n));
}
