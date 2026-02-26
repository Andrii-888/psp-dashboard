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

function toQuery(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      qs.set(key, String(value));
    }
  }

  const s = qs.toString();
  return s ? `?${s}` : "";
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

// src/lib/pspApi.ts

let healthCache: {
  value: { ok: boolean; service?: string };
  ts: number;
} | null = null;

let healthInFlight: Promise<{ ok: boolean; service?: string }> | null = null;

// How long we consider health "fresh" (ms)
const HEALTH_TTL_MS = 2_500;

export async function healthCheck(): Promise<{
  ok: boolean;
  service?: string;
}> {
  const now = Date.now();

  // Serve from cache if fresh
  if (healthCache && now - healthCache.ts < HEALTH_TTL_MS) {
    return healthCache.value;
  }

  // Deduplicate concurrent requests
  if (healthInFlight) return healthInFlight;

  healthInFlight = apiGet<{ ok: boolean; service?: string }>("/health")
    .then((res) => {
      healthCache = { value: res, ts: Date.now() };
      return res;
    })
    .finally(() => {
      healthInFlight = null;
    });

  return healthInFlight;
}

// -------- Invoices (client + server) --------

function cleanStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeAmlStatus(v: unknown): Invoice["amlStatus"] {
  const s = cleanStr(v).toLowerCase();
  if (!s) return null;

  // PSP-Core может отдавать "review" — в UI трактуем как warning (нужна проверка)
  if (s === "review") return null;

  if (s === "clean") return "clean";
  if (s === "warning") return "warning";
  if (s === "risky" || s === "risk" || s === "high") return "risky";
  if (s === "blocked" || s === "block") return "risky"; // badge не умеет "blocked", показываем как risky

  return null;
}

function normalizeDecisionStatus(v: unknown): Invoice["decisionStatus"] {
  const s = cleanStr(v).toLowerCase();

  // Пусто или "none" → нет решения
  if (!s || s === "none") return null;

  // PSP-Core иногда отдаёт "approved"
  if (s === "approved") return "approve";

  if (s === "approve") return "approve";
  if (s === "hold") return "hold";
  if (s === "reject" || s === "rejected") return "reject";

  // Всё неизвестное считаем отсутствием решения
  return null;
}

function normalizeInvoice(raw: unknown): Invoice {
  const inv = raw as Invoice;

  const aml = normalizeAmlStatus(
    typeof inv.amlStatus === "string" ? inv.amlStatus : null
  );

  const decision = normalizeDecisionStatus(
    typeof inv.decisionStatus === "string" ? inv.decisionStatus : null
  );

  return {
    ...inv,
    amlStatus: aml,
    decisionStatus: decision,
  };
}

function normalizeInvoicesList(items: unknown): Invoice[] {
  if (!Array.isArray(items)) return [];
  return items.map((x) => normalizeInvoice(x));
}

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
      items: normalizeInvoicesList(r.items),
      total: typeof r.total === "number" ? r.total : undefined,
    };
  }

  if (Array.isArray(res)) {
    return { ok: true, items: normalizeInvoicesList(res), total: res.length };
  }

  return { ok: false, items: [], total: 0 };
}

export async function fetchOperatorInvoices(
  params: FetchInvoicesParams = {},
  opts?: ApiOpts
): Promise<Invoice[]> {
  const q = toQuery({
    limit: params.limit ?? 50,
    offset: params.offset ?? 0,
    status: params.status,
  });

  return apiGet<Invoice[]>(`/operator/invoices${q}`, opts);
}

export async function fetchInvoiceById(
  invoiceId: string
): Promise<{ ok: boolean; invoice: Invoice }> {
  const res = await apiGet<unknown>(`/invoices/${invoiceId}`);

  if (res && typeof res === "object" && "invoice" in res) {
    const out = res as { ok: boolean; invoice: Invoice };
    return { ...out, invoice: normalizeInvoice(out.invoice) };
  }

  return { ok: true, invoice: normalizeInvoice(res) };
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
    `/invoices/${invoiceId}/aml/check`,
    {}
  );
}

export async function attachInvoiceTransaction(
  invoiceId: string,
  payload: AttachTransactionPayload
): Promise<{ ok: boolean; invoice: Invoice }> {
  return apiPost<{ ok: boolean; invoice: Invoice }>(
    `/invoices/${invoiceId}/tx`,
    payload
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

export async function setInvoiceDecision(
  invoiceId: string,
  decision: NonNullable<Invoice["decisionStatus"]>,
  reason?: string
): Promise<unknown> {
  const status =
    decision === "approve"
      ? "approved"
      : decision === "reject"
      ? "rejected"
      : "hold";

  return apiPost<unknown>(`/operator/invoices/${invoiceId}/decision`, {
    status,
    reasonCode: null,
    comment: reason ?? null,
  });
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

export async function fetchAccountingSummary(params: {
  merchantId: string;
  headers: Headers;
  from?: string;
  to?: string;
}): Promise<unknown> {
  const qs = toQuery({
    merchantId: params.merchantId,
    from: params.from,
    to: params.to,
  });

  // NOTE: server-safe call (absolute URL + forwarded auth headers)
  return apiGet<unknown>(`/accounting/summary${qs}`, {
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
