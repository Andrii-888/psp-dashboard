// src/lib/pspApi.ts

export type InvoiceStatus = "waiting" | "confirmed" | "expired" | "rejected";

export type AmlStatus = "clean" | "warning" | "risky" | null;
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

  // blockchain
  network: string | null;
  txHash: string | null;
  walletAddress: string | null;

  // AML по инвойсу (общий риск)
  riskScore: number | null;
  amlStatus: AmlStatus;

  // «чистота актива» (то, что считает AmlService по стейблкоину)
  assetRiskScore: number | null;
  assetStatus: AssetStatus;

  // merchant
  merchantId: string | null;
}

export interface FetchInvoicesParams {
  status?: InvoiceStatus;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

const API_BASE =
  process.env.NEXT_PUBLIC_PSP_CORE_API ?? "http://localhost:3000";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `PSP-core API error: ${res.status} ${res.statusText} – ${text}`
    );
  }
  return (await res.json()) as T;
}

// 🔹 Список инвойсов
export async function fetchInvoices(
  params: FetchInvoicesParams = {}
): Promise<Invoice[]> {
  const url = new URL("/invoices", API_BASE);

  if (params.status) url.searchParams.set("status", params.status);
  if (params.from) url.searchParams.set("from", params.from);
  if (params.to) url.searchParams.set("to", params.to);
  if (typeof params.limit === "number")
    url.searchParams.set("limit", String(params.limit));
  if (typeof params.offset === "number")
    url.searchParams.set("offset", String(params.offset));

  const res = await fetch(url.toString(), {
    cache: "no-store",
  });

  return handleResponse<Invoice[]>(res);
}

// 🔹 Один инвойс
export async function fetchInvoice(id: string): Promise<Invoice> {
  const res = await fetch(`${API_BASE}/invoices/${id}`, {
    cache: "no-store",
  });

  return handleResponse<Invoice>(res);
}

// 🔹 Webhooks (для страницы деталей)
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

export async function fetchInvoiceWebhooks(
  id: string
): Promise<WebhookEvent[]> {
  const res = await fetch(`${API_BASE}/invoices/${id}/webhooks`, {
    cache: "no-store",
  });

  return handleResponse<WebhookEvent[]>(res);
}

export async function dispatchInvoiceWebhooks(
  id: string
): Promise<WebhookDispatchResult> {
  const res = await fetch(`${API_BASE}/invoices/${id}/webhooks/dispatch`, {
    method: "POST",
  });

  return handleResponse<WebhookDispatchResult>(res);
}
