// src/app/accounting/components/AccountingRow.tsx

import type { AccountingEntryRaw } from "../lib/types";
import { fmtDate, fmtMoney, toNumber } from "../lib/format";

function eventClass(eventType?: string) {
  switch (eventType) {
    case "invoice.confirmed":
      return "text-emerald-700 bg-emerald-50";
    case "fee_charged":
      return "text-amber-700 bg-amber-50";
    case "invoice.confirmed_reversed":
      return "text-rose-700 bg-rose-50";
    case "invoice.expired":
      return "text-zinc-600 bg-zinc-100";
    default:
      return "text-zinc-600 bg-zinc-100";
  }
}

function invoiceClass(eventType?: string) {
  switch (eventType) {
    case "invoice.confirmed":
      return "text-emerald-700";
    case "fee_charged":
      return "text-amber-700";
    case "invoice.confirmed_reversed":
      return "text-rose-700";
    case "invoice.expired":
      return "text-zinc-500";
    default:
      return "text-zinc-600";
  }
}

export default function AccountingRow({
  entry,
}: {
  entry: AccountingEntryRaw;
}) {
  const gross = toNumber(entry.grossAmount, 0);
  const fee = toNumber(entry.feeAmount, 0);
  const net = toNumber(entry.netAmount, 0);

  return (
    <>
      {/* Created */}
      <td className="px-4 py-3 font-mono text-xs text-zinc-500">
        {fmtDate(entry.createdAt)}
      </td>

      {/* Invoice */}
      <td className="px-4 py-3">
        <div
          className={`font-mono text-xs leading-snug break-all ${invoiceClass(
            entry.eventType
          )}`}
        >
          {entry.invoiceId}
        </div>
      </td>

      {/* Event */}
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 font-mono text-[11px] leading-none ${eventClass(
            entry.eventType
          )}`}
        >
          {entry.eventType}
        </span>
      </td>

      {/* Gross */}
      <td className="px-4 py-3 text-right font-mono text-xs font-medium tabular-nums text-zinc-600">
        {gross ? fmtMoney(gross) : "—"}
      </td>

      {/* Fee */}
      <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-amber-700">
        {fee ? fmtMoney(fee) : "—"}
      </td>

      {/* Net */}
      <td className="px-4 py-3 text-right font-mono text-xs font-medium tabular-nums text-zinc-800">
        {net ? fmtMoney(net) : "—"}
      </td>

      {/* Asset */}
      <td className="px-4 py-3">
        <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs font-medium uppercase tracking-wide text-zinc-800">
          {entry.currency}
        </span>
      </td>

      {/* Network */}
      <td className="px-4 py-3">
        <span className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-zinc-500">
          {entry.network}
        </span>
      </td>
    </>
  );
}
