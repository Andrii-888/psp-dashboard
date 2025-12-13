"use client";

import { useRouter } from "next/navigation";
import type { Invoice } from "@/lib/pspApi";
import { StatusBadge } from "@/components/invoices/StatusBadge";
import { AmlBadge } from "@/components/invoices/AmlBadge";

function formatDate(dateIso: string) {
  const d = new Date(dateIso);
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

interface InvoicesTableProps {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
}

export function InvoicesTable({
  invoices,
  loading,
  error,
}: InvoicesTableProps) {
  const router = useRouter();

  const openDetails = (id: string) => {
    router.push(`/invoices/${id}`);
  };

  const onRowKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openDetails(id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-slate-400">
        Loading invoices…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
        {error}
      </div>
    );
  }

  if (!invoices.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
        <p className="text-sm font-medium text-slate-200">No invoices found</p>
        <p className="text-xs text-slate-500">
          Try changing filters or create a new test payment.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-y-1">
        <thead>
          <tr className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
            <th className="px-3 py-2 text-left">ID</th>
            <th className="px-3 py-2 text-left">Created</th>
            <th className="px-3 py-2 text-right">Amount</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">AML</th>
            <th className="px-3 py-2 text-left">Network</th>
            <th className="px-3 py-2 text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
          {invoices.map((inv) => (
            <tr
              key={inv.id}
              tabIndex={0}
              role="button"
              aria-label={`Open invoice ${inv.id}`}
              onClick={() => openDetails(inv.id)}
              onKeyDown={(e) => onRowKeyDown(e, inv.id)}
              className="group cursor-pointer rounded-2xl bg-slate-900/60 text-xs text-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.55)] transition-all hover:bg-slate-900/90 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              {/* ID */}
              <td className="max-w-[260px] truncate px-3 py-3 font-mono text-[11px] text-slate-300">
                {inv.id}
              </td>

              {/* Created / Expires */}
              <td className="px-3 py-3 text-[11px] text-slate-400">
                <div>{formatDate(inv.createdAt)}</div>
                <div className="mt-0.5 text-[10px] text-slate-500">
                  Expires: {formatDate(inv.expiresAt)}
                </div>
              </td>

              {/* Amounts */}
              <td className="whitespace-nowrap px-3 py-3 text-right text-xs font-semibold text-slate-50">
                <div>{formatAmount(inv.fiatAmount, inv.fiatCurrency)}</div>
                <div className="mt-0.5 text-[10px] text-slate-500">
                  {formatAmount(inv.cryptoAmount, inv.cryptoCurrency)}
                </div>
              </td>

              {/* Status */}
              <td className="px-3 py-3">
                <StatusBadge status={inv.status} />
              </td>

              {/* AML */}
              <td className="px-3 py-3 align-top">
                <AmlBadge
                  amlStatus={inv.amlStatus ?? null}
                  riskScore={inv.riskScore ?? null}
                  assetStatus={inv.assetStatus ?? null}
                  assetRiskScore={inv.assetRiskScore ?? null}
                />
              </td>

              {/* Network / tx hash */}
              <td className="px-3 py-3 text-[11px] text-slate-400">
                {inv.network ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="uppercase tracking-[0.16em] text-slate-500">
                      {inv.network}
                    </span>
                    {inv.txHash && (
                      <span className="max-w-[190px] truncate font-mono text-[10px] text-slate-400">
                        {inv.txHash}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">—</span>
                )}
              </td>

              {/* Actions */}
              <td className="px-3 py-3">
                <a
                  href={inv.paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center rounded-full bg-slate-800/70 px-3 py-1 text-[11px] font-medium text-slate-50 ring-1 ring-slate-700/80 transition hover:bg-slate-700 hover:ring-slate-500"
                >
                  Open payment page
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
