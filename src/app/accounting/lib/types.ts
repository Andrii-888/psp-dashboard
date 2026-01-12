// src/app/accounting/lib/types.ts

/**
 * Strictly supported networks (v1)
 */
export type Network = "TRON" | "ETHEREUM";

/**
 * Strictly supported assets (v1)
 */
export type Asset = "USDT" | "USDC";

/**
 * Allowed asset-network pairs (BUSINESS RULE)
 * USDT  -> TRON
 * USDC  -> ETHEREUM
 */
export type AssetNetworkPair =
  | { asset: "USDT"; network: "TRON" }
  | { asset: "USDC"; network: "ETHEREUM" };

/**
 * Accounting events coming from backend
 */
export type AccountingEventType =
  | "invoice.waiting"
  | "invoice.detected"
  | "invoice.confirmed"
  | "invoice.expired"
  | "invoice.rejected"
  | string;

/**
 * Raw entry returned by psp-core
 * GET /accounting/entries
 */
export interface AccountingEntryRaw {
  invoiceId: string;
  eventType: AccountingEventType;

  grossAmount: string | number;
  feeAmount: string | number;
  netAmount: string | number;

  currency: Asset; // USDT | USDC
  network: Network; // TRON | ETHEREUM

  depositAddress: string;
  senderAddress: string | null;

  txHash: string | null;

  createdAt: string; // ISO
  merchantId: string;
}

/**
 * Backend response
 */
export type AccountingEntriesResponse = AccountingEntryRaw[];
