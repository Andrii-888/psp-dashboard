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

function getBaseUrlForNode(): string | null {
  // In browser we always use relative proxy path (/api/psp/...)
  if (typeof window !== "undefined") return null;

  // Prefer explicit app URL (works for local + prod checks)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) return appUrl.replace(/\/+$/, "");

  // Vercel provides VERCEL_URL without protocol sometimes
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const withProto = vercel.startsWith("http") ? vercel : `https://${vercel}`;
    return withProto.replace(/\/+$/, "");
  }

  // Fallback for local scripts
  return "http://localhost:3000";
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

  // Server-side: absolute URL, client-side: relative proxy path
  const base = opts?.forwardHeaders
    ? getBaseUrlFromHeaders(opts.forwardHeaders)
    : getBaseUrlForNode();

  const url = base ? `${base}${proxyPath}` : proxyPath;
  return url;
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

export async function fetchInvoices(
  params?: FetchInvoicesParams,
  opts?: { forwardHeaders?: Headers }
): Promise<{ ok: boolean; items: Invoice[]; total?: number }> {
  const qs = toQuery({
    status: params?.status,
    from: params?.from,
    to: params?.to,
    limit: params?.limit ?? 500,
    offset: params?.offset ?? 0,
  });

  const res = await apiGet<unknown>(`/invoices${qs}`, {
    forwardHeaders: opts?.forwardHeaders,
  });

  // ✅ Support both formats:
  // 1) { ok, items, total }
  // 2) Invoice[] (array)
  if (res && typeof res === "object" && "items" in res) {
    const r = res as { ok?: boolean; items?: unknown; total?: number };
    return {
      ok: Boolean(r.ok ?? true),
      items: Array.isArray(r.items) ? (r.items as Invoice[]) : [],
      total: typeof r.total === "number" ? r.total : undefined,
    };
  }

  if (Array.isArray(res)) {
    return { ok: true, items: res as Invoice[], total: res.length };
  }

  return { ok: false, items: [], total: 0 };
}

export async function fetchInvoiceById(
  invoiceId: string
): Promise<{ ok: boolean; invoice: Invoice }> {
  const res = await apiGet<unknown>(`/invoices/${invoiceId}`);

  if (res && typeof res === "object" && "invoice" in res) {
    return res as { ok: boolean; invoice: Invoice };
  }

  return { ok: true, invoice: res as Invoice };
}

export async function fetchInvoiceWebhooks(
  invoiceId: string
): Promise<{ ok: boolean; items: WebhookEvent[] }> {
  const res = await apiGet<unknown>(`/invoices/${invoiceId}/webhooks`);

  // case 1: backend returns array directly
  if (Array.isArray(res)) {
    return { ok: true, items: res as WebhookEvent[] };
  }

  // case 2: backend returns { ok, items }
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    const items = obj["items"];

    if (Array.isArray(items)) {
      return {
        ok: typeof obj["ok"] === "boolean" ? (obj["ok"] as boolean) : true,
        items: items as WebhookEvent[],
      };
    }
  }

  // fallback: never crash UI
  return { ok: true, items: [] };
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
