"use client";

interface AmlFilterPillsProps {
  amlStatus: string;
  onChange: (value: string) => void;
}

const AML_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "AML: All" },
  { value: "clean", label: "Clean" },
  { value: "warning", label: "Warning" },
  { value: "risky", label: "High-risk" },
  { value: "none", label: "No AML" },
];

export function AmlFilterPills({ amlStatus, onChange }: AmlFilterPillsProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-1.5 py-1 text-[11px] text-slate-300 ring-1 ring-slate-700/80">
      {AML_OPTIONS.map((opt) => {
        const active = opt.value === amlStatus;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={
              active
                ? "rounded-full px-2 py-0.5 bg-emerald-400 text-slate-950 shadow-sm"
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
