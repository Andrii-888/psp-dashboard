// src/app/accounting/lib/format.ts
// Accounting formatting helpers
// v1 — stablecoins only (USDT / USDC)
// Used across Accounting page, KPIs and table
// --------------------------------------------

/**
 * Safely convert backend values (string | number | null)
 * to number without throwing.
 */
export function toNumber(
  v: string | number | null | undefined,
  fallback = 0
): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/**
 * Format money values (NO currency symbol)
 * Output: 1,234.56 CHF
 *
 * IMPORTANT:
 * - No `$`
 * - No locale currency style
 * - Deterministic for accounting & audit
 */
export function fmtMoney(value: number) {
  const currency = "CHF"; // SSOT: accounting UI is CHF-only

  const n = Number(value);

  if (!Number.isFinite(n)) {
    return `0.00 ${currency}`;
  }

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

  return `${formatted} ${currency}`;
}

/**
 * Format ISO date for tables
 * Output example: 14.01.2026, 09:13:19
 */
export function fmtDate(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

/**
 * Shorten long ids / hashes / addresses
 * Example: 0xabc123…9fE2
 */
export function shortId(v?: string, left = 6, right = 4) {
  if (!v) return "—";
  if (v.length <= left + right + 1) return v;
  return `${v.slice(0, left)}…${v.slice(-right)}`;
}
