// src/components/invoice-details/overview/AmlSidebar.tsx
"use client";

import type { AttachTransactionPayload, Invoice } from "@/lib/pspApi";
import { AmlBadge } from "@/components/invoices/AmlBadge";
import { ScreeningStatus } from "./ScreeningStatus";
import { AmlActionButton } from "./AmlActionButton";
import { DemoTxAttach } from "./DemoTxAttach";
import { CryptoCleanliness } from "./CryptoCleanliness";
import { getAmlUiState } from "../amlUiState";
import { formatDateTimeCH } from "@/lib/formatters";

type Props = {
  invoice: Invoice;
  onRunAml: () => void;
  amlLoading: boolean;
  savingTx: boolean;
  onAttachTx: (payload: AttachTransactionPayload) => void | Promise<void>;
};

function shortHash(hash: string): string {
  const h = hash.trim();
  if (h.length <= 18) return h;
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

export function AmlSidebar({
  invoice,
  onRunAml,
  amlLoading,
  savingTx,
  onAttachTx,
}: Props) {
  const ui = getAmlUiState(invoice);

  const showTxBlock = ui.hasTx; // SSOT: show only when txHash exists
  const showRunningBox = ui.stage === "running";

  const checkedAtHuman = ui.amlCheckedAt
    ? formatDateTimeCH(ui.amlCheckedAt)
    : null;

  const secondaryLine =
    ui.stage === "done" && (ui.amlProvider || checkedAtHuman)
      ? `Provider: ${ui.amlProvider ?? "—"}${
          checkedAtHuman ? ` · checked: ${checkedAtHuman}` : ""
        }`
      : ui.stage === "error" && ui.amlError
      ? ui.amlError
      : undefined;

  const helperLine =
    ui.stage === "error"
      ? ui.helper ?? "Failed to run AML check."
      : ui.stage === "locked"
      ? ui.helper ?? "Invoice is closed. AML is informational only."
      : ui.stage === "no_tx"
      ? ui.helper ?? "Waiting for provider / chain detection."
      : ui.stage === "not_started"
      ? ui.helper ?? "Tx detected — you can run AML check."
      : ui.stage === "running"
      ? ui.helper ?? "Funds remain isolated until result is recorded."
      : undefined;

  const txStatusBadge = ui.hasTx ? "DETECTED" : "NOT DETECTED";

  return (
    <div className="w-full max-w-xs">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {ui.header}
      </h2>

      <div className="mt-3">
        <AmlBadge
          amlStatus={ui.amlStatus}
          riskScore={ui.riskScore}
          assetStatus={ui.assetStatus}
          assetRiskScore={ui.assetRiskScore}
        />

        <div className="mt-2 space-y-1">
          <p className="text-[11px] text-slate-200">{ui.primaryLine}</p>

          {secondaryLine ? (
            <p className="text-[11px] text-slate-500">{secondaryLine}</p>
          ) : null}

          {helperLine ? (
            <p className="text-[11px] text-slate-500">{helperLine}</p>
          ) : null}
        </div>
      </div>

      <CryptoCleanliness invoice={invoice} />
      <ScreeningStatus invoice={invoice} />

      <DemoTxAttach
        invoice={invoice}
        savingTx={savingTx}
        onAttachTx={onAttachTx}
      />

      {showTxBlock ? (
        <div className="mt-3 rounded-2xl bg-slate-900/60 p-3 ring-1 ring-slate-800/80">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase text-slate-500">Transaction</p>

            <span className="rounded-full bg-slate-950/40 px-2 py-1 text-[10px] font-semibold tracking-wide text-slate-100 ring-1 ring-slate-800/70">
              {txStatusBadge}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-[11px] text-slate-200">
            <div className="text-slate-400">Status</div>
            <div className="font-mono text-slate-100">{ui.txStatus ?? "—"}</div>

            <div className="text-slate-400">Tx hash</div>
            <div
              className="break-all font-mono text-slate-100"
              title={ui.txHash ?? undefined}
            >
              {ui.txHash ? shortHash(ui.txHash) : "—"}
            </div>
          </div>
        </div>
      ) : null}

      {showRunningBox ? (
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

      <AmlActionButton
        invoice={invoice}
        onRunAml={onRunAml}
        amlLoading={amlLoading}
      />
    </div>
  );
}
