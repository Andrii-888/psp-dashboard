// src/features/accounting/ui/AccountingPolicyCard.tsx

function PolicyRow(p: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="text-xs font-medium text-slate-300">{p.label}</div>
      <div className="min-w-0 text-xs text-slate-100 sm:text-right">
        <div className="wrap-break-word">{p.value}</div>
        {p.note ? <div className="mt-0.5 text-slate-400">{p.note}</div> : null}
      </div>
    </div>
  );
}

export default function AccountingPolicyCard(props: {
  totalsLimit: number;
  tableLimit: number;
  allowPipeline: boolean;
}) {
  const { totalsLimit, tableLimit, allowPipeline } = props;

  return (
    <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-50">
            Accounting policies
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Audit transparency: how totals and statuses are derived (SSOT).
          </div>
        </div>

        <span
          className={[
            "rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
            allowPipeline
              ? "bg-amber-500/15 text-amber-300 ring-amber-500/20"
              : "bg-emerald-500/15 text-emerald-300 ring-emerald-500/20",
          ].join(" ")}
        >
          {allowPipeline ? "PIPELINE MODE" : "LEDGER MODE"}
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        <PolicyRow
          label="Source of truth (SSOT)"
          value="psp-core ledger entries + backend /accounting/summary"
          note="UI does not guess statuses; reconciliation validates totals."
        />
        <PolicyRow
          label="Finality rule"
          value="invoice.confirmed is final unless invoice.confirmed_reversed exists"
          note="Reversals are excluded from confirmedCount and totals."
        />
        <PolicyRow
          label="Fees policy"
          value="feeSum (crypto) from invoice.confirmed.feeAmount; feeFiatSum (CHF) from fee_charged"
          note="Crypto fee and fiat fee are independent axes."
        />
        <PolicyRow
          label="Totals dataset"
          value={`Computed from totalsEntries (limit=${totalsLimit}). Table is a window (limit=${tableLimit}).`}
          note="KPIs/ByDay/ByAsset/Reconciliation use totalsEntries only."
        />
      </div>
    </div>
  );
}
