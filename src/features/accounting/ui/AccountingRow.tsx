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

  // 1) fiatAmount from backend (single gross fiat value, Phase 2 write after decision)
  //    Backend stores: fiat_amount = grossFiat, fiat_currency = CHF, fx_rate = locked rate
  const fiatCur = upper(get(entry, "fiatCurrency"));
  const fiatAmountN = toFinite(get(entry, "fiatAmount"));
  const fxRate = toFinite(get(entry, "fxRate"));

  const curRaw = String(entry.currency ?? "").toUpperCase();
  const cryptoCur = String(entry.cryptoCurrency ?? curRaw).toUpperCase();

  const cryptoGross = toFinite(get(entry, "cryptoGrossAmount")) ?? toNumber(entry.grossAmount, 0);
  const cryptoFee   = toFinite(get(entry, "cryptoFeeAmount"))   ?? toNumber(entry.feeAmount, 0);
  const cryptoNet   = toFinite(get(entry, "cryptoNetAmount"))    ?? toNumber(entry.netAmount, 0);

  // Case A: backend provides fiatAmount directly (new entries after our fix)
  if (fiatCur === "CHF" && fiatAmountN !== null && fiatAmountN > 0) {
    const feeBps = toFinite(get(entry, "feeBps")) ?? 100;
    const grossFiat = fiatAmountN;
    const feeFiat   = Math.round((grossFiat * feeBps) / 10000 * 100) / 100;
    const netFiat   = Math.round((grossFiat - feeFiat) * 100) / 100;
    return {
      unit: "CHF",
      gross: grossFiat,
      fee: feeFiat,
      net: netFiat,
      cryptoGross,
      cryptoCur,
      mode: "fiat" as const,
    };
  }

  // Case B: derive CHF from fxRate (USDT->CHF: cryptoAmount * fxRate)
  // fxPair = "USDT->CHF" means 1 USDT = fxRate CHF
  if (fxRate !== null && fxRate > 0 && cryptoGross > 0) {
    const fxPairRaw = String(get(entry, "fxPair") ?? "").toUpperCase();
    // "USDT->CHF" or "USDC->CHF": crypto * rate = CHF
    const isCryptoToChf = fxPairRaw.endsWith("->CHF") || fxPairRaw.endsWith("/CHF");
    if (isCryptoToChf) {
      const grossFiat = Math.round(cryptoGross * fxRate * 100) / 100;
      const feeFiat   = Math.round(cryptoFee   * fxRate * 100) / 100;
      const netFiat   = Math.round(cryptoNet   * fxRate * 100) / 100;
      return {
        unit: "CHF",
        gross: grossFiat,
        fee: feeFiat,
        net: netFiat,
        cryptoGross,
        cryptoCur,
        mode: "fiat" as const,
      };
    }
  }

  // Case C: currency IS CHF (old entries stored in CHF directly)
  if (curRaw === "CHF") {
    const gross = toNumber(entry.grossAmount, 0);
    const fee   = toNumber(entry.feeAmount, 0);
    const net   = toNumber(entry.netAmount, 0);
    return {
      unit: "CHF",
      gross,
      fee,
      net,
      cryptoGross: cryptoCur !== "CHF" ? cryptoGross : 0,
      cryptoCur,
      mode: "fiat" as const,
    };
  }

  // Case D: fallback — crypto only (no fiat data available)
  return {
    unit: cryptoCur || curRaw,
    gross: cryptoGross,
    fee: cryptoFee,
    net: cryptoNet,
    cryptoGross: 0,
    cryptoCur,
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

  // Use crypto values from primary (already resolved)
  const cryptoGross = primary.cryptoGross ?? 0;
  const cryptoFee = toNumber(entry.cryptoFeeAmount ?? entry.feeAmount, 0);
  const cryptoNet = toNumber(entry.cryptoNetAmount ?? entry.netAmount, 0);
  const cryptoCurLabel = primary.cryptoCur ?? String(entry.cryptoCurrency ?? entry.currency ?? "").toUpperCase();

  // Show crypto secondary line only when primary is fiat AND crypto values exist
  const showCryptoSecondary =
    primary.mode === "fiat" && (cryptoGross !== 0 || cryptoFee !== 0 || cryptoNet !== 0);
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
        <div>
          {gross
            ? primary.unit === "CHF"
              ? `${fmtChf(gross)} CHF`
              : `${fmtMoney(gross)} ${primary.unit}`
            : "—"}
        </div>
        {showCryptoSecondary && cryptoGross !== 0 && (
          <div className="mt-1 text-[11px] text-zinc-400">
            {fmtMoney(cryptoGross)}{" "}
            {cryptoCurLabel}
          </div>
        )}
      </td>

      {/* Fee */}
      <td className="px-4 py-2 text-center font-mono text-xs tabular-nums text-amber-700">
        <div>
          {fee
            ? primary.unit === "CHF"
              ? `− ${fmtChf(fee)} CHF`
              : `− ${fmtMoney(fee)} ${primary.unit}`
            : "—"}
        </div>
        {showCryptoSecondary && cryptoFee !== 0 && (
          <div className="mt-1 text-[11px] text-zinc-400">
            − {fmtMoney(cryptoFee)}{" "}
            {cryptoCurLabel}
          </div>
        )}
      </td>

      {/* Net */}
      <td className="px-4 py-2 text-center font-mono text-xs font-medium tabular-nums text-zinc-800">
        <div>
          {net
            ? primary.unit === "CHF"
              ? `${fmtChf(net)} CHF`
              : `${fmtMoney(net)} ${primary.unit}`
            : "—"}
        </div>
        {showCryptoSecondary && cryptoNet !== 0 && (
          <div className="mt-1 text-[11px] text-zinc-400">
            {fmtMoney(cryptoNet)}{" "}
            {cryptoCurLabel}
          </div>
        )}
      </td>

      {/* Asset */}
      <td className="px-4 py-2 text-center">
        <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs font-medium uppercase tracking-wide text-zinc-800">
          {entry.cryptoCurrency ?? entry.currency}
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
