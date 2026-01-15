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

// --- NEW: pay / fees / fx fields coming from PSP Core ---
export type FeePayer = "merchant" | "customer" | null;

export type Chain = "TRON" | "ETH" | (string & {});

export type InvoicePay = {
  address: string;
  amount: string; // provider returns string (e.g. "56.915358")
  currency: string; // e.g. "USDTTRC20"
  network: Chain; // "TRON" | "ETH" (future-safe)
  expiresAt: string | null;
} | null;

export interface Invoice {
  id: string;
  createdAt: string;
  expiresAt: string;

  fiatAmount: number;
  fiatCurrency: string;

  cryptoAmount: number;
  cryptoCurrency: string;

  // fees (from PSP Core)
  grossAmount?: number | null;
  feeAmount?: number | null;
  netAmount?: number | null;
  feeBps?: number | null;
  feePayer?: FeePayer;

  status: InvoiceStatus;
  paymentUrl: string | null;

  // provider payment instructions (NOWPayments etc.)
  pay?: InvoicePay;

  // FX
  fxRate?: number | null;
  fxPair?: string | null;

  network: string | null;

  // tx
  txHash: string | null;
  walletAddress: string | null;
  txStatus?: string | null;
  confirmations?: number | null;
  requiredConfirmations?: number | null;

  detectedAt?: string | null;
  confirmedAt?: string | null;

  // AML
  riskScore: number | null;
  amlStatus: AmlStatus;

  assetRiskScore: number | null;
  assetStatus: AssetStatus;

  merchantId: string | null;

  // decision (flat fields from PSP Core)
  decisionStatus?: "none" | "approve" | "hold" | "reject" | null;
  decisionReasonCode?: string | null;
  decisionReasonText?: string | null;
  decidedAt?: string | null;
  decidedBy?: string | null;

  // legacy/optional objects (if some endpoints return them)
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

export interface ProviderEvent {
  provider: string;
  eventType: string;
  externalId: string | null;
  invoiceId: string | null;
  signature: string | null;
  payloadJson: string;
  receivedAt: string;
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

// Optional: create invoice (если где-то в dashboard нужно)
export async function createInvoice(
  payload: CreateInvoicePayload
): Promise<{ ok: boolean; invoice: Invoice }> {
  return apiPost<{ ok: boolean; invoice: Invoice }>(`/invoices`, payload);
}
