"use client";

import { useState, type FormEvent } from "react";
import type { Invoice, AttachTransactionPayload } from "@/lib/pspApi";

interface BlockchainCardProps {
  invoice: Invoice;
  savingTx: boolean;
  onAttachTx: (payload: AttachTransactionPayload) => void | Promise<void>;
}

export function BlockchainCard({
  invoice,
  savingTx,
  onAttachTx,
}: BlockchainCardProps) {
  const hasNetwork = !!invoice.network && invoice.network.trim().length > 0;
  const hasWallet =
    !!invoice.walletAddress && invoice.walletAddress.trim().length > 0;
  const hasTx = !!invoice.txHash && invoice.txHash.trim().length > 0;

  // локальные поля только для dev/test формы (если tx ещё нет)
  const [network, setNetwork] = useState<string>(invoice.network ?? "");
  const [walletAddress, setWalletAddress] = useState<string>(
    invoice.walletAddress ?? ""
  );
  const [txHash, setTxHash] = useState<string>(invoice.txHash ?? "");

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
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="section-title">Blockchain transaction</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Technical on-chain details (read-only). In production, this is
            attached automatically by PSP core.
          </p>
        </div>

        <span className="rounded-full bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300 ring-1 ring-slate-700/70">
          {hasTx ? "On-chain data attached" : "Waiting for on-chain data"}
        </span>
      </div>

      {/* Current data */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Network */}
        <div className="card-field">
          <p className="label">Network</p>
          {hasNetwork ? (
            <span className="mt-1 inline-flex items-center rounded-full bg-slate-900/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-100 ring-1 ring-slate-700/80">
              {invoice.network}
            </span>
          ) : (
            <p className="mt-1 text-[11px] text-slate-500">Not provided yet</p>
          )}
        </div>

        {/* Wallet */}
        <div className="card-field">
          <p className="label">Wallet address</p>
          {hasWallet ? (
            <p className="mt-1 break-all rounded-2xl bg-slate-900/70 px-3 py-2 font-mono text-[11px] text-slate-100 ring-1 ring-slate-800/80">
              {invoice.walletAddress}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-slate-500">Not attached yet</p>
          )}
        </div>

        {/* Tx hash */}
        <div className="card-field sm:col-span-2">
          <p className="label">Transaction hash</p>
          {hasTx ? (
            <p className="mt-1 break-all rounded-2xl bg-slate-900/70 px-3 py-2 font-mono text-[11px] text-slate-100 ring-1 ring-slate-800/80">
              {invoice.txHash}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-slate-500">
              Transaction hash will appear here after it is detected/attached.
            </p>
          )}
        </div>
      </div>

      {/* Dev/Test attach form — only if txHash is missing */}
      {!hasTx ? (
        <div className="mt-5">
          <p className="text-[11px] text-slate-500">
            Demo tip: use the{" "}
            <span className="text-[rgb(0,136,255)]">Transaction</span> block
            above to attach txHash.
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
    </section>
  );
}
