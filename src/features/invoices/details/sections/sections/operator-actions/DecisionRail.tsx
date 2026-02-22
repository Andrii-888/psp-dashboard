"use client";

import * as React from "react";
import { formatDateTimeCH } from "@/shared/lib/formatters";
import type { Invoice } from "@/shared/api/pspApi";
import type { InvoiceUiState } from "@/features/invoices/model/deriveInvoiceUiState";

type DecisionRailProps = {
  disabled?: boolean;
  loading?: boolean;

  invoice: Invoice;
  uiState: InvoiceUiState;

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

type PendingAction = "approve" | "reject" | "hold" | null;

export function DecisionRail({
  disabled = false,
  loading = false,

  invoice,
  uiState,

  onApprove,
  onReject,
  onHold,
}: DecisionRailProps) {
  const [pending, setPending] = React.useState<PendingAction>(null);
  const [reason, setReason] = React.useState<string>("");

  const [optimisticDecision, setOptimisticDecision] = React.useState<
    "approve" | "reject" | "hold" | null
  >(null);

  const needsDecision = uiState.needsDecision;

  const decisionStatus = optimisticDecision ?? invoice.decisionStatus ?? null;
  const decidedAt = invoice.decidedAt ?? null;
  const decidedBy = invoice.decidedBy ?? null;

  const slaText = uiState.decision.details ?? null;

  const ds =
    typeof decisionStatus === "string"
      ? decisionStatus.trim().toLowerCase()
      : "";
  const isDecided =
    !!decidedAt || ds === "approve" || ds === "reject" || ds === "hold";

  const canAct = !disabled && !loading && needsDecision && !isDecided;

  const baseBtn = [
    "h-11 w-full",
    "rounded-xl",
    "px-3",
    "text-[13px] font-semibold",
    "transition",
    "active:translate-y-[0.5px]",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
  ].join(" ");

  const appleSurface = [
    "ring-1",
    "ring-slate-700/70",
    "bg-slate-900/45",
    "hover:bg-slate-900/65",
    "shadow-[0_12px_34px_rgba(0,0,0,0.40)]",
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

  const slaTone: "ok" | "warn" | "error" | null = React.useMemo(() => {
    if (!safeSla) return null;

    const t = safeSla.toLowerCase();
    if (t.includes("overdue")) return "error";

    // detect "due in Xm"
    const m = t.match(/due in\s+(\d+)\s*m/);
    if (m && m[1]) {
      const mins = Number(m[1]);
      if (Number.isFinite(mins) && mins <= 5) return "warn";
    }

    return "ok";
  }, [safeSla]);

  const panelAccent =
    canAct && slaTone === "error"
      ? "ring-rose-500/30 shadow-[0_18px_60px_rgba(244,63,94,0.22)]"
      : canAct && slaTone === "warn"
      ? "ring-amber-500/25 shadow-[0_18px_60px_rgba(245,158,11,0.18)]"
      : "ring-slate-800/70 shadow-[0_10px_30px_rgba(0,0,0,0.35)]";

  const slaTextClass =
    slaTone === "error"
      ? "text-rose-200"
      : slaTone === "warn"
      ? "text-amber-200"
      : "text-slate-400";

  function resetConfirm() {
    setPending(null);
    setReason("");
    setOptimisticDecision(null);
  }

  function startConfirm(action: PendingAction) {
    if (!canAct) return;
    setPending(action);
    setReason("");
  }

  function confirm() {
    if (!canAct || !pending || loading) return;

    const clean = reason.trim();
    const finalReason = clean.length ? clean : undefined;

    setOptimisticDecision(pending);

    if (pending === "approve") onApprove?.();
    if (pending === "reject") onReject?.(finalReason);
    if (pending === "hold") onHold?.(finalReason);

    resetConfirm();
  }

  const confirmTitle =
    pending === "approve"
      ? "Confirm approve"
      : pending === "reject"
      ? "Confirm reject"
      : "Confirm hold";

  const confirmHint =
    pending === "approve"
      ? "This will approve the invoice for settlement."
      : pending === "reject"
      ? "This will mark the invoice as rejected by operator."
      : "This will put the invoice on hold for manual review.";

  return (
    <aside className="hidden lg:block w-44 shrink-0 sticky top-6 self-start">
      <div className="sticky top-6">
        <div
          className={[
            "apple-card overflow-hidden max-h-[calc(100vh-3rem)] ring-1",
            panelAccent,
          ].join(" ")}
        >
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
              <div className={["mt-1 text-[11px]", slaTextClass].join(" ")}>
                {safeSla}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 p-4 overflow-auto">
            <button
              type="button"
              disabled={!canAct || !onApprove || pending !== null}
              onClick={() => startConfirm("approve")}
              className={[
                baseBtn,
                appleSurface,
                "text-emerald-100",
                "ring-emerald-400/35",
                "bg-emerald-500/8",
                "hover:bg-emerald-500/14",
                "hover:ring-emerald-400/45",
                "hover:shadow-[0_18px_50px_rgba(16,185,129,0.28)]",
                "focus-visible:ring-emerald-400/45",
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
                "ring-rose-400/35",
                "bg-rose-500/8",
                "hover:bg-rose-500/14",
                "hover:ring-rose-400/45",
                "hover:shadow-[0_18px_50px_rgba(244,63,94,0.28)]",
                "focus-visible:ring-rose-400/45",
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
                "ring-amber-400/35",
                "bg-amber-500/8",
                "hover:bg-amber-500/14",
                "hover:ring-amber-400/45",
                "hover:shadow-[0_18px_50px_rgba(245,158,11,0.28)]",
                "focus-visible:ring-amber-400/45",
              ].join(" ")}
            >
              Hold
            </button>

            {/* Confirm block (only for Reject/Hold) */}
            {pending ? (
              <div
                className={[
                  "mt-2 rounded-xl border border-slate-800/70 bg-slate-950/50 p-3 text-center",
                  "origin-top transition-all duration-200 ease-out",
                  "animate-in fade-in zoom-in-95",
                ].join(" ")}
              >
                <div className="text-xs font-semibold text-slate-100">
                  {confirmTitle}
                </div>

                <div className="mt-0.5 text-[11px] text-slate-400">
                  {confirmHint}
                </div>

                {pending !== "approve" ? (
                  <label className="mt-2 block text-center">
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
                ) : null}

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={resetConfirm}
                    className={[
                      "h-9 w-full rounded-xl px-2 text-[11px] font-semibold",
                      "flex items-center justify-center",
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
                      "h-9 w-full rounded-xl px-2 text-[11px] font-semibold",
                      loading ? "opacity-60 cursor-not-allowed" : "",
                      "flex items-center justify-center",
                      pending === "reject"
                        ? "border border-rose-500/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
                        : "border border-amber-500/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15",
                      "transition active:translate-y-[0.5px]",
                    ].join(" ")}
                  >
                    {loading ? "Processing..." : "Confirm"}
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
