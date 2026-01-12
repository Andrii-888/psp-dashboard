import { fmtMoney, toNumber } from "../lib/format";
import type { AccountingEntryRaw } from "../lib/types";

type Props = {
  entries: AccountingEntryRaw[];
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

export default function AccountingKpis({ entries }: Props) {
  const totals = entries.reduce(
    (acc, e) => {
      acc.gross += toNumber(e.grossAmount, 0);
      acc.fee += toNumber(e.feeAmount, 0);
      acc.net += toNumber(e.netAmount, 0);
      acc.count += 1;
      return acc;
    },
    { gross: 0, fee: 0, net: 0, count: 0 }
  );

  const items: KpiItem[] = [
    { label: "Gross volume", value: fmtMoney(totals.gross, "USD") },
    { label: "Fees", value: fmtMoney(totals.fee, "USD") },
    { label: "Net volume", value: fmtMoney(totals.net, "USD") },
    { label: "Transactions", value: String(totals.count) },
  ];

  return (
    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((it) => (
        <KpiCard key={it.label} label={it.label} value={it.value} />
      ))}
    </div>
  );
}
