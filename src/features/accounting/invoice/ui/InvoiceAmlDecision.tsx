// src/app/accounting/invoice/components/InvoiceAmlDecision.tsx

import type { Invoice } from "@/domain/invoices/types";

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    new Intl.DateTimeFormat("de-CH", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d) + " UTC"
  );
}

function fmtValue(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export function InvoiceAmlDecision({ invoice }: { invoice: Invoice }) {
  return (
    <>
      <div className="mt-6 text-sm font-semibold text-zinc-900">
        AML & decision
      </div>

      <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
        <div className="grid gap-2 md:grid-cols-2">
          <div>
            <div className="text-xs text-zinc-500">amlStatus</div>
            <div className="font-mono text-xs text-zinc-900">
              {fmtValue(invoice.amlStatus)}
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500">riskScore</div>
            <div className="font-mono text-xs text-zinc-900">
              {fmtValue(invoice.riskScore)}
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500">assetStatus</div>
            <div className="font-mono text-xs text-zinc-900">
              {fmtValue(invoice.assetStatus)}
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500">assetRiskScore</div>
            <div className="font-mono text-xs text-zinc-900">
              {fmtValue(invoice.assetRiskScore)}
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500">decisionStatus</div>
            <div className="font-mono text-xs text-zinc-900">
              {fmtValue(invoice.decisionStatus)}
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500">decidedAt</div>
            <div className="font-mono text-xs text-zinc-900">
              {fmtDateTime(invoice.decidedAt)}
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-zinc-500">reason</div>
            <div className="text-sm text-zinc-900">
              <span className="font-mono text-xs text-zinc-700">
                {fmtValue(invoice.decisionReasonCode)}
              </span>
              {invoice.decisionReasonText ? (
                <span className="text-zinc-700">
                  {" "}
                  — {invoice.decisionReasonText}
                </span>
              ) : null}
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500">decidedBy</div>
            <div className="font-mono text-xs text-zinc-900">
              {fmtValue(invoice.decidedBy)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
