"use client";

import { useRef, useState } from "react";
import { ChevronDownIcon } from "./icons";
import { useOnClickOutside } from "./hooks";

const MERCHANTS = [
  { id: "merchant-001", label: "Merchant 001" },
  { id: "merchant-002", label: "Merchant 002" },
  { id: "merchant-003", label: "Merchant 003" },
  { id: "merchant-004", label: "Merchant 004" },
  { id: "merchant-005", label: "Merchant 005" },
  { id: "merchant-006", label: "Merchant 006" },
  { id: "merchant-007", label: "Merchant 007" },
  { id: "merchant-008", label: "Merchant 008" },
  { id: "merchant-009", label: "Merchant 009" },
  { id: "merchant-010", label: "Merchant 010" },
];

export function MerchantSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (merchantId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useOnClickOutside(ref, () => setOpen(false));

  const current = MERCHANTS.find((m) => m.id === value)?.label ?? value;

  return (
    <div ref={ref} className="relative mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{current}</span>
        <ChevronDownIcon className="h-5 w-5 text-slate-500" />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(0,0,0,0.16)]">
          <ul role="listbox" className="max-h-64 overflow-auto py-1">
            {MERCHANTS.map((m) => {
              const active = m.id === value;
              return (
                <li key={m.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onChange(m.id);
                    }}
                    className={[
                      "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm",
                      active
                        ? "bg-slate-900 text-white"
                        : "text-slate-900 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <span>{m.label}</span>
                    {active && (
                      <span className="text-xs text-white/80">Selected</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
