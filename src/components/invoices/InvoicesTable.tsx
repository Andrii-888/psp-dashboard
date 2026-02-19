"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Invoice } from "@/lib/pspApi";
import {
  StatusBadge,
  getStatusTextClass,
} from "@/components/invoices/StatusBadge";
import { AmlBadge } from "@/components/invoices/AmlBadge";
import { formatDateTimeCH } from "@/lib/formatters";

function formatDate(dateIso: string) {
  return formatDateTimeCH(dateIso);
}

function formatFiatChf(amount: number) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)} CHF`;
}

function formatAsset(amount: number, asset: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  const a = (asset ?? "").trim();
  return a ? `${n.toFixed(2)} ${a}` : `${n.toFixed(2)}`;
}

type InvoiceRow = Invoice & {
  decisionStatus?: string | null;
  txStatus?: string | null;
  decisionDueAt?: string | null;
  ui?: {
    stage?: string;
    needsDecision?: boolean;
    readyForSettlement?: boolean;
    badgeTone?: string;
  } | null;
};

interface InvoicesTableProps {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
}

function getDecisionSla(inv: InvoiceRow, nowMs: number) {
  // Show SLA only while decision is actually required
  const uiNeedsDecision = inv.ui?.needsDecision === true;

  const decisionStatus = String(inv.decisionStatus ?? "").toLowerCase();
  const isDecided =
    !!inv.decidedAt ||
    decisionStatus === "approved" ||
    decisionStatus === "rejected";

  if (!uiNeedsDecision || isDecided) return null;

  // Do not show for terminal invoice lifecycle states
  const st = (inv.status ?? "").toLowerCase();
  const isFinal = st === "rejected" || st === "expired" || st === "failed";

  if (isFinal) return null;

  if (!inv.decisionDueAt) return null;

  // Show only when there is a real case (tx detected/confirmed or AML present)
  const tx = (inv.txStatus ?? "").toLowerCase();
  const hasTx = tx === "detected" || tx === "confirmed";
  const hasAml = inv.amlStatus != null;

  if (!hasTx && !hasAml) return null;

  const dueMs = Date.parse(inv.decisionDueAt);
  if (!Number.isFinite(dueMs)) return null;

  const diff = dueMs - nowMs;
  const overdue = diff <= 0;
  const abs = Math.abs(diff);

  const totalSec = Math.floor(abs / 1000);
  const sec = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const min = totalMin % 60;
  const hrs = Math.floor(totalMin / 60);

  const short =
    hrs > 0
      ? `${hrs}h ${String(min).padStart(2, "0")}m`
      : `${totalMin}m ${String(sec).padStart(2, "0")}s`;

  const BREACH_CUTOFF_MIN = 60;
  const overdueMin = Math.floor(abs / 60000);
  const breached = overdue && overdueMin >= BREACH_CUTOFF_MIN;

  return {
    overdue,
    text: !overdue
      ? `${short} left`
      : breached
      ? "SLA breached"
      : `Overdue ${short}`,
  };
}

function SkeletonRow() {
  return (
    <tr className="rounded-2xl bg-slate-900/40">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <div className="h-3 w-full animate-pulse rounded bg-slate-800/60" />
        </td>
      ))}
    </tr>
  );
}

export function InvoicesTable({
  invoices,
  loading,
  error,
}: InvoicesTableProps) {
  const router = useRouter();

  const [nowMs, setNowMs] = React.useState<number>(() => new Date().getTime());

  React.useEffect(() => {
    const t = window.setInterval(() => {
      setNowMs(new Date().getTime());
    }, 1000);

    return () => window.clearInterval(t);
  }, []);

  const openDetails = (id: string) => {
    router.push(`/invoices/${id}`);
  };

  const onRowKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openDetails(id);
    }
  };

  return (
    <div className="overflow-x-auto">
      {error && (
        <div className="mb-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          <div className="font-medium">Failed to load invoices</div>
          <div className="mt-0.5 text-xs opacity-90">{error}</div>
        </div>
      )}

      <table className="min-w-full border-separate border-spacing-y-1">
        <thead>
          <tr className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
            <th className="px-3 py-2 text-left">ID</th>
            <th className="px-3 py-2 text-left">Created</th>
            <th className="px-3 py-2 text-right">Amount</th>
            <th className="px-3 py-2 text-center">Status</th>
            <th className="px-3 py-2 text-left">AML</th>
            <th className="px-3 py-2 text-left">FX</th>
            <th className="px-3 py-2 text-left">Network</th>
            <th className="px-3 py-2 text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
          {loading &&
            invoices.length === 0 &&
            Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={`sk-${i}`} />
            ))}

          {!loading && invoices.length === 0 && !error && (
            <tr>
              <td colSpan={8}>
                <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
                  <p className="text-sm font-medium text-slate-200">
                    No invoices found
                  </p>
                  <p className="text-xs text-slate-500">
                    Try adjusting filters or wait for new payments.
                  </p>
                </div>
              </td>
            </tr>
          )}

          {invoices.map((inv) => {
            const row = inv as InvoiceRow;

            return (
              <tr
                key={inv.id}
                tabIndex={0}
                role="button"
                aria-label={`Open invoice ${inv.id}`}
                onClick={() => openDetails(inv.id)}
                onKeyDown={(e) => onRowKeyDown(e, inv.id)}
                className="group cursor-pointer rounded-2xl bg-slate-900/60 text-xs text-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.55)] transition-all hover:bg-slate-900/90 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                <td
                  className={[
                    "max-w-xs truncate px-3 py-3 font-mono text-[11px] font-semibold",
                    getStatusTextClass(inv.status),
                  ].join(" ")}
                >
                  {inv.id}
                </td>

                {/* Created / Expires */}
                <td className="px-3 py-3 text-[11px] text-slate-400">
                  <div>{formatDate(inv.createdAt)}</div>
                  <div className="mt-0.5 text-[10px] text-slate-500">
                    Expires: {formatDate(inv.expiresAt)}
                  </div>
                </td>

                {/* Amounts */}
                <td className="whitespace-nowrap px-3 py-3 text-right text-xs font-semibold text-slate-50">
                  <div>{formatFiatChf(inv.fiatAmount)}</div>
                  <div className="mt-0.5 text-[10px] text-slate-500">
                    {formatAsset(inv.cryptoAmount, inv.cryptoCurrency)}
                  </div>
                </td>

                {/* Status */}
                <td className="px-3 py-3 align-top">
                  <div className="flex flex-col items-center justify-start gap-1 pt-1">
                    <StatusBadge status={inv.status} />

                    {(() => {
                      const sla = getDecisionSla(row, nowMs);
                      if (!sla) return null;

                      return (
                        <div
                          className={[
                            "text-[10px] font-medium",
                            sla.overdue ? "text-rose-300" : "text-slate-500",
                          ].join(" ")}
                        >
                          {sla.text}
                        </div>
                      );
                    })()}
                  </div>
                </td>

                {/* AML */}
                <td className="px-3 py-3 align-top">
                  <AmlBadge
                    amlStatus={inv.amlStatus ?? null}
                    riskScore={inv.riskScore ?? null}
                    assetStatus={inv.assetStatus ?? null}
                    assetRiskScore={inv.assetRiskScore ?? null}
                  />
                </td>

                {/* FX */}
                <td className="px-3 py-3 text-[11px] text-slate-400">
                  {typeof inv.fxRate === "number" &&
                  Number.isFinite(inv.fxRate) &&
                  inv.fxRate > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="uppercase tracking-[0.16em] text-slate-500">
                        {inv.fxPair ?? "FX"}
                      </span>
                      <span className="font-mono text-[11px] text-slate-300">
                        {inv.fxRate.toFixed(4)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">—</span>
                  )}
                </td>

                {/* Network / tx hash */}
                <td className="px-3 py-3 text-[11px] text-slate-400">
                  {inv.network ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="uppercase tracking-[0.16em] text-slate-500">
                        {inv.network}
                      </span>
                      {inv.txHash && (
                        <span className="max-w-48 truncate font-mono text-[10px] text-slate-400">
                          {inv.txHash}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">—</span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-3 py-3">
                  {inv.id ? (
                    <Link
                      href={`/invoices/${encodeURIComponent(
                        inv.id
                      )}/payment-record`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center whitespace-nowrap rounded-full bg-slate-800/70 px-3 py-1 text-[11px] font-medium text-slate-50 ring-1 ring-slate-700/80 transition hover:bg-slate-700 hover:ring-slate-500"
                    >
                      View Payment Record
                    </Link>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-900/60 px-3 py-1 text-[11px] text-slate-500 ring-1 ring-slate-800/70">
                      —
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
