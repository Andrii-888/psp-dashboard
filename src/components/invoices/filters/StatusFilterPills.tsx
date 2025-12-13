"use client";

interface StatusFilterPillsProps {
  status: string;
  onChange: (value: string) => void;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "waiting", label: "Waiting" },
  { value: "confirmed", label: "Confirmed" },
  { value: "expired", label: "Expired" },
  { value: "rejected", label: "Rejected" },
];

export function StatusFilterPills({
  status,
  onChange,
}: StatusFilterPillsProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-1.5 py-1 text-[11px] text-slate-300 ring-1 ring-slate-700/80">
      {STATUS_OPTIONS.map((opt) => {
        const active = opt.value === status;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={
              active
                ? "rounded-full px-2 py-0.5 bg-slate-100 text-slate-900 shadow-sm"
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
