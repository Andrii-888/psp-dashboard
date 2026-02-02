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

  ui: {
    status: "ok" | "warn" | "error";
    headline: string;
    subline?: string;
  };

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

function isConfirmedReversed(e: AccountingEntryRaw): boolean {
  return String(e.eventType ?? "").trim() === "invoice.confirmed_reversed";
}

function buildReversedInvoiceIdSet(rows: AccountingEntryRaw[]): Set<string> {
  const s = new Set<string>();
  for (const r of rows ?? []) {
    if (!isConfirmedReversed(r)) continue;
    const id = String((r as { invoiceId?: unknown }).invoiceId ?? "").trim();
    if (id) s.add(id);
  }
  return s;
}

function isFinalValueMovementRow(
  e: AccountingEntryRaw,
  reversedInvoiceIds: Set<string>
): boolean {
  // fee rows — всегда считаем (они и есть деньги)
  const t = String(e.eventType ?? "").trim();
  if (t === "fee_charged") return true;

  // invoice.confirmed — считаем ТОЛЬКО если он финальный (не reversed)
  if (t === "invoice.confirmed") {
    return isFinalConfirmed(e, reversedInvoiceIds);
  }

  // invoice.confirmed_reversed — НЕ считаем (это “отмена”, и в твоих данных там 0)
  if (t === "invoice.confirmed_reversed") return false;

  // fallback: любые другие строки с движением денег (на будущее)
  return isValueMovementRow(e);
}

