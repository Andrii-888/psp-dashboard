"use client";

import type { Invoice } from "@/lib/pspApi";

function getScreeningMeta(invoice: Invoice): {
  label: "NOT STARTED" | "PENDING" | "COMPLETED";
  dotClass: string;
  hint: string;
} {
  const hasTx = !!invoice.txHash && invoice.txHash.trim().length > 0;
  const hasAml = invoice.amlStatus !== null;

  if (!hasTx) {
    return {
      label: "NOT STARTED",
      dotClass: "bg-slate-500",
      hint: "No txHash detected yet.",
    };
  }

  if (hasTx && !hasAml) {
    return {
      label: "PENDING",
      dotClass: "bg-amber-400",
      hint: "Tx detected. Screening is pending.",
    };
  }

  return {
    label: "COMPLETED",
    dotClass:
      invoice.amlStatus === "risky" || invoice.amlStatus === "blocked"
        ? "bg-rose-400"
        : invoice.amlStatus === "warning"
        ? "bg-amber-400"
        : "bg-emerald-400",
    hint: "Screening result is recorded.",
  };
}

export function ScreeningStatus({ invoice }: { invoice: Invoice }) {
  const screening = getScreeningMeta(invoice);

  return (
    <div className="mt-3 rounded-2xl bg-slate-900/60 p-3 ring-1 ring-slate-800/80">
      <p className="text-[11px] uppercase text-slate-500">Screening</p>

      <div className="mt-1 inline-flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${screening.dotClass}`} />
        <p className="text-sm font-semibold text-slate-50">{screening.label}</p>
      </div>

      <p className="mt-1 text-[11px] text-slate-500">{screening.hint}</p>
    </div>
  );
}
