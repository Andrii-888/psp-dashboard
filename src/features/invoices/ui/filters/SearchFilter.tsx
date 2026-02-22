"use client";

import { Search } from "lucide-react";
import type { ChangeEvent } from "react";

interface SearchFilterProps {
  search: string;
  onSearchChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function SearchFilter({ search, onSearchChange }: SearchFilterProps) {
  return (
    <div className="relative w-full max-w-sm">
      <Search
        size={16}
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
          bg-transparent
          border border-slate-700
          px-9 py-2
          text-sm text-slate-200
          placeholder:text-slate-500
          outline-none
          transition
          focus:border-slate-500
          focus:bg-slate-900/40
        "
      />
    </div>
  );
}
