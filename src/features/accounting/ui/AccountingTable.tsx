// src/app/accounting/components/AccountingTable.tsx

import type { AccountingEntryRaw } from "@/features/accounting/lib/types";
import AccountingRow from "./AccountingRow";

export default function AccountingTable({
  entries,
  onInvoiceClick,
}: {
  entries: AccountingEntryRaw[];
  onInvoiceClick?: (invoiceId: string) => void;
}) {
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <table className="min-w-full w-full text-sm">
        <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur">
          <tr className="border-b border-zinc-200 text-left text-xs font-medium text-zinc-600">
            <th className="px-4 py-2">Created</th>
            <th className="px-4 py-2">Invoice</th>
            <th className="px-4 py-2 text-center">Gross</th>
            <th className="px-4 py-2 text-center">Fee</th>
            <th className="px-4 py-2 text-center">Net</th>
            <th className="px-4 py-2 text-center">Asset</th>
            <th className="px-4 py-2 text-center">Network</th>
            <th className="w-10 px-3 py-2"></th>
          </tr>
        </thead>

        <tbody className="text-zinc-900">
          {entries.map((e, idx) => {
            const clickable = typeof onInvoiceClick === "function";

            return (
              <tr
                key={`${e.invoiceId}-${e.eventType}-${idx}`}
                className="hover:bg-zinc-50"
              >
                <AccountingRow entry={e} />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
