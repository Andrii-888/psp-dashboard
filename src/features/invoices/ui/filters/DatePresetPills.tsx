"use client";

import type { DatePreset } from "./datePresets";
import { DATE_PRESETS } from "./datePresets";

interface DatePresetPillsProps {
  datePreset: DatePreset;
  onChange: (value: DatePreset) => void;
}

export function DatePresetPills({
  datePreset,
  onChange,
}: DatePresetPillsProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-1.5 py-1 text-[11px] text-slate-300 ring-1 ring-slate-700/80">
      {DATE_PRESETS.map((opt) => {
        const active = opt.value === datePreset;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={
              active
                ? "rounded-full px-2 py-0.5 bg-sky-400 text-slate-950 shadow-sm"
                : "rounded-full px-2 py-0.5 text-slate-400 hover:bg-slate-800/90 hover:text-slate-100"
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
