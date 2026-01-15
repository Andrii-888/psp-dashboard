// src/lib/pspApiInvoiceDetails.ts

import type {
  Invoice,
  WebhookEvent,
  WebhookDispatchResult,
  AttachTransactionPayload,
  FetchInvoicesParams,
  ProviderEvent,
} from "@/lib/pspApi";

// маленький helper, чтобы не трогать существующий pspApi.ts
function makeUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `/api/psp${normalized}`;
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
    throw new Error(
      `Expected JSON, got non-JSON response: ${raw.slice(0, 200)}`
    );
  }

  return JSON.parse(raw) as T;
}

async function apiGet<T>(path: string): Promise<T> {
  const url = makeUrl(path);
  const res = await fetch(url, {
    cache: "no-store",
    credentials: "omit",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const text = await readBodySafely(res);
    throw new Error(
      `GET ${path} failed (${res.status}): ${text.slice(0, 200)}`
    );
  }

  return parseJsonSafely<T>(res);
}

async function apiPost<T>(
  path: string,
  body?: unknown,
  method: "POST" | "PATCH" = "POST"
): Promise<T> {
  const url = makeUrl(path);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method,
    cache: "no-store",
    credentials: "omit",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await readBodySafely(res);
    throw new Error(
      `${method} ${path} failed (${res.status}): ${text.slice(0, 200)}`
    );
  }

  return parseJsonSafely<T>(res);
}

function toQuery(params?: Record<string, unknown>) {
  if (!params) return "";
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

// ===== exports that useInvoiceDetails.ts expects =====

export async function fetchInvoices(
  params?: FetchInvoicesParams
): Promise<Invoice[]> {
  return apiGet<Invoice[]>(
    `/invoices${toQuery(params as Record<string, unknown>)}`
  );
}

export async function fetchInvoice(id: string): Promise<Invoice> {
  return apiGet<Invoice>(`/invoices/${encodeURIComponent(id)}`);
}

export async function fetchInvoiceWebhooks(
  id: string
): Promise<WebhookEvent[]> {
  return apiGet<WebhookEvent[]>(`/invoices/${encodeURIComponent(id)}/webhooks`);
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

export async function dispatchInvoiceWebhooks(
  id: string
): Promise<WebhookDispatchResult> {
  return apiPost<WebhookDispatchResult>(
    `/invoices/${encodeURIComponent(id)}/webhooks/dispatch`,
    {}
  );
}

export async function runInvoiceAmlCheck(id: string): Promise<Invoice> {
  return apiPost<Invoice>(`/invoices/${encodeURIComponent(id)}/aml/run`, {});
}

export async function attachInvoiceTransaction(
  id: string,
  payload: AttachTransactionPayload
): Promise<Invoice> {
  return apiPost<Invoice>(
    `/invoices/${encodeURIComponent(id)}/tx`,
    payload,
    "PATCH"
  );
}

export async function confirmInvoice(id: string): Promise<Invoice> {
  return apiPost<Invoice>(`/invoices/${encodeURIComponent(id)}/confirm`, {});
}

export async function rejectInvoice(id: string): Promise<Invoice> {
  return apiPost<Invoice>(`/invoices/${encodeURIComponent(id)}/reject`, {});
}

export async function expireInvoice(id: string): Promise<Invoice> {
  return apiPost<Invoice>(`/invoices/${encodeURIComponent(id)}/expire`, {});
}
