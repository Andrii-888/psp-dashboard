"use client";

import type { Invoice } from "@/shared/api/pspApi";

// 🎨 Цвет кнопки в зависимости от AML
function getAmlButtonClasses(status: Invoice["amlStatus"]) {
  switch (status) {
    case "clean":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20";
    case "warning":
      return "border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20";
    case "risky":
    case "blocked":
      return "border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20";
    default:
      return "border-slate-500/40 bg-slate-900/70 text-slate-200 hover:bg-slate-800";
  }
}

interface AmlActionButtonProps {
  invoice: Invoice;
  onRunAml: () => void;
  amlLoading: boolean;
}

export function AmlActionButton({
  invoice,
  onRunAml,
  amlLoading,
}: AmlActionButtonProps) {
  const hasTx = !!invoice.txHash && invoice.txHash.trim().length > 0;
  const isOpen = invoice.status === "waiting";
  const needsScreening = hasTx && invoice.amlStatus === null;

  const disabled = amlLoading || !hasTx || !isOpen;

  const buttonText = !isOpen
    ? "AML locked (invoice closed)"
    : !hasTx
    ? "Run AML check (tx required)"
    : needsScreening
    ? "Run AML check (required)"
    : "Run AML check";

  const buttonClasses = needsScreening
    ? "border-sky-500/40 bg-sky-500/10 text-[rgb(0,136,255)] hover:bg-sky-500/15 ring-1 ring-sky-400/30"
    : getAmlButtonClasses(invoice.amlStatus);

  return (
    <button
      type="button"
      onClick={onRunAml}
      disabled={disabled}
      className={`mt-4 inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-[11px] font-medium transition shadow-sm
        disabled:cursor-not-allowed disabled:opacity-60
        ${buttonClasses}
      `}
    >
      {amlLoading ? "Checking AML…" : buttonText}
    </button>
  );
}
