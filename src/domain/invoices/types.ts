// src/domain/invoices/types.ts
// Single source of truth for Invoice domain types (dashboard)

export type InvoiceStatus = "waiting" | "confirmed" | "expired" | "rejected";

export type AmlStatus = "clean" | "warning" | "risky" | "blocked" | null;
export type AssetStatus = "clean" | "suspicious" | "blocked" | null;

export type DecisionStatus = "approve" | "hold" | "reject" | null;
export type SanctionsStatus = "clear" | "hit" | null;

export interface SanctionsResult {
  status: SanctionsStatus;
  provider?: string | null;
  reasonCode?: string | null;
  details?: string | null;
  checkedAt?: string | null;
}

export interface OperatorDecision {
  status: DecisionStatus;
  reasonCode?: string | null;
  comment?: string | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
}

// fees / fx
export type FeePayer = "merchant" | "customer" | null;

// networks
export type Chain = "TRON" | "ETH" | (string & {});

export type InvoicePay = {
  address: string;
  amount: string; // provider returns string
  currency: string; // e.g. "USDTTRC20"
  network: Chain;
  expiresAt: string | null;
} | null;

export interface Invoice {
  id: string;
  createdAt: string;
  expiresAt: string;

  fiatAmount: number;
  fiatCurrency: string;

  cryptoAmount: number;
  cryptoCurrency: string;

  // fees (from PSP Core)
  grossAmount?: number | null;
  feeAmount?: number | null;
  netAmount?: number | null;
  feeBps?: number | null;
  feePayer?: FeePayer;

  status: InvoiceStatus;
  paymentUrl: string | null;

  // provider payment instructions
  pay?: InvoicePay;

  // FX
  fxRate?: number | null;
  fxPair?: string | null;

  // FX audit (from ledger meta)
  fxSource?: string | null;
  fxLockedAt?: string | null;

  network: string | null;

  // tx
  txHash: string | null;
  walletAddress: string | null;
  txStatus?: string | null;
  confirmations?: number | null;
  requiredConfirmations?: number | null;

  detectedAt?: string | null;
  confirmedAt?: string | null;

  // AML
  riskScore: number | null;
  amlStatus: AmlStatus;

  assetRiskScore: number | null;
  assetStatus: AssetStatus;

  merchantId: string | null;

  // decision (flat fields from PSP Core)
  decisionStatus?: "none" | "approve" | "hold" | "reject" | null;
  decisionReasonCode?: string | null;
  decisionReasonText?: string | null;
  decidedAt?: string | null;
  decidedBy?: string | null;

  // legacy/optional objects
  sanctions?: SanctionsResult | null;
  decision?: OperatorDecision | null;
}

export interface WebhookEvent {
  id: string;
  invoiceId: string;
  eventType: string;
  payloadJson: string;
  status: "pending" | "sent" | "failed";
  retryCount: number;
  lastAttemptAt: string | null;
  createdAt: string;
}

export interface WebhookDispatchResult {
  processed: number;
  sent: number;
  failed: number;
}

export interface ProviderEvent {
  provider: string;
  eventType: string;
  externalId: string | null;
  invoiceId: string | null;
  signature: string | null;
  payloadJson: string;
  receivedAt: string;
}

export interface FetchInvoicesParams {
  status?: InvoiceStatus;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface AttachTransactionPayload {
  network?: string;
  walletAddress?: string;
  txHash?: string;
}

export type CreateInvoicePayload = {
  fiatAmount: number;
  fiatCurrency: string;
  cryptoCurrency: string;
  network?: string;
  merchantId?: string | null;
};
