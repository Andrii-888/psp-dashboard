"use client";

import type { AccountingUiModel } from "../lib/uiModel";

type Props = {
  merchantId: string;
  from: string;
  to: string;
  limit: number;

  ui: AccountingUiModel["ui"];

  backfillInserted?: string;
  backfillError?: string;
};

function formatRange(from: string, to: string): string {
  const f = from?.trim() ? from : "—";
  const t = to?.trim() ? to : "—";
  return `${f} → ${t}`;
}

export default function AccountingStatusBanner({
  merchantId,
  from,
  to,
  limit,
  ui,
  backfillInserted,
  backfillError,
}: Props) {
  const status = ui?.status ?? "warn";
  const headline = ui?.headline ?? "System status";
  const subline = ui?.subline ?? "";

  const badgeClass =
    status === "error"
      ? "inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"
      : status === "warn"
      ? "inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
      : "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700";

  const header =
    status === "error" ? "ERROR" : status === "warn" ? "WARN" : "OK";

  const secondaryHint = backfillError
    ? `Last backfill error: ${backfillError}`
    : backfillInserted
    ? `Backfill completed: inserted ${backfillInserted}.`
    : "";

  return (
    <div className="mt-6 rounded-2xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          {/* Left */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={badgeClass}>{header}</span>

              <div className="text-xs text-zinc-600">
                merchantId:{" "}
                <span className="font-mono text-zinc-800">{merchantId}</span>
              </div>
            </div>

            <div className="mt-2 text-sm font-semibold text-zinc-900">
              {headline}
            </div>

            {subline ? (
              <div className="mt-1 text-sm text-zinc-700">{subline}</div>
            ) : null}

            <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600">
              <span>
                range:{" "}
                <span className="font-mono text-zinc-800">
                  {formatRange(from, to)}
                </span>
              </span>
              <span>·</span>
              <span>
                limit: <span className="font-mono text-zinc-800">{limit}</span>
              </span>
            </div>

            {secondaryHint ? (
              <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                {secondaryHint}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
