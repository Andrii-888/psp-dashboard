
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
 */
export type Network = "TRON" | "ETHEREUM";

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
 * USDC  -> ETHEREUM
 */
export type AssetNetworkPair =
  | { asset: "USDT"; network: "TRON" }
  | { asset: "USDC"; network: "ETHEREUM" };

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
 * Raw accounting row used by dashboard UI.
 * (Can come from ledger OR from invoice pipeline fallback.)
 */
export interface AccountingEntryRaw {
  invoiceId: string;
  eventType: AccountingEventType;

  grossAmount: string | number;
  feeAmount: string | number;
  netAmount: string | number;

  currency: AccountingCurrency; // CHF | USDT | USDC
  network: Network; // TRON | ETHEREUM

  depositAddress: string;
  senderAddress: string | null;

  txHash: string | null;

  createdAt: string; // ISO
  merchantId: string;

  // Fiat fields exist on ledger entries; pipeline rows may not have them.
  fiatCurrency?: FiatCurrency | null;
  feeFiatCurrency?: FiatCurrency | null;
}

/**
 * Backend response
 */
export type AccountingEntriesResponse = AccountingEntryRaw[];
