// src/app/accounting/page.tsx

import { headers } from "next/headers";
import Link from "next/link";

import type { SearchParams } from "./lib/searchParams";
import { pick } from "./lib/searchParams";

import {
  fetchEntries,
  fetchInvoiceHistoryAsEntries,
  fetchSummary,
} from "./lib/api";

import type { AccountingEntryRaw } from "./lib/types";
import type { SummaryResponse } from "./lib/api";

function safeJson(obj: unknown) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function small(v: unknown) {
  const s = String(v ?? "");
  return s.length > 80 ? s.slice(0, 77) + "..." : s;
}

function isConfirmed(e: AccountingEntryRaw) {
  return String(e.eventType ?? "").trim() === "invoice.confirmed";
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
    Math.min(200, Number(pick(sp, "limit", "50")) || 50)
  );

  const from = pick(sp, "from", "");
  const to = pick(sp, "to", "");

  // Fetch only the essentials for debugging
  const [ledgerRes, pipelineRes, summaryRes] = await Promise.allSettled([
    fetchEntries({ merchantId, limit, headers: h, from, to }),
    fetchInvoiceHistoryAsEntries({ merchantId, limit, headers: h, from, to }),
    fetchSummary({ merchantId, headers: h, from, to }),
  ]);

  const ledgerItems =
    ledgerRes.status === "fulfilled" ? ledgerRes.value.items : [];
  const pipelineItems =
    pipelineRes.status === "fulfilled" ? pipelineRes.value.items : [];
  const summary: SummaryResponse | null =
    summaryRes.status === "fulfilled" ? summaryRes.value : null;

  const confirmedLedger = ledgerItems.filter(isConfirmed);

  const errLedger =
    ledgerRes.status === "rejected"
      ? ledgerRes.reason instanceof Error
        ? ledgerRes.reason.message
        : "Failed to load ledger entries"
      : "";

  const errPipeline =
    pipelineRes.status === "rejected"
      ? pipelineRes.reason instanceof Error
        ? pipelineRes.reason.message
        : "Failed to load pipeline entries"
      : "";

  const errSummary =
    summaryRes.status === "rejected"
      ? summaryRes.reason instanceof Error
        ? summaryRes.reason.message
        : "Failed to load summary"
      : "";

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold text-zinc-900">
            Accounting (Debug)
          </div>
          <div className="mt-1 text-sm text-zinc-600">
            merchantId: <span className="font-mono">{merchantId}</span> · limit:{" "}
            <span className="font-mono">{limit}</span>
            {from ? (
              <>
                {" "}
                · from: <span className="font-mono">{from}</span>
              </>
            ) : null}
            {to ? (
              <>
                {" "}
                · to: <span className="font-mono">{to}</span>
              </>
            ) : null}
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            Goal: show raw API payloads only (no UI computations), then rebuild
            top-grade accounting UI on top.
          </div>
        </div>

        <Link
          href="/"
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
        >
          ← Back to invoices
        </Link>
      </div>

      {/* Summary */}
      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 p-4">
          <div className="text-sm font-semibold text-zinc-900">
            /accounting/summary (raw)
          </div>
          {errSummary ? (
            <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {errSummary}
            </div>
          ) : null}
        </div>

        <div className="p-4">
          <pre className="max-h-96 overflow-auto rounded-xl bg-zinc-950 p-4 text-xs text-zinc-100">
            {safeJson(summary)}
          </pre>
        </div>
      </div>

      {/* Counts */}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">
            Ledger rows (entries)
          </div>
          <div className="mt-2 text-2xl font-semibold text-zinc-900">
            {ledgerItems.length}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">
            Ledger confirmed rows
          </div>
          <div className="mt-2 text-2xl font-semibold text-zinc-900">
            {confirmedLedger.length}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">
            Pipeline rows (invoices-as-rows)
          </div>
          <div className="mt-2 text-2xl font-semibold text-zinc-900">
            {pipelineItems.length}
          </div>
        </div>
      </div>

      {/* Ledger table */}
      <div className="mt-4 rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 p-4">
          <div className="text-sm font-semibold text-zinc-900">
            /accounting/entries (ledger) — raw rows
          </div>
          <div className="mt-1 text-xs text-zinc-600">
            Shows exactly what API returns. Confirmed rows are highlighted.
          </div>
          {errLedger ? (
            <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {errLedger}
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto p-4">
          <table className="w-full min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-zinc-500">
              <tr className="border-b border-zinc-200">
                <th className="py-2 pr-4">createdAt</th>
                <th className="py-2 pr-4">eventType</th>
                <th className="py-2 pr-4">invoiceId</th>
                <th className="py-2 pr-4">gross</th>
                <th className="py-2 pr-4">fee</th>
                <th className="py-2 pr-4">net</th>
                <th className="py-2 pr-4">currency</th>
                <th className="py-2 pr-2">txHash</th>
              </tr>
            </thead>
            <tbody className="text-zinc-900">
              {ledgerItems.map((e, idx) => {
                const confirmed = isConfirmed(e);
                return (
                  <tr
                    key={`${e.invoiceId}-${e.eventType}-${idx}`}
                    className={
                      confirmed
                        ? "border-b border-zinc-100 bg-emerald-50"
                        : "border-b border-zinc-100"
                    }
                  >
                    <td className="py-2 pr-4 font-mono text-xs">
                      {small(e.createdAt)}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {small(e.eventType)}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {small(e.invoiceId)}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {small(e.grossAmount)}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {small(e.feeAmount)}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {small(e.netAmount)}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {small(e.currency)}
                    </td>
                    <td className="py-2 pr-2 font-mono text-xs">
                      {small(e.txHash)}
                    </td>
                  </tr>
                );
              })}

              {!ledgerItems.length ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-6 text-center text-sm text-zinc-500"
                  >
                    No ledger rows returned.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pipeline table */}
      <div className="mt-4 rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 p-4">
          <div className="text-sm font-semibold text-zinc-900">
            invoices-as-entries (pipeline) — raw rows
          </div>
          <div className="mt-1 text-xs text-zinc-600">
            This is NOT accounting truth. It’s operational invoice history.
          </div>
          {errPipeline ? (
            <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {errPipeline}
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto p-4">
          <table className="w-full min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-zinc-500">
              <tr className="border-b border-zinc-200">
                <th className="py-2 pr-4">createdAt</th>
                <th className="py-2 pr-4">status/event</th>
                <th className="py-2 pr-4">invoiceId</th>
                <th className="py-2 pr-4">gross</th>
                <th className="py-2 pr-4">fee</th>
                <th className="py-2 pr-4">net</th>
                <th className="py-2 pr-4">currency</th>
              </tr>
            </thead>
            <tbody className="text-zinc-900">
              {pipelineItems.map((e, idx) => (
                <tr
                  key={`${e.invoiceId}-${e.eventType}-${idx}`}
                  className="border-b border-zinc-100"
                >
                  <td className="py-2 pr-4 font-mono text-xs">
                    {small(e.createdAt)}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {small(e.eventType)}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {small(e.invoiceId)}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {small(e.grossAmount)}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {small(e.feeAmount)}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {small(e.netAmount)}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {small(e.currency)}
                  </td>
                </tr>
              ))}

              {!pipelineItems.length ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-6 text-center text-sm text-zinc-500"
                  >
                    No pipeline rows returned.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
