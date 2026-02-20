// src/components/invoice-details/sections/operator-actions/DecisionRail.tsx
type DecisionRailProps = {
  disabled?: boolean;

  // UI state
  needsDecision?: boolean;
  decisionStatus?: string | null;
  decidedAt?: string | null;
  decidedBy?: string | null;

  // optional SLA line (can be null from caller)
  slaText?: string | null;

  // actions
  onApprove?: () => void;
  onReject?: () => void;
  onHold?: () => void;
};

export function DecisionRail({
  disabled = false,

  needsDecision = false,
  decisionStatus = null,
  decidedAt = null,
  decidedBy = null,

  slaText = null,

  onApprove,
  onReject,
  onHold,
}: DecisionRailProps) {
  const ds = typeof decisionStatus === "string" ? decisionStatus : "";
  const dsNorm = ds.trim().toLowerCase();

  const decidedLabel =
    dsNorm === "approved"
      ? "approve"
      : dsNorm === "rejected"
      ? "reject"
      : dsNorm === "hold"
      ? "hold"
      : null;

  const isDecided = !!decidedLabel || !!decidedAt || !!decidedBy;
  const showMeta = isDecided && !needsDecision;

  const metaText = (() => {
    const parts: string[] = [];
    if (decidedLabel) parts.push(`Decided: ${decidedLabel}`);
    if (decidedAt) parts.push(decidedAt);
    if (decidedBy) parts.push(decidedBy);
    return parts.join(" · ");
  })();

  const safeSla =
    typeof slaText === "string" && slaText.trim().length
      ? slaText.trim()
      : null;

  const canAct = needsDecision && !disabled;

  const baseBtn =
    "h-9 w-full rounded-xl px-3 text-sm font-semibold transition active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50";
  const appleSurface =
    "bg-slate-950/40 ring-1 ring-slate-800/70 backdrop-blur-md hover:bg-slate-950/55 hover:ring-slate-700/80";

  return (
    <aside className="hidden w-44 lg:block">
      <div className="apple-card overflow-hidden">
        <div className="border-b border-slate-800/70 px-4 py-3">
          <div className="text-sm font-semibold text-slate-100">Decision</div>

          {showMeta && metaText ? (
            <div className="mt-1 text-[11px] text-slate-400">{metaText}</div>
          ) : null}

          {needsDecision ? (
            <div className="mt-1 text-[11px] text-amber-200/90">
              Operator decision required
            </div>
          ) : null}

          {safeSla ? (
            <div className="mt-1 text-[11px] text-slate-400">{safeSla}</div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 p-4">
          <button
            type="button"
            disabled={!canAct || !onApprove}
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
            disabled={!canAct || !onReject}
            onClick={onReject}
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
            disabled={!canAct || !onHold}
            onClick={onHold}
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
        </div>
      </div>
    </aside>
  );
}
