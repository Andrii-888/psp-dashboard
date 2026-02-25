"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Invoice } from "@/shared/api/pspApi";
import { getStatusTextClass } from "@/shared/ui/invoices/StatusBadge";
import { AmlBadge } from "@/shared/ui/invoices/AmlBadge";
import { CopyButton } from "@/shared/ui/components/CopyButton";
import { InvoiceStatusChips } from "./InvoiceStatusChips";
import { formatDateTimeCH } from "@/shared/lib/formatters";

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
    stage?: string | null;
    needsDecision?: boolean;
    readyForSettlement?: boolean;
    badgeTone?: string | null;
  } | null;
};

interface InvoicesTableProps {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
}

function getDecisionSla(inv: InvoiceRow, nowMs: number) {
  // 1️⃣ Show ONLY when operator action is required (SSOT from backend)
  if (!inv.ui?.needsDecision) return null;

  // 2️⃣ Never show after decision is made
  const decisionStatus = String(inv.decisionStatus ?? "").toLowerCase();
  if (
    inv.decidedAt ||
    decisionStatus === "approved" ||
    decisionStatus === "rejected"
  ) {
    return null;
  }

  // 3️⃣ Must have valid SLA deadline
  if (!inv.decisionDueAt) return null;

  const dueMs = Date.parse(inv.decisionDueAt);
  if (!Number.isFinite(dueMs)) return null;

  // 4️⃣ Must be a real actionable case (tx or AML exists)
  const tx = String(inv.txStatus ?? "").toLowerCase();
  const hasTx = tx === "detected" || tx === "confirmed";
  const hasAml = inv.amlStatus != null;

  if (!hasTx && !hasAml) return null;

  // 5️⃣ Calculate time difference
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

type DecisionUi = {
  label: "Approved" | "Rejected" | "Hold";
  badgeClass: string;
};

function getDecisionUi(decisionStatus: unknown): DecisionUi | null {
  const ds =
    typeof decisionStatus === "string"
      ? decisionStatus.trim().toLowerCase()
      : "";
  if (!ds) return null;

  if (ds === "approved" || ds === "approve") {
    return {
      label: "Approved",
      badgeClass: "bg-emerald-500/10 text-emerald-200 ring-emerald-400/25",
    };
  }

  if (ds === "rejected" || ds === "reject") {
    return {
      label: "Rejected",
      badgeClass: "bg-rose-500/10 text-rose-200 ring-rose-400/25",
    };
  }

  if (ds === "hold") {
    return {
      label: "Hold",
      badgeClass: "bg-amber-500/10 text-amber-200 ring-amber-400/25",
    };
  }

  return null;
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
            <th className="px-3 py-2 text-center">AML</th>
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
                <div className="mx-auto my-6 max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6 text-center shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-md">
                  <div className="text-sm font-semibold text-white">
                    No invoices match current filters
                  </div>
                  <div className="mt-1 text-xs text-slate-300">
                    If you opened this from a KPI, it may simply mean there are
                    zero items in the current dataset.
                  </div>

                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => router.push("/invoices")}
                      className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/15 hover:bg-white/15"
                    >
                      Reset filters
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push("/invoices?decision=queue")}
                      className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/10 hover:bg-white/10"
                    >
                      Open queue
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          )}

          {invoices.map((row) => {
            const inv = row as unknown as InvoiceRow;

            const risk = Number(inv.riskScore);
            const asset = Number(inv.assetRiskScore);
            const maxRisk = Math.max(
              Number.isFinite(risk) ? risk : 0,
              Number.isFinite(asset) ? asset : 0
            );
            const isHighRisk = maxRisk >= 70;

            return (
              <tr
                key={inv.id}
                tabIndex={0}
                role="button"
                aria-label={`Open invoice ${inv.id}`}
                onClick={() => openDetails(inv.id)}
                onKeyDown={(e) => onRowKeyDown(e, inv.id)}
                className={[
                  "group cursor-pointer rounded-2xl bg-slate-900/60 text-xs text-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.55)] transition-all hover:bg-slate-900/90 focus:outline-none focus:ring-2 focus:ring-violet-500/50",
                  isHighRisk
                    ? "ring-1 ring-rose-500/25 bg-rose-500/5 hover:bg-rose-500/10"
                    : "",
                ].join(" ")}
              >
                <td
                  className={[
                    "max-w-xs truncate px-3 py-3 font-mono text-[11px] font-semibold",
                    getStatusTextClass(inv.status),
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="shrink-0"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onKeyDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label="Copy invoice id"
                      title="Copy invoice id"
                    >
                      <CopyButton value={String(inv.id)} />
                    </div>

                    <span className="truncate">{inv.id}</span>
                  </div>
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
                    <InvoiceStatusChips invoice={inv} showAxes={false} />

                    {(() => {
                      const row = inv as unknown as InvoiceRow;

                      const decisionUi = getDecisionUi(row.decisionStatus);

                      // ✅ 1) After operator decision — show it (instead of SLA time)
                      if (decisionUi) {
                        return (
                          <div className="mt-1 flex flex-col items-center gap-1">
                            <div className="text-[11px] text-slate-500">
                              Decision due
                            </div>

                            <span
                              className={[
                                "inline-flex items-center justify-center",
                                "h-6 min-w-24 px-3",
                                "rounded-full text-[11px] font-semibold",
                                "ring-1",
                                decisionUi.badgeClass,
                              ].join(" ")}
                            >
                              {decisionUi.label}
                            </span>
                          </div>
                        );
                      }

                      // ✅ 2) If backend says decision is required — show SLA countdown
                      if (row.ui?.needsDecision === true) {
                        if (!row.decisionDueAt) return null;

                        const sla = getDecisionSla(row, nowMs);
                        if (!sla) return null;

                        return (
                          <div className="mt-1 flex flex-col items-center gap-1">
                            <div className="text-[11px] text-slate-500">
                              Operator decision
                            </div>

                            <span
                              className={[
                                "inline-flex items-center justify-center",
                                "h-6 min-w-24 px-3",
                                "rounded-full text-[11px] font-semibold",
                                "ring-1",
                                sla.overdue
                                  ? "bg-rose-500/10 text-rose-200 ring-rose-400/25"
                                  : "bg-slate-500/10 text-slate-200 ring-slate-400/25",
                              ].join(" ")}
                            >
                              {sla.text}
                            </span>
                          </div>
                        );
                      }

                      return null;
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
