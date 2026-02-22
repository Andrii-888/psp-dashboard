"use client";

import type { Invoice } from "@/lib/pspApi";

type Props = {
  invoice: Invoice;
};

function formatFiatChf(amount: number) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)} CHF`;
}

function getAmountTier(fiatAmount: number): "SMALL" | "MEDIUM" | "LARGE" {
  if (fiatAmount < 500) return "SMALL";
  if (fiatAmount < 2000) return "MEDIUM";
  return "LARGE";
}

function upper(v: unknown) {
  const s = typeof v === "string" ? v : v == null ? "—" : String(v);
  return s.toUpperCase();
}

function Card({
  label,
  value,
  subline,
}: {
  label: string;
  value: string;
  subline?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-[13px] font-medium text-slate-100">{value}</div>

      {subline ? (
        <div className="mt-1 text-[11px] text-slate-500">{subline}</div>
      ) : null}
    </div>
  );
}

export function ComplianceMetaGrid({ invoice }: Props) {
  const sanctions = invoice.sanctions ?? null;

  const amountTier = getAmountTier(invoice.fiatAmount);
  const amountValue = `${amountTier} · ${formatFiatChf(invoice.fiatAmount)}`;

  const amlStatus = upper(invoice.amlStatus);
  const amlProvider = invoice.amlProvider ? String(invoice.amlProvider) : "—";
  const amlCheckedAt = invoice.amlCheckedAt
    ? String(invoice.amlCheckedAt)
    : null;

  const sanctionsStatus = upper(sanctions?.status);
  const sanctionsProvider = sanctions?.provider
    ? String(sanctions.provider)
    : "—";
  const sanctionsReason = sanctions?.reasonCode
    ? String(sanctions.reasonCode)
    : null;

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
      <Card
        label="Amount tier"
        value={amountValue}
        subline="Internal policy tier (not legal threshold)."
      />

      <Card
        label="AML"
        value={amlStatus}
        subline={
          amlCheckedAt
            ? `Provider: ${amlProvider} · checked: ${amlCheckedAt}`
            : `Provider: ${amlProvider}`
        }
      />

      <Card
        label="Sanctions"
        value={sanctionsStatus}
        subline={
          sanctionsReason
            ? `Source: ${sanctionsProvider} · ${sanctionsReason}`
            : `Source: ${sanctionsProvider}`
        }
      />

      <Card
        label="Policy"
        value="Operator decision"
        subline="Approve / Hold / Reject is written to audit trail."
      />
    </div>
  );
}
