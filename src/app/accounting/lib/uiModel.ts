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

type ReconciliationIssue = NonNullable<ReconciliationModel>["issues"][number];

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

function nearlyEqual(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) <= eps;
}

function summaryNumber(obj: Record<string, unknown>, key: string): number {
  return n(obj[key]);
}

function asSummaryObject(summary: unknown): Record<string, unknown> | null {
  if (!summary || typeof summary !== "object") return null;
  return summary as Record<string, unknown>;
}

function makeIssue(args: {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  meta?: unknown;
}) {
  return {
    type: args.type,
    severity: args.severity,
    message: args.message,
    createdAt: "",
    meta: args.meta,
  };
}

export function toAccountingUiModel(args: {
  entries: AccountingEntryRaw[];
  totalsEntries: AccountingEntryRaw[];
  summary?: unknown;
  merchantId: string;
  from: string;
  to: string;
}): AccountingUiModel {
  const { entries, totalsEntries, summary, merchantId, from, to } = args;

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

  const reconIssues: ReconciliationIssue[] = [];

  const summaryObj = asSummaryObject(summary);

  // If backend summary is missing, show a meaningful warning
  if (!summaryObj) {
    reconIssues.push(
      makeIssue({
        type: "summary_not_available",
        severity: "medium",
        message:
          "Backend /accounting/summary is not available. Reconciliation is based on entries only.",
      })
    );
  } else {
    const sCount = summaryNumber(summaryObj, "confirmedCount");
    const sGross = summaryNumber(summaryObj, "grossSum");
    const sFee =
      summaryNumber(summaryObj, "feeSum") ||
      summaryNumber(summaryObj, "feeFiatSum");
    const sNet = summaryNumber(summaryObj, "netSum");

    const cCount = totalsConfirmedCount;
    const cGross = totalsGrossSum;
    const cFee = totalsFeeSum;
    const cNet = totalsNetSum;

    // count mismatch
    if (sCount !== 0 && cCount !== sCount) {
      reconIssues.push(
        makeIssue({
          type: "count_mismatch",
          severity: "high",
          message: `confirmedCount mismatch: entries=${cCount}, summary=${sCount}`,
          meta: { entries: cCount, summary: sCount },
        })
      );
    }

    // gross mismatch
    if (!nearlyEqual(cGross, sGross, 1e-6)) {
      reconIssues.push(
        makeIssue({
          type: "gross_mismatch",
          severity: "critical",
          message: `grossSum mismatch: entries=${cGross}, summary=${sGross}`,
          meta: { entries: cGross, summary: sGross },
        })
      );
    }

    // fee mismatch (if summary fee is 0, treat as non-blocking)
    const feeComparable = sFee !== 0;
    if (feeComparable && !nearlyEqual(cFee, sFee, 1e-6)) {
      reconIssues.push(
        makeIssue({
          type: "fee_mismatch",
          severity: "high",
          message: `feeSum mismatch: entries=${cFee}, summary=${sFee}`,
          meta: { entries: cFee, summary: sFee },
        })
      );
    }

    // net mismatch
    if (!nearlyEqual(cNet, sNet, 1e-6)) {
      reconIssues.push(
        makeIssue({
          type: "net_mismatch",
          severity: "critical",
          message: `netSum mismatch: entries=${cNet}, summary=${sNet}`,
          meta: { entries: cNet, summary: sNet },
        })
      );
    }
  }

  const reconciliation: ReconciliationModel = {
    merchantId,
    issues: reconIssues,
    checkedAt: "",
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
