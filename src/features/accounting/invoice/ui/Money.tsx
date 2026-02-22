"use client";

import type { Invoice } from "../types/invoice";
import React from "react";
import { formatNumberCH } from "@/shared/lib/formatters";

function upper(v?: string | null): string {
  return (
    String(v ?? "")
      .trim()
      .toUpperCase() || "—"
  );
}

function num(v: number | null | undefined, digits = 2): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  return formatNumberCH(v, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
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
          wrap ? "break-all" : "truncate",
        ].join(" ")}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </div>
    </div>
  );
}

export default function Money({ invoice }: { invoice: Invoice }) {
  const fiatCurrency = upper(invoice.fiatCurrency);
  const cryptoCurrency = upper(invoice.cryptoCurrency);

  const gross = invoice.grossAmount ?? null;
  const fee = invoice.feeAmount ?? null;
  const net = invoice.netAmount ?? null;

  const feePayer = upper(invoice.feePayer ?? null);
  const feeBps =
    typeof invoice.feeBps === "number" && Number.isFinite(invoice.feeBps)
      ? String(invoice.feeBps)
      : "—";

  const cryptoAmountRaw = invoice.cryptoAmount;
  const cryptoDigits =
    typeof cryptoAmountRaw === "number" && Number.isFinite(cryptoAmountRaw)
      ? cryptoAmountRaw % 1 === 0
        ? 2
        : 8
      : 8;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="px-6 py-5">
        <div>
          <div className="text-sm font-semibold text-zinc-900">Money</div>
          <div className="mt-1 text-xs text-zinc-500">
            Source: Invoice amounts (ledger SSOT will be connected next).
          </div>
        </div>

        {/* Receipt-style core amounts */}
        <div className="mt-4 divide-y divide-zinc-100">
          <Row label="Gross" value={`${num(gross, 2)} ${fiatCurrency}`} />
          <Row label="Fee" value={`− ${num(fee, 2)} ${fiatCurrency}`} />
          <Row label="Net" value={`${num(net, 2)} ${fiatCurrency}`} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-600">
          <span>Fee payer:</span>
          <span className="font-mono text-[12px] text-zinc-900">
            {feePayer}
          </span>
          <span className="text-zinc-400">·</span>
          <span>Fee bps:</span>
          <span className="font-mono text-[12px] text-zinc-900">{feeBps}</span>
        </div>

        {/* Fiat/Crypto amounts */}
        <div className="mt-4 divide-y divide-zinc-100">
          <Row
            label="Fiat amount"
            value={`${num(invoice.fiatAmount, 2)} ${fiatCurrency}`}
          />
          <Row
            label="Crypto amount"
            value={`${num(
              invoice.cryptoAmount,
              cryptoDigits
            )} ${cryptoCurrency}`}
          />
        </div>
      </div>
    </section>
  );
}
