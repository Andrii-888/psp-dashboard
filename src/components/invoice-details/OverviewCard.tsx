"use client";

import type { Invoice } from "@/lib/pspApi";
import { AmlBadge } from "@/components/invoices/AmlBadge";

interface OverviewCardProps {
  invoice: Invoice;
  onRunAml: () => void;
  amlLoading: boolean;
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(amount: number, currency: string) {
  return `${amount.toFixed(2)} ${currency}`;
}

// 🎨 Цвет кнопки в зависимости от AML
function getAmlButtonClasses(status: string | null) {
  switch (status) {
    case "clean":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20";
    case "warning":
      return "border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20";
    case "risky":
      return "border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20";
    default:
      return "border-slate-500/40 bg-slate-900/70 text-slate-200 hover:bg-slate-800";
  }
}

export function OverviewCard({
  invoice,
  onRunAml,
  amlLoading,
}: OverviewCardProps) {
  return (
    <section className="apple-card p-4 md:p-6">
      <div className="flex flex-col gap-6 md:flex-row">
        {/* LEFT */}
        <div className="flex-1 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Overview
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-900/60 p-3 ring-1 ring-slate-800/80">
              <p className="text-[11px] uppercase text-slate-500">
                Fiat amount
              </p>
              <p className="mt-1 text-base font-semibold text-slate-50">
                {formatAmount(invoice.fiatAmount, invoice.fiatCurrency)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-900/60 p-3 ring-1 ring-slate-800/80">
              <p className="text-[11px] uppercase text-slate-500">
                Crypto amount
              </p>
              <p className="mt-1 text-base font-semibold text-slate-50">
                {formatAmount(invoice.cryptoAmount, invoice.cryptoCurrency)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-900/60 p-3 ring-1 ring-slate-800/80">
              <p className="text-[11px] uppercase text-slate-500">Created at</p>
              <p className="mt-1 text-xs text-slate-100">
                {formatDateTime(invoice.createdAt)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-900/60 p-3 ring-1 ring-slate-800/80">
              <p className="text-[11px] uppercase text-slate-500">Expires at</p>
              <p className="mt-1 text-xs text-slate-100">
                {formatDateTime(invoice.expiresAt)}
              </p>
            </div>
          </div>

          <div className="mt-2 text-[11px] text-slate-500">
            Merchant:{" "}
            <span className="font-mono text-slate-300">
              {invoice.merchantId ?? "—"}
            </span>
          </div>

          <div className="mt-1 text-[11px] text-slate-500">
            Payment page:{" "}
            <a
              href={invoice.paymentUrl}
              target="_blank"
              rel="noreferrer"
              className="break-all font-mono text-[11px] text-emerald-300 hover:underline"
            >
              {invoice.paymentUrl}
            </a>
          </div>
        </div>

        {/* RIGHT */}
        <div className="w-full max-w-xs">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            AML status
          </h2>

          <div className="mt-3">
            <AmlBadge
              amlStatus={invoice.amlStatus ?? null}
              riskScore={invoice.riskScore ?? null}
              assetStatus={invoice.assetStatus ?? null}
              assetRiskScore={invoice.assetRiskScore ?? null}
            />
          </div>

          {/* 🔥 Умная кнопка */}
          <button
            type="button"
            onClick={onRunAml}
            disabled={amlLoading}
            className={`mt-4 inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-medium transition shadow-sm
              disabled:opacity-60 disabled:cursor-not-allowed 
              ${getAmlButtonClasses(invoice.amlStatus)}
            `}
          >
            {amlLoading ? "Checking AML…" : "Run AML check"}
          </button>
        </div>
      </div>
    </section>
  );
}
