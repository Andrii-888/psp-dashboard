"use client";

import type { OperatorTxViewModel } from "../lib/blockchainTypes";

type ResultUi = {
  label: string;
  valueClassName: string;
  subtleClassName: string;
};

function normalizeNetwork(net: string): string {
  return net.trim().toLowerCase();
}

function getTxExplorerUrl(
  network: string | null,
  txHash: string | null
): string | null {
  if (!network || !txHash) return null;
  const n = normalizeNetwork(network);

  if (n === "eth" || n === "ethereum" || n === "sepolia") {
    return `https://etherscan.io/tx/${txHash}`;
  }
  if (n === "polygon" || n === "matic") {
    return `https://polygonscan.com/tx/${txHash}`;
  }
  if (n === "bsc" || n === "bnb" || n === "binance") {
    return `https://bscscan.com/tx/${txHash}`;
  }
  if (n === "tron" || n === "trx") {
    return `https://tronscan.org/#/transaction/${txHash}`;
  }

  return null;
}

function getResultUi(status: OperatorTxViewModel["status"]): ResultUi {
  if (status === "failed") {
    return {
      label: "FAILED",
      valueClassName: "text-rose-300",
      subtleClassName: "text-rose-200/80",
    };
  }
  if (status === "confirmed") {
    return {
      label: "SUCCESSFUL",
      valueClassName: "text-emerald-300",
      subtleClassName: "text-emerald-200/80",
    };
  }
  if (status === "detected") {
    return {
      label: "DETECTED",
      valueClassName: "text-sky-300",
      subtleClassName: "text-sky-200/80",
    };
  }
  return {
    label: "PENDING",
    valueClassName: "text-slate-200",
    subtleClassName: "text-slate-200/70",
  };
}

function RailItem({
  label,
  value,
  mono = false,
  accentClassName,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accentClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div
        className={[
          "text-[12px] text-slate-100",
          mono ? "overflow-x-auto whitespace-nowrap font-mono" : "",
          accentClassName ?? "",
        ].join(" ")}
      >
        <span className="select-text">{value}</span>
      </div>
    </div>
  );
}

type Props = {
  tx: OperatorTxViewModel;
};

export function OnChainStatusRail({ tx }: Props) {
  const result = getResultUi(tx.status);

  const confirmationsText =
    typeof tx.confirmations === "number"
      ? `${tx.confirmations}${
          typeof tx.requiredConfirmations === "number"
            ? ` / ${tx.requiredConfirmations}`
            : ""
        }`
      : "—";

  const isFinal =
    typeof tx.confirmations === "number" &&
    typeof tx.requiredConfirmations === "number" &&
    tx.requiredConfirmations > 0 &&
    tx.confirmations >= tx.requiredConfirmations;

  const explorerUrl = getTxExplorerUrl(tx.network ?? null, tx.txHash ?? null);

  return (
    <aside className="md:pt-6">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
        On-chain status
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <RailItem
          label="Network"
          value={tx.network ?? "—"}
          accentClassName="text-slate-50"
        />

        <RailItem
          label="Result"
          value={result.label}
          accentClassName={result.valueClassName}
        />

        <RailItem
          label="Finality"
          value={isFinal ? "FINAL" : "NOT FINAL"}
          accentClassName={
            isFinal ? "text-emerald-300" : result.subtleClassName
          }
        />

        <RailItem
          label="Confirmations"
          value={confirmationsText}
          mono
          accentClassName="text-slate-50"
        />

        {explorerUrl ? (
          <div className="pt-1">
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[12px] text-slate-300 underline decoration-white/15 underline-offset-4 hover:text-slate-100 hover:decoration-white/25"
            >
              Open in explorer
            </a>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
