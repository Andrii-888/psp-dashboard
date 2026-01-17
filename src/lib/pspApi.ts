// src/lib/pspApi.ts

// Re-export domain types (single source of truth)
export type {
  InvoiceStatus,
  AmlStatus,
  AssetStatus,
  DecisionStatus,
  SanctionsStatus,
  SanctionsResult,
  OperatorDecision,
  FeePayer,
  Chain,
  InvoicePay,
  Invoice,
  WebhookEvent,
  WebhookDispatchResult,
  ProviderEvent,
  FetchInvoicesParams,
  AttachTransactionPayload,
  CreateInvoicePayload,
} from "@/domain/invoices/types";

import type {
  Invoice,
  WebhookEvent,
  WebhookDispatchResult,
  ProviderEvent,
  FetchInvoicesParams,
  AttachTransactionPayload,
  CreateInvoicePayload,
} from "@/domain/invoices/types";

// ===================== ERRORS =====================

export class PspApiError extends Error {
  status: number;
  url: string;
  bodyText?: string;

  constructor(
    message: string,
    args: { status: number; url: string; bodyText?: string }
  ) {
    super(message);
    this.name = "PspApiError";
    this.status = args.status;
    this.url = args.url;
    this.bodyText = args.bodyText;
  }
}

async function readBodySafely(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function looksLikeHtml(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    t.startsWith("<!doctype") || t.startsWith("<html") || t.startsWith("<")
  );
}

async function parseJsonSafely<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  const raw = await readBodySafely(res);

  if (!contentType.includes("application/json") || looksLikeHtml(raw)) {
    throw new PspApiError("Expected JSON, got non-JSON response", {
      status: res.status,
      url: res.url,
      bodyText: raw.slice(0, 400),
    });
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new PspApiError("Failed to parse JSON response", {
      status: res.status,
      url: res.url,
      bodyText: raw.slice(0, 400),
    });
  }
}

// ===================== URL + HEADERS (SSOT transport) =====================

type ApiOpts = {
  /**
   * Server-only:
   * If provided, requests are made with an absolute URL built from these headers,
   * and auth headers are forwarded (x-merchant-id / x-api-key / authorization).
   */
  forwardHeaders?: Headers;
};

function makeProxyPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `/api/psp${normalized}`;
}

function getBaseUrlFromHeaders(h: Headers): string {
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

function buildForwardAuthHeaders(h?: Headers): Record<string, string> {
  if (!h) return {};

  const out: Record<string, string> = {};
  const merchant = h.get("x-merchant-id");
  const apiKey = h.get("x-api-key");
  const auth = h.get("authorization");

  if (merchant) out["x-merchant-id"] = merchant;
  if (apiKey) out["x-api-key"] = apiKey;
  if (auth) out["authorization"] = auth;

  return out;
}

function makeUrl(path: string, opts?: ApiOpts): string {
  const proxyPath = makeProxyPath(path);

  // Client-side: relative URL is perfect.
  if (!opts?.forwardHeaders) return proxyPath;

  // Server-side: must be absolute (Next server fetch)
  const base = getBaseUrlFromHeaders(opts.forwardHeaders);
  return `${base}${proxyPath}`;
}

// ===================== CORE FETCHERS =====================

async function apiGet<T>(path: string, opts?: ApiOpts): Promise<T> {
  const url = makeUrl(path, opts);

  const res = await fetch(url, {
    cache: "no-store",
    credentials: "omit",
    headers: {
      Accept: "application/json",
      ...buildForwardAuthHeaders(opts?.forwardHeaders),
    },
  });

  if (!res.ok) {
    const text = await readBodySafely(res);
    throw new PspApiError(`GET ${path} failed`, {
      status: res.status,
      url,
      bodyText: text.slice(0, 400),
    });
  }

  return parseJsonSafely<T>(res);
}

async function apiPost<T>(
  path: string,
  body?: unknown,
  method: "POST" | "PATCH" = "POST",
  opts?: ApiOpts
): Promise<T> {
  const url = makeUrl(path, opts);

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...buildForwardAuthHeaders(opts?.forwardHeaders),
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    cache: "no-store",
    credentials: "omit",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await readBodySafely(res);
    throw new PspApiError(`${method} ${path} failed`, {
      status: res.status,
      url,
      bodyText: text.slice(0, 400),
    });
  }

  return parseJsonSafely<T>(res);
}

// ===================== API (via /api/psp proxy) =====================

