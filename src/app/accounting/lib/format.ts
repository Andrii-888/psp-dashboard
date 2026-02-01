// src/app/accounting/lib/format.ts
// Accounting formatting helpers
// v1 — stablecoins only (USDT / USDC)
// Used across Accounting page, KPIs and table
// --------------------------------------------

import { formatDateTimeCH, formatNumberCH } from "@/lib/formatters";

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

  const formatted = formatNumberCH(n, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${formatted} ${currency}`;
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
