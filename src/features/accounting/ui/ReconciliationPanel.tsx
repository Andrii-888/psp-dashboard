// src/app/accounting/components/ReconciliationPanel.tsx

import { Fragment } from "react/jsx-runtime";
import JsonPretty from "./JsonPretty";
import { formatNumberCH } from "@/shared/lib/formatters";

type ReconciliationIssue = {
  type: string;
  severity: "low" | "medium" | "high" | "critical" | string;
  invoiceId?: string | null;
  message?: string | null;
  createdAt?: string | null;
  meta?: unknown;
};

type ReconciliationData = {
  merchantId?: string | null;
  issues: ReconciliationIssue[];
  checkedAt?: string | null;
};

type Issue = ReconciliationIssue;

type Props = {
  data: ReconciliationData | null;

  merchantId?: string;
  limit?: number;
  from?: string;
  to?: string;
  backfillInserted?: string;
  backfillError?: string;
  onBackfill?: (formData: FormData) => Promise<void>;
};

function SeverityPill({ severity }: { severity: Issue["severity"] }) {
  const s = String(severity || "").toLowerCase();

  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";

  if (s === "high")
    return (
      <span className={`${base} border-red-200 bg-red-50 text-red-700`}>
        HIGH
      </span>
    );

  if (s === "medium")
    return (
      <span className={`${base} border-amber-200 bg-amber-50 text-amber-700`}>
        MEDIUM
      </span>
    );

  if (s === "low")
    return (
      <span className={`${base} border-zinc-200 bg-zinc-50 text-zinc-700`}>
        LOW
      </span>
    );

  return (
    <span className={`${base} border-zinc-200 bg-white text-zinc-700`}>
      {String(severity || "unknown")}
    </span>
  );
}

