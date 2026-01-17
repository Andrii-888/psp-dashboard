// src/app/accounting/invoice/components/InvoicePaymentInstructions.tsx

import type { Invoice } from "@/domain/invoices/types";
import { Row } from "../ui/Row";

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function fmtAmount(amount?: string | number | null, currency?: string | null) {
  if (amount === null || amount === undefined || amount === "") return "—";
  const c = currency ?? "";
  return c ? `${amount} ${c}` : String(amount);
}

export function InvoicePaymentInstructions({ invoice }: { invoice: Invoice }) {
  return (
    <>
      <div className="mt-6 text-sm font-semibold text-zinc-900">
        Payment instructions
      </div>

      <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
        <div className="grid gap-2 md:grid-cols-2">
          <div>
            <div className="text-xs text-zinc-500">address</div>
            <div className="break-all font-mono text-xs text-zinc-900">
              {invoice.pay?.address ?? "—"}
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500">amount</div>
            <div className="font-mono text-xs text-zinc-900">
              {fmtAmount(
                invoice.pay?.amount ?? null,
                invoice.pay?.currency ?? null
              )}
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500">network</div>
            <div className="font-mono text-xs text-zinc-900">
              {invoice.pay?.network ?? invoice.network ?? "—"}
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500">pay expiresAt</div>
            <div className="font-mono text-xs text-zinc-900">
              {fmtDateTime(invoice.pay?.expiresAt ?? null)}
            </div>
          </div>
        </div>
      </div>

      {/* keep Row-based fields consistent if you want to show raw pay object later */}
      {invoice.paymentUrl ? (
        <div className="mt-4">
          <Row
            label="paymentUrl"
            value={
              <a
                className="text-sky-600 hover:underline"
                href={invoice.paymentUrl}
                target="_blank"
                rel="noreferrer"
              >
                {invoice.paymentUrl}
              </a>
            }
          />
        </div>
      ) : null}
    </>
  );
}
