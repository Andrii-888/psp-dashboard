"use client";

import type { Invoice } from "@/shared/api/pspApi";
import { formatDateTimeCH } from "@/shared/lib/formatters";
import { CopyButton } from "@/shared/ui/components/CopyButton";

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  return formatDateTimeCH(iso);
}

interface AuditTrailCardProps {
  invoice: Invoice;
}

export function AuditTrailCard({ invoice }: AuditTrailCardProps) {
  const finalAt =
    invoice.decidedAt ??
    invoice.confirmedAt ??
    (invoice.status !== "waiting" ? invoice.detectedAt : null);

  const showFinalLine =
    invoice.status !== "waiting" && invoice.status !== "confirmed";

  return (
    <section className="apple-card apple-card-content p-4 md:p-6">
      <h2 className="section-title">Audit trail</h2>
      <p className="mt-1 text-[11px] text-slate-500">
        Immutable log of compliance-relevant events.
      </p>

      <div className="mt-4 space-y-2 text-[11px]">
        {/* Invoice created */}
        <div className="flex items-center justify-between rounded-xl bg-slate-900/60 px-3 py-2 ring-1 ring-slate-800/80">
          <span className="text-slate-300">Invoice created</span>
          <span className="text-slate-500">
            {formatDateTime(invoice.createdAt)}
          </span>
        </div>

        {/* Tx attached */}
        {invoice.txHash ? (
          <div className="flex items-center justify-between rounded-xl bg-slate-900/60 px-3 py-2 ring-1 ring-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="text-slate-300">
                Transaction detected (tx attached)
              </span>
              <CopyButton value={invoice.txHash} size="sm" />
            </div>
            <span className="text-slate-500">
              {formatDateTime(invoice.detectedAt ?? null)}
            </span>
          </div>
        ) : null}

        {/* AML run */}
        {invoice.amlStatus ? (
          <div className="flex items-center justify-between rounded-xl bg-slate-900/60 px-3 py-2 ring-1 ring-slate-800/80">
            <span className="text-slate-300">
              AML screening completed ({invoice.amlProvider ?? "provider"} ·{" "}
              {invoice.amlStatus})
            </span>
            <span className="text-slate-500">
              {formatDateTime(invoice.amlCheckedAt ?? null)}
            </span>
          </div>
        ) : null}

        {/* Invoice confirmed (single source) */}
        {invoice.status === "confirmed" ? (
          <div className="flex items-center justify-between rounded-xl bg-slate-900/60 px-3 py-2 ring-1 ring-slate-800/80">
            <span className="text-emerald-300">Invoice confirmed</span>
            <span className="text-slate-500">
              {formatDateTime(invoice.confirmedAt ?? finalAt)}
            </span>
          </div>
        ) : null}

        {/* Operator decision */}
        {invoice.decidedAt ? (
          <div className="flex items-center justify-between rounded-xl bg-slate-900/60 px-3 py-2 ring-1 ring-slate-800/80">
            <span className="text-slate-300">
              Decision {invoice.decisionStatus ?? "—"}
              {invoice.decidedBy ? ` (by ${invoice.decidedBy})` : ""}
            </span>
            <span className="text-slate-500">
              {formatDateTime(invoice.decidedAt)}
            </span>
          </div>
        ) : null}

        {/* Final status line for non-confirmed terminal states */}
        {showFinalLine ? (
          <div className="flex items-center justify-between rounded-xl bg-slate-900/60 px-3 py-2 ring-1 ring-slate-800/80">
            <span
              className={
                invoice.status === "rejected"
                  ? "text-red-300"
                  : invoice.status === "expired"
                  ? "text-amber-300"
                  : "text-slate-300"
              }
            >
              Invoice {invoice.status}
            </span>
            <span className="text-slate-500">{formatDateTime(finalAt)}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
