"use client";

import * as React from "react";
import { formatNumberCH } from "@/shared/lib/formatters";
import type { Invoice } from "@/features/accounting/invoice/types/invoice";
import type { InvoiceLedgerEvent } from "@/shared/api/pspApi";

type Props = {
  invoiceId?: string;
  invoice?: Invoice;
  ledgerEvents?: InvoiceLedgerEvent[];
  note?: string;
};

function fmt(v: number | null | undefined, currency?: string): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  const formatted = formatNumberCH(v, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const value = formatted === "-" ? "—" : formatted;
  return currency ? `${value} ${currency.toUpperCase()}` : value;
}

function Row({
  label,
  value,
  mono = true,
  wrap = false,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  wrap?: boolean;
  tone?: "default" | "muted";
}) {
  const title = typeof value === "string" ? value : undefined;

  return (
    <div className="grid grid-cols-12 gap-3 py-3">
      <div className="col-span-12 text-xs font-medium text-zinc-500 md:col-span-4">
        {label}
      </div>
      <div
        className={[
          "col-span-12 text-sm md:col-span-8",
          tone === "muted" ? "text-zinc-700" : "text-zinc-900",
          mono ? "font-mono text-[13px] tabular-nums" : "",
          wrap
            ? "break-all"
            : "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap",
        ].join(" ")}
        title={title}
      >
        {value}
      </div>
    </div>
  );
}

export default function Accounting({
  invoiceId,
  invoice,
  ledgerEvents = [],
  note,
}: Props) {
  const connected = ledgerEvents.length > 0;
  const ledgerStatus = connected
    ? "CONNECTED (SSOT)"
    : "PENDING / NOT CONNECTED";
  const recordsCount = String(ledgerEvents.length);

  const confirmedEvent = ledgerEvents.find(
    (e) => e.eventType === "invoice.confirmed"
  );

  const gross = confirmedEvent?.fiatAmount ?? invoice?.grossAmount ?? null;
  const fee = confirmedEvent?.fiatAmount ?? invoice?.feeAmount ?? null;
  const net = confirmedEvent?.fiatAmount ?? invoice?.netAmount ?? null;
  const currency =
    confirmedEvent?.fiatCurrency ?? invoice?.fiatCurrency ?? "CHF";

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-zinc-900">
              Accounting & Ledger
            </div>
            {invoiceId && (
              <div className="mt-1 text-xs text-zinc-500">
                Invoice ID: <span className="font-mono">{invoiceId}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 divide-y divide-zinc-100">
          <Row
            label="Ledger status"
            value={ledgerStatus}
            tone={connected ? "default" : "muted"}
          />
          <Row label="System Entries" value={recordsCount} />

          <div className="bg-zinc-50/50 -mx-6 px-6 py-2 my-2 border-y border-zinc-100">
            <Row label="Gross (Total)" value={fmt(gross, currency)} />
            <Row label="Processing Fee" value={fmt(fee, currency)} />
            <Row
              label="Net (Settlement)"
              value={<span className="font-bold">{fmt(net, currency)}</span>}
            />
          </div>

          <Row
            label="Retention Audit"
            mono={false}
            tone="muted"
            wrap
            value={
              note ??
              "Receipt view for accounting & audit. Payment facts are retained for 10 years and synchronized with the immutable Ledger."
            }
          />
        </div>
      </div>
    </section>
  );
}
