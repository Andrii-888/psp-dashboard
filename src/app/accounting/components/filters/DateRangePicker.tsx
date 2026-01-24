"use client";

import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { enUS } from "date-fns/locale";
import "react-day-picker/style.css";
import { ChevronDownIcon } from "./icons";

export function DateRangePicker({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (nextFrom: string, nextTo: string) => void;
}) {
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* From */}
      <div className="relative">
        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          From
        </label>

        <button
          type="button"
          onClick={() => setFromOpen((v) => !v)}
          className="mt-2 flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none hover:bg-slate-50 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
          aria-haspopup="dialog"
          aria-expanded={fromOpen}
        >
          <span>{from || "Select date"}</span>
          <ChevronDownIcon className="h-5 w-5 text-slate-500" />
        </button>

        {fromOpen && (
          <div className="daypicker-light absolute left-0 z-30 mt-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_45px_rgba(0,0,0,0.16)]">
            <DayPicker
              mode="single"
              selected={from ? new Date(from) : undefined}
              onSelect={(d) => {
                setFromOpen(false);
                const v = d ? d.toISOString().slice(0, 10) : "";
                onChange(v, to);
              }}
              locale={enUS}
              weekStartsOn={1}
            />
          </div>
        )}
      </div>

      {/* To */}
      <div className="relative">
        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          To
        </label>

        <button
          type="button"
          onClick={() => setToOpen((v) => !v)}
          className="mt-2 flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none hover:bg-slate-50 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
          aria-haspopup="dialog"
          aria-expanded={toOpen}
        >
          <span>{to || "Select date"}</span>
          <ChevronDownIcon className="h-5 w-5 text-slate-500" />
        </button>

        {toOpen && (
          <div className="daypicker-light absolute left-0 z-30 mt-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_45px_rgba(0,0,0,0.16)]">
            <DayPicker
              mode="single"
              selected={to ? new Date(to) : undefined}
              onSelect={(d) => {
                setToOpen(false);
                const v = d ? d.toISOString().slice(0, 10) : "";
                onChange(from, v);
              }}
              locale={enUS}
              weekStartsOn={1}
            />
          </div>
        )}
      </div>
    </div>
  );
}
