import { fmtMoney, toNumber } from "../lib/format";
import type { AccountingEntryRaw } from "../lib/types";

type SummaryLike = {
  confirmedCount: number;
  grossSum: string;
  feeSum: string;
  netSum: string;
};

type Props = {
  entries: AccountingEntryRaw[];
  summary?: SummaryLike | null;

  /**
   * IMPORTANT:
   * Accounting entries can contain mixed currencies (EUR fees + USDT confirmed, etc).
   * KPI must never sum mixed currencies together.
   */
  currency?: string; // default: "EUR"
};

type KpiItem = {
  label: string;
  value: string;
};

function KpiCard({ label, value }: KpiItem) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-zinc-900 tabular-nums">
        {value}
      </div>
    </div>
  );
}

export default function AccountingKpis({ entries, currency = "EUR" }: Props) {
  // Filter to ONE currency so KPI is deterministic
  const filtered = entries.filter((e) => {
    const c = String(e.currency ?? "")
      .trim()
      .toUpperCase();
    return c === String(currency).toUpperCase();
  });

  const fallbackTotals = filtered.reduce(
    (acc, e) => {
      acc.gross += toNumber(e.grossAmount, 0);
      acc.fee += toNumber(e.feeAmount, 0);
      acc.net += toNumber(e.netAmount, 0);
      acc.count += 1;
      return acc;
    },
    { gross: 0, fee: 0, net: 0, count: 0 }
  );

  // IMPORTANT:
  // summary can be wrong if backend summary currently mixes currencies.
  // Until backend is fixed, KPI should rely on filtered entries.
  const gross = fallbackTotals.gross;
  const fee = fallbackTotals.fee;
  const net = fallbackTotals.net;
  const count = fallbackTotals.count;

  const items: KpiItem[] = [
    { label: `Gross volume (${currency})`, value: fmtMoney(gross, currency) },
    { label: `Fees (${currency})`, value: fmtMoney(fee, currency) },
    { label: `Net volume (${currency})`, value: fmtMoney(net, currency) },
    { label: "Transactions", value: String(count) },
  ];

  return (
    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((it) => (
        <KpiCard key={it.label} label={it.label} value={it.value} />
      ))}
    </div>
  );
}
