"use client";

import { useRef, useState } from "react";
import { ChevronDownIcon } from "./icons";
import { useOnClickOutside, useEscapeClose } from "./hooks";

const LIMITS = [5, 20, 50, 100, 200];

export function LimitDropdown({
  value,
  onChange,
}: {
  value: number;
  onChange: (limit: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useOnClickOutside(ref, () => setOpen(false));
  useEscapeClose(open, () => setOpen(false));

  return (
    <div ref={ref} className="relative mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none hover:bg-slate-50 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{value}</span>
        <ChevronDownIcon className="h-5 w-5 text-slate-500" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(0,0,0,0.16)]">
          <ul role="listbox" className="max-h-64 overflow-auto py-1">
            {LIMITS.map((n) => {
              const active = n === value;
              return (
                <li key={n} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onChange(n);
                    }}
                    className={[
                      "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors",
                      active
                        ? "bg-slate-800 text-white"
                        : "text-slate-800 hover:bg-slate-100",
                    ].join(" ")}
                  >
                    <span>{n}</span>
                    {active && (
                      <span className="h-2 w-2 rounded-full bg-sky-500" />
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
