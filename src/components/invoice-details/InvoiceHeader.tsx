"use client";

import type { Invoice } from "@/lib/pspApi";
import { StatusBadge } from "@/components/invoices/StatusBadge";

interface InvoiceHeaderProps {
  invoice: Invoice | null;
  onBack: () => void;
}

export function InvoiceHeader({ invoice, onBack }: InvoiceHeaderProps) {
  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      {/* LEFT: Back + title */}
      <div className="flex flex-col gap-1">
        <button
          onClick={onBack}
          type="button"
          className="inline-flex w-fit items-center gap-2 rounded-full bg-white/85 px-3 py-1 
                     text-xs font-medium text-slate-700 ring-1 ring-slate-200 shadow-sm 
                     backdrop-blur-sm transition hover:bg-white hover:text-slate-900 hover:ring-slate-300"
        >
          <span className="text-base leading-none text-slate-700">‹</span>
          <span>Back to invoices</span>
        </button>

        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
            Invoice details
          </h1>
          <p className="mt-1 text-xs text-slate-600 md:text-sm">
            PSP Core — Swiss crypto payment processor
          </p>
        </div>
      </div>

      {/* RIGHT: Invoice ID + status */}
      {invoice && (
        <div className="inline-flex flex-col items-end gap-2">
          {/* Статичный чип с ID — без копирования, чтобы ничего не прыгало */}
          <span
            className="inline-flex max-w-full items-center rounded-full 
                       bg-white/90 px-3 py-1 font-mono text-[12px] font-semibold 
                       text-slate-700 ring-1 ring-slate-300 shadow-sm"
          >
            {invoice.id}
          </span>

          <StatusBadge status={invoice.status} />
        </div>
      )}
    </header>
  );
}
