"use client";

import { useState, type FormEvent } from "react";
import type { Invoice, AttachTransactionPayload } from "@/lib/pspApi";

interface DemoTxAttachProps {
  invoice: Invoice;
  savingTx: boolean;
  onAttachTx: (payload: AttachTransactionPayload) => void | Promise<void>;
}

export function DemoTxAttach({
  invoice,
  savingTx,
  onAttachTx,
}: DemoTxAttachProps) {
  const hasTx = !!invoice.txHash && invoice.txHash.trim().length > 0;

  const [txHash, setTxHash] = useState<string>(invoice.txHash ?? "");

  // если tx уже есть — компонент не рисуем (важно: не дублировать UI)
  if (hasTx) return null;

  const canSubmit = txHash.trim().length > 0;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    await onAttachTx({
      txHash: txHash.trim(),
    });
  }

  return (
    <div className="mt-3 rounded-2xl bg-slate-900/60 p-3 ring-1 ring-slate-800/80">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Transaction
          </p>
          <p className="mt-1 text-[11px] text-slate-200">
            Not detected yet
            <span className="ml-2 rounded-full bg-slate-950/70 px-2 py-0.5 text-[10px] text-slate-400 ring-1 ring-slate-800/70">
              demo mode
            </span>
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Attach on-chain transaction hash for demo testing.
          </p>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full bg-slate-950/70 px-3 py-1 text-[11px] text-slate-300 ring-1 ring-slate-800/70">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
          NOT DETECTED
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Transaction hash
          </label>
          <input
            type="text"
            placeholder="Paste tx hash…"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/90 px-2 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-[rgb(0,136,255)]/70 focus:outline-none focus:ring-1 focus:ring-[rgb(0,136,255)]/50"
          />
        </div>

        <button
          type="submit"
          disabled={savingTx || !canSubmit}
          className="inline-flex items-center justify-center rounded-full border border-slate-700/70 bg-slate-100 px-4 py-1.5 text-[11px] font-medium text-slate-900 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingTx ? "Attaching…" : "Attach tx"}
        </button>
      </form>
    </div>
  );
}
