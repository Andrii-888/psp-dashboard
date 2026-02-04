"use client";

import type { Invoice } from "../types/invoice";
import { BackButton } from "@/components/ui/BackButton";
import { StatusBadge } from "@/components/invoices/StatusBadge";

type Props = {
  invoice: Invoice | null;
};

export default function InvoiceAccountingHeader({ invoice }: Props) {
  return (
    <header className="mb-6">
      <div className="flex items-center justify-between">
        {/* LEFT */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
            Accounting Receipt
          </h1>

          {invoice ? <StatusBadge status={invoice.status} /> : null}
        </div>

        {/* RIGHT */}
        <BackButton href="/accounting" label="Back" />
      </div>
    </header>
  );
}
