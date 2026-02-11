"use client";

import type { Invoice } from "@/lib/pspApi";

interface OperatorActionsCardProps {
  invoice: Invoice;
  onConfirm: () => void;
  onExpire: () => void;
  onReject: () => void;
}

function getStatusLabel(status: Invoice["status"]): string {
  switch (status) {
    case "waiting":
      return "WAITING";
    case "confirmed":
      return "CONFIRMED";
    case "expired":
      return "EXPIRED";
    case "rejected":
      return "REJECTED";
    default:
      console.warn("⚠️ Unknown invoice status received:", status);
      return String(status).toUpperCase();
  }
}

function getStatusDescription(status: Invoice["status"]): string {
  switch (status) {
    case "waiting":
      return "Invoice is open. Actions available until it becomes final (confirmed/expired/rejected).";
    case "confirmed":
      return "This invoice is confirmed (final).";
    case "expired":
      return "This invoice is expired (final).";
    case "rejected":
      return "This invoice is rejected (final).";
    default:
      return "";
  }
}

export function OperatorActionsCard({
  invoice,
  onConfirm,
  onExpire,
  onReject,
}: OperatorActionsCardProps) {
  const isFinal =
    invoice.status === "confirmed" ||
    invoice.status === "expired" ||
    invoice.status === "rejected";

  const isWaiting = invoice.status === "waiting";

  const hasTx = !!invoice.txHash && invoice.txHash.trim().length > 0;

  // AML result is stored when amlStatus is not null
  const hasAmlResult = invoice.amlStatus !== null;

  // "Top" gating:
  // - Confirm only if: waiting + txHash present + AML result present
  // - Expire/Reject only if: waiting (and not final)
  const canConfirm = isWaiting && !isFinal && hasTx && hasAmlResult;
  const canExpire = isWaiting && !isFinal;
  const canReject = isWaiting && !isFinal;

  return (
    <section className="apple-card apple-card-content p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="section-title">Operator actions</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Demo-only controls. In production, status changes are performed by
            PSP Core automatically after TX + compliance checks.
          </p>
        </div>

        <div className="flex flex-col items-start gap-1 text-[11px] text-slate-400 md:items-end">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/70 px-3 py-1 ring-1 ring-slate-700/70">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="uppercase tracking-[0.18em] text-slate-300">
              Current status:{" "}
              <span className="text-slate-50">
                {getStatusLabel(invoice.status)}
              </span>
            </span>
          </span>

          <span className="text-[11px] text-slate-500">
            {getStatusDescription(invoice.status)}
          </span>

          {/* Helpful gating hint (no style changes, just a small line) */}
          {!isFinal && isWaiting ? (
            <span className="text-[11px] text-slate-500">
              Confirm requires: <span className="text-slate-300">txHash</span> +{" "}
              <span className="text-slate-300">AML result</span>
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onConfirm}
          disabled={!canConfirm}
          className="inline-flex min-w-90px items-center justify-center rounded-full
                     border border-emerald-500/60 bg-emerald-500/10 px-4 py-1.5
                     text-[11px] font-medium text-emerald-100 shadow-sm
                     transition hover:bg-emerald-500/20
                     disabled:cursor-not-allowed disabled:opacity-60"
        >
          Confirm
        </button>

        <button
          type="button"
          onClick={onExpire}
          disabled={!canExpire}
          className="inline-flex min-w-90px items-center justify-center rounded-full
                     border border-amber-500/60 bg-amber-500/10 px-4 py-1.5
                     text-[11px] font-medium text-amber-100 shadow-sm
                     transition hover:bg-amber-500/20
                     disabled:cursor-not-allowed disabled:opacity-60"
        >
          Expire
        </button>

        <button
          type="button"
          onClick={onReject}
          disabled={!canReject}
          className="inline-flex min-w-90px items-center justify-center rounded-full
                     border border-rose-500/70 bg-rose-500/12 px-4 py-1.5
                     text-[11px] font-medium text-rose-100 shadow-sm
                     transition hover:bg-rose-500/20
                     disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reject
        </button>
      </div>
    </section>
  );
}
