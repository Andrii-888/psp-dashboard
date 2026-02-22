"use client";

import type { OperatorTxViewModel } from "../lib/blockchainTypes";

type ResultUi = {
  label: string;
  valueClassName: string;
  subtleClassName: string;
};

function normalizeNetwork(net: string): string {
  return (net ?? "").trim().toLowerCase();
}

function getTxExplorerUrl(
  network: string | null,
  txHash: string | null
): string | null {
  if (!network || !txHash) return null;
  const n = normalizeNetwork(network);

  // Ethereum family
  if (n === "sepolia") return `https://sepolia.etherscan.io/tx/${txHash}`;
  if (n === "eth" || n === "ethereum")
    return `https://etherscan.io/tx/${txHash}`;

  // Polygon
  if (n === "polygon" || n === "matic")
    return `https://polygonscan.com/tx/${txHash}`;

  // BSC
  if (n === "bsc" || n === "bnb" || n === "binance")
    return `https://bscscan.com/tx/${txHash}`;

  // Tron
  if (n === "tron" || n === "trx")
    return `https://tronscan.org/#/transaction/${txHash}`;

  return null;
}

function getExplorerLabel(network: string | null): string {
  const n = normalizeNetwork(network ?? "");
  if (n === "sepolia" || n === "eth" || n === "ethereum") return "Etherscan";
  if (n === "polygon" || n === "matic") return "Polygonscan";
  if (n === "bsc" || n === "bnb" || n === "binance") return "BscScan";
  if (n === "tron" || n === "trx") return "Tronscan";
  return "Explorer";
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

function RailLink({
  label,
  href,
  text,
}: {
  label: string;
  href: string;
  text: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-[12px] text-slate-300 underline decoration-white/15 underline-offset-4 hover:text-slate-100 hover:decoration-white/25"
      >
        {text}
      </a>
    </div>
  );
}

function StatusPill({
  tone,
  text,
}: {
  tone: "ok" | "warn" | "info" | "neutral";
  text: string;
}) {
  const cls =
    tone === "ok"
      ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/30"
      : tone === "warn"
      ? "bg-rose-500/10 text-rose-200 ring-rose-500/30"
      : tone === "info"
      ? "bg-sky-500/10 text-sky-200 ring-sky-500/30"
      : "bg-slate-500/10 text-slate-200 ring-slate-500/30";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5",
        "text-[10px] font-semibold uppercase tracking-[0.18em]",
        "ring-1",
        cls,
      ].join(" ")}
    >
      {text}
    </span>
  );
}

type Props = {
  tx: OperatorTxViewModel;
};

export function OnChainStatusRail({ tx }: Props) {
  const result = getResultUi(tx.status);

  const isFinal =
    typeof tx.confirmations === "number" &&
    typeof tx.requiredConfirmations === "number" &&
    tx.requiredConfirmations > 0 &&
    tx.confirmations >= tx.requiredConfirmations;

  const explorerUrl = getTxExplorerUrl(tx.network ?? null, tx.txHash ?? null);
  const explorerLabel = getExplorerLabel(tx.network ?? null);

  return (
    <aside className="md:pt-6">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 text-center">
        On-chain status
      </div>

      <div className="mt-4 flex flex-col items-center gap-6 text-center">
        <RailItem
          label="Network"
          value={tx.network ?? "—"}
          accentClassName="text-slate-50"
        />

        <div className="flex flex-col items-center gap-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
            Result
          </div>

          <div className="w-full flex justify-center">
            <StatusPill
              tone={
                tx.status === "confirmed"
                  ? "ok"
                  : tx.status === "failed"
                  ? "warn"
                  : tx.status === "detected"
                  ? "info"
                  : "neutral"
              }
              text={result.label}
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 pt-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
            Finality
          </div>

          <div className="w-full flex justify-center">
            <StatusPill
              tone={isFinal ? "ok" : "neutral"}
              text={isFinal ? "FINAL" : "NOT FINAL"}
            />
          </div>
        </div>

        {explorerUrl ? (
          <RailLink
            label="Explorer"
            href={explorerUrl}
            text={`Open in ${explorerLabel}`}
          />
        ) : null}
      </div>
    </aside>
  );
}
