// src/app/accounting/lib/uiModel.ts

import type { ComponentProps } from "react";
import ReconciliationPanel from "../components/ReconciliationPanel";
import type { AccountingEntryRaw } from "./types";
import type { Asset, Network } from "./types";

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

  const confirmed = entries.filter((e) => e.eventType === "invoice.confirmed");

  const confirmedCount = confirmed.length;
  const grossSum = confirmed.reduce((s, e) => s + n(e.grossAmount), 0);
  const feeSum = confirmed.reduce((s, e) => s + n(e.feeAmount), 0);
  const netSum = confirmed.reduce((s, e) => s + n(e.netAmount), 0);

  const kpisSummary: AccountingKpisSummary = {
    merchantId,
    from: fromOrNull,
    to: toOrNull,
    confirmedCount,
    grossSum: String(grossSum),
    feeSum: String(feeSum),
    netSum: String(netSum),
    feeFiatSum: "0",
    feeFiatCurrency: null,
  };

  const confirmedTotals = totalsEntries.filter(
    (e) => e.eventType === "invoice.confirmed"
  );

  const totalsSummary: TotalsSummary = {
    merchantId,
    from: fromOrNull,
    to: toOrNull,
    confirmedCount: confirmedTotals.length,
    grossSum: String(confirmedTotals.reduce((s, e) => s + n(e.grossAmount), 0)),
    feeSum: String(confirmedTotals.reduce((s, e) => s + n(e.feeAmount), 0)),
    netSum: String(confirmedTotals.reduce((s, e) => s + n(e.netAmount), 0)),
    feeFiatSum: "0",
    feeFiatCurrency: null,
  };

  const reconciliation: ReconciliationModel = {
    merchantId,
    issues: [],
    checkedAt: new Date().toISOString(),
  };

  return {
    kpisSummary,
    totalsSummary,
    fees: {
      merchantId,
      from: fromOrNull,
      to: toOrNull,
      totalFiatSum: "0",
      feesByCurrency: [],
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
