// Accounting formatting helpers
// v1 — stablecoins only (USDT / USDC)
// Used across Accounting page, KPIs and table
// --------------------------------------------

import { formatDateTimeCH } from "@/lib/formatters";

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
 * Output example: 1'628.72 CHF
 *
 * IMPORTANT:
 * - Deterministic across server + client (NO Intl.NumberFormat here)
 * - Swiss grouping with ASCII apostrophe (')
 * - Fixed 2 decimals
 */
export function fmtMoney(value: number) {
  const currency = "CHF"; // SSOT: accounting UI is CHF-only
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return `0.00 ${currency}`;
  }

  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);

  const fixed = abs.toFixed(2); // "1628.72"
  let [intPart, fracPart] = fixed.split(".");
  if (!intPart) intPart = "0";
  if (!fracPart) fracPart = "00";

  // Swiss-style grouping with ASCII apostrophe (deterministic)
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "'");

  return `${sign}${intPart}.${fracPart} ${currency}`;
}

/**
 * Format ISO date for tables
 * (Deterministic: fixed Europe/Zurich timezone in SSOT formatter)
 */
export function fmtDate(v?: string) {
  if (!v) return "—";
  return formatDateTimeCH(v);
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