const DATE_FMT = new Intl.DateTimeFormat("en-CH", {
  timeZone: "Europe/Zurich",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return DATE_FMT.format(d);
}

function buildDebugUrls(args: {
  merchantId?: string;
  limit?: number;
  from?: string;
  to?: string;
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
    reloadUrl: suffix || "/accounting",
  };
}

function parseMismatch(
  issueType: string,
  message?: string | null
): {
  entries?: number;
  summary?: number;
} {
  const t = String(issueType || "").toLowerCase();
  const msg = String(message || "");

  // expected formats:
  // "confirmedCount mismatch: entries=9, summary=8"
  // "grossSum mismatch: entries=2053.79, summary=425.08"
  // "netSum mismatch: entries=..., summary=..."
  if (
    !(
      t.includes("count_mismatch") ||
      t.includes("gross_mismatch") ||
      t.includes("fee_mismatch") ||
      t.includes("net_mismatch")
    )
  ) {
    return {};
  }

  const m = msg.match(
    /entries=([0-9]+(?:\.[0-9]+)?),\s*summary=([0-9]+(?:\.[0-9]+)?)/i
  );
  if (!m) return {};

  const a = Number(m[1]);
  const b = Number(m[2]);

  return {
    entries: Number.isFinite(a) ? a : undefined,
    summary: Number.isFinite(b) ? b : undefined,
  };
}

function fmtNum(x?: number) {
  if (typeof x !== "number" || !Number.isFinite(x)) return "—";

  // ✅ deterministic across SSR/CSR via our formatter (also normalizes CH apostrophe)
  const s = formatNumberCH(x, { maximumFractionDigits: 6 });

  // formatNumberCH returns "-" for empty/invalid, but in UI we use "—"
  return s === "-" ? "—" : s;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function readNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function issueDetails(it: Issue): {
  delta?: number | null;
  absDelta?: number | null;
  relDelta?: number | null;
  legacyUsdttrc20Gross?: number | null;
  hasLegacyUsdttrc20?: boolean | null;
} {
  if (!isRecord(it.meta)) return {};

  const delta = readNumber(it.meta["delta"]);
  const absDelta = readNumber(it.meta["absDelta"]);
  const relDelta = readNumber(it.meta["relDelta"]);

  const legacy = isRecord(it.meta["legacy"]) ? it.meta["legacy"] : null;
  const legacyUsdttrc20Gross = legacy
    ? readNumber(legacy["usdttrc20Gross"])
    : null;

  const hasLegacyUsdttrc20Raw = legacy ? legacy["hasLegacyUsdttrc20"] : null;
  const hasLegacyUsdttrc20 =
    typeof hasLegacyUsdttrc20Raw === "boolean" ? hasLegacyUsdttrc20Raw : null;

  return {
    delta,
    absDelta,
    relDelta,
    legacyUsdttrc20Gross,
    hasLegacyUsdttrc20,
  };
}

function guidedText(it: Issue): {
  cause?: string;
  impact?: string;
  action?: string;
} {
  const t = String(it.type || "").toLowerCase();
  const d = issueDetails(it);

  if (t.includes("gross_mismatch")) {
    const legacyHint = d.hasLegacyUsdttrc20
      ? `Legacy taxonomy detected: USDTTRC20 gross ≈ ${fmtNum(
          d.legacyUsdttrc20Gross ?? undefined
        )} (likely TRON).`
      : null;

    return {
      cause:
        legacyHint ??
        "Entries and backend summary appear to be computed under different scope/taxonomy.",
      impact:
        "Operator totals may not match SSOT summary; reconciliation can show false-critical until taxonomy is aligned.",
      action: d.hasLegacyUsdttrc20
        ? "Action: normalize legacy currency in UI (USDTTRC20@TRON → USDT), or run a backend backfill to rewrite legacy taxonomy in ledger."
        : "Action: verify summary scope (filters/valuation) and align UI aggregation rules with summary.",
    };
  }

  if (t.includes("net_mismatch")) {
    return {
      cause:
        "Net is derived from gross/fees; if gross or fee scope differs, net will also differ.",
      impact:
        "Net KPI and settlement totals become unreliable for the selected window.",
      action:
        "Action: fix gross/fee scope first; then re-check net. If needed, run backfill for missing confirmed/fee rows.",
    };
  }

  if (t.includes("fee_mismatch")) {
    return {
      cause:
        "Fees may be missing fee_charged rows or summary uses different fee policy/valuation.",
      impact: "Fee revenue KPI may be wrong; can cause net mismatch.",
      action:
        "Action: confirm feeSource policy (fee_charged only) and ensure ledger contains fee_charged rows for the window.",
    };
  }

  if (t.includes("count_mismatch")) {
    return {
      cause:
        "ConfirmedCount differs when finality rules differ (e.g. confirmed vs confirmed_reversed) or when rows are missing in ledger.",
      impact:
        "Counts and totals can’t be trusted for reconciliation decisions.",
      action:
        "Action: run backfill confirmed (button above) and ensure reversed confirmed are excluded consistently.",
    };
  }

  return {
    cause: "Unknown issue type — inspect JSON payloads.",
    impact: "May affect operator totals and trust in KPI panels.",
    action:
      "Action: open summary/entries JSON and compare the specific fields for this issue.",
  };
}

function likelyCause(issues: Issue[]): string | null {
  const hasGross = issues.some((i) =>
    String(i.type).toLowerCase().includes("gross_mismatch")
  );
  const hasNet = issues.some((i) =>
    String(i.type).toLowerCase().includes("net_mismatch")
  );
  const hasCount = issues.some((i) =>
    String(i.type).toLowerCase().includes("count_mismatch")
  );

  // heuristic: if gross+net mismatches exist, it's usually scope/taxonomy mismatch
  if (hasGross && hasNet) {
    return "Likely: backend summary uses a different scope (e.g. CHF-only or different event filters) than the entries shown in UI.";
  }
  if (hasCount) {
    return "Likely: summary confirmedCount uses a different filter/window than entries (missing/extra confirmed in summary).";
  }
  return null;
}

export default function ReconciliationPanel({
  data,
  merchantId,
  limit,
  from,
  to,
  backfillInserted,
  backfillError,
  onBackfill,
}: Props) {
  const issues = data?.issues ?? [];
  const ok = issues.length === 0;

  const recommendBackfill =
    issues.some(
      (it) => String(it.type ?? "").toLowerCase() === "count_mismatch"
    ) && typeof onBackfill === "function";

  const canBackfill =
    typeof onBackfill === "function" &&
    typeof merchantId === "string" &&
    merchantId.length > 0 &&
    typeof limit === "number";

  return (
    <div
      id="reconciliation"
      className="mt-6 rounded-2xl border border-zinc-200 bg-white"
    >
      <div className="border-b border-zinc-200 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-zinc-900">
              Reconciliation
            </div>
            <div className="mt-1 text-xs text-zinc-600">
              {data ? (
                <>
                  merchantId:{" "}
                  <span className="font-mono text-zinc-800">
                    {data.merchantId ?? merchantId ?? "—"}
                  </span>
                  {from ? (
                    <>
                      {" "}
                      · from:{" "}
                      <span className="font-mono text-zinc-800">{from}</span>
                    </>
                  ) : null}
                  {to ? (
                    <>
                      {" "}
                      · to:{" "}
                      <span className="font-mono text-zinc-800">{to}</span>
                    </>
                  ) : null}
                  {data.checkedAt ? (
                    <>
                      {" "}
                      · checked:{" "}
                      <span className="font-mono text-zinc-800">
                        {fmtDate(data.checkedAt)}
                      </span>
                    </>
                  ) : null}
                </>
              ) : (
                <span>Not available</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-start justify-end gap-2">
            {(() => {
              const { entriesJsonUrl, summaryJsonUrl, reloadUrl } =
                buildDebugUrls({
                  merchantId,
                  limit,
                  from,
                  to,
                });

              const linkBtn =
                "rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50";

              return (
                <>
                  <a
                    href={reloadUrl}
                    className={linkBtn}
                    title="Reload the page with the same filters"
                  >
                    Reload
                  </a>

                  <a
                    href={summaryJsonUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={linkBtn}
                    title="Open backend summary JSON via /api/psp proxy"
                  >
                    Open summary JSON
                  </a>

                  <a
                    href={entriesJsonUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={linkBtn}
                    title="Open entries JSON via /api/psp proxy"
                  >
                    Open entries JSON
                  </a>

                  <div
                    className={
                      ok
                        ? "ml-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"
                        : "ml-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
                    }
                  >
                    {ok ? "OK" : `Issues: ${issues.length}`}
                  </div>

                  {canBackfill && recommendBackfill ? (
                    <div className="ml-2 flex flex-col items-end gap-1">
                      <form action={onBackfill}>
                        <input
                          type="hidden"
                          name="merchantId"
                          value={merchantId}
                        />
                        <input
                          type="hidden"
                          name="limit"
                          value={String(limit)}
                        />
                        <input type="hidden" name="from" value={from ?? ""} />
                        <input type="hidden" name="to" value={to ?? ""} />

                        <button
                          type="submit"
                          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                          title="Create missing invoice.confirmed accounting entries"
                        >
                          Run backfill confirmed
                        </button>
                      </form>

                      <div className="text-[11px] text-zinc-500">
                        Creates missing{" "}
                        <span className="font-mono">invoice.confirmed</span>{" "}
                        rows for this range. Reload after completion.
                      </div>
                    </div>
                  ) : null}
                </>
              );
            })()}
          </div>
        </div>

        {/* ---- JSON pretty with "jq-like" coloring ---- */}
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <details className="group rounded-2xl border border-zinc-200 bg-zinc-50/60 p-3 shadow-sm">
            <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-900 outline-none">
              Summary JSON (preview)
            </summary>
            <div className="mt-0.5 text-xs text-zinc-600">
              Local reconciliation payload (what UI receives).
            </div>
            <JsonPretty
              value={data ?? { merchantId, issues, checkedAt: null }}
            />
          </details>

          <details className="group rounded-2xl border border-zinc-200 bg-zinc-50/60 p-3 shadow-sm">
            <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-900 outline-none">
              Issues JSON (preview)
            </summary>
            <div className="text-xs text-zinc-500">
              Issues only (quick copy/paste).
            </div>
            <JsonPretty value={issues} />
          </details>
        </div>

        {backfillInserted ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Backfill completed: inserted{" "}
            <span className="font-semibold">{backfillInserted}</span>.
          </div>
        ) : null}

        {backfillError ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            Backfill failed:{" "}
            <span className="font-semibold">{backfillError}</span>
          </div>
        ) : null}

        {!ok
          ? (() => {
              const byType = new Map<
                string,
                { entries?: number; summary?: number }
              >();

              for (const it of issues) {
                const t = String(it.type || "").toLowerCase();
                const parsed = parseMismatch(t, it.message);
                if (
                  parsed.entries === undefined &&
                  parsed.summary === undefined
                )
                  continue;
                byType.set(t, parsed);
              }

              const get = (key: string) => byType.get(key)?.entries;
              const getS = (key: string) => byType.get(key)?.summary;

              const rows: Array<{ label: string; k: string; unit?: string }> = [
                { label: "Confirmed count", k: "count_mismatch" },
                { label: "Gross", k: "gross_mismatch", unit: "CHF" },
                { label: "Fees", k: "fee_mismatch", unit: "CHF" },
                { label: "Net", k: "net_mismatch", unit: "CHF" },
              ];

              const cause = likelyCause(issues);

              return (
                <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-semibold text-zinc-900">
                      Summary vs Entries
                    </div>
                    <div className="text-xs text-zinc-600">
                      Values are taken from mismatch details (entries=...,
                      summary=...).
                    </div>
                  </div>

                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs uppercase tracking-wide text-zinc-500">
                        <tr className="border-b border-zinc-200">
                          <th className="py-2 pr-4">Metric</th>
                          <th className="py-2 pr-4">Entries</th>
                          <th className="py-2 pr-4">Summary</th>
                          <th className="py-2 pr-2">Δ (entries - summary)</th>
                        </tr>
                      </thead>
                      <tbody className="text-zinc-900">
                        {rows.map((r) => {
                          const e =
                            r.k === "count_mismatch" ? get(r.k) : get(r.k);
                          const s =
                            r.k === "count_mismatch" ? getS(r.k) : getS(r.k);

                          // If no mismatch row exists for this metric, show — (meaning it matched or wasn’t checked)
                          const delta =
                            e !== undefined && s !== undefined
                              ? e - s
                              : undefined;

                          return (
                            <tr key={r.k} className="border-b border-zinc-100">
                              <td className="py-3 pr-4 font-medium text-zinc-900">
                                {r.label}
                              </td>
                              <td className="py-3 pr-4 font-mono text-xs text-zinc-800">
                                {fmtNum(e)}
                                {r.unit && e !== undefined ? ` ${r.unit}` : ""}
                              </td>
                              <td className="py-3 pr-4 font-mono text-xs text-zinc-800">
                                {fmtNum(s)}
                                {r.unit && s !== undefined ? ` ${r.unit}` : ""}
                              </td>
                              <td className="py-3 pr-2 font-mono text-xs">
                                {delta === undefined ? (
                                  <span className="text-zinc-500">—</span>
                                ) : delta === 0 ? (
                                  <span className="text-emerald-700">
                                    {fmtNum(delta)}
                                  </span>
                                ) : (
                                  <span className="text-red-700">
                                    {fmtNum(delta)}
                                  </span>
                                )}
                                {r.unit && delta !== undefined
                                  ? ` ${r.unit}`
                                  : ""}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {cause ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      <span className="font-semibold">Likely cause:</span>{" "}
                      {cause}
                    </div>
                  ) : null}
                </div>
              );
            })()
          : null}
      </div>

      <div className="p-4">
        {ok ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
            No issues found for the selected period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-zinc-500">
                <tr className="border-b border-zinc-200">
                  <th className="py-2 pr-4">Severity</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Invoice</th>
                  <th className="py-2 pr-4">Message</th>
                  <th className="py-2 pr-2">Created</th>
                </tr>
              </thead>
              <tbody className="text-zinc-900">
                {issues.map((it, idx) => {
                  const g = guidedText(it);

                  return (
                    <Fragment
                      key={`${it.type}-${it.invoiceId ?? "—"}-${
                        it.createdAt ?? "—"
                      }`}
                    >
                      <tr className="border-b border-zinc-100">
                        <td className="py-3 pr-4">
                          <SeverityPill severity={it.severity} />
                        </td>
                        <td className="py-3 pr-4">
                          <span className="font-mono text-xs">{it.type}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="font-mono text-xs">
                            {it.invoiceId ?? "—"}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-zinc-700">
                          {it.message ?? "—"}
                        </td>
                        <td className="py-3 pr-2 text-zinc-600">
                          {fmtDate(it.createdAt)}
                        </td>
                      </tr>

                      <tr
                        key={`guided-${it.type}-${it.invoiceId ?? "—"}-${
                          it.createdAt ?? "—"
                        }-${idx}`}
                        className="border-b border-zinc-100"
                      >
                        <td className="py-3 pr-4" />
                        <td className="py-3 pr-4" colSpan={4}>
                          <div className="grid gap-2 md:grid-cols-3">
                            <div className="rounded-xl border border-zinc-200 bg-white p-3">
                              <div className="text-xs font-semibold text-zinc-900">
                                Cause
                              </div>
                              <div className="mt-1 text-sm text-zinc-700">
                                {g.cause}
                              </div>
                            </div>

                            <div className="rounded-xl border border-zinc-200 bg-white p-3">
                              <div className="text-xs font-semibold text-zinc-900">
                                Impact
                              </div>
                              <div className="mt-1 text-sm text-zinc-700">
                                {g.impact}
                              </div>
                            </div>

                            <div className="rounded-xl border border-zinc-200 bg-white p-3">
                              <div className="text-xs font-semibold text-zinc-900">
                                Next step
                              </div>
                              <div className="mt-1 text-sm text-zinc-700">
                                {g.action ?? "—"}
                              </div>
                            </div>

                            <div className="rounded-xl border border-zinc-200 bg-white p-3">
                              <div className="text-xs font-semibold text-zinc-900">
                                Action
                              </div>
                              <div className="mt-1 text-sm text-zinc-700">
                                {g.action}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
