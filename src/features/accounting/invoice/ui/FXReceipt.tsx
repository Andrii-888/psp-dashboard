"use client";

import type { Invoice } from "../types/invoice";
import { formatNumberCH, formatDateTimeCH } from "@/shared/lib/formatters";

function upper(v?: string | null): string {
  return (
    String(v ?? "")
      .trim()
      .toUpperCase() || "—"
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-12 gap-3 py-3">
      <div className="col-span-12 text-xs font-medium text-zinc-500 md:col-span-4">
        {label}
      </div>
      <div className="col-span-12 text-sm font-mono text-[13px] text-zinc-900 md:col-span-8">
        {value}
      </div>
    </div>
  );
}

export default function FXReceipt({ invoice }: { invoice: Invoice }) {
  const hasFx =
    typeof invoice.fxRate === "number" ||
    invoice.fxPair ||
    invoice.fxSource ||
    invoice.fxLockedAt;

  if (!hasFx) return null;

  return (
    <section className="mt-4 rounded-2xl border border-zinc-200 bg-white">
      <div className="px-6 py-5">
        <div className="text-sm font-semibold text-zinc-900">FX</div>
        <div className="mt-1 text-xs text-zinc-500">
          Shown only when FX context exists (rate-lock / source).
        </div>

        <div className="mt-4 divide-y divide-zinc-100">
          <Row label="Pair" value={upper(invoice.fxPair)} />

          <Row
            label="Rate"
            value={
              typeof invoice.fxRate === "number"
                ? formatNumberCH(invoice.fxRate, {
                    minimumFractionDigits: 6,
                    maximumFractionDigits: 6,
                  })
                : "—"
            }
          />

          <Row label="Source" value={upper(invoice.fxSource)} />

          <Row label="Locked at" value={formatDateTimeCH(invoice.fxLockedAt)} />
        </div>
      </div>
    </section>
  );
}
