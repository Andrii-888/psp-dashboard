// src/lib/pspApi.ts

export type InvoiceStatus = "waiting" | "confirmed" | "expired" | "rejected";

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

  network?: string | null;
  txHash?: string | null;
  walletAddress?: string | null;
  riskScore?: number | null;
  amlStatus?: string | null;
  merchantId?: string | null;
}

export interface FetchInvoicesParams {
  status?: InvoiceStatus | "all";
  from?: string; // ISO date
  to?: string; // ISO date
  limit?: number;
  offset?: number;
}

/**
 * Base URL для psp-core backend.
 * В dev: http://localhost:3000 (из .env.local)
 */
function getPspBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_PSP_CORE_URL ?? "http://localhost:3000";

  // На всякий случай убираем лишний слэш в конце
  return base.replace(/\/+$/, "");
}

/**
 * Загружает список инвойсов из psp-core.
 * Использует GET /invoices с опциональными query-параметрами.
 */
export async function fetchInvoices(
  params: FetchInvoicesParams = {}
): Promise<Invoice[]> {
  const baseUrl = getPspBaseUrl();

  const url = new URL("/invoices", baseUrl);

  if (params.status && params.status !== "all") {
    url.searchParams.set("status", params.status);
  }

  if (params.from) {
    url.searchParams.set("from", params.from);
  }

  if (params.to) {
    url.searchParams.set("to", params.to);
  }

  if (typeof params.limit === "number") {
    url.searchParams.set("limit", String(params.limit));
  }

  if (typeof params.offset === "number") {
    url.searchParams.set("offset", String(params.offset));
  }

  const res = await fetch(url.toString(), {
    // Важно для dashboard — всегда актуальные данные
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`PSP core error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as Invoice[];
  return data;
}
