"use client";

import type { Invoice } from "@/lib/pspApi";

export function BlockchainCard({ invoice }: { invoice: Invoice }) {
  return (
    <section className="apple-card apple-card-content p-4 md:p-6">
      <h2 className="section-title">Blockchain transaction</h2>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Network */}
        <div className="card-field">
          <p className="label">Network</p>
          <p className="value-sm">
            {invoice.network && invoice.network.trim().length > 0
              ? invoice.network
              : "—"}
          </p>
        </div>

        {/* Wallet */}
        <div className="card-field">
          <p className="label">Wallet address</p>
          <p className="mt-1 break-all text-[11px] text-slate-100">
            {invoice.walletAddress && invoice.walletAddress.trim().length > 0
              ? invoice.walletAddress
              : "—"}
          </p>
        </div>

        {/* Tx hash (на всю ширину) */}
        <div className="sm:col-span-2 card-field">
          <p className="label">Transaction hash</p>
          <p className="mt-1 break-all font-mono text-[11px] text-slate-100">
            {invoice.txHash && invoice.txHash.trim().length > 0
              ? invoice.txHash
              : "—"}
          </p>
        </div>
      </div>
    </section>
  );
}
