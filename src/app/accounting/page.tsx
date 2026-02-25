// src/app/accounting/page.tsx

import { headers } from "next/headers";

import { backfillConfirmedAction } from "@/features/accounting/actions/backfillConfirmed";
import AccountingStatusBanner from "@/features/accounting/ui/AccountingStatusBanner";

import AccountingFilters from "@/features/accounting/ui/AccountingFilters";
import AccountingHeader from "@/features/accounting/ui/AccountingHeader";
import AccountingKpis from "@/features/accounting/ui/AccountingKpis";
import AccountingTableClient from "@/features/accounting/ui/AccountingTableClient";
import ByAssetTable from "@/features/accounting/ui/ByAssetTable";
import ByDayTable from "@/features/accounting/ui/ByDayTable";
import EmptyState from "@/features/accounting/ui/EmptyState";
import ErrorState from "@/features/accounting/ui/ErrorState";
import FeesBreakdown from "@/features/accounting/ui/FeesBreakdown";
import ReconciliationPanel from "@/features/accounting/ui/ReconciliationPanel";
import TotalsReconciliationPanel from "@/features/accounting/ui/TotalsReconciliationPanel";
import type { AccountingEntryRaw } from "@/features/accounting/lib/types";
import SystemStatusCard from "@/features/accounting/ui/SystemStatusCard";
import AccountingPolicyCard from "@/features/accounting/ui/AccountingPolicyCard";

import {
  fetchEntries,
  fetchInvoiceHistoryAsEntries,
  fetchSummary,
} from "@/features/accounting/lib/api";

import {
  pick,
  type SearchParams,
} from "@/features/accounting/lib/searchParams";

import {
  getErrorMessage,
  mergePipelineWithLedger,
  toFetchHeaders,
} from "@/features/accounting/lib/serverUtils";

import { toAccountingUiModel } from "@/features/accounting/lib/uiModel";

