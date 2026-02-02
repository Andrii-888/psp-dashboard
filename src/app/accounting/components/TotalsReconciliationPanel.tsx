// src/app/accounting/components/TotalsReconciliationPanel.tsx

import type { AccountingEntryRaw } from "../lib/types";

type SummaryData = {
  merchantId: string;
  from: string | null;
  to: string | null;
  confirmedCount: number;
  grossSum: string;
  feeSum: string;
  netSum: string;
  feeFiatSum: string;
  feeFiatCurrency: string | null;
};

type Props = {
  entries: AccountingEntryRaw[];
  summary: SummaryData | null;
};

function toPlainString(v: string | number): string {
  return typeof v === "number" ? String(v) : v;
}

function normalizeDecimalString(input: string): string {
  const s = String(input ?? "").trim();
  if (!s) return "0";

  const neg = s.startsWith("-");
  const raw = neg ? s.slice(1) : s;

  const parts = raw.split(".");
  const intPartRaw = parts[0] ?? "0";
  const fracPartRaw = parts[1] ?? "";

  let intPart = intPartRaw.replace(/^0+(?=\d)/, "");
  if (!intPart) intPart = "0";

  const fracPart = fracPartRaw.replace(/0+$/, "");

  const out = fracPart ? `${intPart}.${fracPart}` : intPart;
  const out2 = out === "0" ? "0" : out;
  return neg && out2 !== "0" ? `-${out2}` : out2;
}

function splitDecimal(s: string): { neg: boolean; int: string; frac: string } {
  const n = normalizeDecimalString(s);
  const neg = n.startsWith("-");
  const raw = neg ? n.slice(1) : n;
  const [i, f] = raw.split(".");
  return { neg, int: i ?? "0", frac: f ?? "" };
}

function addDecimalStrings(a: string, b: string): string {
  const A = splitDecimal(a);
  const B = splitDecimal(b);

  if (A.neg || B.neg) {
    const x = Number(a);
    const y = Number(b);
    if (Number.isFinite(x) && Number.isFinite(y))
      return normalizeDecimalString(String(x + y));
    return normalizeDecimalString(a);
  }

  const scale = Math.max(A.frac.length, B.frac.length);
  const aInt = BigInt(A.int + A.frac.padEnd(scale, "0"));
  const bInt = BigInt(B.int + B.frac.padEnd(scale, "0"));
  const sum = aInt + bInt;

  let sumStr = sum.toString();

  if (scale === 0) return normalizeDecimalString(sumStr);

  if (sumStr.length <= scale) {
    sumStr = sumStr.padStart(scale + 1, "0");
  }

  const cut = sumStr.length - scale;
  const intPart = sumStr.slice(0, cut);
  const fracPart = sumStr.slice(cut);
  return normalizeDecimalString(`${intPart}.${fracPart}`);
}

function sumField(
  entries: AccountingEntryRaw[],
  pick: (e: AccountingEntryRaw) => string | number
) {
  let acc = "0";
  for (const e of entries) {
    acc = addDecimalStrings(acc, toPlainString(pick(e)));
  }
  return normalizeDecimalString(acc);
}

/**
 * Summary values may contain float artifacts like:
 *  478.46000000000004
 * We "pretty-normalize" them to stable decimals (still as string).
 */
function normalizeFromNumberIfPossible(input: string): string {
  const n = Number(input);
  if (!Number.isFinite(n)) return normalizeDecimalString(input);

  // Keep enough precision to safely remove float noise, then trim.
  // 12 decimals is more than enough for fee/gross/net in our case.
  return normalizeDecimalString(n.toFixed(12));
}

function nearlyEqual(a: string, b: string, eps = 1e-9): boolean {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isFinite(na) || !Number.isFinite(nb)) return a === b;
  return Math.abs(na - nb) <= eps;
}

