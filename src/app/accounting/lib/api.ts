// src/app/accounting/lib/api.ts

/**
 * Accounting data access for the Accounting page.
 *
 * ✅ SSOT rules:
 * - Network transport lives ONLY in src/lib/pspApi.ts
 * - Dashboard never calls psp-core directly (only through /api/psp proxy)
 * - Accounting UI is derived from ledger entries + invoices pipeline
 */

import type { AccountingEntryRaw } from "./types";
import { invoicesToAccountingEntries } from "./fromInvoices";

import {
  fetchInvoices,
  fetchAccountingEntries,
  runBackfillConfirmed as pspRunBackfillConfirmed,
  type BackfillConfirmedResponse,
} from "@/lib/pspApi";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function extractEntryItems(data: unknown): AccountingEntryRaw[] {
  // Supports multiple formats (array / { items } / { rows })
  if (Array.isArray(data)) return data as AccountingEntryRaw[];

  if (isRecord(data)) {
    const rows = data.rows;
    if (Array.isArray(rows)) return rows as AccountingEntryRaw[];

    const items = data.items;
    if (Array.isArray(items)) return items as AccountingEntryRaw[];
  }

  return [];
}

/**
 * Ledger entries (accounting_entries) from psp-core via /api/psp proxy.
 * This is the "ground truth" ledger if it exists.
 */
export async function fetchEntries(params: {
  merchantId: string;
  limit: number;
  headers: Headers;
  from?: string;
  to?: string;
}): Promise<{ items: AccountingEntryRaw[] }> {
  const data = await fetchAccountingEntries({
    merchantId: params.merchantId,
    limit: params.limit,
    headers: params.headers,
    from: params.from,
    to: params.to,
  });

  return { items: extractEntryItems(data) };
}

/**
 * Pipeline entries (derived from invoices list).
 * Used to show Accounting data even if ledger is empty/not backfilled yet.
 *
 * ✅ Invoices fetched ONLY via SSOT client: src/lib/pspApi.ts
 */
export async function fetchInvoiceHistoryAsEntries(params: {
  merchantId?: string; // optional: invoices are already scoped by headers in proxy/core
  limit: number;
  headers: Headers;
  from?: string;
  to?: string;
}): Promise<{ items: AccountingEntryRaw[] }> {
  const { limit, from, to } = params;

  const res = await fetchInvoices(
    { limit, offset: 0, from, to },
    { forwardHeaders: params.headers }
  );

  const invoices = Array.isArray(res.items) ? res.items : [];
  const items = invoicesToAccountingEntries(invoices);

  return { items };
}

/**
 * Manual repair action: backfill confirmed entries into ledger.
 * Goes through /api/psp proxy (server-safe call with forwarded auth headers).
 */
export async function runBackfillConfirmed(params: {
  merchantId: string;
  headers: Headers;
  from?: string;
  to?: string;
}): Promise<BackfillConfirmedResponse> {
  return pspRunBackfillConfirmed({
    merchantId: params.merchantId,
    headers: params.headers,
    from: params.from,
    to: params.to,
  });
}
