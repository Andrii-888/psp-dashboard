"use client";

import type { ChangeEvent } from "react";
import type { DatePreset } from "./filters/datePresets";
import { StatusFilterPills } from "@/features/invoices/ui/filters/StatusFilterPills";
import { AmlFilterPills } from "@/features/invoices/ui/filters/AmlFilterPills";
import { DatePresetPills } from "@/features/invoices/ui/filters/DatePresetPills";
import { SearchFilter } from "@/features/invoices/ui/filters/SearchFilter";

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

  datePreset: DatePreset;
  onDatePresetChange: (value: DatePreset) => void;

  // 🔹 дополнительные поля поиска
  txHash: string;
  onTxHashChange: (value: string) => void;
  walletAddress: string;
  onWalletAddressChange: (value: string) => void;
  merchantId: string;
  onMerchantIdChange: (value: string) => void;
}

export function FiltersBar({
  status,
  onStatusChange,
  amlStatus,
  onAmlStatusChange,
  search,
  onSearchChange,
  datePreset,
  onDatePresetChange,
}: FiltersBarProps) {
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) =>
    onSearchChange(e.target.value);

  const handleSearchClear = () => onSearchChange("");

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* LEFT: pills row */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
            <div className="text-xs font-medium tracking-widest text-slate-500 lg:hidden">
              STATUS
            </div>
            <StatusFilterPills status={status} onChange={onStatusChange} />
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
            <div className="text-xs font-medium tracking-widest text-slate-500 lg:hidden">
              AML
            </div>
            <AmlFilterPills
              amlStatus={amlStatus}
              onChange={onAmlStatusChange}
            />
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
            <div className="text-xs font-medium tracking-widest text-slate-500 lg:hidden">
              TIME
            </div>
            <DatePresetPills
              datePreset={datePreset}
              onChange={onDatePresetChange}
            />
          </div>
        </div>

        {/* RIGHT: search */}
        <div className="w-full shrink-0 lg:max-w-sm">
          <SearchFilter
            search={search}
            onSearchChange={handleSearchChange}
            onSearchClear={handleSearchClear}
          />
        </div>
      </div>
    </div>
  );
}
