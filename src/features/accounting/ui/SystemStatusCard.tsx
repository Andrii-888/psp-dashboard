// src/features/accounting/ui/SystemStatusCard.tsx

import type { GuidedAction } from "@/features/accounting/lib/uiModel";

export default function SystemStatusCard(props: {
  status: "ok" | "warn" | "error";
  headline: string;
  subline?: string;
  checkedAt?: string;
  primaryAction?: GuidedAction;
}) {
  const { status, headline, subline, checkedAt, primaryAction } = props;

  const badge =
    status === "ok"
      ? {
          text: "OK",
          cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/20",
        }
      : status === "warn"
      ? {
          text: "WARN",
          cls: "bg-amber-500/15 text-amber-300 ring-amber-500/20",
        }
      : { text: "ERROR", cls: "bg-rose-500/15 text-rose-300 ring-rose-500/20" };

  return (
    <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span
              className={[
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                badge.cls,
              ].join(" ")}
            >
              {badge.text}
            </span>
            <h2 className="truncate text-base font-semibold text-slate-50">
              {headline}
            </h2>
          </div>

          {subline ? (
            <p className="mt-2 text-sm text-slate-300">{subline}</p>
          ) : null}

          {checkedAt ? (
            <p className="mt-2 text-xs text-slate-400">Checked: {checkedAt}</p>
          ) : null}
        </div>

        {primaryAction ? (
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-100">
                {primaryAction.title}
              </div>
              <span
                className={[
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  primaryAction.severity === "ok"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : primaryAction.severity === "warn"
                    ? "bg-amber-500/15 text-amber-300"
                    : "bg-rose-500/15 text-rose-300",
                ].join(" ")}
              >
                {primaryAction.severity.toUpperCase()}
              </span>
            </div>

            {primaryAction.cause ? (
              <p className="mt-2 text-xs text-slate-300">
                <span className="text-slate-400">Cause:</span>{" "}
                {primaryAction.cause}
              </p>
            ) : null}

            {primaryAction.impact ? (
              <p className="mt-2 text-xs text-slate-300">
                <span className="text-slate-400">Impact:</span>{" "}
                {primaryAction.impact}
              </p>
            ) : null}

            <p className="mt-2 text-xs text-slate-300">
              <span className="text-slate-400">Action:</span>{" "}
              {primaryAction.action}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
