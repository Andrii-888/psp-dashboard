"use client";

import type { Invoice } from "@/lib/pspApi";

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function getTone(status: Invoice["amlStatus"]) {
  if (status === "blocked" || status === "risky") return "rose";
  if (status === "warning") return "amber";
  if (status === "clean") return "emerald";
  return "slate";
}

export function CryptoCleanliness({ invoice }: { invoice: Invoice }) {
  const hasTx = !!invoice.txHash && invoice.txHash.trim().length > 0;

  // показываем только когда есть tx и есть riskScore (после AML)
  if (!hasTx) return null;
  if (invoice.riskScore === null || invoice.riskScore === undefined)
    return null;

  const risk = clamp(Number(invoice.riskScore));
  const cleanliness = clamp(100 - risk);

  const tone = getTone(invoice.amlStatus);

  const barBg =
    tone === "emerald"
      ? "bg-emerald-500/20"
      : tone === "amber"
      ? "bg-amber-500/20"
      : tone === "rose"
      ? "bg-rose-500/20"
      : "bg-slate-500/20";

  const barFill =
    tone === "emerald"
      ? "bg-emerald-400"
      : tone === "amber"
      ? "bg-amber-400"
      : tone === "rose"
      ? "bg-rose-400"
      : "bg-slate-300";

  const textTone =
    tone === "emerald"
      ? "text-emerald-200"
      : tone === "amber"
      ? "text-amber-200"
      : tone === "rose"
      ? "text-rose-200"
      : "text-slate-200";

  return (
    <div className="mt-3 rounded-2xl bg-slate-900/60 p-3 ring-1 ring-slate-800/80">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Crypto cleanliness
          </p>
          <p className={`mt-1 text-[11px] ${textTone}`}>
            {cleanliness}% clean
            <span className="ml-2 text-slate-500">·</span>
            <span className="ml-2 text-slate-500">risk score {risk}/100</span>
          </p>
        </div>

        <span className="rounded-full bg-slate-950/70 px-3 py-1 text-[11px] text-slate-300 ring-1 ring-slate-800/70">
          {invoice.amlStatus ? invoice.amlStatus.toUpperCase() : "—"}
        </span>
      </div>

      <div
        className={`mt-3 h-2 w-full rounded-full ${barBg} ring-1 ring-slate-800/70`}
      >
        <div
          className={`h-2 rounded-full ${barFill}`}
          style={{ width: `${cleanliness}%` }}
          aria-label={`Crypto cleanliness ${cleanliness}%`}
        />
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        Risk score is produced by AML/KYT engine and stored by PSP core.
      </p>
    </div>
  );
}
