"use client";

import { useMemo, useState } from "react";
import type { Invoice, DecisionStatus, SanctionsStatus } from "@/lib/pspApi";

type Props = {
  invoice: Invoice;
  onDecide: (payload: {
    status: Exclude<DecisionStatus, null>;
    reasonCode: string;
    comment?: string;
  }) => Promise<void> | void;
};

function formatFiatChf(amount: number) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)} CHF`;
}

function getAmountTier(fiatAmount: number): "small" | "medium" | "large" {
  // ⚠️ Это “policy tiers”, не “legal thresholds”
  if (fiatAmount < 500) return "small";
  if (fiatAmount < 2000) return "medium";
  return "large";
}

function suggestedDecision(invoice: Invoice): {
  status: Exclude<DecisionStatus, null>;
  reasonCode: string;
  summary: string;
} {
  const aml = invoice.amlStatus ?? null;
  const sanctions: SanctionsStatus = invoice.sanctions?.status ?? null;
  const tier = getAmountTier(invoice.fiatAmount);

  if (sanctions === "hit") {
    return {
      status: "reject",
      reasonCode: "SANCTIONS_HIT",
      summary:
        "Sanctions hit detected. Transaction must be rejected and escalated.",
    };
  }

  if (aml === "blocked") {
    return {
      status: "reject",
      reasonCode: "AML_BLOCKED",
      summary: "AML status is BLOCKED. Transaction must be rejected.",
    };
  }

  if (aml === "risky") {
    return {
      status: "reject",
      reasonCode: "AML_HIGH_RISK",
      summary: "High-risk AML result. Reject by policy.",
    };
  }

  if (aml === "warning") {
    return {
      status: "hold",
      reasonCode: "AML_WARNING_HOLD",
      summary: "AML warning. Hold for enhanced screening / manual review.",
    };
  }

  // aml clean / null:
  if (tier === "large") {
    return {
      status: "hold",
      reasonCode: "TIER2_LARGE_AMOUNT",
      summary: "Large amount tier. Hold for manual review (comment required).",
    };
  }

  return {
    status: "approve",
    reasonCode: tier === "small" ? "TIER0_AUTO_APPROVE" : "TIER1_APPROVE",
    summary: "Low/medium amount with no risk flags. Approve is allowed.",
  };
}

function pillClass(kind: "approve" | "hold" | "reject") {
  switch (kind) {
    case "approve":
      return "border-emerald-500/50 bg-emerald-500/10 text-emerald-100";
    case "hold":
      return "border-amber-500/50 bg-amber-500/10 text-amber-100";
    case "reject":
      return "border-rose-500/60 bg-rose-500/10 text-rose-100";
  }
}

function buttonClass(kind: "approve" | "hold" | "reject") {
  switch (kind) {
    case "approve":
      return "border-emerald-500/60 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20";
    case "hold":
      return "border-amber-500/60 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20";
    case "reject":
      return "border-rose-500/70 bg-rose-500/12 text-rose-100 hover:bg-rose-500/20";
  }
}

function isClosed(status: Invoice["status"]) {
  return (
    status === "confirmed" || status === "expired" || status === "rejected"
  );
}

export function ComplianceDecisionCard({ invoice, onDecide }: Props) {
  const suggested = useMemo(() => suggestedDecision(invoice), [invoice]);

  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState<DecisionStatus>(null);
  const [error, setError] = useState<string | null>(null);

  const locked = isClosed(invoice.status);

  const isAutoConfirmed = invoice.status === "confirmed";

  const sanctions = invoice.sanctions ?? null;

  async function submit(
    status: Exclude<DecisionStatus, null>,
    reasonCode: string
  ) {
    if (locked) return;

    const needsComment = status === "hold" || status === "reject";
    const c = comment.trim();

    if (needsComment && c.length < 3) {
      setError("Comment is required for HOLD / REJECT (min 3 chars).");
      return;
    }

    try {
      setError(null);
      setSubmitting(status);
      await onDecide({ status, reasonCode, comment: c || undefined });
      setComment(""); // clear after success
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to submit decision");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <section className="apple-card apple-card-content p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h2 className="section-title">Compliance decision</h2>
          <p className="text-[11px] text-slate-500">
            Funds remain isolated until a compliance decision is made. Final
            responsibility remains with the PSP.
          </p>
        </div>

        <div className="flex flex-col items-start gap-1 text-[11px] text-slate-400 md:items-end">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ring-1 ${pillClass(
              suggested.status
            )}`}
          >
            <span className="uppercase tracking-[0.18em]">
              Suggested:{" "}
              <span className="text-slate-50">
                {suggested.status.toUpperCase()}
              </span>
            </span>
            <span className="text-slate-400">·</span>
            <span className="font-mono text-slate-300">
              {suggested.reasonCode}
            </span>
          </span>
          <span className="max-w-2xl text-xs text-slate-500 md:text-right">
            {suggested.summary}
          </span>
        </div>
      </div>

      {isAutoConfirmed && (
        <div className="mt-4 rounded-2xl bg-slate-900/60 p-3 ring-1 ring-slate-800/80">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Demo note
          </p>
          <p className="mt-1 text-[11px] text-[rgb(0,136,255)]">
            This invoice was auto-confirmed before manual compliance review. The
            decision panel is shown for audit and policy demonstration purposes.
          </p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-900/60 p-3 ring-1 ring-slate-800/80">
          <p className="text-[11px] uppercase text-slate-500">Amount tier</p>
          <p className="mt-1 text-sm font-semibold text-slate-50">
            {getAmountTier(invoice.fiatAmount).toUpperCase()}{" "}
            <span className="text-[11px] font-normal text-slate-400">
              ·· {formatFiatChf(invoice.fiatAmount)}
            </span>
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/60 p-3 ring-1 ring-slate-800/80">
          <p className="text-[11px] uppercase text-slate-500">Sanctions</p>
          <p className="mt-1 text-sm font-semibold text-slate-50">
            {(sanctions?.status ?? "—").toString().toUpperCase()}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {sanctions?.provider
              ? `Source: ${sanctions.provider}`
              : "Source: —"}
            {sanctions?.reasonCode ? ` · ${sanctions.reasonCode}` : ""}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/60 p-3 ring-1 ring-slate-800/80">
          <p className="text-[11px] uppercase text-slate-500">Policy note</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Policy tiers are internal workflow levels (not legal thresholds).
          </p>
        </div>
      </div>

      <div className="mt-4">
        <label className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
          Operator comment {locked ? "" : "(required for HOLD/REJECT)"}
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={locked}
          rows={2}
          placeholder={
            locked
              ? "Invoice is closed."
              : "Add justification / notes for audit trail…"
          }
          className="mt-2 w-full rounded-2xl bg-slate-900/60 p-3 text-[12px] text-slate-100
                     ring-1 ring-slate-800/80 placeholder:text-slate-600
                     focus:outline-none focus:ring-2 focus:ring-slate-700/80
                     disabled:cursor-not-allowed disabled:opacity-60"
        />
        {error && <p className="mt-2 text-[11px] text-rose-200">{error}</p>}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={locked || submitting !== null}
          onClick={() =>
            submit(
              "approve",
              suggested.status === "approve"
                ? suggested.reasonCode
                : "MANUAL_APPROVE"
            )
          }
          className={`inline-flex min-w-110px items-center justify-center rounded-full border px-4 py-1.5
                      text-[11px] font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60
                      ${buttonClass("approve")}`}
        >
          {submitting === "approve" ? "Approving…" : "Approve"}
        </button>

        <button
          type="button"
          disabled={locked || submitting !== null}
          onClick={() =>
            submit(
              "hold",
              suggested.status === "hold" ? suggested.reasonCode : "MANUAL_HOLD"
            )
          }
          className={`inline-flex min-w-110px items-center justify-center rounded-full border px-4 py-1.5
                      text-[11px] font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60
                      ${buttonClass("hold")}`}
        >
          {submitting === "hold" ? "Holding…" : "Hold"}
        </button>

        <button
          type="button"
          disabled={locked || submitting !== null}
          onClick={() =>
            submit(
              "reject",
              suggested.status === "reject"
                ? suggested.reasonCode
                : "MANUAL_REJECT"
            )
          }
          className={`inline-flex min-w-110px items-center justify-center rounded-full border px-4 py-1.5
                      text-[11px] font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60
                      ${buttonClass("reject")}`}
        >
          {submitting === "reject" ? "Rejecting…" : "Reject"}
        </button>

        {locked && (
          <span className="text-[11px] text-slate-500">
            Invoice is closed. Compliance decisions are locked.
          </span>
        )}
      </div>
    </section>
  );
}
