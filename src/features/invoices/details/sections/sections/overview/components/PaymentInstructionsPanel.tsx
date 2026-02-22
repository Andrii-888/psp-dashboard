"use client";

import type { Invoice } from "@/lib/pspApi";
import { formatDateTimeCH } from "@/lib/formatters";
import { ExpiryCountdown } from "@/features/invoices/details/sections/sections/overview/components/ExpiryCountdown";

type Props = {
  invoice: Invoice;
  fxHumanRate: string;
};

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return formatDateTimeCH(iso);
}

function cleanStr(v: unknown): string {
  const s = typeof v === "string" ? v.trim() : String(v ?? "").trim();
  return s;
}

export function PaymentInstructionsPanel({ invoice, fxHumanRate }: Props) {
  if (!invoice.pay) return null;

  const txHash = cleanStr((invoice as unknown as { txHash?: unknown }).txHash);
  const hasTx = txHash.length > 0;

  return (
    <div className="mt-3 rounded-2xl bg-slate-900/60 p-3 ring-1 ring-slate-800/80">
      <p className="text-[11px] uppercase text-slate-500">
        Payment instructions
      </p>

      {/* ✅ operator-grade "label / value" layout */}
      <div className="mt-2 grid grid-cols-[90px_1fr] gap-x-3 gap-y-2 text-[11px] text-slate-200">
        <div className="text-slate-400">Send</div>
        <div className="font-mono text-slate-100">
          {invoice.pay.amount} {invoice.pay.currency}
        </div>

        <div className="text-slate-400">Network</div>
        <div className="font-mono text-slate-100">{invoice.pay.network}</div>

        <div className="text-slate-400">Address</div>
        <div className="break-all font-mono text-slate-100">
          {invoice.pay.address}
        </div>

        <div className="text-slate-400">Tx hash</div>
        <div className="break-all font-mono text-slate-100">
          {hasTx ? txHash : "—"}
        </div>

        <div className="text-slate-400">Provider TTL</div>
        <div className="flex flex-col gap-1 text-slate-200">
          <ExpiryCountdown
            expiresAt={invoice.pay.expiresAt ?? null}
            status={invoice.status ?? null}
          />

          <span className="text-[10px] text-slate-500">
            {invoice.pay.expiresAt
              ? `Provider expires at ${formatDateTime(invoice.pay.expiresAt)}`
              : "—"}
          </span>
        </div>

        <div className="text-slate-400">Expires at</div>
        <div className="text-slate-300">
          {formatDateTime(invoice.pay.expiresAt)}
        </div>
      </div>

      {/* FX / SSOT (без дубля предупреждений) */}
      <div className="mt-3 rounded-2xl bg-slate-950/40 p-3 ring-1 ring-slate-800/70">
        <p className="text-[11px] uppercase text-slate-500">FX / SSOT</p>

        <div className="mt-2 space-y-2 text-[11px] text-slate-200">
          <div>
            <div className="text-slate-400">SSOT cryptoAmount</div>
            <div className="mt-1 font-mono text-slate-100">
              {invoice.cryptoAmount} {invoice.cryptoCurrency}
            </div>
          </div>

          <div>
            <div className="text-slate-400">Provider pay amount</div>
            <div className="font-mono text-slate-100">
              {invoice.pay.amount} {invoice.pay.currency}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <div className="text-slate-400">FX pair</div>
              <div className="font-mono text-slate-100">
                {invoice.fxPair ?? "—"}
              </div>
            </div>

            <div>
              <div className="text-slate-400">FX rate</div>
              <div className="font-mono text-slate-100">
                {typeof invoice.fxRate === "number" &&
                Number.isFinite(invoice.fxRate)
                  ? invoice.fxRate.toFixed(6)
                  : "—"}
              </div>
            </div>
          </div>

          <div>
            <div className="text-slate-400">Human rate</div>
            <div className="font-mono text-slate-100">{fxHumanRate}</div>
          </div>

          <div className="text-slate-400">
            Source / lockedAt:{" "}
            <span className="font-mono text-slate-100">
              {invoice.fxSource ?? "—"}
            </span>{" "}
            ·{" "}
            <span className="font-mono text-slate-100">
              {formatDateTime(invoice.fxLockedAt ?? null)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
