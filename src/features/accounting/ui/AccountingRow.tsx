// src/app/accounting/components/AccountingRow.tsx

import Link from "next/link";
import { ReceiptText } from "lucide-react";
import type { AccountingEntryRaw } from "@/features/accounting/lib/types";
import { fmtDate, toNumber } from "@/features/accounting/lib/format";

type Tone = {
  invoiceText: string;
  eventBadge: string;
};

const fmtChf = (n: number) =>
  new Intl.NumberFormat("de-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 8,
  }).format(n);

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const get = (obj: unknown, key: string): unknown =>
  isObj(obj) ? obj[key] : undefined;

function pickPrimaryMoney(entry: AccountingEntryRaw) {
  const toFinite = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const upper = (v: unknown): string =>
    typeof v === "string" ? v.trim().toUpperCase() : "";

  const parseFxPair = (
    pairRaw: unknown
  ): { base: string; quote: string } | null => {
    const p = upper(pairRaw);
    if (!p) return null;

    // supports: "USDC/CHF", "USDC-CHF", "USDC_CHF"
    const parts = p.split(/[^A-Z]+/).filter(Boolean);
    if (parts.length >= 2) return { base: parts[0], quote: parts[1] };

    // supports: "CHFUSD", "USDCHF" (3+3)
    if (/^[A-Z]{6}$/.test(p))
      return { base: p.slice(0, 3), quote: p.slice(3, 6) };

    return null;
  };

  // 1) If backend ever provides explicit fiat amounts, use them first
  const fiatCur = upper(get(entry, "fiatCurrency"));

  const grossFiatN = toFinite(get(entry, "grossFiatAmount"));
  const feeFiatN = toFinite(get(entry, "feeFiatAmount"));
  const netFiatN = toFinite(get(entry, "netFiatAmount"));

  const hasFiatAmounts =
    fiatCur === "CHF" &&
    (grossFiatN !== null || feeFiatN !== null || netFiatN !== null);

  if (hasFiatAmounts) {
    return {
      unit: "CHF",
      gross: grossFiatN ?? 0,
      fee: feeFiatN ?? 0,
      net: netFiatN ?? 0,
      mode: "fiat" as const,
    };
  }

  // 2) CHF-first derived from fxRate/fxPair
  const fxRate = toFinite(get(entry, "fxRate"));
  const fxPair = parseFxPair(get(entry, "fxPair"));

  // normalize stablecoins to USD for FX purposes
  const curRaw = String(entry.currency ?? "").toUpperCase();
  const cur = curRaw === "USDC" || curRaw === "USDT" ? "USD" : curRaw;

  const gross = toNumber(entry.grossAmount, 0);
  const fee = toNumber(entry.feeAmount, 0);
  const net = toNumber(entry.netAmount, 0);

  // Interpret fxPair as BASE/QUOTE
  // Example you have: CHFUSD with fxRate=0.774688 => 1 CHF = 0.774688 USD
  // So USD -> CHF = USD / fxRate
  if (fxRate !== null && fxPair) {
    const hasChf = fxPair.base === "CHF" || fxPair.quote === "CHF";
    const hasCur = fxPair.base === cur || fxPair.quote === cur;

    if (hasChf && hasCur) {
      const chf =
        fxPair.base === cur && fxPair.quote === "CHF"
          ? (n: number) => n * fxRate
          : fxPair.base === "CHF" && fxPair.quote === cur
          ? (n: number) => n / fxRate
          : null;

      if (chf) {
        return {
          unit: "CHF",
          gross: chf(gross),
          fee: chf(fee),
          net: chf(net),
          mode: "fiat" as const,
        };
      }
    }
  }

  // 3) fallback: crypto axis
  return {
    unit: curRaw,
    gross,
    fee,
    net,
    mode: "crypto" as const,
  };
}

