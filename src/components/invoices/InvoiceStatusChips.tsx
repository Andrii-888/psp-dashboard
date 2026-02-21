"use client";

import { useMemo } from "react";
import type { Invoice } from "@/lib/pspApi";
import { deriveInvoiceUiState } from "@/lib/invoices/deriveInvoiceUiState";

type Props = {
  invoice: Invoice;
  /** default: false — в списке показываем только invoice.status */
  showAxes?: boolean;
};

function toneClass(tone: "ok" | "warn" | "error" | string) {
  return tone === "ok"
    ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/20"
    : tone === "warn"
    ? "bg-amber-500/10 text-amber-200 ring-amber-500/20"
    : "bg-red-500/10 text-red-200 ring-red-500/20";
}

export function InvoiceStatusChips({ invoice, showAxes = false }: Props) {
  const ui = useMemo(() => deriveInvoiceUiState(invoice), [invoice]);

  if (!showAxes) {
    // single-chip mode for /invoices list
    const s = invoice.status;
    const cls =
      s === "confirmed"
        ? toneClass("ok")
        : s === "expired"
        ? toneClass("warn")
        : s === "rejected"
        ? toneClass("error")
        : "bg-slate-500/10 text-slate-200 ring-slate-500/20";

    return (
      <span
        className={[
          "rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
          cls,
        ].join(" ")}
      >
        {s.toUpperCase()}
      </span>
    );
  }

  // triage/operator mode: 3 axes
  return (
    <div className="flex flex-wrap gap-1.5">
      <span
        className={[
          "rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
          toneClass(ui.invoice.tone),
        ].join(" ")}
      >
        {ui.invoice.label}
      </span>

      <span
        className={[
          "rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
          toneClass(ui.tx.tone),
        ].join(" ")}
      >
        {ui.tx.label}
      </span>

      <span
        className={[
          "rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
          toneClass(ui.decision.tone),
        ].join(" ")}
      >
        {ui.decision.label}
      </span>
    </div>
  );
}
