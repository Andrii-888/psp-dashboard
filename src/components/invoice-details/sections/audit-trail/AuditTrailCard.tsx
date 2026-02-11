"use client";

import type { Invoice } from "@/lib/pspApi";
import { formatDateTimeCH } from "@/lib/formatters";

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  return formatDateTimeCH(iso);
}

interface AuditTrailCardProps {
  invoice: Invoice;
}

export function AuditTrailCard({ invoice }: AuditTrailCardProps) {
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
        {invoice.txHash && (
          <div className="flex items-center justify-between rounded-xl bg-slate-900/60 px-3 py-2 ring-1 ring-slate-800/80">
            <span className="text-slate-300">
              Transaction detected (tx attached)
            </span>
            <span className="text-slate-500">—</span>
          </div>
        )}

        {/* AML run */}
        {invoice.amlStatus && (
          <div className="flex items-center justify-between rounded-xl bg-slate-900/60 px-3 py-2 ring-1 ring-slate-800/80">
            <span className="text-slate-300">AML screening completed</span>
            <span className="text-slate-500">—</span>
          </div>
        )}

        {/* Final decision */}
        {invoice.status !== "waiting" && (
          <div className="flex items-center justify-between rounded-xl bg-slate-900/60 px-3 py-2 ring-1 ring-slate-800/80">
            <span className="text-slate-300">Invoice {invoice.status}</span>
            <span className="text-slate-500">—</span>
          </div>
        )}
      </div>
    </section>
  );
}
