/**
 * PSP-grade accounting types (CHF-first, but compatible with invoice pipeline fallback).
 *
 * Reality today:
 * - Ledger entries (from psp-core) are fiat-based and currently use CHF.
 * - Pipeline fallback (derived from invoices) uses crypto assets (USDT/USDC).
 *
 * So currency must allow CHF + (USDT/USDC) until we fully remove pipeline dependency (Day 3).
 */

/**
 * Supported networks (v1).
 *
 * IMPORTANT:
 * Backend accounting entries currently return "ETH" (not "ETHEREUM").
 * Keep types aligned with SSOT JSON to avoid breaking dynamic rendering.
 */
export type Network = "TRON" | "ETH";

/**
 * Fiat currency (v1): CHF only.
 */
export type FiatCurrency = "CHF";

/**
 * Crypto assets (v1).
 */
export type Asset = "USDT" | "USDC";

/**
 * Accounting "currency" can be either fiat (ledger) or crypto (pipeline).
 * STRICT: CHF + USDT/USDC only (no EUR yet).
 */
export type AccountingCurrency = FiatCurrency | Asset;

/**
 * Allowed asset-network pairs (BUSINESS RULE).
 * USDT  -> TRON
 * USDC  -> ETH
 */
export type AssetNetworkPair =
  | { asset: "USDT"; network: "TRON" }
  | { asset: "USDC"; network: "ETH" };

/**
 * Ledger / pipeline event types.
 * Keep known ones + allow extension.
 */
export type AccountingEventType =
  | "invoice.waiting"
  | "invoice.detected"
  | "invoice.confirmed"
  | "invoice.expired"
  | "invoice.rejected"
  | "invoice.confirmed_reversed"
  | "fee_charged"
  | string;

/**
 * Decision statuses returned by backend rows (can be broader than UI canonical enums).
 * We normalize them into DecisionStatusUi.
 */
export type DecisionStatusRaw =
  | "not_required"
  | "pending"
  | "hold"
  | "approved"
  | "rejected"
  | "manual_required"
  | string;

export type DecisionStatusUi =
  | "not_required"
  | "pending"
  | "hold"
  | "approved"
  | "rejected";

/**
 * AML statuses returned by backend rows (can be broader than UI canonical enums).
 * We normalize them into AmlStatusUi.
 */
export type AmlStatusRaw =
  | "not_started"
  | "pending"
  | "passed"
  | "failed"
  | "unavailable"
  | "review"
  | "clean"
  | string;

export type AmlStatusUi =
  | "not_started"
  | "pending"
  | "passed"
  | "failed"
  | "unavailable";

/**
 * Risk / asset status (as seen in SSOT rows today).
 * Keep as string to avoid breaking when provider adds values.
 */
export type AssetStatus = "clean" | "suspicious" | "unknown" | string;

/**
 * Raw accounting row used by dashboard UI.
 * (Can come from ledger OR from invoice pipeline fallback.)
 *
 * NOTE:
 * Keep optional fields aligned with live backend JSON.
 */

export interface AccountingEntryRaw {
  invoiceId: string;
  eventType: AccountingEventType;

  grossAmount: string | number;
  feeAmount: string | number;
  netAmount: string | number;

  // NEW: invoice snapshot fields (optional)
  fiatAmount?: number | null;
  feeBps?: number | null;
  feePayer?: string | null;
  confirmedAt?: string | null;

  grossFiatAmount?: number | null;
  feeFiatAmount?: number | null;
  netFiatAmount?: number | null;

  currency: AccountingCurrency; // CHF | USDT | USDC
  network: Network; // TRON | ETH

  depositAddress: string;
  senderAddress: string | null;

  txHash: string | null;

  createdAt: string; // ISO

  merchantId?: string;

  // Fiat fields exist on ledger entries; pipeline rows may not have them.
  fiatCurrency?: FiatCurrency | null;
  feeFiatCurrency?: FiatCurrency | null;

  amlStatus?: AmlStatusRaw | null;
  riskScore?: number | null;

  assetStatus?: AssetStatus | null;
  assetRiskScore?: number | null;

  decisionStatus?: DecisionStatusRaw | null;
  decisionReasonCode?: string | null;
  decisionReasonText?: string | null;

  decidedAt?: string | null; // ISO
  decidedBy?: string | null;

  fxRate?: number | null;
  fxPair?: string | null;
}

/**
 * Backend response
 */
export type AccountingEntriesResponse = AccountingEntryRaw[];

/**
 * Normalization helpers (single source of truth for Accounting UI).
 * Use these in UI models, table rendering, and reconciliation messaging.
 */

export function normalizeDecisionStatus(s: unknown): DecisionStatusUi {
  const v = String(s ?? "").trim();

  // backend/raw → UI canonical
  if (v === "manual_required") return "pending";

  // already canonical
  if (
    v === "not_required" ||
    v === "pending" ||
    v === "hold" ||
    v === "approved" ||
    v === "rejected"
  ) {
    return v;
  }

  // safest default: if unknown but exists → pending (operator should review)
  return v ? "pending" : "not_required";
}

export function normalizeAmlStatus(s: unknown): AmlStatusUi {
  const v = String(s ?? "").trim();

  // backend/raw → UI canonical
  if (v === "review") return "pending";
  if (v === "clean") return "passed";

  // already canonical
  if (
    v === "not_started" ||
    v === "pending" ||
    v === "passed" ||
    v === "failed" ||
    v === "unavailable"
  ) {
    return v;
  }

  // unknown → pending if something exists (better safe)
  return v ? "pending" : "not_started";
}
