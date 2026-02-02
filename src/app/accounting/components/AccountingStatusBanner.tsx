"use client";

import type { AccountingEntryRaw } from "../lib/types";
import type { TotalsSummary, ReconciliationModel } from "../lib/uiModel";

type Props = {
  merchantId: string;
  from: string;
  to: string;
  limit: number;
  entries: AccountingEntryRaw[];
  totalsSummary: TotalsSummary;
  reconciliation: ReconciliationModel;
  summaryAvailable: boolean;
  backfillInserted?: string;
  backfillError?: string;
};

function isConfirmedRow(e: AccountingEntryRaw): boolean {
  return String(e.eventType ?? "").trim() === "invoice.confirmed";
}

function formatRange(from: string, to: string): string {
  const f = from?.trim() ? from : "—";
  const t = to?.trim() ? to : "—";
  return `${f} → ${t}`;
}

function statusLabel(worst: number, issuesCount: number): string {
  if (worst >= 4) return "CRITICAL";
  if (worst === 3) return "ACTION REQUIRED";
  if (worst === 2) return "WARNING";
  if (issuesCount > 0) return "NOTICE";
  return "OK";
}

function statusPillClass(worst: number, issuesCount: number): string {
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";

  if (worst >= 4) return `${base} border-red-200 bg-red-50 text-red-700`;
  if (worst === 3) return `${base} border-rose-200 bg-rose-50 text-rose-700`;
  if (worst === 2) return `${base} border-amber-200 bg-amber-50 text-amber-700`;
  if (issuesCount > 0)
    return `${base} border-zinc-200 bg-zinc-50 text-zinc-700`;
  return `${base} border-emerald-200 bg-emerald-50 text-emerald-700`;
}

function severityRank(s?: string | null): number {
  switch (String(s ?? "").toLowerCase()) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

export default function AccountingStatusBanner({
  merchantId,
  from,
  to,
  limit,
  entries,
  totalsSummary,
  reconciliation,
  summaryAvailable,
  backfillInserted,
  backfillError,
}: Props) {
  const issues = reconciliation?.issues ?? [];
  const hasFeeIssue = issues.some(
    (i) => String(i.type ?? "") === "fee_mismatch"
  );

  const issuesCount = issues.length;

  const worst = issues.reduce((acc, it) => {
    const r = severityRank(it.severity ?? null);
    return Math.max(acc, r);
  }, 0);

  const confirmedRows = entries.filter(isConfirmedRow).length;

  const totalsMismatch =
    Number(totalsSummary?.confirmedCount ?? 0) !== Number(confirmedRows);

  const header = statusLabel(worst, issuesCount);
  const badgeClass = statusPillClass(worst, issuesCount);

  const title =
    issuesCount === 0
      ? "Reconciliation looks consistent for the selected period."
      : `Detected ${issuesCount} reconciliation issue${
          issuesCount === 1 ? "" : "s"
        }.`;

  const primaryHint =
    issuesCount === 0
      ? "No action needed."
      : hasFeeIssue
      ? "Fee mismatch often means fee rows (e.g. fee_charged) are not included in confirmed-only totals, or the backend summary uses a different scope than the UI."
      : "Likely scope mismatch between backend summary and the entries shown in UI. Check event filters and date range boundaries.";

  const secondaryHint = backfillError
    ? `Last backfill error: ${backfillError}`
    : backfillInserted
    ? `Backfill completed: inserted ${backfillInserted}.`
    : "";

  const linkHint =
    issuesCount > 0
      ? "Next step: open summary + entries JSON, then confirm scope (currency filters, event types, date range)."
      : null;

  const quickValueClass = "font-mono text-zinc-900";
  const quickKeyClass = "text-zinc-600";
  const quickOk = "text-emerald-700";
  const quickBad = "text-rose-700";

  return (
    <div className="mt-6 rounded-2xl border border-zinc-200 bg-white">
      {/* Header */}
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
              {title}
            </div>

            <div className="mt-1 text-sm text-zinc-700">{primaryHint}</div>

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
              <span>·</span>
              <span>
                confirmed rows:{" "}
                <span className="font-mono text-zinc-800">{confirmedRows}</span>
              </span>
            </div>

            {secondaryHint ? (
              <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                {secondaryHint}
              </div>
            ) : null}
          </div>

          {/* Right: Quick checks */}
          <div className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:w-[320px]">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Quick checks
            </div>

            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className={quickKeyClass}>Summary available</span>
                <span className={quickValueClass}>
                  {summaryAvailable ? "yes" : "no"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className={quickKeyClass}>Issues</span>
                <span className={quickValueClass}>{issuesCount}</span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className={quickKeyClass}>Totals mismatch</span>
                <span
                  className={`font-mono ${totalsMismatch ? quickBad : quickOk}`}
                >
                  {totalsMismatch ? "yes" : "no"}
                </span>
              </div>
            </div>

            {linkHint ? (
              <div className="mt-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
                {linkHint}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
