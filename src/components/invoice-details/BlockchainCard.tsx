"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { Invoice, AttachTransactionPayload } from "@/lib/pspApi";

interface BlockchainCardProps {
  invoice: Invoice;
  savingTx: boolean;
  onAttachTx: (payload: AttachTransactionPayload) => void | Promise<void>;
}

function isFinalStatus(status: Invoice["status"]): boolean {
  return (
    status === "confirmed" || status === "expired" || status === "rejected"
  );
}

function fmtDateTime(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString();
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function BlockchainCard({
  invoice,
  savingTx,
  onAttachTx,
}: BlockchainCardProps) {
  const hasNetwork = !!invoice.network && invoice.network.trim().length > 0;
  const hasWallet =
    !!invoice.walletAddress && invoice.walletAddress.trim().length > 0;
  const hasTx = !!invoice.txHash && invoice.txHash.trim().length > 0;

  const pay = invoice.pay ?? null;
  const hasPay = !!pay?.address && !!pay?.amount && !!pay?.currency;

  const finalStatus = isFinalStatus(invoice.status);
  const canAttachDev = !finalStatus && !hasTx; // dev form only if not final and tx missing

  // local fields for dev/test form (if tx still missing)
  const [network, setNetwork] = useState<string>(invoice.network ?? "");
  const [walletAddress, setWalletAddress] = useState<string>(
    invoice.walletAddress ?? ""
  );
  const [txHash, setTxHash] = useState<string>(invoice.txHash ?? "");

  const [copiedKey, setCopiedKey] = useState<"pay" | "wallet" | "tx" | null>(
    null
  );

  const onCopy = async (key: "pay" | "wallet" | "tx", value: string) => {
    const ok = await copyToClipboard(value);
    setCopiedKey(ok ? key : null);
    window.setTimeout(() => setCopiedKey(null), 1200);
  };

  const payNetworkLabel = useMemo(() => {
    const n = pay?.network?.toString().trim();
    return n ? n : "—";
  }, [pay?.network]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const payload: AttachTransactionPayload = {
      network: network.trim() || undefined,
      walletAddress: walletAddress.trim() || undefined,
      txHash: txHash.trim() || undefined,
    };

    await onAttachTx(payload);
  };

  return (
    <section className="apple-card apple-card-content p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="section-title">Blockchain transaction</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Payment instructions + on-chain details. In production, TX is
            attached automatically by PSP Core.
          </p>
        </div>

        <span className="rounded-full bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300 ring-1 ring-slate-700/70">
          {hasTx ? "On-chain data attached" : "Waiting for on-chain data"}
        </span>
      </div>

      {/* Payment instructions */}
      <div className="mt-4 rounded-2xl bg-slate-950/70 p-3 ring-1 ring-slate-800/80">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Payment instructions
          </p>

          <span className="rounded-full bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300 ring-1 ring-slate-700/70">
            {hasPay ? "Ready" : "Pending"}
          </span>
        </div>

        {hasPay ? (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="card-field">
              <p className="label">Address</p>
              <div className="mt-1 flex items-start gap-2">
                <p className="min-w-0 flex-1 break-all rounded-2xl bg-slate-900/70 px-3 py-2 font-mono text-[11px] text-slate-100 ring-1 ring-slate-800/80">
                  {pay?.address}
                </p>
                <button
                  type="button"
                  onClick={() => onCopy("pay", pay!.address)}
                  className="shrink-0 rounded-full border border-slate-600/70 bg-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-900 shadow-sm transition hover:bg-white"
                  title="Copy address"
                >
                  {copiedKey === "pay" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="card-field">
              <p className="label">Amount</p>
              <p className="mt-1 rounded-2xl bg-slate-900/70 px-3 py-2 text-[11px] text-slate-100 ring-1 ring-slate-800/80">
                <span className="font-mono">{pay?.amount}</span>{" "}
                <span className="text-slate-300">({pay?.currency})</span>
              </p>
            </div>

            <div className="card-field">
              <p className="label">Network</p>
              <span className="mt-1 inline-flex items-center rounded-full bg-slate-900/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-100 ring-1 ring-slate-700/80">
                {payNetworkLabel}
              </span>
            </div>

            <div className="card-field">
              <p className="label">Provider expires at</p>
              <p className="mt-1 text-[11px] text-slate-200">
                {fmtDateTime(pay?.expiresAt ?? null)}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[11px] text-slate-500">
            PSP Core hasn&apos;t provided payment instructions yet. This usually
            appears shortly after invoice creation (address/amount/network).
          </p>
        )}
      </div>

      {/* Current on-chain data */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Network */}
        <div className="card-field">
          <p className="label">Network</p>
          {hasNetwork ? (
            <span className="mt-1 inline-flex items-center rounded-full bg-slate-900/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-100 ring-1 ring-slate-700/80">
              {invoice.network}
            </span>
          ) : (
            <p className="mt-1 text-[11px] text-slate-500">Not provided yet</p>
          )}
        </div>

        {/* Wallet */}
        <div className="card-field">
          <div className="flex items-center justify-between gap-2">
            <p className="label">Wallet address</p>
            {hasWallet ? (
              <button
                type="button"
                onClick={() => onCopy("wallet", invoice.walletAddress!)}
                className="rounded-full border border-slate-600/70 bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-900 shadow-sm transition hover:bg-white"
                title="Copy wallet address"
              >
                {copiedKey === "wallet" ? "Copied" : "Copy"}
              </button>
            ) : null}
          </div>

          {hasWallet ? (
            <p className="mt-1 break-all rounded-2xl bg-slate-900/70 px-3 py-2 font-mono text-[11px] text-slate-100 ring-1 ring-slate-800/80">
              {invoice.walletAddress}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-slate-500">Not attached yet</p>
          )}
        </div>

        {/* Tx hash */}
        <div className="card-field sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <p className="label">Transaction hash</p>
            {hasTx ? (
              <button
                type="button"
                onClick={() => onCopy("tx", invoice.txHash!)}
                className="rounded-full border border-slate-600/70 bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-900 shadow-sm transition hover:bg-white"
                title="Copy transaction hash"
              >
                {copiedKey === "tx" ? "Copied" : "Copy"}
              </button>
            ) : null}
          </div>

          {hasTx ? (
            <p className="mt-1 break-all rounded-2xl bg-slate-900/70 px-3 py-2 font-mono text-[11px] text-slate-100 ring-1 ring-slate-800/80">
              {invoice.txHash}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-slate-500">
              Transaction hash will appear here after it is detected/attached.
            </p>
          )}
        </div>
      </div>

      {/* Dev/Test attach form — only if txHash is missing AND invoice is not final */}
      {canAttachDev ? (
        <div className="mt-5">
          <p className="text-[11px] text-slate-500">
            Demo tip: attach txHash manually only in dev/testing environments.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-3 grid grid-cols-1 gap-3 rounded-2xl bg-slate-950/70 p-3 ring-1 ring-slate-800/80 md:grid-cols-[2fr_2fr_3fr_auto]"
          >
            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                Network (dev)
              </label>
              <input
                type="text"
                placeholder="e.g. ETH, TRON, BSC"
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                className="rounded-xl border border-slate-700/70 bg-slate-950/90 px-2 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-[rgb(0,136,255)]/70 focus:outline-none focus:ring-1 focus:ring-[rgb(0,136,255)]/50"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                Wallet address (dev)
              </label>
              <input
                type="text"
                placeholder="0x... / T..."
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="rounded-xl border border-slate-700/70 bg-slate-950/90 px-2 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-[rgb(0,136,255)]/70 focus:outline-none focus:ring-1 focus:ring-[rgb(0,136,255)]/50"
              />
            </div>

            <div className="flex flex-col gap-1 md:col-span-1">
              <label className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                Transaction hash (dev)
              </label>
              <input
                type="text"
                placeholder="Blockchain tx hash…"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                className="w-full rounded-xl border border-slate-700/70 bg-slate-950/90 px-2 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-[rgb(0,136,255)]/70 focus:outline-none focus:ring-1 focus:ring-[rgb(0,136,255)]/50"
              />
            </div>

            <div className="flex items-end justify-start md:justify-end">
              <button
                type="submit"
                disabled={savingTx}
                className="inline-flex items-center justify-center rounded-full border border-slate-600/70 bg-slate-100 px-4 py-1.5 text-[11px] font-medium text-slate-900 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingTx ? "Saving…" : "Attach (dev)"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Final status note */}
      {finalStatus ? (
        <p className="mt-4 text-[11px] text-slate-500">
          This invoice is{" "}
          <span className="text-slate-300">{invoice.status}</span>. Actions are
          locked (read-only).
        </p>
      ) : null}
    </section>
  );
}
