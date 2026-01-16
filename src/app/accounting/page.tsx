// src/app/accounting/page.tsx

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import ErrorState from "./components/ErrorState";
import EmptyState from "./components/EmptyState";

import AccountingHeader from "./components/AccountingHeader";
import AccountingKpis from "./components/AccountingKpis";
import AccountingFilters from "./components/AccountingFilters";
import AccountingTableClient from "./components/AccountingTableClient";

import FeesBreakdown from "./components/FeesBreakdown";
import ByDayTable from "./components/ByDayTable";
import ByAssetTable from "./components/ByAssetTable";
import ReconciliationPanel from "./components/ReconciliationPanel";
import TotalsReconciliationPanel from "./components/TotalsReconciliationPanel";

import type { AccountingEntryRaw } from "./lib/types";

import {
  fetchEntries,
  runBackfillConfirmed,
  fetchInvoiceHistoryAsEntries,
  fetchSummary,
  fetchFeesSummary,
  fetchByDay,
  fetchByAsset,
  fetchReconciliation,
} from "./lib/api";

import type {
  SummaryResponse,
  FeesSummaryResponse,
  ByDayResponse,
  ByAssetResponse,
  ReconciliationResponse,
} from "./lib/api";

import type { SearchParams } from "./lib/searchParams";
import { pick } from "./lib/searchParams";

