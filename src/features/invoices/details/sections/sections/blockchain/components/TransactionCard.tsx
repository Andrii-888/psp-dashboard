"use client";

import { useMemo } from "react";
import type { OperatorTxViewModel } from "../lib/blockchainTypes";
import { CopyButton } from "@/shared/ui/components/CopyButton";

function formatAmount(amount: string | null, asset: string | null): string {
  if (!amount && !asset) return "—";
  if (amount && asset) return `${amount} ${asset}`;
  return amount ?? asset ?? "—";
}

function truncateMiddle(value: string, head = 10, tail = 8): string {
  if (!value) return "—";
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function getConfirmState(
  confirmations?: number,
  required?: number
): { label: string; tone: "pending" | "ok" } {
  if (typeof confirmations !== "number") {
    return { label: "Pending", tone: "pending" };
  }

  const req = typeof required === "number" ? required : null;

  if (!req) {
    return {
      label: `${confirmations}`,
      tone: confirmations > 0 ? "ok" : "pending",
    };
  }

  const ok = confirmations >= req;
  return {
    label: ok
      ? `Confirmed (${confirmations} / ${req})`
      : `Pending (${confirmations} / ${req})`,
    tone: ok ? "ok" : "pending",
  };
}

function StatusPill({ tone, text }: { tone: "pending" | "ok"; text: string }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5",
        "text-[10px] font-semibold uppercase tracking-[0.18em]",
        "ring-1",
        tone === "ok"
          ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/30"
          : "bg-amber-500/10 text-amber-200 ring-amber-500/30",
      ].join(" ")}
    >
      {text}
    </span>
  );
}

function Row({
  label,
  value,
  mono = false,
  accent = false,
  copyValue,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
  copyValue?: string;
}) {
  return (
    <div className="flex flex-nowrap items-center justify-between gap-4">
      <div className="w-28 shrink-0 text-[11px] uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>

      <div className="min-w-0 flex items-center justify-end gap-2">
        <span
          className={[
            "text-[12px] text-slate-100 whitespace-nowrap",
            mono ? "font-mono" : "",
            accent ? "font-medium text-slate-50" : "",
          ].join(" ")}
          title={copyValue ?? value}
        >
          {value}
        </span>

        {copyValue ? <CopyButton value={copyValue} /> : null}
      </div>
    </div>
  );
}

export function TransactionCard({ tx }: { tx: OperatorTxViewModel }) {
  const amountLine = useMemo(
    () => formatAmount(tx.amount ?? null, tx.asset ?? null),
    [tx.amount, tx.asset]
  );

  const conf = useMemo(
    () =>
      getConfirmState(
        tx.confirmations ?? undefined,
        tx.requiredConfirmations ?? undefined
      ),
    [tx.confirmations, tx.requiredConfirmations]
  );

  return (
    <div className="md:pr-10">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
        Transaction details
      </div>

      <div className="mt-4 flex flex-col space-y-3">
        <Row
          label="From"
          value={tx.fromAddress ? truncateMiddle(tx.fromAddress, 12, 10) : "—"}
          mono
          copyValue={tx.fromAddress ?? undefined}
        />

        <Row label="Amount" value={amountLine} accent />

        <Row
          label="To"
          value={tx.toAddress ? truncateMiddle(tx.toAddress, 12, 10) : "—"}
          mono
        />

        <div className="my-3 h-px bg-white/10" />

        <Row
          label="Hash"
          value={tx.txHash ? truncateMiddle(tx.txHash, 18, 10) : "—"}
          mono
          copyValue={tx.txHash ?? undefined}
        />

        <div className="flex flex-nowrap items-center justify-between gap-4">
          <div className="w-28 shrink-0 text-[11px] uppercase tracking-[0.18em] text-slate-400">
            Block
          </div>

          <div className="min-w-0 flex items-center justify-end gap-2">
            <StatusPill
              tone={typeof tx.blockNumber === "number" ? "ok" : "pending"}
              text={typeof tx.blockNumber === "number" ? "Included" : "Pending"}
            />

            {typeof tx.blockNumber === "number" && (
              <span className="font-mono text-[12px] text-slate-100 whitespace-nowrap">
                #{tx.blockNumber}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-nowrap items-center justify-between gap-4">
          <div className="w-28 shrink-0 text-[11px] uppercase tracking-[0.18em] text-slate-400">
            Confirmations
          </div>

          <div className="min-w-0 flex items-center justify-end gap-2">
            <StatusPill
              tone={conf.tone}
              text={conf.tone === "ok" ? "Confirmed" : "Pending"}
            />
            <span className="font-mono text-[12px] text-slate-100 whitespace-nowrap">
              {typeof tx.confirmations === "number" &&
              typeof tx.requiredConfirmations === "number"
                ? `${tx.confirmations} / ${tx.requiredConfirmations}`
                : typeof tx.confirmations === "number"
                ? `${tx.confirmations}`
                : "—"}
            </span>
          </div>
        </div>

        <Row label="Detected at" value={tx.detectedAt ?? "—"} />
      </div>
    </div>
  );
}
