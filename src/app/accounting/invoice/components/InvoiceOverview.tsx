// src/app/accounting/invoice/components/InvoiceOverview.tsx

import type { Invoice } from "@/domain/invoices/types";
import { Row } from "../ui/Row";

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function fmtMoney(amount?: string | number | null, currency?: string | null) {
  if (amount === null || amount === undefined || amount === "") return "—";
  const c = currency ?? "";
  return c ? `${amount} ${c}` : String(amount);
}

function fmtAmounts(invoice: Invoice) {
  const gross = invoice.grossAmount ?? "—";
  const fee = invoice.feeAmount ?? "—";
  const net = invoice.netAmount ?? "—";
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
          label="fiat"
          value={fmtMoney(
            invoice.fiatAmount ?? null,
            invoice.fiatCurrency ?? null
          )}
          mono
        />

        <Row
          label="crypto"
          value={fmtMoney(
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
