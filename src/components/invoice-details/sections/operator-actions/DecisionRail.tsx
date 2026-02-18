// src/components/invoice-details/sections/operator-actions/DecisionRail.tsx
type DecisionRailProps = {
  disabled?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onHold?: () => void;
};

export function DecisionRail({
  disabled = false,
  onApprove,
  onReject,
  onHold,
}: DecisionRailProps) {
  return (
    <aside className="hidden lg:block w-43">
      <div className="apple-card overflow-hidden">
        <div className="border-b border-slate-800/70 px-4 py-3">
          <div className="text-sm font-semibold text-slate-100">Decision</div>
        </div>

        <div className="flex flex-col gap-2 p-4">
          <button
            type="button"
            disabled={disabled || !onApprove}
            onClick={onApprove}
            className="h-9 w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Approve
          </button>

          <button
            type="button"
            disabled={disabled || !onReject}
            onClick={onReject}
            className="h-9 w-full rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 text-sm font-semibold text-rose-100 hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reject
          </button>

          <button
            type="button"
            disabled={disabled || !onHold}
            onClick={onHold}
            className="h-9 w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 text-sm font-semibold text-amber-100 hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hold
          </button>
        </div>
      </div>
    </aside>
  );
}
