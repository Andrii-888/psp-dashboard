"use client";

import type { Invoice } from "@/lib/pspApi";
import { AmlBadge } from "@/components/invoices/AmlBadge";

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

export function OverviewCard({ invoice }: { invoice: Invoice }) {
  return (
    <section className="apple-card apple-card-content p-4 md:p-6">
      <div className="flex flex-col gap-6 md:flex-row">
        {/* LEFT */}
        <div className="flex-1 space-y-4">
          <h2 className="section-title">Overview</h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Fiat */}
            <div className="card-field">
              <p className="label">Fiat amount</p>
              <p className="value">
                {formatAmount(invoice.fiatAmount, invoice.fiatCurrency)}
              </p>
            </div>

            {/* Crypto */}
            <div className="card-field">
              <p className="label">Crypto amount</p>
              <p className="value">
                {formatAmount(invoice.cryptoAmount, invoice.cryptoCurrency)}
              </p>
            </div>

            {/* Created */}
            <div className="card-field">
              <p className="label">Created at</p>
              <p className="value-sm">{formatDateTime(invoice.createdAt)}</p>
            </div>

            {/* Expires */}
            <div className="card-field">
              <p className="label">Expires at</p>
              <p className="value-sm">{formatDateTime(invoice.expiresAt)}</p>
            </div>
          </div>

          <p className="meta">
            Merchant:{" "}
            <span className="font-mono text-slate-200">
              {invoice.merchantId ?? "—"}
            </span>
          </p>

          <p className="meta">
            Payment page:{" "}
            <a
              href={invoice.paymentUrl}
              target="_blank"
              className="payment-link"
            >
              {invoice.paymentUrl}
            </a>
          </p>
        </div>

        {/* RIGHT */}
        <div className="w-full max-w-xs">
          <h2 className="section-title">AML status</h2>
          <div className="mt-3">
            <AmlBadge
              amlStatus={invoice.amlStatus ?? null}
              riskScore={invoice.riskScore ?? null}
              assetStatus={invoice.assetStatus ?? null}
              assetRiskScore={invoice.assetRiskScore ?? null}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
