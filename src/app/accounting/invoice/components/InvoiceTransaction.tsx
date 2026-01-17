// src/app/accounting/invoice/components/InvoiceTransaction.tsx

import type { Invoice } from "@/domain/invoices/types";

function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function fmtConfirmations(
  confirmations?: number | null,
  required?: number | null
): string {
  const a =
    typeof confirmations === "number" && Number.isFinite(confirmations)
      ? confirmations
      : null;

  const b =
    typeof required === "number" && Number.isFinite(required) ? required : null;

  if (a === null && b === null) return "—";
  if (a === null) return `— / ${b}`;
  if (b === null) return `${a} / —`;
  return `${a} / ${b}`;
}

export function InvoiceTransaction({ invoice }: { invoice: Invoice }) {
  return (
    <>
      <div className="mt-6 text-sm font-semibold text-zinc-900">
        Transaction
      </div>

      <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
        <div className="grid gap-2 md:grid-cols-2">
          <div>
            <div className="text-xs text-zinc-500">walletAddress</div>
            <div className="break-all font-mono text-xs text-zinc-900">
              {invoice.walletAddress ?? "—"}
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500">txHash</div>
            <div className="break-all font-mono text-xs text-zinc-900">
              {invoice.txHash ?? "—"}
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500">txStatus</div>
            <div className="font-mono text-xs text-zinc-900">
              {invoice.txStatus ?? "—"}
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500">confirmations</div>
            <div className="font-mono text-xs text-zinc-900">
              {fmtConfirmations(
                invoice.confirmations ?? null,
                invoice.requiredConfirmations ?? null
              )}
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500">detectedAt</div>
            <div className="font-mono text-xs text-zinc-900">
              {fmtDateTime(invoice.detectedAt ?? null)}
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500">confirmedAt</div>
            <div className="font-mono text-xs text-zinc-900">
              {fmtDateTime(invoice.confirmedAt ?? null)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
