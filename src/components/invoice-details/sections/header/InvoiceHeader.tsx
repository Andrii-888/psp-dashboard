"use client";

import type { Invoice } from "@/lib/pspApi";
import { StatusBadge } from "@/components/invoices/StatusBadge";
import { BackButton } from "@/components/ui/BackButton";
import { CopyButton } from "@/components/ui/CopyButton";

interface InvoiceHeaderProps {
  invoice: Invoice | null;
}

export function InvoiceHeader({ invoice }: InvoiceHeaderProps) {
  const invoiceId = invoice?.id ?? "";

  return (
    <header className="apple-card p-4 md:p-6">
      <div className="flex items-start justify-between gap-4">
        {/* LEFT */}
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Invoice ID
          </div>

          <div className="mt-1 flex items-center gap-1.5">
            <div className="truncate font-mono text-xs font-medium tracking-[0.02em] text-slate-50 md:text-sm">
              {invoice?.id ?? "Loading…"}
            </div>

            <CopyButton value={invoiceId} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-[0.16em] text-slate-500">
                Merchant
              </span>
              <span className="max-w-[52ch] truncate font-mono text-slate-200">
                {invoice?.merchantId ?? "—"}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col items-end gap-2">
          {invoice ? <StatusBadge status={invoice.status} /> : null}
          <BackButton href="/invoices" label="Back" />
        </div>
      </div>
    </header>
  );
}
