"use client";

import { useMemo, useState } from "react";
import type { Invoice, DecisionStatus, SanctionsStatus } from "@/shared/api/pspApi";

import { ComplianceMetaGrid } from "./components/ComplianceMetaGrid";
import { ComplianceBanner } from "./components/ComplianceBanner";

type Suggested = {
  status: Exclude<DecisionStatus, null>;
  reasonCode: string;
  summary: string;
};

type Props = {
  invoice: Invoice;
  onDecide: (payload: {
    status: Exclude<DecisionStatus, null>;
    reasonCode: string;
    comment?: string;
  }) => Promise<void> | void;
};

function getAmountTier(fiatAmount: number): "small" | "medium" | "large" {
  if (fiatAmount < 500) return "small";
  if (fiatAmount < 2000) return "medium";
  return "large";
}

function getSuggestedDecision(invoice: Invoice): Suggested {
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

function isInvoiceClosed(status: Invoice["status"]) {
  return (
    status === "confirmed" || status === "expired" || status === "rejected"
  );
}

function buttonTone(
  action: "approve" | "hold" | "reject",
  suggested: "approve" | "hold" | "reject"
) {
  return action === suggested ? "primary" : "secondary";
}

function stripeActionClass(
  action: "approve" | "hold" | "reject",
  tone: "primary" | "secondary"
) {
  const base = [
    "inline-flex items-center justify-center rounded-lg border px-3 py-2",
    "text-[12px] font-medium",
    "transition",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600/50",
    "disabled:cursor-not-allowed disabled:opacity-60",
  ].join(" ");

  const secondary =
    "border-slate-800 bg-transparent text-slate-200 hover:bg-slate-900/30";

  if (tone === "secondary") {
    return [base, secondary].join(" ");
  }

  // Primary (Stripe-dark subtle emphasis)
  if (action === "approve") {
    return [
      base,
      "border-emerald-500/35 bg-slate-900/10 text-slate-50 hover:bg-slate-900/30",
    ].join(" ");
  }

  if (action === "hold") {
    return [
      base,
      "border-amber-500/35 bg-slate-900/10 text-slate-50 hover:bg-slate-900/30",
    ].join(" ");
  }

  return [
    base,
    "border-rose-500/35 bg-slate-900/10 text-slate-50 hover:bg-slate-900/30",
  ].join(" ");
}

export function ComplianceDecisionCard({ invoice, onDecide }: Props) {
  const suggested = useMemo(() => getSuggestedDecision(invoice), [invoice]);

  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState<DecisionStatus>(null);
  const [error, setError] = useState<string | null>(null);

  const locked = isInvoiceClosed(invoice.status);
  const isAutoConfirmed = invoice.status === "confirmed";

  const needsCommentNow =
    !locked && (suggested.status === "hold" || suggested.status === "reject");

  const commentTrim = comment.trim();

  async function submit(
    status: Exclude<DecisionStatus, null>,
    reasonCode: string
  ) {
    if (locked) return;

    const requiresComment = status === "hold" || status === "reject";
    const c = comment.trim();

    if (requiresComment && c.length < 3) {
      setError("Comment is required for HOLD / REJECT (min 3 chars).");
      return;
    }

    try {
      setError(null);
      setSubmitting(status);
      await onDecide({ status, reasonCode, comment: c || undefined });
      setComment("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to submit decision");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <section className="apple-card apple-card-content p-4 md:p-6">
      <ComplianceBanner
        invoice={invoice}
        suggested={suggested}
        locked={locked}
      />

      {/* Demo note (Stripe-dark, subtle) */}
      {isAutoConfirmed ? (
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/20 px-4 py-2 text-[12px] text-slate-400">
          <span className="font-medium text-slate-300">Demo:</span> This invoice
          was auto-confirmed before compliance review. Panel is shown for
          audit/policy.
        </div>
      ) : null}

      <ComplianceMetaGrid invoice={invoice} />

      {/* Operator comment */}
      <div className="mt-4">
        <div className="flex items-end justify-between gap-3">
          <label className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Operator comment{" "}
            {!locked ? (
              <span className="text-slate-600">
                {needsCommentNow
                  ? "(recommended now)"
                  : "(required for HOLD/REJECT)"}
              </span>
            ) : null}
          </label>

          {!locked ? (
            <div className="text-[11px] text-slate-600">
              {commentTrim.length}/500
            </div>
          ) : null}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 500))}
          disabled={locked}
          rows={2}
          placeholder={
            locked ? "Invoice is closed." : "Add notes for audit trail…"
          }
          className={[
            "mt-2 w-full rounded-xl border border-slate-800 bg-slate-900/30 p-3",
            "text-[12px] text-slate-100 placeholder:text-slate-600",
            "focus:outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-700/30",
            "disabled:cursor-not-allowed disabled:opacity-60",
          ].join(" ")}
        />

        {error ? (
          <p className="mt-2 text-[11px] text-rose-200">{error}</p>
        ) : null}
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(["approve", "hold", "reject"] as const).map((action) => {
          const tone = buttonTone(action, suggested.status);
          const label =
            action === "approve"
              ? "Approve"
              : action === "hold"
              ? "Hold"
              : "Reject";
          const busy =
            submitting === action
              ? action === "approve"
                ? "Approving…"
                : action === "hold"
                ? "Holding…"
                : "Rejecting…"
              : null;

          return (
            <button
              key={action}
              type="button"
              disabled={locked || submitting !== null}
              onClick={() =>
                submit(
                  action,
                  suggested.status === action
                    ? suggested.reasonCode
                    : `MANUAL_${action.toUpperCase()}`
                )
              }
              className={stripeActionClass(action, tone)}
            >
              {busy ?? label}
            </button>
          );
        })}

        <div className="ml-auto text-[11px] text-slate-600">
          {locked
            ? "Decisions are locked (invoice closed)."
            : "Decision is written to audit trail (reason + comment)."}
        </div>
      </div>
    </section>
  );
}
