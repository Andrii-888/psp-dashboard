"use client";

import type { Invoice } from "@/lib/pspApi";

type Suggested = {
  status: "approve" | "hold" | "reject";
  reasonCode: string;
  summary: string;
};

type Props = {
  invoice: Invoice;
  suggested: Suggested;
  locked: boolean;
};

function statusLabel(s: Suggested["status"]) {
  if (s === "approve") return "Approve";
  if (s === "hold") return "Hold";
  return "Reject";
}

function statusDotClass(s: Suggested["status"]) {
  if (s === "approve") return "bg-emerald-400/90";
  if (s === "hold") return "bg-amber-400/90";
  return "bg-rose-400/90";
}

export function ComplianceBanner({ suggested, locked }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <h2 className="section-title">Compliance decision</h2>

        {locked ? (
          <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Locked · invoice closed
          </span>
        ) : null}
      </div>

      {/* Recommended block — Stripe dark minimal */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-3">
        <div className="flex items-center justify-between gap-6">
          {/* Left side */}
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass(
                suggested.status
              )}`}
            />

            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Recommended action
              </span>
              <span className="rounded-md border border-slate-800 bg-slate-900/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Suggested
              </span>
            </div>

            <span className="text-[13px] font-medium text-slate-100">
              {statusLabel(suggested.status)}
            </span>
          </div>

          {/* Right side */}
          <div className="text-[11px] text-slate-500 shrink-0">
            <span className="text-slate-600">Reason:</span>{" "}
            <span className="font-mono text-slate-300">
              {suggested.reasonCode}
            </span>
          </div>
        </div>

        <div className="mt-2 text-[12px] text-slate-400">
          {suggested.summary}
        </div>
      </div>
    </div>
  );
}
