// src/app/accounting/lib/uiModel.ts

import type { ComponentProps } from "react";
import ReconciliationPanel from "../components/ReconciliationPanel";
import type { AccountingEntryRaw } from "./types";
import type { Asset, Network } from "./types";

const CHF = "CHF";

export type AccountingKpisSummary = {
  merchantId: string;
  from: string | null;
  to: string | null;
  confirmedCount: number;
  grossSum: string;
  feeSum: string;
  netSum: string;
  feeFiatSum: string;
  feeFiatCurrency: string | null;
};

export type TotalsSummary = {
  merchantId: string;
  from: string | null;
  to: string | null;
  confirmedCount: number;
  grossSum: string;
  feeSum: string;
  netSum: string;
  feeFiatSum: string;
  feeFiatCurrency: string | null;
};

export type FeesModel = {
  merchantId: string;
  from: string | null;
  to: string | null;
  totalFiatSum: string;
  feesByCurrency: Array<{ currency: string; sum: string }>;
};

export type ByDayModel = {
  merchantId: string;
  from: string | null;
  to: string | null;
  rows: Array<{
    day: string;
    confirmedCount: number;
    grossSum: string;
    feeSum: string;
    netSum: string;
    feeFiatTotal: string;
  }>;
};

export type ByAssetModel = {
  merchantId: string;
  from: string | null;
  to: string | null;
  rows: Array<{
    currency: Asset;
    network: Network;
    confirmedCount: number;
    grossSum: string;
    feeSum: string;
    netSum: string;
  }>;
};

export type ReconciliationModel = ComponentProps<
  typeof ReconciliationPanel
>["data"];

export type AccountingUiModel = {
  kpisSummary: AccountingKpisSummary;
  fees: FeesModel;
  byDay: ByDayModel;
  byAsset: ByAssetModel;
  reconciliation: ReconciliationModel;
  totalsSummary: TotalsSummary;
};

function n(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  }
  return 0;
}

/**
 * PSP-grade UI rule (v0):
 * - Primary: confirmedCount counts `invoice.confirmed`
 * - Fallback (when ledger uses different eventTypes): count rows that look like finalized value movement:
 *   grossAmount > 0 OR netAmount > 0 OR feeAmount > 0
 *
 * This keeps UI useful while backend event taxonomy evolves.
 * Later (Day 0/Day 3), we will lock the exact ledger event types and remove fallbacks.
 */
function isValueMovementRow(e: AccountingEntryRaw): boolean {
  const g = n(e.grossAmount);
  const f = n(e.feeAmount);
  const net = n(e.netAmount);
  return g > 0 || f > 0 || net > 0;
}

function isConfirmed(e: AccountingEntryRaw): boolean {
  return String(e.eventType ?? "").trim() === "invoice.confirmed";
}

/**
 * CHF-first normalization:
 * If all feeFiatCurrency values are CHF (or missing), show CHF.
 * Otherwise show MIXED.
 */
function deriveFeeFiatCurrency(rows: AccountingEntryRaw[]): string | null {
  if (!rows || rows.length === 0) return CHF;

  const currencies = new Set<string>();
  for (const r of rows) {
    const c = String(r.feeFiatCurrency ?? "")
      .trim()
      .toUpperCase();
    if (!c) continue;
    currencies.add(c);
  }

  // no explicit currencies -> CHF (v1)
  if (currencies.size === 0) return CHF;

  // strictly CHF -> CHF, otherwise MIXED
  return currencies.size === 1 && currencies.has(CHF) ? CHF : "MIXED";
}

export function toAccountingUiModel(args: {
  entries: AccountingEntryRaw[];
  totalsEntries: AccountingEntryRaw[];
  merchantId: string;
  from: string;
  to: string;
}): AccountingUiModel {
  const { entries, totalsEntries, merchantId, from, to } = args;

  const fromOrNull = from || null;
  const toOrNull = to || null;

  const confirmed = entries.filter(isConfirmed);
  const confirmedCount =
    confirmed.length > 0
      ? confirmed.length
      : entries.filter(isValueMovementRow).length;

  // PSP-grade sums (v0): sum across value-movement rows
  const sumBase = entries.filter(isValueMovementRow);

  const grossSum = sumBase.reduce((s, e) => s + n(e.grossAmount), 0);
  const feeSum = sumBase.reduce((s, e) => s + n(e.feeAmount), 0);
  const netSum = sumBase.reduce((s, e) => s + n(e.netAmount), 0);

  // ✅ Fee fiat (CHF-first): in v1 feeFiatSum == sum(feeAmount) for rows (entries already in CHF)
  const feeFiatSum = feeSum;
  const feeFiatCurrency = deriveFeeFiatCurrency(sumBase);

  const kpisSummary: AccountingKpisSummary = {
    merchantId,
    from: fromOrNull,
    to: toOrNull,
    confirmedCount,
    grossSum: String(grossSum),
    feeSum: String(feeSum),
    netSum: String(netSum),
    feeFiatSum: String(feeFiatSum),
    feeFiatCurrency,
  };

  const confirmedTotals = totalsEntries.filter(isConfirmed);
  const totalsConfirmedCount =
    confirmedTotals.length > 0
      ? confirmedTotals.length
      : totalsEntries.filter(isValueMovementRow).length;

  const totalsBase = totalsEntries.filter(isValueMovementRow);

  const totalsGrossSum = totalsBase.reduce((s, e) => s + n(e.grossAmount), 0);
  const totalsFeeSum = totalsBase.reduce((s, e) => s + n(e.feeAmount), 0);
  const totalsNetSum = totalsBase.reduce((s, e) => s + n(e.netAmount), 0);

  const totalsFeeFiatSum = totalsFeeSum;
  const totalsFeeFiatCurrency = deriveFeeFiatCurrency(totalsBase);

  const totalsSummary: TotalsSummary = {
    merchantId,
    from: fromOrNull,
    to: toOrNull,
    confirmedCount: totalsConfirmedCount,
    grossSum: String(totalsGrossSum),
    feeSum: String(totalsFeeSum),
    netSum: String(totalsNetSum),
    feeFiatSum: String(totalsFeeFiatSum),
    feeFiatCurrency: totalsFeeFiatCurrency,
  };

  const reconciliation: ReconciliationModel = {
    merchantId,
    issues: [],
    checkedAt: new Date().toISOString(),
  };

  const feesByCurrency =
    feeFiatCurrency === CHF ? [{ currency: CHF, sum: String(feeFiatSum) }] : [];

  return {
    kpisSummary,
    totalsSummary,
    fees: {
      merchantId,
      from: fromOrNull,
      to: toOrNull,
      totalFiatSum: String(feeFiatSum),
      feesByCurrency,
    },
    byDay: {
      merchantId,
      from: fromOrNull,
      to: toOrNull,
      rows: [],
    },
    byAsset: {
      merchantId,
      from: fromOrNull,
      to: toOrNull,
      rows: [],
    },
    reconciliation,
  };
}
