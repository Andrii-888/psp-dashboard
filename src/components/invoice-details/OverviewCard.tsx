"use client";

import type { Invoice, AttachTransactionPayload } from "@/lib/pspApi";
import { AmlBadge } from "@/components/invoices/AmlBadge";
import { ScreeningStatus } from "@/components/invoice-details/overview/ScreeningStatus";
import { AmlActionButton } from "@/components/invoice-details/overview/AmlActionButton";
import { DemoTxAttach } from "@/components/invoice-details/overview/DemoTxAttach";
import { CryptoCleanliness } from "@/components/invoice-details/overview/CryptoCleanliness";

interface OverviewCardProps {
  invoice: Invoice;
  onRunAml: () => void;
  amlLoading: boolean;
  savingTx: boolean;
  onAttachTx: (payload: AttachTransactionPayload) => void | Promise<void>;
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

function formatFiatChf(amount: number) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)} CHF`;
}

function formatAsset(amount: number, asset: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  const a = (asset ?? "").trim();
  return a ? `${n.toFixed(2)} ${a}` : `${n.toFixed(2)}`;
}

export function OverviewCard({
  invoice,
  onRunAml,
  amlLoading,
  savingTx,
  onAttachTx,
}: OverviewCardProps) {
  const hasTx = !!invoice.txHash && invoice.txHash.trim().length > 0;
  const isScreeningPending = hasTx && invoice.amlStatus === null;

  const payAmountNum = invoice.pay?.amount
    ? Number(String(invoice.pay.amount).replace(",", "."))
    : NaN;
  const hasAmountMismatch =
    Number.isFinite(payAmountNum) &&
    Number.isFinite(invoice.cryptoAmount) &&
    Math.abs(payAmountNum - Number(invoice.cryptoAmount)) > 0.000001;

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
                {formatFiatChf(invoice.fiatAmount)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-900/60 p-3 ring-1 ring-slate-800/80">
              <p className="text-[11px] uppercase text-slate-500">
                Asset amount
              </p>
              <p className="mt-1 text-base font-semibold text-slate-50">
                {formatAsset(invoice.cryptoAmount, invoice.cryptoCurrency)}
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
            {invoice.paymentUrl ? (
              <a
                href={invoice.paymentUrl}
                target="_blank"
                rel="noreferrer"
                className="break-all font-mono text-[11px] text-emerald-300 hover:underline"
              >
                {invoice.paymentUrl}
              </a>
            ) : (
              <span className="font-mono text-[11px] text-slate-500">—</span>
            )}
          </div>

          {/* ================= PAYMENT INSTRUCTIONS ================= */}
          {invoice.pay ? (
            <div className="mt-3 rounded-2xl bg-slate-900/60 p-3 ring-1 ring-slate-800/80">
              <p className="text-[11px] uppercase text-slate-500">
                Payment instructions
              </p>

              <div className="mt-2 space-y-1 text-[11px] text-slate-200">
                <div>
                  Network:{" "}
                  <span className="font-mono text-slate-100">
                    {invoice.pay.network}
                  </span>
                </div>

                <div>
                  Address:{" "}
                  <span className="break-all font-mono text-slate-100">
                    {invoice.pay.address}
                  </span>
                </div>

                <div>
                  Amount:{" "}
                  <span className="font-mono text-slate-100">
                    {invoice.pay.amount} {invoice.pay.currency}
                  </span>
                </div>

                <div className="text-slate-400">
                  Expires at: {formatDateTime(invoice.pay.expiresAt)}
                </div>
              </div>
              <div className="mt-3 rounded-2xl bg-slate-900/60 p-3 ring-1 ring-slate-800/80">
                <p className="text-[11px] uppercase text-slate-500">
                  FX / SSOT
                </p>

                <div className="mt-2 space-y-1 text-[11px] text-slate-200">
                  <div>
                    SSOT cryptoAmount:{" "}
                    {hasAmountMismatch ? (
                      <div className="rounded-lg bg-amber-500/10 p-2 ring-1 ring-amber-500/30">
                        <div className="text-[11px] font-semibold text-amber-200">
                          ⚠ Amount mismatch detected
                        </div>
                        <div className="mt-0.5 text-[11px] text-amber-200/80">
                          SSOT cryptoAmount differs from provider pay amount.
                          Check provider_raw / pricing flow.
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-emerald-500/10 p-2 ring-1 ring-emerald-500/30">
                        <div className="text-[11px] font-semibold text-emerald-200">
                          ✅ Amounts match (SSOT)
                        </div>
                        <div className="mt-0.5 text-[11px] text-emerald-200/80">
                          cryptoAmount equals provider pay amount.
                        </div>
                      </div>
                    )}
                    <span className="font-mono text-slate-100">
                      {invoice.cryptoAmount} {invoice.cryptoCurrency}
                    </span>
                  </div>

                  <div>
                    Provider pay amount:{" "}
                    <span className="font-mono text-slate-100">
                      {invoice.pay?.amount} {invoice.pay?.currency}
                    </span>
                  </div>

                  <div>
                    FX pair:{" "}
                    <span className="font-mono text-slate-100">
                      {invoice.fxPair ?? "—"}
                    </span>
                  </div>

                  <div>
                    FX rate:{" "}
                    <span className="font-mono text-slate-100">
                      {typeof invoice.fxRate === "number" &&
                      Number.isFinite(invoice.fxRate)
                        ? invoice.fxRate.toFixed(6)
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
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

          <CryptoCleanliness invoice={invoice} />

          {/* ✅ Screening status (compliance-first) */}
          <ScreeningStatus invoice={invoice} />

          <DemoTxAttach
            invoice={invoice}
            savingTx={savingTx}
            onAttachTx={onAttachTx}
          />

          {/* ✅ Running AML state (tx detected, result not yet stored) */}
          {isScreeningPending ? (
            <div className="mt-3 rounded-2xl bg-slate-900/60 p-3 ring-1 ring-slate-800/80">
              <p className="text-[11px] uppercase text-slate-500">
                AML / KYT checks
              </p>
              <p className="mt-1 text-[11px] text-slate-200">
                🔍 Running AML / KYT checks…
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Funds remain isolated until compliance result is recorded.
              </p>
            </div>
          ) : null}

          {/* 🔥 AML action */}
          <AmlActionButton
            invoice={invoice}
            onRunAml={onRunAml}
            amlLoading={amlLoading}
          />
        </div>
      </div>
    </section>
  );
}
