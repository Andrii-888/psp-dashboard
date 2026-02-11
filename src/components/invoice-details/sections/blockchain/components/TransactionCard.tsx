"use client";

import { useMemo } from "react";
import type { OperatorTxViewModel } from "../lib/blockchainTypes";

function formatAmount(amount: string | null, asset: string | null): string {
  if (!amount && !asset) return "—";
  if (amount && asset) return `${amount} ${asset}`;
  return amount ?? asset ?? "—";
}

function Row({
  label,
  value,
  mono = false,
  accent = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-1.5">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>

      <div
        className={[
          "text-[12px] text-slate-100",
          mono ? "overflow-x-auto whitespace-nowrap font-mono" : "",
          accent ? "font-medium text-slate-50" : "",
        ].join(" ")}
      >
        <span className="select-text">{value}</span>
      </div>
    </div>
  );
}

export function TransactionCard({ tx }: { tx: OperatorTxViewModel }) {
  const amountLine = useMemo(
    () => formatAmount(tx.amount ?? null, tx.asset ?? null),
    [tx.amount, tx.asset]
  );

  const confirmationsText =
    typeof tx.confirmations === "number"
      ? `${tx.confirmations}${
          typeof tx.requiredConfirmations === "number"
            ? ` / ${tx.requiredConfirmations}`
            : ""
        }`
      : "—";

  return (
    <div className="md:pr-10">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
        Transaction details
      </div>

      <div className="mt-4 flex flex-col">
        <Row label="From" value={tx.fromAddress ?? "—"} mono />

        <Row label="Amount" value={amountLine} accent />

        <Row label="To" value={tx.toAddress ?? "—"} mono />

        <div className="my-3 h-px bg-white/10" />

        <Row label="Hash" value={tx.txHash ?? "—"} mono />

        <Row
          label="Block"
          value={
            typeof tx.blockNumber === "number" ? String(tx.blockNumber) : "—"
          }
          mono
        />

        <Row label="Confirmations" value={confirmationsText} mono />

        <Row label="Detected at" value={tx.detectedAt ?? "—"} />
      </div>
    </div>
  );
}
