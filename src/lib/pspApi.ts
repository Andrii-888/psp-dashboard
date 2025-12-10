// src/lib/pspApi.ts

const API_BASE = process.env.NEXT_PUBLIC_PSP_API_URL ?? "http://localhost:3000";

export type InvoiceStatus = "waiting" | "confirmed" | "expired" | "rejected";

export type AmlStatus = "clean" | "warning" | "risky" | "blocked" | null;
export type AssetStatus = "clean" | "suspicious" | "blocked" | null;

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

  riskScore: number | null;
  amlStatus: AmlStatus;

  assetRiskScore: number | null;
  assetStatus: AssetStatus;

  merchantId: string | null;
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

/**
 * Параметры для запроса списка инвойсов с backend-а
 * (используются в /invoices/page.tsx)
 */
export interface FetchInvoicesParams {
  status?: InvoiceStatus;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

/**
 * Payload для привязки blockchain-транзакции
 */
export interface AttachTransactionPayload {
  network?: string;
  walletAddress?: string;
  txHash?: string;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`GET ${path} failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function apiPost<T>(
  path: string,
  body?: unknown,
  method: "POST" | "PATCH" = "POST"
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Список инвойсов (для таблицы)
 * Если params не передать — будет просто GET /invoices
 */
export async function fetchInvoices(
  params?: FetchInvoicesParams
): Promise<Invoice[]> {
  let path = "/invoices";

  if (params) {
    const search = new URLSearchParams();

    if (params.status) search.set("status", params.status);
    if (params.from) search.set("from", params.from);
    if (params.to) search.set("to", params.to);
    if (typeof params.limit === "number") {
      search.set("limit", String(params.limit));
    }
    if (typeof params.offset === "number") {
      search.set("offset", String(params.offset));
    }

    const qs = search.toString();
    if (qs) {
      path += `?${qs}`;
    }
  }

  return apiGet<Invoice[]>(path);
}

/**
 * Один инвойс (для страницы /invoices/[id])
 */
export async function fetchInvoice(id: string): Promise<Invoice> {
  return apiGet<Invoice>(`/invoices/${id}`);
}

/**
 * Webhook events по инвойсу
 */
export async function fetchInvoiceWebhooks(
  id: string
): Promise<WebhookEvent[]> {
  return apiGet<WebhookEvent[]>(`/invoices/${id}/webhooks`);
}

/**
 * Отправить все pending webhooks по инвойсу
 */
export async function dispatchInvoiceWebhooks(
  id: string
): Promise<WebhookDispatchResult> {
  return apiPost<WebhookDispatchResult>(`/invoices/${id}/webhooks/dispatch`);
}

/**
 * ✅ Запустить AUTO AML-проверку инвойса
 */
export async function runInvoiceAmlCheck(id: string): Promise<Invoice> {
  return apiPost<Invoice>(`/invoices/${id}/aml/check`);
}

/**
 * ✅ Оператор: подтвердить инвойс
 */
export async function confirmInvoice(id: string): Promise<Invoice> {
  return apiPost<Invoice>(`/invoices/${id}/confirm`);
}

/**
 * ✅ Оператор: пометить как истёкший
 */
export async function expireInvoice(id: string): Promise<Invoice> {
  return apiPost<Invoice>(`/invoices/${id}/expire`);
}

/**
 * ✅ Оператор: отклонить инвойс
 */
export async function rejectInvoice(id: string): Promise<Invoice> {
  return apiPost<Invoice>(`/invoices/${id}/reject`);
}

/**
 * ✅ Оператор: прикрепить blockchain-транзакцию
 */
export async function attachInvoiceTransaction(
  id: string,
  payload: AttachTransactionPayload
): Promise<Invoice> {
  return apiPost<Invoice>(`/invoices/${id}/tx`, payload);
}
