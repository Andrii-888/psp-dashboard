// src/lib/formatters.ts

const LOCALE_CH = "de-CH" as const;
const LOCALE_EN = "en-GB" as const;
const TZ = "Europe/Zurich" as const;

/**
 * Normalize locale-dependent output to be deterministic between SSR (Node)
 * and the browser to avoid hydration mismatches.
 *
 * In de-CH / en-GB:
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

// CH formats (de-CH)
const DT_LONG_CH = new Intl.DateTimeFormat(LOCALE_CH, {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const D_ONLY_CH = new Intl.DateTimeFormat(LOCALE_CH, {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// EN formats (for product UI like top PSPs)
const DT_LONG_EN = new Intl.DateTimeFormat(LOCALE_EN, {
  timeZone: TZ,
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

// Optional: time-only (handy for compact UIs)
const T_ONLY_EN = new Intl.DateTimeFormat(LOCALE_EN, {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTimeCH(iso?: string | null): string {
  const d = safeDate(iso);
  return d ? normalizeIntlOutput(DT_LONG_CH.format(d)) : "-";
}

export function formatDateCH(iso?: string | null): string {
  const d = safeDate(iso);
  return d ? normalizeIntlOutput(D_ONLY_CH.format(d)) : "-";
}

/**
 * ✅ "12 Feb 2026, 22:14" (Europe/Zurich)
 * This is the "top fintech UI" format we agreed on for English UI.
 */
export function formatDateTimeEN(iso?: string | null): string {
  const d = safeDate(iso);
  return d ? normalizeIntlOutput(DT_LONG_EN.format(d)) : "-";
}

export function formatTimeEN(iso?: string | null): string {
  const d = safeDate(iso);
  return d ? normalizeIntlOutput(T_ONLY_EN.format(d)) : "-";
}

/* =======================
   NUMBER FORMATTERS
======================= */

const NUM_DEFAULT_CH = new Intl.NumberFormat(LOCALE_CH);

export function formatNumberCH(
  value: number | string | null | undefined,
  opts?: Intl.NumberFormatOptions
): string {
  if (value === null || value === undefined || value === "") return "-";

  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "-";

  if (!opts) {
    return normalizeIntlOutput(NUM_DEFAULT_CH.format(n));
  }

  return normalizeIntlOutput(new Intl.NumberFormat(LOCALE_CH, opts).format(n));
}
