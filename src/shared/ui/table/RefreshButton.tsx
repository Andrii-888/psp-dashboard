"use client";

interface RefreshButtonProps {
  onRefresh: () => Promise<void>;
  loading?: boolean;
}

export function RefreshButton({
  onRefresh,
  loading = false,
}: RefreshButtonProps) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={loading}
      className={[
        "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium",
        "border border-slate-700/60 bg-slate-900/50 text-slate-200",
        "transition hover:bg-slate-800/70",
        loading
          ? "cursor-not-allowed opacity-60"
          : "hover:ring-1 hover:ring-violet-500/40",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-2 w-2 rounded-full",
          loading ? "bg-violet-400 animate-pulse" : "bg-slate-400",
        ].join(" ")}
      />
      {loading ? "Refreshing…" : "Refresh"}
    </button>
  );
}
