"use client";

import type { ChangeEvent } from "react";
import type { DatePreset } from "./filters/datePresets";

import { StatusFilterPills } from "@/features/invoices/ui/filters/StatusFilterPills";
import { AmlFilterPills } from "@/features/invoices/ui/filters/AmlFilterPills";
import { DatePresetPills } from "@/features/invoices/ui/filters/DatePresetPills";
import { AmountFilter } from "@/features/invoices/ui/filters/AmountFilter";
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
  minAmount,
  maxAmount,
  onMinAmountChange,
  onMaxAmountChange,
  datePreset,
  onDatePresetChange,
  txHash,
  onTxHashChange,
  walletAddress,
  onWalletAddressChange,
  merchantId,
  onMerchantIdChange,
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

  const handleTxHashChange = (e: ChangeEvent<HTMLInputElement>) => {
    onTxHashChange(e.target.value);
  };

  const handleWalletChange = (e: ChangeEvent<HTMLInputElement>) => {
    onWalletAddressChange(e.target.value);
  };

  const handleMerchantChange = (e: ChangeEvent<HTMLInputElement>) => {
    onMerchantIdChange(e.target.value);
  };

  return (
    <div className="flex flex-col gap-3 px-3 py-3 md:flex-row md:items-center md:justify-between md:px-4 md:py-3">
      {/* LEFT: status + AML + date preset */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
        <StatusFilterPills status={status} onChange={onStatusChange} />
        <AmlFilterPills amlStatus={amlStatus} onChange={onAmlStatusChange} />
        <DatePresetPills
          datePreset={datePreset}
          onChange={onDatePresetChange}
        />
      </div>

      {/* RIGHT: amount + search */}
      <div className="flex flex-col gap-2 md:w-auto md:flex-row md:flex-wrap md:items-center md:justify-end">
        <AmountFilter
          minAmount={minAmount}
          maxAmount={maxAmount}
          onMinAmountChange={handleMinAmountChange}
          onMaxAmountChange={handleMaxAmountChange}
        />

        <SearchFilter
          search={search}
          txHash={txHash}
          walletAddress={walletAddress}
          merchantId={merchantId}
          onSearchChange={handleSearchChange}
          onTxHashChange={handleTxHashChange}
          onWalletAddressChange={handleWalletChange}
          onMerchantIdChange={handleMerchantChange}
        />
      </div>
    </div>
  );
}
