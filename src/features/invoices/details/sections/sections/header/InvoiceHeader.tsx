"use client";

import type { Invoice } from "@/shared/api/pspApi";
import { formatDateTimeCH } from "@/shared/lib/formatters";
import { BackButton } from "@/shared/ui/components/BackButton";
import { CopyButton } from "@/shared/ui/components/CopyButton";
import type { InvoiceUiState } from "@/features/invoices/model/deriveInvoiceUiState";

interface InvoiceHeaderProps {
  invoice: Invoice | null;
  uiState: InvoiceUiState | null;
}

function formatDetails(details?: string | null): string | null {
  if (!details) return null;

  const ms = new Date(details).getTime();
  if (!Number.isFinite(ms)) return details;

  return formatDateTimeCH(details);
}

export function InvoiceHeader({ invoice, uiState }: InvoiceHeaderProps) {
  if (!invoice || !uiState) return null;

  const invoiceId = invoice.id;

  return (
    <header className="apple-card p-4 md:p-6">
      <div className="flex items-start justify-between gap-4">
        {/* LEFT */}
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Invoice ID
          </div>

          <div className="mt-1 flex items-center gap-2">
            <span
              className="truncate font-mono text-[11px] tracking-[0.04em] text-slate-300/90"
              title={invoiceId}
            >
              {invoiceId}
            </span>

            <CopyButton value={invoiceId} size="sm" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-[0.16em] text-slate-500">
                Merchant
              </span>
              <span className="max-w-[52ch] truncate font-mono text-slate-200">
                {invoice.merchantId ?? "—"}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-2">
            <span
              className={[
                "whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[0.04em] ring-1",
                uiState.invoice.tone === "ok"
                  ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/20"
                  : uiState.invoice.tone === "warn"
                  ? "bg-amber-500/10 text-amber-200 ring-amber-500/20"
                  : "bg-red-500/10 text-red-200 ring-red-500/20",
              ].join(" ")}
            >
              {uiState.invoice.label}
            </span>

            <span
              className={[
                "whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[0.04em] ring-1",
                uiState.tx.tone === "ok"
                  ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/20"
                  : uiState.tx.tone === "warn"
                  ? "bg-amber-500/10 text-amber-200 ring-amber-500/20"
                  : "bg-red-500/10 text-red-200 ring-red-500/20",
              ].join(" ")}
            >
              {uiState.tx.label}
              {uiState.tx.details ? (
                <span className="ml-2 font-normal text-slate-300">
                  {formatDetails(uiState.tx.details)}
                </span>
              ) : null}
            </span>

            <span
              className={[
                "whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[0.04em] ring-1",
                uiState.decision.tone === "ok"
                  ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/20"
                  : uiState.decision.tone === "warn"
                  ? "bg-amber-500/10 text-amber-200 ring-amber-500/20"
                  : "bg-red-500/10 text-red-200 ring-red-500/20",
              ].join(" ")}
            >
              {uiState.decision.label}
              {uiState.decision.details ? (
                <span className="ml-2 font-normal text-slate-300">
                  {formatDetails(uiState.decision.details)}
                </span>
              ) : null}
            </span>
          </div>

          <BackButton href="/invoices" label="Back" />
        </div>
      </div>
    </header>
  );
}
