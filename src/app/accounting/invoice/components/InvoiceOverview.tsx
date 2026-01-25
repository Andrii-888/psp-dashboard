// src/app/accounting/invoice/components/InvoiceOverview.tsx

import type { Invoice } from "@/domain/invoices/types";
import { Row } from "../ui/Row";
import { fmtMoney, toNumber } from "../../lib/format";

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function fmtAsset(amount?: string | number | null, asset?: string | null) {
  if (amount === null || amount === undefined || amount === "") return "—";
  const a = (asset ?? "").trim();
  return a ? `${amount} ${a}` : String(amount);
}

function fmtAmounts(invoice: Invoice) {
  const gross = fmtMoney(toNumber(invoice.grossAmount ?? null, 0));
  const fee = fmtMoney(toNumber(invoice.feeAmount ?? null, 0));
  const net = fmtMoney(toNumber(invoice.netAmount ?? null, 0));

  const feeBps = invoice.feeBps ?? "—";
  const feePayer = invoice.feePayer ?? "—";

  return `gross=${gross}, fee=${fee}, net=${net} (feeBps=${feeBps}, feePayer=${feePayer})`;
}

type Props = {
  invoice: Invoice;
};

export function InvoiceOverview({ invoice }: Props) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="text-sm font-semibold text-zinc-900">Overview</div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700">
            {invoice.status}
          </div>
        </div>
      </div>

      <div className="p-4">
        <Row label="merchantId" value={invoice.merchantId ?? "—"} mono />
        <Row label="createdAt" value={fmtDateTime(invoice.createdAt)} />
        <Row label="expiresAt" value={fmtDateTime(invoice.expiresAt)} />

        <Row
          label="fiat (CHF)"
          value={fmtMoney(toNumber(invoice.fiatAmount ?? null, 0))}
          mono
        />

        <Row
          label="asset"
          value={fmtAsset(
            invoice.cryptoAmount ?? null,
            invoice.cryptoCurrency ?? null
          )}
          mono
        />

        <Row label="amounts" value={fmtAmounts(invoice)} mono />

        <Row
          label="fx"
          value={
            invoice.fxPair
              ? `${invoice.fxPair} @ ${invoice.fxRate ?? "—"}`
              : "—"
          }
          mono
        />
      </div>
    </div>
  );
}
