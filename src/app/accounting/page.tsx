// src/app/accounting/page.tsx

import { headers } from "next/headers";

import { backfillConfirmedAction } from "./actions/backfillConfirmed";
import AccountingStatusBanner from "./components/AccountingStatusBanner";

import AccountingFilters from "./components/AccountingFilters";
import AccountingHeader from "./components/AccountingHeader";
import AccountingKpis from "./components/AccountingKpis";
import AccountingTableClient from "./components/AccountingTableClient";
import ByAssetTable from "./components/ByAssetTable";
import ByDayTable from "./components/ByDayTable";
import EmptyState from "./components/EmptyState";
import ErrorState from "./components/ErrorState";
import FeesBreakdown from "./components/FeesBreakdown";
import ReconciliationPanel from "./components/ReconciliationPanel";
import TotalsReconciliationPanel from "./components/TotalsReconciliationPanel";

import type { AccountingEntryRaw } from "./lib/types";

import {
  fetchEntries,
  fetchInvoiceHistoryAsEntries,
  fetchSummary,
} from "./lib/api";

import { pick, type SearchParams } from "./lib/searchParams";
import {
  getErrorMessage,
  mergePipelineWithLedger,
  toFetchHeaders,
} from "./lib/serverUtils";
import { toAccountingUiModel } from "./lib/uiModel";

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

  // ✅ Next 15+: headers() is async
  const hReadonly = await headers();
  const h = toFetchHeaders(hReadonly);

  const merchantId = pick(sp, "merchantId", "demo-merchant");
  const limit = Math.max(
    1,
    Math.min(200, Number(pick(sp, "limit", "20")) || 20)
  );
  const from = pick(sp, "from", "");
  const to = pick(sp, "to", "");

  const backfillInserted = pick(sp, "backfillInserted", "");
  const backfillError = pick(sp, "backfillError", "");

  const totalsLimit = 200;

  // Table data
  let items: AccountingEntryRaw[] = [];
  let totalsItems: AccountingEntryRaw[] = [];

  // Pipeline data
  let pipelineItems: AccountingEntryRaw[] = [];
  let pipelineTotalsItems: AccountingEntryRaw[] = [];

  let summary: unknown = null;

  let errorMsg = "";

  // ✅ CHF-first (UI): allow all crypto rows, but restrict ANY fiat fields to CHF only.
  // Ledger truth is unchanged; this is presentation filtering only.
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

  // ✅ CHF-first (UI): allow all crypto rows, but restrict ANY fiat fields to CHF only.
  // Ledger truth is unchanged; this is presentation filtering only.
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

      // if any fiat is present -> strictly CHF
      return fiat === CHF && feeFiat === CHF;
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
    }), // totals
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

  // ✅ Pipeline is fallback only (ledger is SSOT)
  if (items.length === 0) {
    items = mergePipelineWithLedger(pipelineItems, items);
  }

  // ✅ Normalize + Apply CHF-only view to both ledger + pipeline fallbacks
  items = normalizeLegacyCurrencies(onlyChfFiatKeepCrypto(items));
  totalsItems = normalizeLegacyCurrencies(onlyChfFiatKeepCrypto(totalsItems));

  if (totalsItems.length === 0) {
    totalsItems = onlyChfFiatKeepCrypto(
      mergePipelineWithLedger(pipelineTotalsItems, totalsItems)
    );
  }

  // ✅ Single, clean UI contract (no casts in JSX)
  const ui = toAccountingUiModel({
    entries: items,
    totalsEntries: totalsItems,
    summary,
    merchantId,
    from,
    to,
  });

  const hasNonChf = [...items, ...totalsItems].some(
    (r) =>
      String(r.currency ?? "")
        .trim()
        .toUpperCase() !== "CHF"
  );

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-50">
      <AccountingHeader
        merchantId={merchantId}
        limit={limit}
        rows={items.length}
        hasNonChf={hasNonChf}
      />

      <AccountingFilters
        merchantId={merchantId}
        limit={limit}
        from={from}
        to={to}
      />

      <AccountingKpis entries={items} summary={ui.kpisSummary} />

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
        data={ui.reconciliation}
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
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <AccountingTableClient entries={items} />
      )}
    </div>
  );
}
