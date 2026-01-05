// src/lib/psp.ts
export type Invoice = {
  id: string;
  createdAt: string;
  expiresAt: string;

  fiatAmount: number;
  fiatCurrency: string;

  cryptoAmount: number;
  cryptoCurrency: string;

  status: "waiting" | "confirmed" | "expired" | "rejected" | string;

  network: string;
  paymentUrl: string;

  walletAddress: string | null;
  txHash: string | null;
  txStatus: string | null;

  confirmations: number | null;
  requiredConfirmations: number | null;

  detectedAt: string | null;
  confirmedAt: string | null;

  amlStatus: string | null;
  riskScore: number | null;

  decisionStatus: string | null;
  decisionReasonText: string | null;
};

function safePreview(text: string, max = 400) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `/api/psp${path}`;

  const hasBody = init?.body != null;

  const headers = new Headers(init?.headers);
  headers.set("accept", "application/json");
  if (hasBody && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const res = await fetch(url, {
    cache: "no-store",
    ...init,
    headers,
  });

  const ct = res.headers.get("content-type") ?? "";
  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || `HTTP ${res.status}`);
  }

  if (!text) return {} as T;

  if (!ct.includes("application/json")) {
    throw new Error(
      `Expected JSON, got "${ct || "unknown"}": ${safePreview(text)}`
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Failed to parse JSON: ${safePreview(text)}`);
  }
}

export function getInvoice(id: string) {
  return api<Invoice>(`/invoices/${encodeURIComponent(id)}`);
}

export function listInvoices() {
  return api<Invoice[]>(`/invoices`);
}

export function createInvoice(body: {
  fiatAmount: number;
  fiatCurrency: string;
  cryptoCurrency: string;
  network: string;
}) {
  return api<Invoice>(`/invoices`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