function formatDelta(summaryVal: string, entriesVal: string) {
  const a = Number(summaryVal);
  const b = Number(entriesVal);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return "—";

  const d = b - a;
  const sign = d > 0 ? "+" : "";
  return normalizeFromNumberIfPossible(`${sign}${d}`);
}

function deltaClass(summaryVal: string, entriesVal: string) {
  const a = Number(summaryVal);
  const b = Number(entriesVal);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return "text-zinc-400";

  const d = b - a;
  if (d > 0) return "text-emerald-700";
  if (d < 0) return "text-red-700";
  return "text-zinc-600";
}

type BadgeKind = "na" | "ok" | "warn" | "partial" | "mismatch";

function Badge({ kind }: { kind: BadgeKind }) {
  if (kind === "na") {
    return (
      <div className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700">
        Not available
      </div>
    );
  }

  if (kind === "ok") {
    return (
      <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        OK
      </div>
    );
  }

  if (kind === "warn") {
    return (
      <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
        WARN
      </div>
    );
  }

  if (kind === "partial") {
    return (
      <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
        Partial (not comparable)
      </div>
    );
  }

  return (
    <div className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
      ERROR
    </div>
  );
}

export default function TotalsReconciliationPanel({ entries, summary }: Props) {
  const hasSummary = Boolean(summary);

  // ✅ IMPORTANT: Totals are based on invoice.confirmed only.
  // So reconciliation must compare summary vs entries filtered to invoice.confirmed.
  const confirmedEntries = entries.filter(
    (e) => String(e.eventType ?? "").trim() === "invoice.confirmed"
  );

  const computedGross = sumField(confirmedEntries, (e) => e.grossAmount);
  const computedFee = sumField(confirmedEntries, (e) => e.feeAmount);
  const computedNet = sumField(confirmedEntries, (e) => e.netAmount);

  // ✅ normalize summary (remove float artifacts)
  const summaryGross = normalizeFromNumberIfPossible(summary?.grossSum ?? "0");
  const summaryFee = normalizeFromNumberIfPossible(summary?.feeSum ?? "0");
  const summaryNet = normalizeFromNumberIfPossible(summary?.netSum ?? "0");

  const summaryCount = Number(summary?.confirmedCount ?? 0);
  const confirmedEntriesCount = confirmedEntries.length;

  // Comparable when we have enough confirmed rows loaded for the period.
  // (When summaryCount=0, we allow comparison: both should be 0.)
  const isComparable =
    hasSummary && (summaryCount === 0 || confirmedEntriesCount >= summaryCount);

  const okGross = isComparable && nearlyEqual(summaryGross, computedGross);
  const okNet = isComparable && nearlyEqual(summaryNet, computedNet);

  // Fee comparison:
  // If backend summary feeSum is "0", treat fee as not comparable and do NOT fail totals.
  const canCompareFee = summaryFee !== "0";
  const okFee =
    !isComparable || !canCompareFee || nearlyEqual(summaryFee, computedFee);

  const isError = isComparable && (!okGross || !okNet);
  const isWarn = isComparable && !isError && canCompareFee && !okFee;
  const allOk = isComparable && !isError && !isWarn;

  let badge: BadgeKind = "na";
  if (!hasSummary) badge = "na";
  else if (!isComparable) badge = "partial";
  else if (allOk) badge = "ok";
  else if (isWarn) badge = "warn";
  else badge = "mismatch";

  return (
    <div className="mt-6 rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
        <div>
          <div className="text-sm font-semibold text-zinc-900">
            Totals reconciliation
          </div>
          <div className="mt-1 text-sm text-zinc-500">
            Verifies totals for the selected range
          </div>

          {hasSummary ? (
            <div className="mt-2 text-sm text-zinc-500">
              Coverage:&nbsp;
              <span className="font-mono text-zinc-900">
                {confirmedEntriesCount}
              </span>
              <span className="mx-1 text-zinc-400">·</span>
              Summary:&nbsp;
              <span className="font-mono text-zinc-900">{summaryCount}</span>
            </div>
          ) : null}
        </div>

        <Badge kind={badge} />
      </div>

      <div className="p-4">
        {!hasSummary ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
            Summary endpoint not available, cannot reconcile totals.
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Operator summary — scope + fee policy (compact, Apple/ChatGPT style) */}
            <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
              <span className="text-zinc-500">Scope</span>
              <span className="rounded-lg border border-zinc-200 bg-white px-2 py-1 font-mono text-xs text-zinc-900">
                invoice.confirmed
              </span>

              <span className="text-zinc-300">•</span>

              <span className="text-zinc-500">Fees</span>
              {summaryFee === "0" ? (
                <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-700">
                  skipped (summary fee = 0)
                </span>
              ) : (
                <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                  included (summary fee ={" "}
                  <span className="font-mono">{summaryFee}</span>)
                </span>
              )}
            </div>

            {/* Metrics — card columns (Apple/ChatGPT style) */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Metric */}
              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="text-xs font-medium text-zinc-500">Metric</div>
                <div className="mt-3 divide-y divide-zinc-100 font-mono text-xs tabular-nums leading-6">
                  <div className="py-2 text-zinc-900">Gross</div>
                  <div className="py-2 text-zinc-600">Fee</div>
                  <div className="py-2 text-zinc-900">Net</div>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-xl border text-center border-zinc-200 bg-white p-4">
                <div className="text-xs font-medium text-zinc-600">Summary</div>
                <div className="mt-3 divide-y divide-zinc-100 font-mono text-xs tabular-nums leading-6">
                  <div className="py-2 text-zinc-900">{summaryGross}</div>
                  <div className="py-2 text-amber-700">{summaryFee}</div>
                  <div className="py-2 text-emerald-700">{summaryNet}</div>
                </div>
              </div>

              {/* Entries */}
              <div className="rounded-xl border text-center border-zinc-200 bg-white p-4">
                <div className="text-xs font-medium text-sky-700">
                  Entries sum (confirmed)
                </div>
                <div className="mt-3 divide-y divide-zinc-100 font-mono text-xs tabular-nums leading-6 text-zinc-900">
                  <div className="py-2">{computedGross}</div>
                  <div className="py-2">{computedFee}</div>
                  <div className="py-2">{computedNet}</div>
                </div>
              </div>

              {/* Delta */}
              <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center">
                <div className="text-xs font-medium text-violet-700">
                  Δ (entries - summary)
                </div>

                <div className="mt-3 divide-y divide-zinc-100 font-mono text-xs tabular-nums leading-6">
                  <div
                    className={`py-2 ${deltaClass(
                      summaryGross,
                      computedGross
                    )}`}
                  >
                    {formatDelta(summaryGross, computedGross)}
                  </div>

                  <div
                    className={`py-2 ${deltaClass(summaryFee, computedFee)}`}
                  >
                    {formatDelta(summaryFee, computedFee)}
                  </div>

                  <div
                    className={`py-2 ${deltaClass(summaryNet, computedNet)}`}
                  >
                    {formatDelta(summaryNet, computedNet)}
                  </div>
                </div>
              </div>
            </div>

            {badge === "partial" ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Totals check is disabled because not all confirmed rows are
                loaded for the selected period (limit/pagination). Increase
                limit for full-period reconciliation.
              </div>
            ) : badge === "warn" ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Gross and Net totals match, but Fee totals differ. This is a
                warning (not an error) because fee accounting can be configured
                separately (or fee may be intentionally omitted from summary).
              </div>
            ) : badge === "mismatch" ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                Gross/Net totals mismatch for confirmed rows. This usually means
                missing/duplicate{" "}
                <span className="font-mono">invoice.confirmed</span> entries for
                the period.
              </div>
            ) : !canCompareFee && isComparable ? (
              <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                Fee reconciliation is not comparable because{" "}
                <span className="font-mono">summary.feeSum</span> is{" "}
                <span className="font-mono">0</span> (expected).
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
