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

type BadgeKind = "na" | "ok" | "partial" | "mismatch";

function Badge({ kind }: { kind: BadgeKind }) {
  if (kind === "na") {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700">
        Not available
      </div>
    );
  }

  if (kind === "ok") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        OK
      </div>
    );
  }

  if (kind === "partial") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
        Partial (not comparable)
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
      Mismatch
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

  // Fee comparison:
  // If backend summary feeSum is "0", treat fee as not comparable and do NOT fail totals.
  const canCompareFee = summaryFee !== "0";
  const okFee =
    !isComparable || !canCompareFee || nearlyEqual(summaryFee, computedFee);

  const okNet = isComparable && nearlyEqual(summaryNet, computedNet);

  const allOk = okGross && okNet && okFee;

  let badge: BadgeKind = "na";
  if (!hasSummary) badge = "na";
  else if (!isComparable) badge = "partial";
  else badge = allOk ? "ok" : "mismatch";

  return (
    <div className="mt-6 rounded-2xl border border-zinc-200 bg-white">
      <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-4">
        <div>
          <div className="text-sm font-semibold text-zinc-900">
            Totals reconciliation
          </div>
          <div className="mt-1 text-xs text-zinc-600">
            Compares totals vs sum of confirmed rows from{" "}
            <span className="font-mono">/accounting/entries</span> for the same
            period. period.
          </div>

          {hasSummary ? (
            <div className="mt-2 text-xs text-zinc-600">
              confirmed entries loaded:{" "}
              <span className="font-mono text-zinc-800">
                {confirmedEntriesCount}
              </span>
              {" · "}confirmedCount:{" "}
              <span className="font-mono text-zinc-800">{summaryCount}</span>
              {!isComparable ? (
                <span className="text-amber-700">
                  {" · "}comparison disabled (limit/pagination)
                </span>
              ) : null}
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
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-zinc-500">
                <tr className="border-b border-zinc-200">
                  <th className="py-2 pr-4">Metric</th>
                  <th className="py-2 pr-4">Summary</th>
                  <th className="py-2 pr-4">Entries sum (confirmed)</th>
                  <th className="py-2 pr-2">Δ (entries - summary)</th>
                </tr>
              </thead>
              <tbody className="text-zinc-900">
                <tr className="border-b border-zinc-100">
                  <td className="py-3 pr-4 font-medium">Gross</td>
                  <td className="py-3 pr-4 font-mono text-xs">
                    {summaryGross}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs">
                    {computedGross}
                  </td>
                  <td className="py-3 pr-2 font-mono text-xs text-zinc-700">
                    {formatDelta(summaryGross, computedGross)}
                  </td>
                </tr>

                <tr className="border-b border-zinc-100">
                  <td className="py-3 pr-4 font-medium">Fee</td>
                  <td className="py-3 pr-4 font-mono text-xs">{summaryFee}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{computedFee}</td>
                  <td className="py-3 pr-2 font-mono text-xs text-zinc-700">
                    {formatDelta(summaryFee, computedFee)}
                  </td>
                </tr>

                <tr>
                  <td className="py-3 pr-4 font-medium">Net</td>
                  <td className="py-3 pr-4 font-mono text-xs">{summaryNet}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{computedNet}</td>
                  <td className="py-3 pr-2 font-mono text-xs text-zinc-700">
                    {formatDelta(summaryNet, computedNet)}
                  </td>
                </tr>
              </tbody>
            </table>

            {badge === "partial" ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Totals check is disabled because not all confirmed rows are
                loaded for the selected period (limit/pagination). Increase
                limit or add a backend totals-check endpoint for full-period
                reconciliation.
              </div>
            ) : badge === "mismatch" ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                Totals mismatch detected for confirmed rows. This usually means
                missing/duplicate{" "}
                <span className="font-mono">invoice.confirmed</span> entries for
                the period.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
