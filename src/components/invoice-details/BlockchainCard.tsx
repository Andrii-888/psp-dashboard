"use client";

import type { Invoice } from "@/lib/pspApi";

export function BlockchainCard({ invoice }: { invoice: Invoice }) {
  const hasNetwork = !!invoice.network && invoice.network.trim().length > 0;
  const hasWallet =
    !!invoice.walletAddress && invoice.walletAddress.trim().length > 0;
  const hasTx = !!invoice.txHash && invoice.txHash.trim().length > 0;

  return (
    <section className="apple-card apple-card-content p-4 md:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="section-title">Blockchain transaction</h2>

        {/* маленький статус-лейбл для наглядности */}
        <span className="rounded-full bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300 ring-1 ring-slate-700/70">
          {hasTx ? "On-chain data attached" : "Waiting for on-chain data"}
        </span>
      </div>

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

        {/* Tx hash (широкий блок) */}
        <div className="card-field sm:col-span-2">
          <p className="label">Transaction hash</p>
          {hasTx ? (
            <p className="mt-1 break-all rounded-2xl bg-slate-900/70 px-3 py-2 font-mono text-[11px] text-slate-100 ring-1 ring-slate-800/80">
              {invoice.txHash}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-slate-500">
              Transaction hash will appear here after the operator attaches
              on-chain payment.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