function isFinalConfirmed(
  e: AccountingEntryRaw,
  reversedInvoiceIds: Set<string>
): boolean {
  if (!isConfirmed(e)) return false;

  const invoiceId = typeof e.invoiceId === "string" ? e.invoiceId.trim() : "";

  // если invoiceId пустой — считаем confirmed валидным
  if (!invoiceId) return true;

  // confirmed считается финальным, только если НЕ было reversed
  return !reversedInvoiceIds.has(invoiceId);
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

function computeTotals(
  rows: AccountingEntryRaw[],
  reversedInvoiceIds: Set<string>
): {
  confirmedCount: number;
  grossSum: number;
  feeSum: number;
  netSum: number;
  feeFiatSum: number;
  feeFiatCurrency: string | null;
} {
  const all = rows ?? [];

  // ✅ confirmedCount = только финальные confirmed (без fallback)
  const confirmedCount = all.filter((e) =>
    isFinalConfirmed(e, reversedInvoiceIds)
  ).length;

  // ✅ база движения денег (confirmed финальный, fee_charged, и т.д.)
  const base = all.filter((e) =>
    isFinalValueMovementRow(e, reversedInvoiceIds)
  );

  const grossSum = base.reduce((s, e) => s + n(e.grossAmount), 0);
  const netSum = base.reduce((s, e) => s + n(e.netAmount), 0);

  // ✅ fees = только fee_charged (SSOT rule)
  const feeRows = all.filter(
    (e) => String(e.eventType ?? "").trim() === "fee_charged"
  );
  const feeSum = feeRows.reduce((s, e) => s + n(e.feeAmount), 0);

  const feeFiatSum = feeSum;
  const feeFiatCurrency = deriveFeeFiatCurrency(feeRows);

  return {
    confirmedCount,
    grossSum,
    feeSum,
    netSum,
    feeFiatSum,
    feeFiatCurrency,
  };
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

  const reversedInvoiceIds = buildReversedInvoiceIdSet([
    ...(entries ?? []),
    ...(totalsEntries ?? []),
  ]);

  const fromOrNull = from || null;
  const toOrNull = to || null;

  const entriesTotals = computeTotals(entries ?? [], reversedInvoiceIds);
  const totalsTotals = computeTotals(totalsEntries ?? [], reversedInvoiceIds);

  const kpisSummary: AccountingKpisSummary = {
    merchantId,
    from: fromOrNull,
    to: toOrNull,
    confirmedCount: entriesTotals.confirmedCount,
    grossSum: String(entriesTotals.grossSum),
    feeSum: String(entriesTotals.feeSum),
    netSum: String(entriesTotals.netSum),
    feeFiatSum: String(entriesTotals.feeFiatSum),
    feeFiatCurrency: entriesTotals.feeFiatCurrency,
  };

  const totalsSummary: TotalsSummary = {
    merchantId,
    from: fromOrNull,
    to: toOrNull,
    confirmedCount: totalsTotals.confirmedCount,
    grossSum: String(totalsTotals.grossSum),
    feeSum: String(totalsTotals.feeSum),
    netSum: String(totalsTotals.netSum),
    feeFiatSum: String(totalsTotals.feeFiatSum),
    feeFiatCurrency: totalsTotals.feeFiatCurrency,
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

    const cCount = totalsTotals.confirmedCount;
    const cGross = totalsTotals.grossSum;
    const cFee = totalsTotals.feeSum;
    const cNet = totalsTotals.netSum;

    const hasEurUsd = (totalsEntries ?? []).some(
      (e) =>
        String((e as { fxPair?: unknown }).fxPair ?? "").trim() === "EURUSD"
    );

    const metaBase = {
      scope: { merchantId, from: fromOrNull, to: toOrNull },
      rules: {
        currencyNormalization: "USDTTRC20@TRON -> USDT",
        confirmedFinality:
          "invoice.confirmed counted only if no invoice.confirmed_reversed for invoiceId",
        feeSource: ["fee_charged"],
        valueMovementBase: [
          "invoice.confirmed (final only)",
          "fee_charged",
          "fallback: rows with gross/fee/net > 0 (future-proof)",
        ],
        sourceMismatchPolicy: hasEurUsd
          ? "Ledger entries include EURUSD flows; backend summary may be computed on a different valuation scope."
          : "Summary and entries expected to match within same valuation scope.",
      },
      summaryValues: {
        confirmedCount: sCount,
        grossSum: sGross,
        feeSum: sFee,
        netSum: sNet,
      },
      computedValues: {
        confirmedCount: cCount,
        grossSum: cGross,
        feeSum: cFee,
        netSum: cNet,
      },
    };

    // count mismatch
    if (sCount !== 0 && cCount !== sCount) {
      reconIssues.push(
        makeIssue({
          type: "count_mismatch",
          severity: "high",
          message: `confirmedCount mismatch: entries=${cCount}, summary=${sCount}`,
          meta: metaBase,
        })
      );
    }

    // gross mismatch
    if (!nearlyEqual(cGross, sGross, 1e-6)) {
      const hasEurUsd =
        metaBase.rules?.sourceMismatchPolicy &&
        metaBase.rules.sourceMismatchPolicy.includes("EURUSD");

      const delta = cGross - sGross;
      const absDelta = Math.abs(delta);
      const relDelta = sGross !== 0 ? delta / sGross : null;

      // pull optional grossByCurrency from computedValues (without `any`)
      const computedValuesUnknown = (metaBase as { computedValues?: unknown })
        .computedValues;

      let grossByCurrency: Record<string, unknown> | null = null;

      if (computedValuesUnknown && typeof computedValuesUnknown === "object") {
        const cv = computedValuesUnknown as Record<string, unknown>;
        const gbc = cv.grossByCurrency ?? cv.gross_by_currency;

        if (gbc && typeof gbc === "object") {
          grossByCurrency = gbc as Record<string, unknown>;
        }
      }

      const readNumber = (v: unknown): number | null => {
        if (typeof v === "number" && Number.isFinite(v)) return v;
        if (typeof v === "string") {
          const n = Number(v);
          return Number.isFinite(n) ? n : null;
        }
        return null;
      };

      const legacyRaw =
        grossByCurrency?.USDTTRC20 ?? grossByCurrency?.USDTTRC20TRON ?? null;

      const legacyUsdttrc20Gross = readNumber(legacyRaw);

      reconIssues.push(
        makeIssue({
          type: "gross_mismatch",
          severity: hasEurUsd ? "high" : "critical",
          message: hasEurUsd
            ? `grossSum mismatch: entries=${cGross}, summary=${sGross} (ledger includes EURUSD flows)`
            : `grossSum mismatch: entries=${cGross}, summary=${sGross}`,
          meta: {
            ...metaBase,
            delta,
            absDelta,
            relDelta,
            legacy: {
              hasLegacyUsdttrc20:
                legacyUsdttrc20Gross === null
                  ? null
                  : legacyUsdttrc20Gross !== 0,
              usdttrc20Gross: legacyUsdttrc20Gross,
              note:
                grossByCurrency === null
                  ? "grossByCurrency not available in computedValues"
                  : "USDTTRC20 gross included to explain mismatch",
            },
          },
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
          meta: metaBase,
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
          meta: metaBase,
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
    entriesTotals.feeFiatCurrency === CHF
      ? [{ currency: CHF, sum: String(entriesTotals.feeFiatSum) }]
      : [];

  // ---- UI status (SSOT) ----
  const summaryAvailable = Boolean(summaryObj);

  const severityRank = (sev: unknown): number => {
    const s = String(sev ?? "").toLowerCase();
    if (s === "critical") return 4;
    if (s === "high") return 3;
    if (s === "medium") return 2;
    if (s === "low") return 1;
    return 0;
  };

  const worstSeverity = reconIssues.reduce(
    (acc, it) => Math.max(acc, severityRank(it.severity)),
    0
  );

  const worstLabel =
    worstSeverity >= 4
      ? "CRITICAL"
      : worstSeverity === 3
      ? "HIGH"
      : worstSeverity === 2
      ? "MEDIUM"
      : worstSeverity === 1
      ? "LOW"
      : "NONE";

  const hasType = (t: string) =>
    reconIssues.some((i) => String(i.type ?? "").toLowerCase() === t);

  const hint = (() => {
    if (!summaryAvailable)
      return "Backend summary not available. Operating in entries-only mode.";
    if (hasType("net_mismatch"))
      return "Net mismatch. Usually means valuation scope/filter mismatch.";
    if (hasType("gross_mismatch"))
      return "Gross mismatch. Check currency normalization / scope boundaries.";
    if (hasType("fee_mismatch"))
      return "Fee mismatch. Verify fee_charged inclusion and fee scope.";
    if (hasType("count_mismatch"))
      return "Count mismatch. Check confirmed finality and date window.";
    return "Review reconciliation issues for details.";
  })();

  const uiStatus: "ok" | "warn" | "error" = !summaryAvailable
    ? "warn"
    : worstSeverity >= 3
    ? "error"
    : worstSeverity >= 1
    ? "warn"
    : "ok";

  const uiHeadline =
    uiStatus === "ok"
      ? "System OK"
      : uiStatus === "warn"
      ? summaryAvailable
        ? "Attention required"
        : "Degraded mode"
      : "Action required";

  const uiSubline =
    reconIssues.length === 0
      ? summaryAvailable
        ? "Summary and entries are consistent for the selected period."
        : "Summary unavailable, but no issues detected in entries-only checks."
      : `Detected ${reconIssues.length} issue${
          reconIssues.length === 1 ? "" : "s"
        } (worst: ${worstLabel}). ${hint}`;

  return {
    kpisSummary,
    totalsSummary,
    fees: {
      merchantId,
      from: fromOrNull,
      to: toOrNull,
      totalFiatSum: String(entriesTotals.feeFiatSum),
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

    ui: {
      status: uiStatus,
      headline: uiHeadline,
      subline: uiSubline,
    },

    reconciliation,
  };
}