function mergePipelineWithLedger(
  pipeline: AccountingEntryRaw[],
  ledger: AccountingEntryRaw[]
): AccountingEntryRaw[] {
  const ledgerByInvoice = new Map<string, AccountingEntryRaw[]>();

  for (const e of ledger) {
    const id = String(e.invoiceId || "").trim();
    if (!id) continue;
    const arr = ledgerByInvoice.get(id) ?? [];
    arr.push(e);
    ledgerByInvoice.set(id, arr);
  }

  const out: AccountingEntryRaw[] = [];

  // 1) pipeline: берём только те invoiceId, которых нет в ledger
  for (const p of pipeline) {
    const id = String(p.invoiceId || "").trim();
    if (!id) continue;
    if (ledgerByInvoice.has(id)) continue;
    out.push(p);
  }

  // 2) ledger: добавляем все ledger записи
  for (const e of ledger) out.push(e);

  // сортировка по createdAt desc
  out.sort((a, b) => {
    const ta = Date.parse(String(a.createdAt ?? "")) || 0;
    const tb = Date.parse(String(b.createdAt ?? "")) || 0;
    return tb - ta;
  });

  return out;
}

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const h = await headers();

  const merchantId = pick(sp, "merchantId", "demo-merchant");

  const limit = Math.max(
    1,
    Math.min(200, Number(pick(sp, "limit", "20")) || 20)
  );

  const from = pick(sp, "from", "");
  const to = pick(sp, "to", "");

  const backfillInserted = pick(sp, "backfillInserted", "");
  const backfillError = pick(sp, "backfillError", "");

  async function onBackfill(formData: FormData) {
    "use server";

    const merchantId = String(formData.get("merchantId") ?? "");
    const limit = String(formData.get("limit") ?? "20");
    const from = String(formData.get("from") ?? "");
    const to = String(formData.get("to") ?? "");

    const qs = new URLSearchParams();
    if (merchantId) qs.set("merchantId", merchantId);
    if (limit) qs.set("limit", limit);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);

    let inserted = 0;
    let errorMsg = "";

    try {
      const h = await headers();
      const res = await runBackfillConfirmed({
        merchantId,
        headers: h,
        from,
        to,
      });

      inserted = Number(res.inserted ?? 0);
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : "Backfill failed";
    }

    if (errorMsg) {
      qs.set("backfillError", errorMsg);
      qs.delete("backfillInserted");
    } else {
      qs.set("backfillInserted", String(inserted));
      qs.delete("backfillError");
    }

    revalidatePath("/accounting");
    redirect(`/accounting?${qs.toString()}`);
  }

  let items: AccountingEntryRaw[] = [];
  let totalsItems: AccountingEntryRaw[] = [];

  let pipelineItems: AccountingEntryRaw[] = [];
  let pipelineTotalsItems: AccountingEntryRaw[] = [];

  let summary: SummaryResponse | null = null;
  let fees: FeesSummaryResponse | null = null;
  let byDay: ByDayResponse | null = null;
  let byAsset: ByAssetResponse | null = null;
  let reconciliation: ReconciliationResponse | null = null;

  let errorMsg = "";

  // IMPORTANT:
  // - items are limited for table UX (limit)
  // - totalsItems are fetched with a larger limit to avoid "Totals mismatch" caused by pagination
  const totalsLimit = 200;

  const [
    entriesRes,
    totalsEntriesRes,
    pipelineRes,
    pipelineTotalsRes,
    summaryRes,
    feesRes,
    byDayRes,
    byAssetRes,
    reconciliationRes,
  ] = await Promise.allSettled([
    // ledger (accounting_entries)
    fetchEntries({ merchantId, limit, headers: h, from, to }), // table
    fetchEntries({ merchantId, limit: totalsLimit, headers: h, from, to }), // totals

    // pipeline (invoices as accounting-like rows)
    fetchInvoiceHistoryAsEntries({ merchantId, limit, headers: h, from, to }), // table
    fetchInvoiceHistoryAsEntries({
      merchantId,
      limit: totalsLimit,
      headers: h,
      from,
      to,
    }), // totals

    // summaries
    fetchSummary({ merchantId, headers: h, from, to }),
    fetchFeesSummary({ merchantId, headers: h, from, to }),
    fetchByDay({ merchantId, headers: h, from, to }),
    fetchByAsset({ merchantId, headers: h, from, to }),
    fetchReconciliation({ merchantId, headers: h, from, to }),
  ]);

  if (entriesRes.status === "fulfilled") {
    items = entriesRes.value.items;
  } else {
    errorMsg =
      entriesRes.reason instanceof Error
        ? entriesRes.reason.message
        : "Failed to load entries";
  }

  if (totalsEntriesRes.status === "fulfilled") {
    totalsItems = totalsEntriesRes.value.items;
  } else {
    // don't break the page just because totals couldn't load
    totalsItems = [];
  }

  if (pipelineRes.status === "fulfilled") {
    pipelineItems = pipelineRes.value.items;
  } else {
    pipelineItems = [];
  }

  const ledgerRows = items.length;
  const pipelineRows = pipelineItems.length;

  if (pipelineTotalsRes.status === "fulfilled") {
    pipelineTotalsItems = pipelineTotalsRes.value.items;
  } else {
    pipelineTotalsItems = [];
  }

  // ✅ итоговые строки для таблицы и для totals-панели
  items = mergePipelineWithLedger(pipelineItems, items);
  totalsItems = mergePipelineWithLedger(pipelineTotalsItems, totalsItems);

  if (summaryRes.status === "fulfilled") summary = summaryRes.value;
  if (feesRes.status === "fulfilled") fees = feesRes.value;
  if (byDayRes.status === "fulfilled") byDay = byDayRes.value;
  if (byAssetRes.status === "fulfilled") byAsset = byAssetRes.value;
  if (reconciliationRes.status === "fulfilled")
    reconciliation = reconciliationRes.value;

  return (
    <div className="p-6">
      <AccountingHeader
        merchantId={merchantId}
        limit={limit}
        rows={items.length}
      />

      <div className="mb-3 text-xs text-zinc-500">
        ledger rows: <b>{ledgerRows}</b> · pipeline rows: <b>{pipelineRows}</b>
      </div>

      <AccountingKpis entries={items} summary={summary} currency="EUR" />

      <AccountingFilters merchantId={merchantId} limit={limit} />

      <ReconciliationPanel
        data={reconciliation}
        merchantId={merchantId}
        limit={limit}
        from={from}
        to={to}
        backfillInserted={backfillInserted}
        backfillError={backfillError}
        onBackfill={onBackfill}
      />

      <TotalsReconciliationPanel entries={totalsItems} summary={summary} />

      <FeesBreakdown fees={fees} />
      <ByDayTable data={byDay} />
      <ByAssetTable data={byAsset} />

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
