"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BlockchainHeader } from "./components/BlockchainHeader";
import { TransactionCard } from "./components/TransactionCard";
import { OnChainStatusRail } from "./components/OnChainStatusRail";

import type { Invoice, AttachTransactionPayload } from "@/lib/pspApi";
import {
  getBlockchainBusinessStatus,
  getOperatorTxModel,
} from "./lib/blockchainSelectors";

interface BlockchainCardProps {
  invoice: Invoice;
  savingTx: boolean;
  onAttachTx: (payload: AttachTransactionPayload) => void | Promise<void>;
}

function isFinalStatus(status: Invoice["status"]): boolean {
  return (
    status === "confirmed" || status === "expired" || status === "rejected"
  );
}

export function BlockchainCard({
  invoice,
  savingTx,
  onAttachTx,
}: BlockchainCardProps) {
  const tx = useMemo(() => getOperatorTxModel(invoice), [invoice]);

  // ✅ UI time tick (no Date.now in render path)
  const [nowMs, setNowMs] = useState<number>(() => new Date().getTime());
  useEffect(() => {
    const t = setInterval(() => {
      setNowMs(new Date().getTime());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // keep as-is for now; next step will pass nowMs into status selector
  void nowMs;

  const businessStatus = useMemo(
    () => getBlockchainBusinessStatus(invoice),
    [invoice]
  );

  const hasTx = !!tx.txHash;
  const finalStatus = isFinalStatus(invoice.status);

  // Dev attach only in non-production AND only if not final AND tx missing
  const isDev = process.env.NODE_ENV !== "production";
  const canAttachDev = isDev && !finalStatus && !hasTx;

  const [network, setNetwork] = useState<string>(() => tx.network ?? "");
  const [walletAddress, setWalletAddress] = useState<string>(
    () => tx.fromAddress ?? ""
  );
  const [txHash, setTxHash] = useState<string>(() => tx.txHash ?? "");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const payload: AttachTransactionPayload = {
      network: network.trim() || undefined,
      walletAddress: walletAddress.trim() || undefined,
      txHash: txHash.trim() || undefined,
    };

    await onAttachTx(payload);
  };

  return (
    <section className="apple-card apple-card-content p-4 md:p-6">
      {/* Header */}
      <BlockchainHeader status={businessStatus} />

      <div className="mt-6 grid grid-cols-1 gap-10 md:grid-cols-[1fr_320px]">
        <TransactionCard tx={tx} />
        <OnChainStatusRail tx={tx} />
      </div>

      {/* Dev/Test attach form — dev only */}
      {canAttachDev ? (
        <div className="mt-5">
          <p className="text-[11px] text-slate-500">
            Demo tip: attach txHash manually only in dev/testing environments.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-3 grid grid-cols-1 gap-3 rounded-2xl bg-slate-950/70 p-3 ring-1 ring-slate-800/80 md:grid-cols-[2fr_2fr_3fr_auto]"
          >
            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                Network (dev)
              </label>
              <input
                type="text"
                placeholder="e.g. ETH, TRON, BSC"
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                className="rounded-xl border border-slate-700/70 bg-slate-950/90 px-2 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-[rgb(0,136,255)]/70 focus:outline-none focus:ring-1 focus:ring-[rgb(0,136,255)]/50"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                Wallet address (dev)
              </label>
              <input
                type="text"
                placeholder="0x... / T..."
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="rounded-xl border border-slate-700/70 bg-slate-950/90 px-2 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-[rgb(0,136,255)]/70 focus:outline-none focus:ring-1 focus:ring-[rgb(0,136,255)]/50"
              />
            </div>

            <div className="flex flex-col gap-1 md:col-span-1">
              <label className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                Transaction hash (dev)
              </label>
              <input
                type="text"
                placeholder="Blockchain tx hash…"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                className="w-full rounded-xl border border-slate-700/70 bg-slate-950/90 px-2 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-[rgb(0,136,255)]/70 focus:outline-none focus:ring-1 focus:ring-[rgb(0,136,255)]/50"
              />
            </div>

            <div className="flex items-end justify-start md:justify-end">
              <button
                type="submit"
                disabled={savingTx}
                className="inline-flex items-center justify-center rounded-full border border-slate-600/70 bg-slate-100 px-4 py-1.5 text-[11px] font-medium text-slate-900 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingTx ? "Saving…" : "Attach (dev)"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Final status note */}
      {finalStatus ? (
        <p className="mt-4 text-[11px] text-slate-500">
          This invoice is{" "}
          <span className="text-slate-300">{invoice.status}</span>. Actions are
          locked (read-only).
        </p>
      ) : null}
    </section>
  );
}
