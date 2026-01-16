// src/app/accounting/lib/api.ts

import type { AccountingEntryRaw, Asset, Network } from "./types";

export type InvoiceListItem = {
  id?: string | null;
  invoiceId?: string | null;
  merchantId?: string | null;

  status?: string | null;
  txStatus?: string | null;

  // amounts (may vary by provider/version)
  grossAmount?: string | number | null;
  feeAmount?: string | number | null;
  netAmount?: string | number | null;
  cryptoAmount?: string | number | null;

  // asset/network (may vary)
  cryptoCurrency?: string | null;
  currency?: string | null;
  network?: string | null;

  // addresses / tx
  depositAddress?: string | null;
  walletAddress?: string | null;
  senderAddress?: string | null;
  txHash?: string | null;

  // timestamps
  createdAt?: string | null;
  detectedAt?: string | null;
  confirmedAt?: string | null;

  // nested pay block (NOWPayments-style)
  pay?: {
    address?: string | null;
  } | null;
};

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

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function extractEntryItems(data: unknown): AccountingEntryRaw[] {
  // поддерживаем несколько форматов, чтобы не ломалось при миграциях
  if (Array.isArray(data)) return data as AccountingEntryRaw[];

  if (isRecord(data)) {
    const rows = data.rows;
    if (Array.isArray(rows)) return rows as AccountingEntryRaw[];

    const items = data.items;
    if (Array.isArray(items)) return items as AccountingEntryRaw[];
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

  const data = await fetchJson<unknown>(
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

function extractInvoiceItems(data: unknown): InvoiceListItem[] {
  if (Array.isArray(data)) return data as InvoiceListItem[];

  if (isRecord(data)) {
    const rows = data.rows;
    if (Array.isArray(rows)) return rows as InvoiceListItem[];

    const items = data.items;
    if (Array.isArray(items)) return items as InvoiceListItem[];
  }

  return [];
}

// --- helpers (keep near invoiceToAccountingLikeRow) ---
function normalizeAssetFromInvoice(inv: InvoiceListItem): Asset {
  const raw = String(inv.cryptoCurrency ?? inv.currency ?? "").toUpperCase();

  // Accept common variants like USDTTRC20 / USDCARC20 / etc.
  if (raw.includes("USDT")) return "USDT";
  if (raw.includes("USDC")) return "USDC";

  // Fallback (so accounting UI never breaks)
  return "USDT";
}

function normalizeNetworkFromInvoice(inv: InvoiceListItem): Network {
  const raw = String(inv.network ?? "").toUpperCase();

  // Your strict types are: "TRON" | "ETHEREUM"
  if (raw.includes("TRON") || raw.includes("TRC")) return "TRON";
  if (raw.includes("ETH")) return "ETHEREUM";

  // Fallback
  return "ETHEREUM";
}

function normalizeEventTypeFromInvoice(inv: InvoiceListItem): string {
  const status = String(inv.status ?? "unknown");
  // if txStatus exists, it’s useful in UI, but still a string is allowed
  const tx = inv.txStatus ? `.${String(inv.txStatus)}` : "";
  return `invoice.${status}${tx}`;
}

// Превращаем invoice в AccountingEntryRaw-подобную строку,
// чтобы Accounting мог показывать "историю как invoices".
function invoiceToAccountingLikeRow(inv: InvoiceListItem): AccountingEntryRaw {
  const invoiceId = String(inv.id ?? inv.invoiceId ?? "");

  const gross =
    inv.grossAmount ??
    inv.cryptoAmount ??
    inv.netAmount ??
    inv.feeAmount ??
    "0";
  const fee = inv.feeAmount ?? "0";
  const net = inv.netAmount ?? gross ?? "0";

  const merchantId = String(inv.merchantId ?? "");
  const currency = normalizeAssetFromInvoice(inv);
  const network = normalizeNetworkFromInvoice(inv);

  const depositAddress = String(
    inv.depositAddress ?? inv.pay?.address ?? inv.walletAddress ?? ""
  );

  const createdAt =
    inv.confirmedAt ??
    inv.detectedAt ??
    inv.createdAt ??
    new Date().toISOString();

  return {
    invoiceId,
    merchantId,

    eventType: normalizeEventTypeFromInvoice(inv),

    grossAmount: String(gross ?? "0"),
    feeAmount: String(fee ?? "0"),
    netAmount: String(net ?? "0"),

    currency,
    network,

    depositAddress,
    senderAddress: inv.senderAddress ?? null,
    txHash: inv.txHash ?? null,

    createdAt: String(createdAt),
  };
}

export async function fetchInvoiceHistoryAsEntries(params: {
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

  const data = await fetchJson<unknown>(
    `/api/psp/invoices${qs}`,
    params.headers
  );
  const invoices = extractInvoiceItems(data);

  return { items: invoices.map(invoiceToAccountingLikeRow) };
}
