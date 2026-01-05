// src/lib/pspApi.ts

// ===================== TYPES =====================

export type InvoiceStatus = "waiting" | "confirmed" | "expired" | "rejected";

export type AmlStatus = "clean" | "warning" | "risky" | "blocked" | null;
export type AssetStatus = "clean" | "suspicious" | "blocked" | null;

// ✅ Compliance / decision types (exported)
export type DecisionStatus = "approve" | "hold" | "reject" | null;
export type SanctionsStatus = "clear" | "hit" | null;

export interface SanctionsResult {
  status: SanctionsStatus;
  provider?: string | null;
  reasonCode?: string | null;
  details?: string | null;
  checkedAt?: string | null;
}

export interface OperatorDecision {
  status: DecisionStatus;
  reasonCode?: string | null;
  comment?: string | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
}

export interface Invoice {
  id: string;
  createdAt: string;
  expiresAt: string;

  fiatAmount: number;
  fiatCurrency: string;

  cryptoAmount: number;
  cryptoCurrency: string;

  status: InvoiceStatus;
  paymentUrl: string;

  network: string | null;
  txHash: string | null;
  walletAddress: string | null;

  txStatus?: string | null;
  confirmations?: number | null;
  requiredConfirmations?: number | null;

  detectedAt?: string | null;
  confirmedAt?: string | null;

  riskScore: number | null;
  amlStatus: AmlStatus;

  assetRiskScore: number | null;
  assetStatus: AssetStatus;

  merchantId: string | null;

  sanctions?: SanctionsResult | null;
  decision?: OperatorDecision | null;
}

export interface WebhookEvent {
  id: string;
  invoiceId: string;
  eventType: string;
  payloadJson: string;
  status: "pending" | "sent" | "failed";
  retryCount: number;
  lastAttemptAt: string | null;
  createdAt: string;
}

export interface WebhookDispatchResult {
  processed: number;
  sent: number;
  failed: number;
}

export interface FetchInvoicesParams {
  status?: InvoiceStatus;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface AttachTransactionPayload {
  network?: string;
  walletAddress?: string;
  txHash?: string;
}

export type CreateInvoicePayload = {
  fiatAmount: number;
  fiatCurrency: string;
  cryptoCurrency: string;
  network?: string;
  merchantId?: string | null;
};

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

function makeUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  // всегда через прокси:
  return `/api/psp${normalized}`;
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
  method: "POST" | "PATCH" = "POST"
): Promise<T> {
  const url = makeUrl(path);

  const headers: Record<string, string> = {
    Accept: "application/json",
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

// ===================== API =====================

export async function healthCheck(): Promise<{ ok: true }> {
  await apiGet<unknown>("/invoices?limit=1&offset=0");
  return { ok: true };
}

export async function fetchInvoices(
  params?: FetchInvoicesParams
): Promise<Invoice[]> {
  let path = "/invoices";

  if (params) {
    const search = new URLSearchParams();

    if (params.status) search.set("status", params.status);
    if (params.from) search.set("from", params.from);
    if (params.to) search.set("to", params.to);
    if (typeof params.limit === "number")
      search.set("limit", String(params.limit));
    if (typeof params.offset === "number")
      search.set("offset", String(params.offset));

    const qs = search.toString();
    if (qs) path += `?${qs}`;
  }

  return apiGet<Invoice[]>(path);
}

export async function fetchInvoice(id: string): Promise<Invoice> {
  return apiGet<Invoice>(`/invoices/${encodeURIComponent(id)}`);
}

export async function fetchInvoiceWebhooks(
  id: string
): Promise<WebhookEvent[]> {
  return apiGet<WebhookEvent[]>(`/invoices/${encodeURIComponent(id)}/webhooks`);
}

export async function dispatchInvoiceWebhooks(
  id: string
): Promise<WebhookDispatchResult> {
  return apiPost<WebhookDispatchResult>(
    `/invoices/${encodeURIComponent(id)}/webhooks/dispatch`,
    undefined,
    "POST"
  );
}

export async function runInvoiceAmlCheck(id: string): Promise<Invoice> {
  return apiPost<Invoice>(
    `/invoices/${encodeURIComponent(id)}/aml/check`,
    undefined,
    "POST"
  );
}

export async function confirmInvoice(id: string): Promise<Invoice> {
  return apiPost<Invoice>(
    `/invoices/${encodeURIComponent(id)}/confirm`,
    undefined,
    "POST"
  );
}

export async function expireInvoice(id: string): Promise<Invoice> {
  return apiPost<Invoice>(
    `/invoices/${encodeURIComponent(id)}/expire`,
    undefined,
    "POST"
  );
}

export async function rejectInvoice(id: string): Promise<Invoice> {
  return apiPost<Invoice>(
    `/invoices/${encodeURIComponent(id)}/reject`,
    undefined,
    "POST"
  );
}

export async function attachInvoiceTransaction(
  id: string,
  payload: AttachTransactionPayload
): Promise<Invoice> {
  return apiPost<Invoice>(
    `/invoices/${encodeURIComponent(id)}/tx`,
    payload,
    "POST"
  );
}

export async function createInvoice(
  payload: CreateInvoicePayload
): Promise<Invoice> {
  return apiPost<Invoice>("/invoices", payload, "POST");
}
