// src/app/accounting/components/AccountingTable.tsx

import type { AccountingEntryRaw } from "../lib/types";
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
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3">Invoice</th>
            <th className="px-4 py-3">Event</th>
            <th className="px-4 py-3 text-right">Gross</th>
            <th className="px-4 py-3 text-right">Fee</th>
            <th className="px-4 py-3 text-right">Net</th>
            <th className="px-4 py-3">Asset</th>
            <th className="px-4 py-3">Network</th>
            <th className="px-4 py-3">Deposit</th>
            <th className="px-4 py-3">Sender</th>
            <th className="px-4 py-3">Tx</th>
          </tr>
        </thead>

        <tbody className="text-zinc-900">
          {entries.map((e, idx) => {
            const clickable = typeof onInvoiceClick === "function";

            return (
              <tr
                key={`${e.invoiceId}-${e.eventType}-${idx}`}
                className={clickable ? "cursor-pointer hover:bg-zinc-50" : ""}
                onClick={
                  clickable ? () => onInvoiceClick?.(e.invoiceId) : undefined
                }
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : undefined}
                onKeyDown={
                  clickable
                    ? (ev) => {
                        if (ev.key === "Enter" || ev.key === " ") {
                          ev.preventDefault();
                          onInvoiceClick?.(e.invoiceId);
                        }
                      }
                    : undefined
                }
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
