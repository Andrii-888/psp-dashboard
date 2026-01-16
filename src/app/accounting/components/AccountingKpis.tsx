// src/app/accounting/components/AccountingKpis.tsx
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
  currency: "EUR"; // ← сейчас строго EUR, CHF добавим позже
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

function isCurrency(e: AccountingEntryRaw, currency: "EUR"): boolean {
  return String(e.currency ?? "").toUpperCase() === currency;
}

export default function AccountingKpis({ entries, summary, currency }: Props) {
  const fallback = entries.reduce(
    (acc, e) => {
      if (e.eventType === "invoice.confirmed" && isCurrency(e, currency)) {
        acc.gross += toNumber(e.grossAmount, 0);
        acc.net += toNumber(e.netAmount, 0);
        acc.count += 1;
      }

      if (e.eventType === "fee_charged" && isCurrency(e, currency)) {
        acc.fee += toNumber(e.feeAmount, 0);
      }

      return acc;
    },
    { gross: 0, fee: 0, net: 0, count: 0 }
  );

  const gross = summary ? toNumber(summary.grossSum, 0) : fallback.gross;
  const fee = summary ? toNumber(summary.feeSum, 0) : fallback.fee;
  const net = summary ? toNumber(summary.netSum, 0) : fallback.net;
  const count = summary ? Number(summary.confirmedCount ?? 0) : fallback.count;

  const items: KpiItem[] = [
    { label: "Gross volume", value: fmtMoney(gross, currency) },
    { label: "Fees", value: fmtMoney(fee, currency) },
    { label: "Net volume", value: fmtMoney(net, currency) },
    {
      label: "Transactions",
      value: String(Number.isFinite(count) ? count : 0),
    },
  ];

  return (
    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((it) => (
        <KpiCard key={it.label} label={it.label} value={it.value} />
      ))}
    </div>
  );
}
