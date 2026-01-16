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

function norm(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

export default function AccountingKpis({ entries, summary }: Props) {
  /**
   * ✅ 1. Если backend дал summary — используем его как source of truth
   */
  if (summary) {
    const gross = toNumber(summary.grossSum, 0);
    const fee = toNumber(summary.feeSum, 0);
    const net = toNumber(summary.netSum, 0);
    const count = Number(summary.confirmedCount ?? 0) || 0;

    const items: KpiItem[] = [
      { label: "Gross volume", value: fmtMoney(gross, "USD") },
      { label: "Fees", value: fmtMoney(fee, "USD") },
      { label: "Net volume", value: fmtMoney(net, "USD") },
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

  /**
   * ✅ 2. Fallback: считаем ТОЛЬКО корректные события
   */
  let gross = 0;
  let net = 0;
  let fee = 0;

  const confirmedInvoiceIds = new Set<string>();

  for (const e of entries) {
    const eventType = norm(e.eventType);
    const invoiceId = String(e.invoiceId ?? "").trim();

    if (eventType === "invoice.confirmed") {
      gross += toNumber(e.grossAmount, 0);
      net += toNumber(e.netAmount, 0);
      if (invoiceId) confirmedInvoiceIds.add(invoiceId);
    }

    if (eventType === "fee_charged") {
      fee += toNumber(e.feeAmount, 0);
    }
  }

  const items: KpiItem[] = [
    { label: "Gross volume", value: fmtMoney(gross, "USD") },
    { label: "Fees", value: fmtMoney(fee, "USD") },
    { label: "Net volume", value: fmtMoney(net, "USD") },
    { label: "Transactions", value: String(confirmedInvoiceIds.size) },
  ];

  return (
    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((it) => (
        <KpiCard key={it.label} label={it.label} value={it.value} />
      ))}
    </div>
  );
}
