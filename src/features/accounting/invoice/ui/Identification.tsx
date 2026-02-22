"use client";

import type { Invoice } from "../types/invoice";
import { CopyReceiptButton } from "@/components/ui/CopyReceiptButton";

function fmtUtc(ts?: string | null): string {
  const v = String(ts ?? "").trim();
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    new Intl.DateTimeFormat("de-CH", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d) + " UTC"
  );
}

function Row({
  label,
  value,
  mono = false,
  wrap = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  wrap?: boolean;
}) {
  return (
    <div className="grid grid-cols-12 gap-3 py-3">
      <div className="col-span-12 text-xs font-medium text-zinc-500 md:col-span-4">
        {label}
      </div>
      <div
        className={[
          "col-span-12 text-sm text-zinc-900 md:col-span-8",
          mono ? "font-mono text-[13px] tabular-nums" : "",
          wrap
            ? "break-all"
            : "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap",
        ].join(" ")}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </div>
    </div>
  );
}

export default function Identification({ invoice }: { invoice: Invoice }) {
  const merchantId =
    invoice && "merchantId" in invoice
      ? String((invoice as { merchantId?: unknown }).merchantId ?? "—")
      : "—";

  const status = String(invoice.status ?? "—").toUpperCase();

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="px-6 py-5">
        {/* Header + Copy */}
        <div className="flex items-start justify-between gap-4">
          <div className="text-sm font-semibold text-zinc-900">
            Identification
          </div>

          <CopyReceiptButton invoice={invoice} label="Copy" />
        </div>

        <div className="mt-4 divide-y divide-zinc-100">
          <Row label="Invoice ID" value={invoice.id ?? "—"} mono wrap />
          <Row label="Merchant ID" value={merchantId} mono />
          <Row label="Created at" value={fmtUtc(invoice.createdAt)} mono />
          <Row label="Confirmed at" value={fmtUtc(invoice.confirmedAt)} mono />
          <Row label="Status" value={status} mono />
        </div>
      </div>
    </section>
  );
}
