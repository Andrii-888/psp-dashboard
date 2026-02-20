// src/components/invoice-details/sections/operator-actions/DecisionRail.tsx
"use client";

import * as React from "react";
import { formatDateTimeCH } from "@/lib/formatters";

type DecisionRailProps = {
  disabled?: boolean;

  // backend SSOT hints
  needsDecision?: boolean;
  decisionStatus?: string | null;
  decidedAt?: string | null;
  decidedBy?: string | null;
  slaText?: string | null;

  onApprove?: () => void;
  onReject?: (reasonText?: string) => void;
  onHold?: (reasonText?: string) => void;
};

function formatShortDate(iso: string): string {
  const s = String(iso ?? "").trim();
  if (!s) return "—";

  try {
    return formatDateTimeCH(s);
  } catch {
    return "—";
  }
}

type PendingAction = "reject" | "hold" | null;

export function DecisionRail({
  disabled = false,

  needsDecision = false,
  decisionStatus,
  decidedAt,
  decidedBy,
  slaText,

  onApprove,
  onReject,
  onHold,
}: DecisionRailProps) {
  const [pending, setPending] = React.useState<PendingAction>(null);
  const [reason, setReason] = React.useState<string>("");

  const ds =
    typeof decisionStatus === "string"
      ? decisionStatus.trim().toLowerCase()
      : "";
  const isDecided =
    !!decidedAt || ds === "approved" || ds === "rejected" || ds === "hold";

  const canAct = !disabled && needsDecision && !isDecided;

  const baseBtn = [
    "h-10 w-full",
    "rounded-xl",
    "px-3",
    "text-sm font-semibold",
    "transition",
    "active:translate-y-[0.5px]",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40",
  ].join(" ");

  const appleSurface = [
    "ring-1",
    "bg-slate-900/40",
    "hover:bg-slate-900/60",
    "shadow-[0_10px_30px_rgba(0,0,0,0.35)]",
  ].join(" ");

  const metaText = isDecided
    ? `${ds || "decided"}${decidedBy ? ` · ${decidedBy}` : ""}${
        decidedAt ? ` · ${formatShortDate(decidedAt)}` : ""
      }`
    : null;

  const needsText =
    needsDecision && !isDecided ? "Operator decision required" : null;

  const safeSla =
    !isDecided && needsDecision && typeof slaText === "string" && slaText.trim()
      ? slaText.trim()
      : null;

  function resetConfirm() {
    setPending(null);
    setReason("");
  }

  function startConfirm(action: PendingAction) {
    if (!canAct) return;
    setPending(action);
    setReason("");
  }

  function confirm() {
    if (!canAct || !pending) return;

    const clean = reason.trim();
    const finalReason = clean.length ? clean : undefined;

    if (pending === "reject") onReject?.(finalReason);
    if (pending === "hold") onHold?.(finalReason);

    resetConfirm();
  }

  const confirmTitle = pending === "reject" ? "Confirm reject" : "Confirm hold";
  const confirmHint =
    pending === "reject"
      ? "This will mark the invoice as rejected by operator."
      : "This will put the invoice on hold for manual review.";

  return (
    <aside className="hidden lg:block w-44 shrink-0 sticky top-6 self-start">
      <div className="sticky top-6">
        <div className="apple-card overflow-hidden max-h-[calc(100vh-3rem)]">
          <div className="border-b border-slate-800/70 px-4 py-3">
            <div className="text-sm text-center font-semibold text-slate-100">
              Operator Panel
            </div>

            {metaText ? (
              <div className="mt-1 text-[11px] text-center text-slate-400">
                {metaText}
              </div>
            ) : null}

            {needsText ? (
              <div className="mt-1 text-[11px] font-medium text-amber-200/90">
                {needsText}
              </div>
            ) : null}

            {safeSla ? (
              <div className="mt-1 text-[11px] text-slate-400">{safeSla}</div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 p-4 overflow-auto">
            <button
              type="button"
              disabled={!canAct || !onApprove || pending !== null}
              onClick={onApprove}
              className={[
                baseBtn,
                appleSurface,
                "text-emerald-100",
                "ring-emerald-500/20",
                "hover:shadow-[0_12px_30px_rgba(16,185,129,0.18)]",
              ].join(" ")}
            >
              Approve
            </button>

            <button
              type="button"
              disabled={!canAct || !onReject || pending !== null}
              onClick={() => startConfirm("reject")}
              className={[
                baseBtn,
                appleSurface,
                "text-rose-100",
                "ring-rose-500/20",
                "hover:shadow-[0_12px_30px_rgba(244,63,94,0.18)]",
              ].join(" ")}
            >
              Reject
            </button>

            <button
              type="button"
              disabled={!canAct || !onHold || pending !== null}
              onClick={() => startConfirm("hold")}
              className={[
                baseBtn,
                appleSurface,
                "text-amber-100",
                "ring-amber-500/20",
                "hover:shadow-[0_12px_30px_rgba(245,158,11,0.18)]",
              ].join(" ")}
            >
              Hold
            </button>

            {/* Confirm block (only for Reject/Hold) */}
            {pending ? (
              <div className="mt-2 rounded-xl border border-slate-800/70 bg-slate-950/50 p-3">
                <div className="text-xs font-semibold text-slate-100">
                  {confirmTitle}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-400">
                  {confirmHint}
                </div>

                <label className="mt-2 block">
                  <div className="text-[11px] text-slate-500">
                    Reason (optional)
                  </div>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Short reason for audit trail…"
                    className={[
                      "mt-1 w-full rounded-lg px-2.5 py-2 text-[12px]",
                      "border border-slate-800/70 bg-slate-950/60 text-slate-100",
                      "placeholder:text-slate-600",
                      "focus:outline-none focus:ring-2 focus:ring-slate-600/40",
                    ].join(" ")}
                  />
                </label>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetConfirm}
                    className={[
                      "h-9 flex-1 rounded-xl px-3 text-xs font-semibold",
                      "border border-slate-800/70 bg-slate-950/40 text-slate-200",
                      "hover:bg-slate-950/60",
                      "transition active:translate-y-[0.5px]",
                    ].join(" ")}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={confirm}
                    className={[
                      "h-9 flex-1 rounded-xl px-3 text-xs font-semibold",
                      pending === "reject"
                        ? "border border-rose-500/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
                        : "border border-amber-500/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15",
                      "transition active:translate-y-[0.5px]",
                    ].join(" ")}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            ) : null}

            {!needsDecision ? (
              <div className="pt-1 text-[11px] text-slate-500">
                No operator action required.
              </div>
            ) : isDecided ? (
              <div className="pt-1 text-[11px] text-slate-500">
                Decision already recorded.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}
