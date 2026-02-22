import type { Invoice } from "@/shared/api/pspApi";
import type {
  OnChainTransactionSSOT,
  OperatorTxViewModel,
  TxStatus,
  TxDirection,
} from "./blockchainTypes";

export type PaymentInstructions = {
  address: string | null;
  amount: string | number | null;
  currency: string | null;
  network: string | null;
  expiresAt: string | null;
};

export type OnChainTrace = {
  walletAddress: string | null;
  txHash: string | null;
  confirmations: number | null;
  requiredConfirmations: number | null;
  detectedAt: string | null;
  txStatus: string | null;
};

export type BlockchainBusinessStatus = "paid" | "aml_failed" | "under_review";

export type BlockchainStatusTone = "neutral" | "warn" | "success" | "final";

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null
    ? (v as Record<string, unknown>)
    : null;
}

function cleanString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

function numberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function amountOrNull(v: unknown): string | number | null {
  if (typeof v === "string") {
    const s = v.trim();
    return s.length > 0 ? s : null;
  }
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function amountStringOrNull(v: unknown): string | null {
  if (typeof v === "string") {
    const s = v.trim();
    return s.length > 0 ? s : null;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    // preserve precision assumption from backend; UI formatting is separate
    return String(v);
  }
  return null;
}

function toTxStatus(v: unknown): TxStatus | null {
  const s = cleanString(v);
  if (!s) return null;
  if (
    s === "pending" ||
    s === "detected" ||
    s === "confirmed" ||
    s === "failed"
  ) {
    return s;
  }
  return null;
}

function toDirection(v: unknown): TxDirection {
  const s = cleanString(v);
  return s === "outgoing" ? "outgoing" : "incoming";
}

/**
 * Legacy helper (kept for compatibility while we refactor UI).
 * Do not show receive instructions in operator UI.
 */
export function getPaymentInstructions(invoice: Invoice): PaymentInstructions {
  const inv = asRecord(invoice);
  const pay = inv ? asRecord(inv["pay"]) : null;

  return {
    address: cleanString(pay?.["address"]),
    amount: amountOrNull(pay?.["amount"]),
    currency: cleanString(pay?.["currency"]),
    network: cleanString(pay?.["network"]),
    expiresAt: cleanString(pay?.["expiresAt"]),
  };
}

/**
 * Legacy helper (kept for compatibility while we refactor UI).
 */
export function getOnChainTrace(invoice: Invoice): OnChainTrace {
  const inv = asRecord(invoice);

  return {
    walletAddress: cleanString(inv?.["walletAddress"]),
    txHash: cleanString(inv?.["txHash"]),
    confirmations: numberOrNull(inv?.["confirmations"]),
    requiredConfirmations: numberOrNull(inv?.["requiredConfirmations"]),
    detectedAt: cleanString(inv?.["detectedAt"]),
    txStatus: cleanString(inv?.["txStatus"]),
  };
}

/**
 * NEW: Bank-grade SSOT model (single source of truth).
 * Mapping assumptions:
 * - fromAddress = invoice.walletAddress
 * - toAddress   = invoice.pay.address (internal)
 * - direction   = invoice.direction ?? "incoming"
 * - asset       = invoice.asset ?? invoice.pay.currency
 * - amount      = invoice.amount ?? invoice.pay.amount
 * - network     = invoice.network ?? invoice.pay.network
 * - blockNumber/blockHash might be null if backend doesn't provide
 */
export function getOnChainSSOT(invoice: Invoice): OnChainTransactionSSOT {
  const inv = asRecord(invoice);
  const pay = inv ? asRecord(inv["pay"]) : null;

  const network =
    cleanString(inv?.["network"]) ?? cleanString(pay?.["network"]);
  const asset = cleanString(inv?.["asset"]) ?? cleanString(pay?.["currency"]);
  const amount =
    amountStringOrNull(inv?.["amount"]) ?? amountStringOrNull(pay?.["amount"]);

  return {
    direction: toDirection(inv?.["direction"]),

    network,
    asset,
    amount,

    fromAddress: cleanString(inv?.["walletAddress"]),
    toAddress: cleanString(pay?.["address"]),

    txHash: cleanString(inv?.["txHash"]),
    txStatus: toTxStatus(inv?.["txStatus"]),

    confirmations: numberOrNull(inv?.["confirmations"]),
    requiredConfirmations: numberOrNull(inv?.["requiredConfirmations"]),

    blockNumber: numberOrNull(inv?.["blockNumber"]),
    blockHash: cleanString(inv?.["blockHash"]),

    detectedAt: cleanString(inv?.["detectedAt"]),
  };
}

/**
 * NEW: Operator-safe view model (UI subset).
 */
export function getOperatorTxModel(invoice: Invoice): OperatorTxViewModel {
  const ssot = getOnChainSSOT(invoice);

  const required =
    typeof ssot.requiredConfirmations === "number"
      ? ssot.requiredConfirmations
      : null;
  const conf =
    typeof ssot.confirmations === "number" ? ssot.confirmations : null;

  const meetsRequired =
    required !== null && required > 0 && conf !== null && conf >= required;

  // UI rule: if requiredConfirmations is missing, treat as not final.
  const isFinal = meetsRequired;

  return {
    fromAddress: ssot.fromAddress,
    txHash: ssot.txHash,

    network: ssot.network,
    asset: ssot.asset,
    amount: ssot.amount,

    confirmations: ssot.confirmations,
    requiredConfirmations: ssot.requiredConfirmations,

    toAddress: ssot.toAddress,
    blockNumber: ssot.blockNumber,

    detectedAt: ssot.detectedAt,
    status: ssot.txStatus,

    isFinal,
  };
}

/**
 * NEW: Status pill model for operator UI.
 */
export function getBlockchainStatus(
  invoice: Invoice,
  nowMs: number
): { label: string; tone: "neutral" | "success" | "warn" | "final" } {
  const inv = asRecord(invoice);
  const invoiceStatus = cleanString(inv?.["status"]);

  // NOTE: keep vm param for callers; txVm is derived from invoice (operator model)
  const txVm = getOperatorTxModel(invoice);

  // If invoice is locked/final at business layer, show final immediately.
  const businessFinal =
    invoiceStatus === "confirmed" ||
    invoiceStatus === "expired" ||
    invoiceStatus === "rejected";

  if (businessFinal) return { label: "Final / locked", tone: "final" };

  if (txVm.status === "confirmed") {
    // If required confirmations exist and are met -> final, otherwise confirmed.
    if (txVm.isFinal) return { label: "Final", tone: "final" };
    return { label: "Confirmed", tone: "success" };
  }

  if (txVm.status === "detected" || !!txVm.txHash) {
    return { label: "Detected", tone: "warn" };
  }

  const pi = getPaymentInstructions(invoice);
  const hasPay =
    !!pi.address &&
    pi.amount !== null &&
    pi.amount !== undefined &&
    !!pi.currency;

  // PSP-grade: if provider TTL (pay.expiresAt) is in the past but SSOT is still waiting,
  // show operator warning ("Past provider TTL") instead of neutral "Awaiting payment".
  const payObj = inv?.["pay"] as unknown;
  const payExpiresAt =
    payObj && typeof payObj === "object"
      ? cleanString((payObj as Record<string, unknown>)["expiresAt"])
      : null;

  const providerExpiryMs = payExpiresAt ? Date.parse(payExpiresAt) : NaN;

  const providerPastTtl =
    Number.isFinite(providerExpiryMs) && nowMs > providerExpiryMs;

  if (providerPastTtl) {
    return { label: "Past provider TTL", tone: "warn" };
  }

  if (hasPay) return { label: "Awaiting payment", tone: "neutral" };

  return { label: "Waiting for instructions", tone: "neutral" };
}

export function getBlockchainBusinessStatus(
  invoice: Invoice
): BlockchainBusinessStatus {
  const inv = asRecord(invoice);

  const invoiceStatus = cleanString(inv?.["status"])?.toLowerCase() ?? null;

  const amlStatusRaw = cleanString(inv?.["amlStatus"]);
  const decisionStatusRaw = cleanString(inv?.["decisionStatus"]);

  const aml = amlStatusRaw?.toLowerCase() ?? null;
  const decision = decisionStatusRaw?.toLowerCase() ?? null;

  const isAmlFailed =
    aml === "failed" ||
    aml === "rejected" ||
    aml === "high_risk" ||
    aml === "blocked" ||
    decision === "rejected" ||
    decision === "deny" ||
    decision === "denied" ||
    decision === "declined";

  if (isAmlFailed) return "aml_failed";

  if (invoiceStatus === "confirmed") return "paid";

  return "under_review";
}
