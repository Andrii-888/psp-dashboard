"use client";

import type { Invoice } from "@/lib/pspApi";

type Status = Invoice["status"];

function normalizeStatus(status: unknown): Status | null {
  const s = String(status ?? "")
    .trim()
    .toLowerCase();
  if (
    s === "confirmed" ||
    s === "waiting" ||
    s === "expired" ||
    s === "rejected"
  )
    return s as Status;
  return null;
}

export function StatusBadge({
  status,
  variant = "outline",
}: {
  status: Status;
  variant?: "outline" | "soft";
}) {
  const s = normalizeStatus(status) ?? "rejected";

  const base =
    "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium border";

  // ✅ Expired — яркий, заметный
  const outline: Record<Status, string> = {
    confirmed: "border-emerald-400 text-emerald-600",
    waiting: "border-amber-400 text-amber-600",
    expired: "border-orange-500 text-orange-600",
    rejected: "border-rose-400 text-rose-600",
  };

  const soft: Record<Status, string> = {
    confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    waiting: "border-amber-200 bg-amber-50 text-amber-700",
    expired: "border-orange-200 bg-orange-50 text-orange-700",
    rejected: "border-rose-200 bg-rose-50 text-rose-700",
  };

  const label: Record<Status, string> = {
    confirmed: "Confirmed",
    waiting: "Waiting",
    expired: "Expired",
    rejected: "Rejected",
  };

  const cls = variant === "soft" ? soft[s] : outline[s];

  return <span className={`${base} ${cls}`}>{label[s]}</span>;
}

// ✅ экспортируем helper, чтобы хедер мог красить invoiceId тем же цветом
export function getStatusTextClass(status: unknown) {
  const s = normalizeStatus(status);
  if (!s) return "text-zinc-400";

  const map: Record<Status, string> = {
    confirmed: "text-emerald-600",
    waiting: "text-amber-600",
    expired: "text-orange-600",
    rejected: "text-rose-600",
  };

  return map[s];
}
