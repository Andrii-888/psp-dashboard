// src/app/accounting/lib/fromInvoices.ts
import type { Invoice } from "@/lib/pspApi";
import type { AccountingEntryRaw, Asset, Network } from "./types";

function toAsset(inv: Invoice): Asset {
  const s = String(inv.cryptoCurrency ?? inv.pay?.currency ?? "").toUpperCase();
  if (s.includes("USDC")) return "USDC";
  // default to USDT (matches your v1 rule set)
  return "USDT";
}

function toNetwork(inv: Invoice): Network {
  const s = String(inv.network ?? inv.pay?.network ?? "").toUpperCase();
  if (s === "TRON" || s.includes("TRON") || s.includes("TRC")) return "TRON";
  // map ETH -> ETHEREUM (v1)
  if (s === "ETH" || s === "ETHEREUM" || s.includes("ETH")) return "ETHEREUM";
  // fallback (v1 only supports TRON/ETHEREUM)
  return "TRON";
}

function toEventType(inv: Invoice): string {
  // Priority: final statuses first
  if (inv.status === "confirmed") return "invoice.confirmed";
  if (inv.status === "expired") return "invoice.expired";
  if (inv.status === "rejected") return "invoice.rejected";

  // Detected if tx status indicates it or detectedAt exists
  const tx = String(inv.txStatus ?? "").toLowerCase();
  if (tx === "detected" || inv.detectedAt) return "invoice.detected";

  return "invoice.waiting";
}

function toCreatedAt(inv: Invoice): string {
  return (
    inv.confirmedAt ?? inv.detectedAt ?? inv.createdAt ?? inv.expiresAt ?? ""
  );
}

export function invoiceToAccountingEntry(inv: Invoice): AccountingEntryRaw {
  const gross = inv.grossAmount ?? inv.cryptoAmount ?? 0;

  const fee = inv.feeAmount ?? 0;
  const net = inv.netAmount ?? Number(gross) - Number(fee);

  return {
    invoiceId: inv.id,
    eventType: toEventType(inv),

    grossAmount: gross,
    feeAmount: fee,
    netAmount: net,

    currency: toAsset(inv),
    network: toNetwork(inv),

    // deposit address is the payment instruction address
    depositAddress: inv.pay?.address ?? "",
    // sender address comes from detected walletAddress in PSP Core
    senderAddress: inv.walletAddress ?? null,

    txHash: inv.txHash ?? null,

    createdAt: toCreatedAt(inv),
    merchantId: inv.merchantId ?? "demo-merchant",
  };
}

export function invoicesToAccountingEntries(
  invoices: Invoice[]
): AccountingEntryRaw[] {
  return invoices.map(invoiceToAccountingEntry);
}