export async function healthCheck(): Promise<{
  ok: boolean;
  service?: string;
}> {
  return apiGet<{ ok: boolean; service?: string }>("/health");
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

// -------- Invoices (client + server) --------

export async function fetchInvoices(params?: FetchInvoicesParams): Promise<{
  ok: boolean;
  items: Invoice[];
  total?: number;
}> {
  const qs = toQuery({
    status: params?.status,
    from: params?.from,
    to: params?.to,
    limit: params?.limit ?? 50,
    offset: params?.offset ?? 0,
  });

  return apiGet<{ ok: boolean; items: Invoice[]; total?: number }>(
    `/invoices${qs}`
  );
}

export async function fetchInvoiceById(
  invoiceId: string
): Promise<{ ok: boolean; invoice: Invoice }> {
  return apiGet<{ ok: boolean; invoice: Invoice }>(`/invoices/${invoiceId}`);
}

export async function fetchInvoiceWebhooks(
  invoiceId: string
): Promise<{ ok: boolean; items: WebhookEvent[] }> {
  return apiGet<{ ok: boolean; items: WebhookEvent[] }>(
    `/invoices/${invoiceId}/webhooks`
  );
}

export async function dispatchInvoiceWebhooks(
  invoiceId: string
): Promise<{ ok: boolean; result: WebhookDispatchResult }> {
  return apiPost<{ ok: boolean; result: WebhookDispatchResult }>(
    `/invoices/${invoiceId}/webhooks/dispatch`,
    {}
  );
}

export async function runInvoiceAml(
  invoiceId: string
): Promise<{ ok: boolean; invoice: Invoice }> {
  return apiPost<{ ok: boolean; invoice: Invoice }>(
    `/invoices/${invoiceId}/aml/run`,
    {}
  );
}

export async function attachInvoiceTransaction(
  invoiceId: string,
  payload: AttachTransactionPayload
): Promise<{ ok: boolean; invoice: Invoice }> {
  return apiPost<{ ok: boolean; invoice: Invoice }>(
    `/invoices/${invoiceId}/tx/attach`,
    payload,
    "PATCH"
  );
}

export async function confirmInvoice(
  invoiceId: string
): Promise<{ ok: boolean; invoice: Invoice }> {
  return apiPost<{ ok: boolean; invoice: Invoice }>(
    `/invoices/${invoiceId}/tx/confirm`,
    {}
  );
}

export async function rejectInvoice(
  invoiceId: string,
  payload?: { reasonCode?: string; reasonText?: string }
): Promise<{ ok: boolean; invoice: Invoice }> {
  return apiPost<{ ok: boolean; invoice: Invoice }>(
    `/invoices/${invoiceId}/reject`,
    payload ?? {}
  );
}

export async function expireInvoice(
  invoiceId: string
): Promise<{ ok: boolean; invoice: Invoice }> {
  return apiPost<{ ok: boolean; invoice: Invoice }>(
    `/invoices/${invoiceId}/expire`,
    {}
  );
}

export async function createInvoice(
  payload: CreateInvoicePayload
): Promise<{ ok: boolean; invoice: Invoice }> {
  return apiPost<{ ok: boolean; invoice: Invoice }>(`/invoices`, payload);
}

export async function fetchInvoiceProviderEvents(
  invoiceId: string,
  limit = 50
): Promise<ProviderEvent[]> {
  return apiGet<ProviderEvent[]>(
    `/accounting/provider-events?invoiceId=${encodeURIComponent(
      invoiceId
    )}&limit=${limit}`
  );
}

// -------- Accounting (server-safe, via forwarded headers) --------

export type BackfillConfirmedResponse = {
  inserted: number;
  skipped?: number;
  merchantId?: string | null;
};

export async function fetchAccountingEntries(params: {
  merchantId: string;
  limit: number;
  headers: Headers;
  from?: string;
  to?: string;
}): Promise<unknown> {
  const qs = toQuery({
    merchantId: params.merchantId,
    limit: params.limit,
    from: params.from,
    to: params.to,
  });

  // NOTE: server-safe call (absolute URL + forwarded auth headers)
  return apiGet<unknown>(`/accounting/entries${qs}`, {
    forwardHeaders: params.headers,
  });
}

export async function runBackfillConfirmed(params: {
  merchantId: string;
  headers: Headers;
  from?: string;
  to?: string;
}): Promise<BackfillConfirmedResponse> {
  const qs = toQuery({
    merchantId: params.merchantId,
    from: params.from,
    to: params.to,
  });

  const data = await apiGet<BackfillConfirmedResponse>(
    `/accounting/backfill/confirmed${qs}`,
    { forwardHeaders: params.headers }
  );

  return data;
}
