"use client";

import React from "react";
import type { Invoice } from "../types/invoice";
import { formatDateTimeCH, formatNumberCH } from "@/shared/lib/formatters";

function upper(v?: string | null): string {
  return (
    String(v ?? "")
      .trim()
      .toUpperCase() || "—"
  );
}

function fmtInt(n?: number | null): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return formatNumberCH(n, { maximumFractionDigits: 0 });
}

function Row({
  label,
  value,
  wrap = false,
}: {
  label: string;
  value: React.ReactNode;
  wrap?: boolean;
}) {
  const title = typeof value === "string" ? value : undefined;

  return (
    <div className="grid grid-cols-12 gap-3 py-3">
      <div className="col-span-12 text-xs font-medium text-zinc-500 md:col-span-4">
        {label}
      </div>
      <div
        className={[
          "col-span-12 text-sm text-zinc-900 md:col-span-8",
          "font-mono text-[13px] tabular-nums",
          wrap ? "break-all" : "truncate",
        ].join(" ")}
        title={title}
      >
        {value}
      </div>
    </div>
  );
}

export default function BlockchainReference({ invoice }: { invoice: Invoice }) {
  const network =
    invoice.network ??
    (invoice.pay?.network ? String(invoice.pay.network) : null) ??
    null;

  const wallet = invoice.walletAddress ?? null;
  const txHash = invoice.txHash ?? null;

  const confirmations = invoice.confirmations ?? null;
  const required = invoice.requiredConfirmations ?? null;

  const detectedAt = invoice.detectedAt ?? null;

  // Show block only when there's something to trace on-chain
  const hasAnything =
    Boolean(network) ||
    Boolean(wallet) ||
    Boolean(txHash) ||
    typeof confirmations === "number" ||
    Boolean(detectedAt);

  if (!hasAnything) return null;

  return (
    <section className="mt-4 rounded-2xl border border-zinc-200 bg-white">
      <div className="px-6 py-5">
        <div className="text-sm font-semibold text-zinc-900">
          Blockchain reference
        </div>
        <div className="mt-1 text-xs text-zinc-500">
          Reference fields for chain tracing.
        </div>

        <div className="mt-4 divide-y divide-zinc-100">
          <Row label="Network" value={upper(network)} />

          <Row label="Wallet address" value={wallet ? wallet : "—"} wrap />

          <Row label="Transaction hash" value={txHash ? txHash : "—"} wrap />

          <Row
            label="Confirmations (final)"
            value={
              typeof confirmations === "number"
                ? `${fmtInt(confirmations)}/${fmtInt(required)}`
                : "—"
            }
          />

          <Row
            label="Detected at"
            value={detectedAt ? `${formatDateTimeCH(detectedAt)} UTC` : "—"}
          />
        </div>
      </div>
    </section>
  );
}
