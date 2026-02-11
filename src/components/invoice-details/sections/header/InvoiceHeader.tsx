"use client";

import type { Invoice } from "@/lib/pspApi";
import { StatusBadge } from "@/components/invoices/StatusBadge";
import { BackButton } from "@/components/ui/BackButton";

interface InvoiceHeaderProps {
  invoice: Invoice | null;
  onBack?: () => void;
}

export function InvoiceHeader({ invoice }: InvoiceHeaderProps) {
  return (
    <header className="apple-card p-4 md:p-6">
      <div className="flex items-start justify-between gap-4">
        {/* LEFT: identity (single source on page) */}
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Invoice ID
          </div>

          <div className="mt-1 truncate font-mono text-sm font-semibold text-slate-50 md:text-base">
            {invoice?.id ?? "Loading…"}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[12px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-[0.16em] text-slate-500">
                Merchant
              </span>
              <span className="font-mono text-slate-200">
                {invoice?.merchantId ?? "—"}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT: status + back */}
        <div className="flex items-center gap-3">
          {invoice ? <StatusBadge status={invoice.status} /> : null}

          <BackButton
            href="/invoices"
            label="Back"
            className={[
              "border border-slate-700/60",
              "bg-slate-900/40 text-slate-200",
              "hover:bg-slate-900/60 hover:text-slate-50 hover:border-slate-600/70",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-600/60",
            ].join(" ")}
          />
        </div>
      </div>
    </header>
  );
}
