"use client";

import type { AttachTransactionPayload, Invoice } from "@/lib/pspApi";
import { PaymentInstructionsPanel } from "./components/PaymentInstructionsPanel";
import { InvoiceSummaryStats } from "./components/InvoiceSummaryStats";
import { AmlSidebar } from "./components/AmlSidebar";

interface OverviewCardProps {
  invoice: Invoice;
  onRunAml: () => void;
  amlLoading: boolean;
  savingTx: boolean;
  onAttachTx: (payload: AttachTransactionPayload) => void | Promise<void>;
}

function parseNum(v: unknown): number {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

export function OverviewCard({
  invoice,
  onRunAml,
  amlLoading,
  savingTx,
  onAttachTx,
}: OverviewCardProps) {
  const payAmountNum = parseNum(invoice.pay?.amount);
  const cryptoAmountNum =
    typeof invoice.cryptoAmount === "number" &&
    Number.isFinite(invoice.cryptoAmount)
      ? invoice.cryptoAmount
      : NaN;

  const hasAmountMismatch =
    Number.isFinite(payAmountNum) &&
    Number.isFinite(cryptoAmountNum) &&
    Math.abs(payAmountNum - cryptoAmountNum) > 0.000001;

  const fxRateNum =
    typeof invoice.fxRate === "number" && Number.isFinite(invoice.fxRate)
      ? invoice.fxRate
      : null;

  const isChfFiat =
    String(invoice.fiatCurrency ?? "")
      .trim()
      .toUpperCase() === "CHF";

  const fxHumanRate =
    fxRateNum && fxRateNum > 0 && isChfFiat
      ? `1 ${invoice.cryptoCurrency} ≈ ${fxRateNum.toFixed(6)} CHF`
      : "—";

  return (
    <section className="apple-card p-4 md:p-6">
      <div className="flex flex-col gap-6 md:flex-row">
        {/* LEFT */}
        <div className="flex-1 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Overview
          </h2>

          <InvoiceSummaryStats
            fiatAmount={invoice.fiatAmount}
            fiatCurrency={invoice.fiatCurrency ?? null}
            cryptoAmount={invoice.cryptoAmount}
            cryptoCurrency={invoice.cryptoCurrency}
            createdAt={invoice.createdAt ?? null}
            expiresAt={invoice.expiresAt ?? null}
            isChfFiat={isChfFiat}
          />

          {hasAmountMismatch ? (
            <div className="rounded-2xl bg-amber-500/10 p-3 ring-1 ring-amber-500/30">
              <div className="grid grid-cols-[1fr_auto] grid-rows-2 gap-x-10 gap-y-2">
                {/* ROW 1 LEFT */}
                <div className="text-[12px] font-semibold text-amber-200">
                  ⚠ Amount mismatch detected
                </div>

                {/* ROW 1 RIGHT */}
                <div className="flex justify-between gap-6">
                  <span className="text-[11px] text-amber-200/70">
                    SSOT cryptoAmount
                  </span>
                  <span className="font-mono text-[12px] text-amber-50 text-right">
                    {invoice.cryptoAmount} {invoice.cryptoCurrency}
                  </span>
                </div>

                {/* ROW 2 LEFT */}
                <div className="text-[11px] text-amber-200/80">
                  SSOT cryptoAmount differs from provider pay amount.
                </div>

                {/* ROW 2 RIGHT */}
                <div className="flex justify-between gap-6">
                  <span className="text-[11px] text-amber-200/70">
                    Provider pay
                  </span>
                  <span className="font-mono text-[12px] text-amber-50 text-right">
                    {invoice.pay?.amount ?? "—"} {invoice.pay?.currency ?? ""}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <PaymentInstructionsPanel
            invoice={invoice}
            fxHumanRate={fxHumanRate}
          />
        </div>

        {/* RIGHT */}
        <AmlSidebar
          invoice={invoice}
          onRunAml={onRunAml}
          amlLoading={amlLoading}
          savingTx={savingTx}
          onAttachTx={onAttachTx}
        />
      </div>
    </section>
  );
}
