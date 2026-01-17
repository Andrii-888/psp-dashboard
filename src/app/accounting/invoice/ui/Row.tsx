import type React from "react";

export function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-zinc-100 py-3 md:flex-row md:items-center md:gap-6">
      <div className="w-full text-xs font-medium uppercase tracking-wide text-zinc-500 md:w-56">
        {label}
      </div>
      <div
        className={
          mono ? "font-mono text-sm text-zinc-900" : "text-sm text-zinc-900"
        }
      >
        {value}
      </div>
    </div>
  );
}
