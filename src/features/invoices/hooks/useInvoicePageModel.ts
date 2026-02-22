// src/hooks/useInvoicePageModel.ts
"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { useInvoiceDetails } from "@/features/invoices/hooks/useInvoiceDetails";
import { deriveInvoiceUiState } from "@/features/invoices/model/deriveInvoiceUiState";

type DebugInvoiceSnapshot = {
  id: string | null;
  status: string | null;
  txStatus: string | null;
  walletAddress: string | null;
  txHash: string | null;
  network: string | null;
  payCurrency: string | null;

  amlStatus: string | null;
  riskScore: number | null;

  decisionStatus: string | null;
  decisionReasonCode: string | null;
  decisionReasonText: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
};

// ---------- safe helpers (no any) ----------
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function pickString(o: Record<string, unknown>, key: string): string | null {
  const v = o[key];
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

export function useInvoicePageModel(invoiceId: string | null) {
  const sp = useSearchParams();
  const debug = useMemo(() => sp.get("debug") === "1", [sp]);

  const details = useInvoiceDetails(invoiceId);

  const { invoice } = details;

  const uiState = useMemo(() => {
    if (!invoice) return null;
    return deriveInvoiceUiState(invoice);
  }, [invoice]);

  const debugSnap = useMemo<DebugInvoiceSnapshot>(() => {
    const base: DebugInvoiceSnapshot = {
      id: invoice?.id ?? invoiceId ?? null,
      status: invoice?.status ?? null,
      txStatus: null,
      walletAddress: null,
      txHash: null,
      network: null,
      payCurrency: null,

      amlStatus: invoice?.amlStatus ?? null,
      riskScore:
        typeof invoice?.riskScore === "number" ? invoice.riskScore : null,

      decisionStatus: invoice?.decisionStatus ?? null,
      decisionReasonCode: null,
      decisionReasonText: null,
      decidedAt: null,
      decidedBy: null,
    };

    if (!isRecord(invoice)) return base;

    return {
      ...base,
      txStatus: pickString(invoice, "txStatus"),
      walletAddress: pickString(invoice, "walletAddress"),
      txHash: pickString(invoice, "txHash"),
      network: pickString(invoice, "network"),
      payCurrency:
        pickString(invoice, "payCurrency") ??
        pickString(invoice, "cryptoCurrency"),
      decisionReasonCode: pickString(invoice, "decisionReasonCode"),
      decisionReasonText: pickString(invoice, "decisionReasonText"),
      decidedAt: pickString(invoice, "decidedAt"),
      decidedBy: pickString(invoice, "decidedBy"),
    };
  }, [invoice, invoiceId]);

  return {
    debug,
    debugSnap,
    uiState,
    ...details,
  };
}

export type { DebugInvoiceSnapshot };
