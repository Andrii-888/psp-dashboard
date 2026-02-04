"use client";

import * as React from "react";
import type { Invoice } from "@/domain/invoices/types";
import { CopyButton } from "@/components/ui/CopyButton";

function upper(v?: string | null): string {
  return (
    String(v ?? "")
      .trim()
      .toUpperCase() || "—"
  );
}

function safe(v?: string | number | null): string {
  const s = String(v ?? "").trim();
  return s || "—";
}

function fmtUtc(iso?: string | null): string {
  const v = String(iso ?? "").trim();
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    new Intl.DateTimeFormat("de-CH", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d) + " UTC"
  );
}

function buildReceiptText(invoice: Invoice): string {
  const merchantId = safe(invoice.merchantId);

  const status = upper(invoice.status);

  const fiatCur = upper(invoice.fiatCurrency);
  const cryptoCur = upper(invoice.cryptoCurrency);

  const gross = invoice.grossAmount ?? invoice.fiatAmount ?? null;
  const fee = invoice.feeAmount ?? null;
  const net = invoice.netAmount ?? null;

  const network = safe(invoice.network ?? invoice.pay?.network ?? null);

  const decision =
    safe(invoice.decisionStatus) !== "—"
      ? safe(invoice.decisionStatus)
      : safe(invoice.decision?.status);

  const reason = safe(
    invoice.decisionReasonText ??
      invoice.decisionReasonCode ??
      invoice.decision?.reasonCode ??
      null
  );

  const lines: string[] = [];

  lines.push("Accounting Receipt");
  lines.push(`Status: ${status}`);
  lines.push(`Invoice ID: ${safe(invoice.id)}`);
  lines.push(`Merchant ID: ${merchantId}`);
  lines.push(`Created at: ${fmtUtc(invoice.createdAt)}`);
  lines.push(`Confirmed at: ${fmtUtc(invoice.confirmedAt)}`);
  lines.push("");

  lines.push("Money");
  lines.push(`Gross: ${safe(gross)} ${fiatCur}`);
  lines.push(`Fee: -${safe(fee)} ${fiatCur}`);
  lines.push(`Net: ${safe(net)} ${fiatCur}`);
  lines.push(
    `Fee payer: ${safe(invoice.feePayer)} · Fee bps: ${safe(invoice.feeBps)}`
  );
  lines.push(`Fiat amount: ${safe(invoice.fiatAmount)} ${fiatCur}`);
  lines.push(`Crypto amount: ${safe(invoice.cryptoAmount)} ${cryptoCur}`);
  lines.push("");

  lines.push("Blockchain reference");
  lines.push(`Network: ${network}`);
  lines.push(`Wallet address: ${safe(invoice.walletAddress)}`);
  lines.push(`Transaction hash: ${safe(invoice.txHash)}`);
  lines.push(
    `Confirmations (final): ${safe(invoice.confirmations)}/${safe(
      invoice.requiredConfirmations
    )}`
  );
  lines.push(`Detected at: ${fmtUtc(invoice.detectedAt)}`);
  lines.push("");

  lines.push("Compliance");
  lines.push(`AML status: ${safe(invoice.amlStatus)}`);
  lines.push(
    `Risk score: ${safe(invoice.riskScore)} · Asset risk: ${safe(
      invoice.assetRiskScore
    )}`
  );
  lines.push(`Decision: ${decision}`);
  lines.push(`Reason: ${reason}`);
  lines.push(`Decided at: ${fmtUtc(invoice.decidedAt)}`);
  lines.push(`Decided by: ${safe(invoice.decidedBy)}`);

  return lines.join("\n");
}

export function CopyReceiptButton({
  invoice,
  className = "",
  size = "sm",
}: {
  invoice: Invoice;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const text = React.useMemo(() => buildReceiptText(invoice), [invoice]);

  return (
    <CopyButton
      value={text}
      label="Copy receipt"
      size={size}
      className={className}
    />
  );
}
