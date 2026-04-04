"use client";

import { Search, X } from "lucide-react";
import type { ChangeEvent } from "react";

interface SearchFilterProps {
  search: string;
  onSearchChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSearchClear: () => void;
}

export function SearchFilter({
  search,
  onSearchChange,
  onSearchClear,
}: SearchFilterProps) {
  return (
    <div className="relative w-full max-w-sm">
      {/* Лупа */}
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
      />

      <input
        type="text"
        value={search}
        onChange={onSearchChange}
        placeholder="Search invoice ID..."
        className="
          w-full
          rounded-lg
          border border-slate-700
          bg-transparent
          py-2 pl-9 pr-8
          text-sm text-slate-200
          placeholder:text-slate-500
          outline-none
          transition
          focus:border-slate-500
          focus:bg-slate-900/40
        "
      />

      {/* Крестик — только когда есть текст */}
      {search.length > 0 && (
        <button
          type="button"
          onClick={onSearchClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-500 transition hover:text-slate-200"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
