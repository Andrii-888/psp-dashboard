"use client";

import { useState } from "react";

export type InvoiceFilters = {
  status?: string;
};

interface FiltersBarProps {
  value: InvoiceFilters;
  onChange: (next: InvoiceFilters) => void;
  onApply: () => void;
  onReset: () => void;
}

export default function FiltersBar({
  value,
  onChange,
  onApply,
  onReset,
}: FiltersBarProps) {
  const [localStatus, setLocalStatus] = useState(value.status ?? "");

  const statuses = [
    { label: "All", value: "" },
    { label: "Waiting", value: "waiting" },
    { label: "Confirmed", value: "confirmed" },
    { label: "Expired", value: "expired" },
    { label: "Rejected", value: "rejected" },
  ];

  function applyFilters() {
    onChange({
      status: localStatus || undefined,
    });
    onApply();
  }

  function resetFilters() {
    setLocalStatus("");
    onReset();
  }

  return (
    <div className="w-full mb-4 flex items-center justify-between bg-[#10131A] border border-neutral-800 rounded-xl px-4 py-3">
      {/* Status dropdown */}
      <div className="flex gap-3 items-center">
        <label className="text-sm text-gray-400">Status:</label>

        <select
          className="bg-[#0D0F15] border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
          value={localStatus}
          onChange={(e) => setLocalStatus(e.target.value)}
        >
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={applyFilters}
          className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
        >
          Apply
        </button>

        <button
          onClick={resetFilters}
          className="px-4 py-2 text-sm rounded-lg bg-neutral-700 text-white hover:bg-neutral-600 transition"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
