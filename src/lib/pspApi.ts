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
 */
export async function fetchInvoices(): Promise<Invoice[]> {
  return apiGet<Invoice[]>("/invoices");
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
 * ✅ Новый метод: запустить AUTO AML-проверку инвойса
 */
export async function runInvoiceAmlCheck(id: string): Promise<Invoice> {
  return apiPost<Invoice>(`/invoices/${id}/aml/check`);
}
