"use client";

import type { ChangeEvent } from "react";

interface SearchFilterProps {
  search: string;
  txHash: string;
  walletAddress: string;
  merchantId: string;
  onSearchChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onTxHashChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onWalletAddressChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onMerchantIdChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function SearchFilter({
  search,
  txHash,
  walletAddress,
  merchantId,
  onSearchChange,
  onTxHashChange,
  onWalletAddressChange,
  onMerchantIdChange,
}: SearchFilterProps) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-slate-900/80 px-2 py-1.5 text-[11px] text-slate-300 ring-1 ring-slate-700/80 md:min-w-[260px]">
      <div className="flex items-center gap-1">
        <span className="px-1 text-slate-500">Search</span>
        <input
          type="text"
          placeholder="Invoice ID…"
          value={search}
          onChange={onSearchChange}
          className="w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-emerald-400/70 focus:outline-none focus:ring-1 focus:ring-emerald-400/70"
        />
      </div>

      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
        <input
          type="text"
          placeholder="Tx hash…"
          value={txHash}
          onChange={onTxHashChange}
          className="rounded-xl border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-emerald-400/70 focus:outline-none focus:ring-1 focus:ring-emerald-400/70"
        />
        <input
          type="text"
          placeholder="Wallet…"
          value={walletAddress}
          onChange={onWalletAddressChange}
          className="rounded-xl border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-emerald-400/70 focus:outline-none focus:ring-1 focus:ring-emerald-400/70"
        />
      </div>

      <input
        type="text"
        placeholder="Merchant ID…"
        value={merchantId}
        onChange={onMerchantIdChange}
        className="rounded-xl border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-emerald-400/70 focus:outline-none focus:ring-1 focus:ring-emerald-400/70"
      />
    </div>
  );
}