// ✅ Normalize legacy currency labels so UI + backend summary use the same taxonomy.
// Today: entries may contain "USDTTRC20" (legacy) but backend summary counts it as "USDT".
function normalizeLegacyCurrencies(
  rows: AccountingEntryRaw[]
): AccountingEntryRaw[] {
  return (rows ?? []).map((r) => {
    const cur = String((r as { currency?: unknown }).currency ?? "").trim();
    const net = String((r as { network?: unknown }).network ?? "").trim();

    // ✅ legacy: USDTTRC20 on TRON -> normalize to USDT
    if (cur === "USDTTRC20" && net === "TRON") {
      return { ...r, currency: "USDT" as AccountingEntryRaw["currency"] };
    }

    return r;
  });
}

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const hReadonly = await headers();
  const h = toFetchHeaders(hReadonly);

  const merchantId = pick(sp, "merchantId", "demo-merchant");
  const DEFAULT_TABLE_LIMIT = 20;
  const MAX_TABLE_LIMIT = 500;

  const limit = Math.max(
    1,
    Math.min(
      MAX_TABLE_LIMIT,
      Number(pick(sp, "limit", String(DEFAULT_TABLE_LIMIT))) ||
        DEFAULT_TABLE_LIMIT
    )
  );
  const from = pick(sp, "from", "");
  const to = pick(sp, "to", "");

  const backfillInserted = pick(sp, "backfillInserted", "");
  const backfillError = pick(sp, "backfillError", "");

  const totalsLimit = 200;

  const mode = pick(sp, "mode", "");
  const allowPipeline = mode === "pipeline";

  const POSTED_EVENT_TYPES = new Set([
    "invoice.confirmed",
    "fee_charged",
    "invoice.confirmed_reversed",
  ]);

  const keepPostedOnly = (rows: AccountingEntryRaw[]): AccountingEntryRaw[] =>
    (rows ?? []).filter((r) =>
      POSTED_EVENT_TYPES.has(String(r.eventType ?? "").trim())
    );

  // Table data
  let items: AccountingEntryRaw[] = [];
  let totalsItems: AccountingEntryRaw[] = [];

  // Pipeline data
  let pipelineItems: AccountingEntryRaw[] = [];
  let pipelineTotalsItems: AccountingEntryRaw[] = [];

  let summary: unknown = null;

  let errorMsg = "";

  const CHF = "CHF";

  type WithFiatFields = {
    fiatCurrency?: string | null;
    feeFiatCurrency?: string | null;
  };

  const hasFiatFields = (
    r: AccountingEntryRaw
  ): r is AccountingEntryRaw & WithFiatFields => {
    return "fiatCurrency" in r || "feeFiatCurrency" in r;
  };

  const onlyChfFiatKeepCrypto = (
    rows: AccountingEntryRaw[]
  ): AccountingEntryRaw[] =>
    (rows ?? []).filter((r) => {
      if (!hasFiatFields(r)) {
        // crypto rows (no fiat fields at all)
        return true;
      }

      const fiat = String(r.fiatCurrency ?? "")
        .trim()
        .toUpperCase();
      const feeFiat = String(r.feeFiatCurrency ?? "")
        .trim()
        .toUpperCase();

      return fiat === CHF && feeFiat === CHF;
    });

  const hasNonChfFiat = (rows: AccountingEntryRaw[]): boolean =>
    (rows ?? []).some((r) => {
      if (!hasFiatFields(r)) return false;

      const fiat = String(r.fiatCurrency ?? "")
        .trim()
        .toUpperCase();
      const feeFiat = String(r.feeFiatCurrency ?? "")
        .trim()
        .toUpperCase();

      const fiatNonChf = fiat !== "" && fiat !== CHF;
      const feeFiatNonChf = feeFiat !== "" && feeFiat !== CHF;

      return fiatNonChf || feeFiatNonChf;
    });

  const results = await Promise.allSettled([
    // ledger (accounting_entries)
    fetchEntries({ merchantId, limit, headers: h, from, to }), // table
    fetchEntries({ merchantId, limit: totalsLimit, headers: h, from, to }), // totals

    fetchSummary({ merchantId, headers: h, from, to }),

    // pipeline (invoices as accounting-like rows)
    fetchInvoiceHistoryAsEntries({ limit, headers: h, from, to }), // table
    fetchInvoiceHistoryAsEntries({
      limit: totalsLimit,
      headers: h,
      from,
      to,
    }),
  ] as const);

  const [
    entriesRes,
    totalsEntriesRes,
    summaryRes,
    pipelineRes,
    pipelineTotalsRes,
  ] = results;

  if (entriesRes.status === "fulfilled") {
    items = entriesRes.value.items;
  } else {
    errorMsg = getErrorMessage(entriesRes.reason, "Failed to load entries");
  }

  if (totalsEntriesRes.status === "fulfilled") {
    totalsItems = totalsEntriesRes.value.items;
  }

  if (summaryRes.status === "fulfilled") {
    summary = summaryRes.value.summary;
  }

  if (pipelineRes.status === "fulfilled") {
    pipelineItems = pipelineRes.value.items;
  }

  if (pipelineTotalsRes.status === "fulfilled") {
    pipelineTotalsItems = pipelineTotalsRes.value.items;
  }

  // ✅ Posted-only filter (ledger + pipeline)
  items = keepPostedOnly(items);
  totalsItems = keepPostedOnly(totalsItems);
  pipelineItems = keepPostedOnly(pipelineItems);
  pipelineTotalsItems = keepPostedOnly(pipelineTotalsItems);

  // ✅ Pipeline is fallback only (ledger is SSOT) — allowed only in debug mode
  if (allowPipeline && items.length === 0) {
    items = mergePipelineWithLedger(pipelineItems, items);
  }

  const hasHiddenNonChfFiat =
    hasNonChfFiat(items) || hasNonChfFiat(totalsItems);

  // ✅ Normalize + Apply CHF-only view to both ledger + pipeline fallbacks
  items = normalizeLegacyCurrencies(onlyChfFiatKeepCrypto(items));
  totalsItems = normalizeLegacyCurrencies(onlyChfFiatKeepCrypto(totalsItems));

  if (allowPipeline && totalsItems.length === 0) {
    totalsItems = onlyChfFiatKeepCrypto(
      mergePipelineWithLedger(pipelineTotalsItems, totalsItems)
    );
  }

  // ✅ Ensure newest entries are visible first (operator UX)
  const sortByCreatedAtDesc = (
    rows: AccountingEntryRaw[]
  ): AccountingEntryRaw[] =>
    [...(rows ?? [])].sort((a, b) => {
      const at = Date.parse(String(a.createdAt ?? ""));
      const bt = Date.parse(String(b.createdAt ?? ""));
      return (Number.isFinite(bt) ? bt : 0) - (Number.isFinite(at) ? at : 0);
    });

  items = sortByCreatedAtDesc(items);
  totalsItems = sortByCreatedAtDesc(totalsItems);

  // ✅ Table UX: 1 invoice = 1 row (show only finalized value-movement rows)
  const tableItems = items.filter(
    (r) => String(r.eventType ?? "").trim() === "invoice.confirmed"
  );

  // ✅ Single, clean UI contract (no casts in JSX)
  const ui = toAccountingUiModel({
    entries: items,
    totalsEntries: totalsItems,
    summary,
    merchantId,
    from,
    to,
  });

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-50">
      <AccountingHeader
        merchantId={merchantId}
        limit={limit}
        rows={tableItems.length}
        hasNonChf={hasHiddenNonChfFiat}
      />

      <AccountingFilters
        merchantId={merchantId}
        limit={limit}
        from={from}
        to={to}
      />

      <SystemStatusCard
        status={ui.ui.status}
        headline={ui.ui.headline}
        subline={ui.ui.subline}
        checkedAt={ui.ui.checkedAt}
        primaryAction={ui.guidedActions[0]}
      />

      <AccountingPolicyCard
        totalsLimit={totalsLimit}
        tableLimit={limit}
        allowPipeline={allowPipeline}
      />

      <AccountingKpis entries={totalsItems} summary={ui.kpisSummary} />

      <AccountingStatusBanner
        merchantId={merchantId}
        from={from}
        to={to}
        limit={limit}
        ui={ui.ui}
        backfillInserted={backfillInserted}
        backfillError={backfillError}
      />

      <ReconciliationPanel
        data={
          ui.reconciliation
            ? { ...ui.reconciliation, issues: [...ui.reconciliation.issues] }
            : null
        }
        merchantId={merchantId}
        limit={limit}
        from={from}
        to={to}
        backfillInserted={backfillInserted}
        backfillError={backfillError}
        onBackfill={backfillConfirmedAction}
      />

      <TotalsReconciliationPanel
        entries={totalsItems}
        summary={ui.totalsSummary}
      />

      <FeesBreakdown fees={ui.fees} />
      <ByDayTable data={ui.byDay} />
      <ByAssetTable data={ui.byAsset} />

      {errorMsg ? (
        <ErrorState description={errorMsg} />
      ) : tableItems.length === 0 ? (
        <EmptyState />
      ) : (
        <AccountingTableClient entries={tableItems} />
      )}
    </div>
  );
}
