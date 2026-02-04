"use client";

import type { Invoice } from "@/lib/pspApi";
import { StatusBadge } from "@/components/invoices/StatusBadge";
import { BackButton } from "@/components/ui/BackButton";

interface InvoiceHeaderProps {
  invoice: Invoice | null;
  onBack?: () => void; // ← ДОБАВЛЕНО, больше ничего
}

export function InvoiceHeader({ invoice }: InvoiceHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4">
      {/* LEFT: title + status */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
          Invoice
        </h1>

        {invoice ? <StatusBadge status={invoice.status} /> : null}
      </div>

      {/* RIGHT: back */}
      <BackButton
        href="/invoices"
        label="Back"
        className={[
          // light page context (same as other invoice pages)
          "border border-slate-300/70",
          "bg-white/80 text-slate-600",
          "hover:bg-white hover:text-slate-900 hover:border-slate-400/80",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300",
        ].join(" ")}
      />
    </header>
  );
}
