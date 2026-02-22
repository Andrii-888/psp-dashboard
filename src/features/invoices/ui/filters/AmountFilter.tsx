"use client";

import type { ChangeEvent } from "react";

interface AmountFilterProps {
  minAmount: string;
  maxAmount: string;
  onMinAmountChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onMaxAmountChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function AmountFilter({
  minAmount,
  maxAmount,
  onMinAmountChange,
  onMaxAmountChange,
}: AmountFilterProps) {
  return (
    <div className="flex items-center gap-1 rounded-2xl bg-slate-900/80 px-2 py-1.5 text-[11px] text-slate-300 ring-1 ring-slate-700/80">
      <span className="px-1 text-slate-500">Amount</span>
      <div className="flex items-center gap-1">
        <input
          type="text"
          inputMode="decimal"
          placeholder="Min"
          value={minAmount}
          onChange={onMinAmountChange}
          className="w-16 rounded-xl border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-emerald-400/70 focus:outline-none focus:ring-1 focus:ring-emerald-400/70"
        />
        <span className="text-slate-600">–</span>
        <input
          type="text"
          inputMode="decimal"
          placeholder="Max"
          value={maxAmount}
          onChange={onMaxAmountChange}
          className="w-16 rounded-xl border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-emerald-400/70 focus:outline-none focus:ring-1 focus:ring-emerald-400/70"
        />
        <span className="pl-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">
          FIAT
        </span>
      </div>
    </div>
  );
}
