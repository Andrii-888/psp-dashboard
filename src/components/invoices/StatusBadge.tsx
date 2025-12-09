"use client";

import type { Invoice } from "@/lib/pspApi";

export function StatusBadge({ status }: { status: Invoice["status"] }) {
  const base =
    "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium border";

  const outline = {
    confirmed: "border-emerald-400 text-emerald-600",
    waiting: "border-amber-400 text-amber-600",
    expired: "border-slate-400 text-slate-600",
    rejected: "border-rose-400 text-rose-600",
  };

  const label = {
    confirmed: "Confirmed",
    waiting: "Waiting",
    expired: "Expired",
    rejected: "Rejected",
  }[status];

  return <span className={`${base} ${outline[status]}`}>{label}</span>;
}
