"use client";

import { formatDateTimeCH } from "@/lib/formatters";
import { ExpiryCountdown } from "@/features/invoices/details/sections/sections/overview/components/ExpiryCountdown";

type Props = {
  fiatAmount?: number | null;
  fiatCurrency?: string | null;

  cryptoAmount: number;
  cryptoCurrency: string;

  createdAt?: string | null;
  expiresAt?: string | null;
  status?: string | null;

  isChfFiat: boolean;
};

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return formatDateTimeCH(iso);
}

function formatFiat(
  amount: number | null | undefined,
  currency?: string | null
) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  const c = (currency ?? "").trim().toUpperCase();
  return c ? `${n.toFixed(2)} ${c}` : `${n.toFixed(2)}`;
}

function formatAsset(amount: number, asset: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  const a = (asset ?? "").trim();
  return a ? `${n.toFixed(6)} ${a}` : `${n.toFixed(6)}`;
}

export function InvoiceSummaryStats({
  fiatAmount,
  fiatCurrency,
  cryptoAmount,
  cryptoCurrency,
  createdAt,
  expiresAt,
  status,
  isChfFiat,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {/* Fiat */}
      <div className="rounded-2xl bg-slate-900/60 p-3 ring-1 ring-slate-800/80">
        <p className="text-[11px] uppercase text-slate-500">Fiat amount</p>
        <p className="mt-1 text-base font-semibold text-slate-50">
          {isChfFiat ? formatFiat(fiatAmount, fiatCurrency) : "—"}
        </p>
      </div>

      {/* Asset */}
      <div className="rounded-2xl bg-slate-900/60 p-3 ring-1 ring-slate-800/80">
        <p className="text-[11px] uppercase text-slate-500">Asset amount</p>
        <p className="mt-1 text-base font-semibold text-slate-50">
          {formatAsset(cryptoAmount, cryptoCurrency)}
        </p>
      </div>

      {/* Created */}
      <div className="rounded-2xl bg-slate-900/60 p-3 ring-1 ring-slate-800/80">
        <p className="text-[11px] uppercase text-slate-500">Created at</p>
        <p className="mt-1 text-xs text-slate-100">
          {formatDateTime(createdAt)}
        </p>
      </div>

      {/* Expires */}
      <div className="rounded-2xl bg-slate-900/60 p-3 ring-1 ring-slate-800/80">
        <p className="text-[11px] uppercase text-slate-500">Expires at</p>

        <div className="mt-1 flex items-center gap-2 text-xs text-slate-100">
          <span>{formatDateTime(expiresAt)}</span>
          <span className="text-slate-400">
            <ExpiryCountdown
              expiresAt={expiresAt ?? null}
              status={status ?? null}
            />
          </span>
        </div>
      </div>
    </div>
  );
}
