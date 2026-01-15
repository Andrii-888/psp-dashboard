// src/app/accounting/lib/api.ts

import type { AccountingEntriesResponse, AccountingEntryRaw } from "./types";

export type SummaryResponse = {
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

export type FeesSummaryResponse = {
  merchantId: string;
  from: string | null;
  to: string | null;
  totalFiatSum: string;
  feesByCurrency: Array<{ currency: string; sum: string }>;
};

export type ByDayResponse = {
  merchantId: string;
  from: string | null;
  to: string | null;
  rows: Array<{
    day: string; // YYYY-MM-DD
    confirmedCount: number;
    grossSum: string;
    feeSum: string;
    netSum: string;
    feeFiatTotal: string;
  }>;
};

export type ByAssetResponse = {
  merchantId: string;
  from: string | null;
  to: string | null;
  rows: Array<{
    currency: string;
    network: string;
    confirmedCount: number;
    grossSum: string;
    feeSum: string;
    netSum: string;
  }>;
};

export type ReconciliationIssue = {
  type: string;
  severity: "low" | "medium" | "high" | "critical" | string;
  invoiceId?: string | null;
  message?: string | null;
  createdAt?: string | null;
  meta?: unknown;
};

export type ReconciliationResponse = {
  merchantId?: string | null;
  issues: ReconciliationIssue[];
  checkedAt?: string | null;
};

export type BackfillConfirmedResponse = {
  inserted: number;
  skipped?: number;
  merchantId?: string | null;
};

function toQuery(params: Record<string, string>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

async function getBaseUrl(h: Headers) {
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function fetchJson<T>(
  apiPath: string,
  forwardHeaders: Headers,
  init?: RequestInit
): Promise<T> {
  const baseUrl = await getBaseUrl(forwardHeaders);
  const url = new URL(apiPath, baseUrl);

  // 1) нормализуем init.headers в обычный объект
  const initHeaders: Record<string, string> = {};
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      for (const [k, v] of init.headers.entries()) initHeaders[k] = v;
    } else if (Array.isArray(init.headers)) {
      for (const [k, v] of init.headers) initHeaders[k] = v;
    } else {
      Object.assign(initHeaders, init.headers as Record<string, string>);
    }
  }

  // 2) строим headers, НЕ кладём пустые значения
  const headersOut: Record<string, string> = {
    accept: "application/json",
    ...initHeaders,
  };

  const merchant = forwardHeaders.get("x-merchant-id");
  const apiKey = forwardHeaders.get("x-api-key");
  const auth = forwardHeaders.get("authorization");

  if (merchant) headersOut["x-merchant-id"] = merchant;
  if (apiKey) headersOut["x-api-key"] = apiKey;
  if (auth) headersOut["authorization"] = auth;

  // 3) ВАЖНО: ...init идёт ДО headers, чтобы headers не перетёрлись
  const res = await fetch(url.toString(), {
    cache: "no-store",
    ...init,
    method: init?.method ?? "GET",
    headers: headersOut,
  });

  const raw = await res.text().catch(() => "");

  if (!res.ok) {
    throw new Error(
      `Failed to load ${apiPath} (${res.status}) ${raw.slice(0, 500)}`.trim()
    );
  }

  // Пустой ответ — вернём как unknown (редко, но бывает на POST/204)
  if (!raw.trim()) return undefined as unknown as T;

  // Если внезапно пришёл HTML/не-JSON — покажем кусок тела
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    throw new Error(
      `Expected JSON from ${apiPath}, got ${ct || "unknown"}: ${raw
        .slice(0, 200)
        .trim()}`
    );
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(
      `Failed to parse JSON from ${apiPath}: ${raw.slice(0, 200).trim()}`
    );
  }
}

function extractEntryItems(data: unknown): AccountingEntryRaw[] {
  // поддерживаем несколько форматов, чтобы не ломалось при миграциях
  if (Array.isArray(data)) return data as AccountingEntryRaw[];

  if (data && typeof data === "object") {
    if ("rows" in data && Array.isArray((data as { rows?: unknown }).rows)) {
      return (data as { rows: AccountingEntryRaw[] }).rows;
    }

    if ("items" in data && Array.isArray((data as { items?: unknown }).items)) {
      return (data as { items: AccountingEntryRaw[] }).items;
    }
  }

  return [];
}

export async function fetchEntries(params: {
  merchantId: string;
  limit: number;
  headers: Headers;
  from?: string;
  to?: string;
}): Promise<{ items: AccountingEntryRaw[] }> {
  const qs = toQuery({
    merchantId: params.merchantId,
    limit: String(params.limit),
    from: params.from ?? "",
    to: params.to ?? "",
  });

  const data = await fetchJson<AccountingEntriesResponse | unknown>(
    `/api/psp/accounting/entries${qs}`,
    params.headers
  );

  return { items: extractEntryItems(data) };
}

export async function fetchSummary(params: {
  merchantId: string;
  headers: Headers;
  from?: string;
  to?: string;
}): Promise<SummaryResponse> {
  const qs = toQuery({
    merchantId: params.merchantId,
    from: params.from ?? "",
    to: params.to ?? "",
  });

  return fetchJson<SummaryResponse>(
    `/api/psp/accounting/summary${qs}`,
    params.headers
  );
}

export async function fetchFeesSummary(params: {
  merchantId: string;
  headers: Headers;
  from?: string;
  to?: string;
}): Promise<FeesSummaryResponse> {
  const qs = toQuery({
    merchantId: params.merchantId,
    from: params.from ?? "",
    to: params.to ?? "",
  });

  return fetchJson<FeesSummaryResponse>(
    `/api/psp/accounting/summary/fees${qs}`,
    params.headers
  );
}

export async function fetchByDay(params: {
  merchantId: string;
  headers: Headers;
  from?: string;
  to?: string;
}): Promise<ByDayResponse> {
  const qs = toQuery({
    merchantId: params.merchantId,
    from: params.from ?? "",
    to: params.to ?? "",
  });

  return fetchJson<ByDayResponse>(
    `/api/psp/accounting/summary/by-day${qs}`,
    params.headers
  );
}

export async function fetchByAsset(params: {
  merchantId: string;
  headers: Headers;
  from?: string;
  to?: string;
}): Promise<ByAssetResponse> {
  const qs = toQuery({
    merchantId: params.merchantId,
    from: params.from ?? "",
    to: params.to ?? "",
  });

  return fetchJson<ByAssetResponse>(
    `/api/psp/accounting/summary/by-asset${qs}`,
    params.headers
  );
}

// Reconciliation (операционная проверка)
export async function fetchReconciliation(params: {
  merchantId: string;
  headers: Headers;
  from?: string;
  to?: string;
}): Promise<ReconciliationResponse> {
  const qs = toQuery({
    merchantId: params.merchantId,
    from: params.from ?? "",
    to: params.to ?? "",
  });

  return fetchJson<ReconciliationResponse>(
    `/api/psp/accounting/reconciliation${qs}`,
    params.headers
  );
}

// Backfill confirmed (ручная “ремонтная кнопка”, GET)
export async function runBackfillConfirmed(params: {
  merchantId: string;
  headers: Headers;
  from?: string;
  to?: string;
}): Promise<BackfillConfirmedResponse> {
  const qs = toQuery({
    merchantId: params.merchantId,
    from: params.from ?? "",
    to: params.to ?? "",
  });

  // В psp-core сейчас это GET /accounting/backfill/confirmed
  return fetchJson<BackfillConfirmedResponse>(
    `/api/psp/accounting/backfill/confirmed${qs}`,
    params.headers
  );
}
