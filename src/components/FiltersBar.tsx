"use client";

import type { ChangeEvent } from "react";

interface FiltersBarProps {
  status: string;
  onStatusChange: (value: string) => void;
  amlStatus: string;
  onAmlStatusChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  minAmount: string;
  maxAmount: string;
  onMinAmountChange: (value: string) => void;
  onMaxAmountChange: (value: string) => void;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "waiting", label: "Waiting" },
  { value: "confirmed", label: "Confirmed" },
  { value: "expired", label: "Expired" },
  { value: "rejected", label: "Rejected" },
];

const AML_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "AML: All" },
  { value: "clean", label: "Clean" },
  { value: "warning", label: "Warning" },
  { value: "risky", label: "High-risk" },
  { value: "none", label: "No AML" },
];

export function FiltersBar({
  status,
  onStatusChange,
  amlStatus,
  onAmlStatusChange,
  search,
  onSearchChange,
  minAmount,
  maxAmount,
  onMinAmountChange,
  onMaxAmountChange,
}: FiltersBarProps) {
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  const handleMinAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    onMinAmountChange(e.target.value);
  };

  const handleMaxAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    onMaxAmountChange(e.target.value);
  };

  return (
    <div className="flex flex-col gap-3 px-3 py-3 md:flex-row md:items-center md:justify-between md:px-4 md:py-3">
      {/* Левая часть: статусы */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-1.5 py-1 text-[11px] text-slate-300 ring-1 ring-slate-700/80">
          {STATUS_OPTIONS.map((opt) => {
            const active = opt.value === status;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onStatusChange(opt.value)}
                className={[
                  "rounded-full px-2 py-0.5 transition",
                  active
                    ? "bg-slate-100 text-slate-900 shadow-sm"
                    : "text-slate-400 hover:bg-slate-800/90 hover:text-slate-100",
                ].join(" ")}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-1.5 py-1 text-[11px] text-slate-300 ring-1 ring-slate-700/80">
          {AML_OPTIONS.map((opt) => {
            const active = opt.value === amlStatus;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onAmlStatusChange(opt.value)}
                className={[
                  "rounded-full px-2 py-0.5 transition",
                  active
                    ? "bg-emerald-400 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:bg-slate-800/90 hover:text-slate-100",
                ].join(" ")}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Правая часть: суммы + поиск */}
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        {/* Min / Max amount */}
        <div className="flex items-center gap-1 rounded-2xl bg-slate-900/80 px-2 py-1.5 text-[11px] text-slate-300 ring-1 ring-slate-700/80">
          <span className="px-1 text-slate-500">Amount</span>
          <div className="flex items-center gap-1">
            <input
              type="text"
              inputMode="decimal"
              placeholder="Min"
              value={minAmount}
              onChange={handleMinAmountChange}
              className="w-16 rounded-xl border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-emerald-400/70 focus:outline-none focus:ring-1 focus:ring-emerald-400/70"
            />
            <span className="text-slate-600">–</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Max"
              value={maxAmount}
              onChange={handleMaxAmountChange}
              className="w-16 rounded-xl border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-emerald-400/70 focus:outline-none focus:ring-1 focus:ring-emerald-400/70"
            />
            <span className="pl-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">
              FIAT
            </span>
          </div>
        </div>

        {/* Search by ID */}
        <div className="flex items-center gap-1 rounded-2xl bg-slate-900/80 px-2 py-1.5 text-[11px] text-slate-300 ring-1 ring-slate-700/80">
          <span className="px-1 text-slate-500">Search</span>
          <input
            type="text"
            placeholder="Invoice ID…"
            value={search}
            onChange={handleSearchChange}
            className="w-40 rounded-xl border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-emerald-400/70 focus:outline-none focus:ring-1 focus:ring-emerald-400/70 md:w-56"
          />
        </div>
      </div>
    </div>
  );
}
