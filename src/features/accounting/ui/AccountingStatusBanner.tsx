"use client";

import type { AccountingUiModel } from "@/features/accounting/lib/uiModel";

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

function buildDebugUrls(args: {
  merchantId: string;
  limit: number;
  from: string;
  to: string;
}) {
  const qs = new URLSearchParams();
  if (args.merchantId) qs.set("merchantId", args.merchantId);
  if (typeof args.limit === "number") qs.set("limit", String(args.limit));
  if (args.from) qs.set("from", args.from);
  if (args.to) qs.set("to", args.to);

  const query = qs.toString();
  const suffix = query ? `?${query}` : "";

  return {
    entriesJsonUrl: `/api/psp/accounting/entries${suffix}`,
    summaryJsonUrl: `/api/psp/accounting/summary${suffix}`,
    reloadUrl: suffix ? `/accounting${suffix}` : "/accounting",
  };
}

function formatCheckedAt(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-CH", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
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
  const checkedAt = ui?.checkedAt;

  const badgeClass =
    status === "error"
      ? "inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700"
      : status === "warn"
      ? "inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
      : "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700";

  const header =
    status === "error" ? "ERROR" : status === "warn" ? "WARN" : "OK";

  const secondaryHint = backfillError
    ? `Backfill error: ${backfillError}`
    : backfillInserted
    ? `Backfill: inserted ${backfillInserted}`
    : "";

  const { entriesJsonUrl, summaryJsonUrl, reloadUrl } = buildDebugUrls({
    merchantId,
    limit,
    from,
    to,
  });

  const action = ui?.action;

  const actionHref =
    action?.kind === "open_summary_json"
      ? summaryJsonUrl
      : action?.kind === "open_entries_json"
      ? entriesJsonUrl
      : action?.kind === "reload"
      ? reloadUrl
      : action?.kind === "run_backfill_confirmed"
      ? "#reconciliation"
      : null;

  const actionIsExternal =
    action?.kind === "open_summary_json" ||
    action?.kind === "open_entries_json";

  const metaLabelClass = "text-[11px] font-medium text-zinc-500";
  const metaValueClass = "mt-0.5 font-mono text-xs text-zinc-900";

  const cardClass =
    "rounded-xl border border-zinc-200 bg-white/60 px-3 py-2 shadow-sm backdrop-blur";

  return (
    <div className="mt-6 rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[320px_1fr_200px] md:items-stretch">
          {/* LEFT column */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={badgeClass}>{header}</span>

              {secondaryHint ? (
                <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-700">
                  {secondaryHint}
                </span>
              ) : null}
            </div>

            <div className={cardClass}>
              <div className={metaLabelClass}>merchantId</div>
              <div className={metaValueClass}>{merchantId}</div>
            </div>

            <div className={cardClass}>
              <div className={metaLabelClass}>range</div>
              <div className={`${metaValueClass} whitespace-normal`}>
                {formatRange(from, to)}
              </div>
            </div>

            <div className={cardClass}>
              <div className={metaLabelClass}>limit</div>
              <div className={metaValueClass}>{limit}</div>
            </div>
          </div>

          {/* CENTER column (strictly centered) */}
          <div className="flex min-w-0 flex-col items-center justify-center text-center">
            <div className="text-base font-semibold tracking-tight text-zinc-950">
              {headline}
            </div>

            {subline ? (
              <div className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-700">
                {subline}
              </div>
            ) : null}

            {status !== "ok" && action && actionHref ? (
              <div className="mt-3">
                <a
                  href={actionHref}
                  target={actionIsExternal ? "_blank" : undefined}
                  rel={actionIsExternal ? "noreferrer" : undefined}
                  className={
                    status === "error"
                      ? "inline-flex items-center rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                      : status === "warn"
                      ? "inline-flex items-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                      : "inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
                  }
                  title={action.kind}
                >
                  {action.label}
                </a>
              </div>
            ) : null}
          </div>

          {/* RIGHT column — last checked */}
          <div className="flex self-start md:justify-end">
            <div className={cardClass}>
              <div className={metaLabelClass}>last checked</div>
              <div className={metaValueClass}>{formatCheckedAt(checkedAt)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