function toneForEvent(eventType?: string): Tone {
  const t = String(eventType ?? "").trim();

  switch (t) {
    case "invoice.confirmed":
      return {
        invoiceText: "text-emerald-700",
        eventBadge: "text-emerald-700 bg-emerald-50",
      };

    case "fee_charged":
      return {
        invoiceText: "text-amber-700",
        eventBadge: "text-amber-700 bg-amber-50",
      };

    case "invoice.confirmed_reversed":
      return {
        invoiceText: "text-rose-700",
        eventBadge: "text-rose-700 bg-rose-50",
      };

    case "invoice.expired":
      return {
        invoiceText: "text-orange-700",
        eventBadge: "text-orange-700 bg-orange-50",
      };

    default:
      return {
        invoiceText: "text-zinc-600",
        eventBadge: "text-zinc-600 bg-zinc-100",
      };
  }
}

export default function AccountingRow({
  entry,
}: {
  entry: AccountingEntryRaw;
}) {
  const primary = pickPrimaryMoney(entry);

  const gross = primary.gross;
  const fee = primary.fee;
  const net = primary.net;

  const cryptoGross = toNumber(entry.grossAmount, 0);
  const cryptoFee = toNumber(entry.feeAmount, 0);
  const cryptoNet = toNumber(entry.netAmount, 0);

  const showCryptoSecondary =
    primary.mode === "fiat" &&
    (cryptoGross !== 0 || cryptoFee !== 0 || cryptoNet !== 0);

  const tone = toneForEvent(entry.eventType);

  return (
    <>
      {/* Created */}
      <td className="px-4 py-2 font-mono text-xs text-zinc-500">
        {fmtDate(entry.createdAt)}
      </td>

      {/* Invoice */}
      <td className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div
            className={[
              "font-mono text-xs leading-snug break-all",
              tone.invoiceText,
            ].join(" ")}
          >
            {entry.invoiceId}
          </div>
        </div>
      </td>

      {/* Gross */}
      <td className="px-4 py-2 text-center font-mono text-xs font-medium tabular-nums text-zinc-600">
        {gross
          ? primary.unit === "CHF"
            ? `${fmtChf(gross)} CHF`
            : `${fmtMoney(gross)} ${primary.unit}`
          : "—"}
        {showCryptoSecondary ? (
          <div className="mt-1 text-[11px] text-zinc-400">
            {cryptoGross ? fmtMoney(cryptoGross) : "—"}{" "}
            {String(entry.currency ?? "").toUpperCase()}
          </div>
        ) : null}
      </td>

      {/* Fee */}
      <td className="px-4 py-2 text-center font-mono text-xs tabular-nums text-amber-700">
        {fee
          ? primary.unit === "CHF"
            ? `− ${fmtChf(fee)} CHF`
            : `− ${fmtMoney(fee)} ${primary.unit}`
          : "—"}
        {showCryptoSecondary ? (
          <div className="mt-1 text-[11px] text-zinc-400">
            {cryptoFee ? `− ${fmtMoney(cryptoFee)}` : "—"}{" "}
            {String(entry.currency ?? "").toUpperCase()}
          </div>
        ) : null}
      </td>

      {/* Net */}
      <td className="px-4 py-2 text-center font-mono text-xs font-medium tabular-nums text-zinc-800">
        {net
          ? primary.unit === "CHF"
            ? `${fmtChf(net)} CHF`
            : `${fmtMoney(net)} ${primary.unit}`
          : "—"}
        {showCryptoSecondary ? (
          <div className="mt-1 text-[11px] text-zinc-400">
            {cryptoNet ? fmtMoney(cryptoNet) : "—"}{" "}
            {String(entry.currency ?? "").toUpperCase()}
          </div>
        ) : null}
      </td>

      {/* Asset */}
      <td className="px-4 py-2 text-center">
        <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs font-medium uppercase tracking-wide text-zinc-800">
          {entry.currency}
        </span>
      </td>

      {/* Network */}
      <td className="px-4 py-2 text-center">
        <span className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-zinc-500">
          {entry.network}
        </span>
      </td>

      {/* Receipt */}
      <td className="px-3 py-2 text-right">
        <Link
          href={`/accounting/invoice?invoiceId=${encodeURIComponent(
            String(entry.invoiceId)
          )}`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
          title="Open receipt"
        >
          <ReceiptText className="h-4 w-4" />
        </Link>
      </td>
    </>
  );
}
