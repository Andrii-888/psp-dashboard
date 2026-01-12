// src/app/accounting/page.tsx

import { headers } from "next/headers";
import ErrorState from "./components/ErrorState";
import EmptyState from "./components/EmptyState";

import type {
  AccountingEntriesResponse,
  AccountingEntryRaw,
} from "./lib/types";

import AccountingHeader from "./components/AccountingHeader";
import AccountingKpis from "./components/AccountingKpis";
import AccountingFilters from "./components/AccountingFilters";
import AccountingTable from "./components/AccountingTable";

type SearchParamsValue = string | string[] | undefined;
type SearchParams = Record<string, SearchParamsValue>;

function pick(sp: SearchParams, key: string, fallback = ""): string {
  const v = sp?.[key];
  if (Array.isArray(v)) return v[0] ?? fallback;
  if (typeof v === "string") return v;
  return fallback;
}

async function getBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function fetchEntries(merchantId: string, limit: number) {
  const apiPath = `/api/psp/accounting/entries?merchantId=${encodeURIComponent(
    merchantId
  )}&limit=${encodeURIComponent(String(limit))}`;

  const baseUrl = await getBaseUrl();
  const url = new URL(apiPath, baseUrl);

  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to load accounting entries (${res.status})`);
  }

  const data = (await res.json()) as AccountingEntriesResponse;
  return { items: Array.isArray(data) ? data : [] };
}

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const merchantId = pick(sp, "merchantId", "demo-merchant");
  const limit = Math.max(
    1,
    Math.min(200, Number(pick(sp, "limit", "20")) || 20)
  );

  let items: AccountingEntryRaw[] = [];
  let errorMsg = "";

  try {
    const res = await fetchEntries(merchantId, limit);
    items = res.items;
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : "Failed to load entries";
  }

  return (
    <div className="p-6">
      <AccountingHeader
        merchantId={merchantId}
        limit={limit}
        rows={items.length}
      />
      <AccountingKpis entries={items} />
      <AccountingFilters merchantId={merchantId} limit={limit} />

      {errorMsg ? (
        <ErrorState description={errorMsg} />
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <AccountingTable entries={items} />
      )}
    </div>
  );
}
