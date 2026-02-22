/**
 * Bank-grade SSOT model for on-chain transaction facts.
 *
 * - This model is the "truth" for internal accounting / reconciliation.
 * - UI (operator) must only render a safe subset of these fields.
 * - All numbers that can lose precision (amount) are stored as strings.
 */

export type TxDirection = "incoming" | "outgoing";

export type TxStatus = "pending" | "detected" | "confirmed" | "failed";

/**
 * SSOT: full transaction facts stored by the system (bank/core).
 * Some fields may be null while upstream providers are still enriching data.
 */
export interface OnChainTransactionSSOT {
  direction: TxDirection;

  network: string | null; // e.g. "ethereum", "tron", "bsc", "polygon"
  asset: string | null; // e.g. "USDT", "USDC", "BTC"
  amount: string | null; // string to preserve precision (no float)

  fromAddress: string | null; // sender
  toAddress: string | null; // deposit address (internal)

  txHash: string | null; // txid
  txStatus: TxStatus | null;

  confirmations: number | null;
  requiredConfirmations: number | null;

  blockNumber: number | null;
  blockHash: string | null;

  detectedAt: string | null; // ISO timestamp
}

/**
 * Operator UI model (safe subset).
 * Never include receive instructions / deposit address as primary content.
 */
export interface OperatorTxViewModel {
  fromAddress: string | null;
  txHash: string | null;

  network: string | null;
  asset: string | null;
  amount: string | null;

  confirmations: number | null;
  requiredConfirmations: number | null;

  detectedAt: string | null;
  status: TxStatus | null;

  toAddress: string | null;
  blockNumber: number | null;

  /**
   * Derived convenience flag for UI. True only when confirmations meet/exceed requiredConfirmations.
   * If requiredConfirmations is missing, treat as not final in UI.
   */
  isFinal: boolean;
}
