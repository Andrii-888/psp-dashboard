// src/app/accounting/page.tsx

import { headers } from "next/headers";

import { backfillConfirmedAction } from "./actions/backfillConfirmed";

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

import { fetchEntries, fetchInvoiceHistoryAsEntries } from "./lib/api";
import { pick, type SearchParams } from "./lib/searchParams";
import {
  getErrorMessage,
  mergePipelineWithLedger,
  toFetchHeaders,
} from "./lib/serverUtils";
import { toAccountingUiModel } from "./lib/uiModel";

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

  let errorMsg = "";

  const results = await Promise.allSettled([
    // ledger (accounting_entries)
    fetchEntries({ merchantId, limit, headers: h, from, to }), // table
    fetchEntries({ merchantId, limit: totalsLimit, headers: h, from, to }), // totals

    // pipeline (invoices as accounting-like rows)
    fetchInvoiceHistoryAsEntries({ limit, headers: h, from, to }), // table
    fetchInvoiceHistoryAsEntries({
      limit: totalsLimit,
      headers: h,
      from,
      to,
    }), // totals
  ] as const);

  const [entriesRes, totalsEntriesRes, pipelineRes, pipelineTotalsRes] =
    results;

  if (entriesRes.status === "fulfilled") {
    items = entriesRes.value.items;
  } else {
    errorMsg = getErrorMessage(entriesRes.reason, "Failed to load entries");
  }

  if (totalsEntriesRes.status === "fulfilled") {
    totalsItems = totalsEntriesRes.value.items;
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

  if (totalsItems.length === 0) {
    totalsItems = mergePipelineWithLedger(pipelineTotalsItems, totalsItems);
  }

  // ✅ Single, clean UI contract (no casts in JSX)
  const ui = toAccountingUiModel({
    entries: items,
    totalsEntries: totalsItems,
    merchantId,
    from,
    to,
  });

  return (
    <div className="p-6">
      <AccountingHeader
        merchantId={merchantId}
        limit={limit}
        rows={items.length}
      />

      <AccountingKpis entries={items} summary={ui.kpisSummary} />

      <AccountingFilters merchantId={merchantId} limit={limit} />

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
