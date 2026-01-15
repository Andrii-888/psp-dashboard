// src/app/accounting/invoice/page.tsx

import type React from "react";
import { headers } from "next/headers";

type Invoice = {
  id: string;
  createdAt: string;
  expiresAt: string;

  fiatAmount: number;
  fiatCurrency: string;

  cryptoAmount: number;
  cryptoCurrency: string;

  // fees (может не быть/быть null)
  grossAmount?: number | null;
  feeAmount?: number | null;
  netAmount?: number | null;
  feeBps?: number | null;
  feePayer?: string | null;

  status: string;
  paymentUrl?: string | null;

  // provider payment instructions
  pay?: {
    address: string;
    amount: string;
    currency: string;
    network: string;
    expiresAt: string | null;
  } | null;

  fxRate?: number | null;
  fxPair?: string | null;

  network?: string | null;

  txHash?: string | null;
  walletAddress?: string | null;
  txStatus?: string | null;
  confirmations?: number | null;
  requiredConfirmations?: number | null;

  detectedAt?: string | null;
  confirmedAt?: string | null;

  riskScore?: number | null;
  amlStatus?: string | null;

  assetRiskScore?: number | null;
  assetStatus?: string | null;

  merchantId?: string | null;

  decisionStatus?: string | null;
  decisionReasonCode?: string | null;
  decisionReasonText?: string | null;
  decidedAt?: string | null;
  decidedBy?: string | null;
};

function toQuery(params: Record<string, string>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

async function getBaseUrl(h: Headers) {
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function fetchJson<T>(
  apiPath: string,
  forwardHeaders: Headers,
  init?: RequestInit
): Promise<T> {
  const baseUrl = await getBaseUrl(forwardHeaders);
  const url = new URL(apiPath, baseUrl);

  // 1) нормализуем init.headers в обычный объект
  const initHeaders: Record<string, string> = {};

  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((value, key) => {
        initHeaders[key] = value;
      });
    } else if (Array.isArray(init.headers)) {
      for (const [key, value] of init.headers) {
        initHeaders[key] = value;
      }
    } else {
      Object.assign(initHeaders, init.headers);
    }
  }

  // 2) строим headers, НЕ кладём пустые значения
  const headersOut: Record<string, string> = {
    accept: "application/json",
    ...initHeaders,
  };

  const merchant = forwardHeaders.get("x-merchant-id");
  const apiKey = forwardHeaders.get("x-api-key");
  const auth = forwardHeaders.get("authorization");

  if (merchant) headersOut["x-merchant-id"] = merchant;
  if (apiKey) headersOut["x-api-key"] = apiKey;
  if (auth) headersOut["authorization"] = auth;

  // 3) ВАЖНО: ...init идёт ДО headers, чтобы headers не перетёрлись
  const res = await fetch(url.toString(), {
    cache: "no-store",
    ...init,
    method: init?.method ?? "GET",
    headers: headersOut,
  });

  const raw = await res.text().catch(() => "");

  if (!res.ok) {
    throw new Error(
      `Failed to load ${apiPath} (${res.status}) ${raw.slice(0, 500)}`.trim()
    );
  }

  // Пустой ответ — вернём как unknown (редко, но бывает на POST/204)
  if (!raw.trim()) return undefined as unknown as T;

  // Если внезапно пришёл HTML/не-JSON — покажем кусок тела
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    throw new Error(
      `Expected JSON from ${apiPath}, got ${ct || "unknown"}: ${raw
        .slice(0, 200)
        .trim()}`
    );
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(
      `Failed to parse JSON from ${apiPath}: ${raw.slice(0, 200).trim()}`
    );
  }
}

function fmt(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-zinc-100 py-3 md:flex-row md:items-center md:gap-6">
      <div className="w-full text-xs font-medium uppercase tracking-wide text-zinc-500 md:w-56">
        {label}
      </div>
      <div
        className={
          mono ? "font-mono text-sm text-zinc-900" : "text-sm text-zinc-900"
        }
      >
        {value}
      </div>
    </div>
  );
}

export default async function AccountingInvoicePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const h = await headers();

  const invoiceId = typeof sp.invoiceId === "string" ? sp.invoiceId : "";
  const merchantId = typeof sp.merchantId === "string" ? sp.merchantId : "";
  const limit = typeof sp.limit === "string" ? sp.limit : "";
  const from = typeof sp.from === "string" ? sp.from : "";
  const to = typeof sp.to === "string" ? sp.to : "";

  if (!invoiceId) {
    return null;
  }

  const invoice = await fetchJson<Invoice>(
    `/api/psp/invoices/${encodeURIComponent(invoiceId)}`,
    h
  );

  const backQs = toQuery({
    merchantId: merchantId || (invoice.merchantId ?? ""),
    limit,
    from,
    to,
  });

  return (
    <div className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-zinc-900">Invoice</div>
          <div className="mt-1 font-mono text-xs text-zinc-600">
            {invoice.id}
          </div>
        </div>

        <a
          href={`/accounting${backQs}`}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
        >
          ← Back to Accounting
        </a>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="text-sm font-semibold text-zinc-900">Overview</div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700">
              {invoice.status}
            </div>
          </div>
        </div>

        <div className="p-4">
          <Row label="merchantId" value={invoice.merchantId ?? "—"} mono />
          <Row label="createdAt" value={fmt(invoice.createdAt)} />
          <Row label="expiresAt" value={fmt(invoice.expiresAt)} />
          <Row
            label="fiat"
            value={`${invoice.fiatAmount} ${invoice.fiatCurrency}`}
            mono
          />
          <Row
            label="crypto"
            value={`${invoice.cryptoAmount} ${invoice.cryptoCurrency}`}
            mono
          />
          <Row
            label="amounts"
            value={`gross=${invoice.grossAmount ?? "—"}, fee=${
              invoice.feeAmount ?? "—"
            }, net=${invoice.netAmount ?? "—"} (feeBps=${
              invoice.feeBps ?? "—"
            }, feePayer=${invoice.feePayer ?? "—"})`}
            mono
          />
          <Row
            label="fx"
            value={
              invoice.fxPair ? `${invoice.fxPair} @ ${invoice.fxRate}` : "—"
            }
            mono
          />

          <Row
            label="paymentUrl"
            value={
              invoice.paymentUrl ? (
                <a
                  className="text-sky-600 hover:underline"
                  href={invoice.paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {invoice.paymentUrl}
                </a>
              ) : (
                "—"
              )
            }
          />

          <div className="mt-6 text-sm font-semibold text-zinc-900">
            Payment instructions
          </div>
          <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <div className="text-xs text-zinc-500">address</div>
                <div className="break-all font-mono text-xs text-zinc-900">
                  {invoice.pay?.address ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">amount</div>
                <div className="font-mono text-xs text-zinc-900">
                  {invoice.pay?.amount ?? "—"} {invoice.pay?.currency ?? ""}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">network</div>
                <div className="font-mono text-xs text-zinc-900">
                  {invoice.pay?.network ?? invoice.network ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">pay expiresAt</div>
                <div className="font-mono text-xs text-zinc-900">
                  {fmt(invoice.pay?.expiresAt ?? null)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-sm font-semibold text-zinc-900">
            Transaction
          </div>
          <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <div className="text-xs text-zinc-500">walletAddress</div>
                <div className="break-all font-mono text-xs text-zinc-900">
                  {invoice.walletAddress ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">txHash</div>
                <div className="break-all font-mono text-xs text-zinc-900">
                  {invoice.txHash ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">txStatus</div>
                <div className="font-mono text-xs text-zinc-900">
                  {invoice.txStatus ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">confirmations</div>
                <div className="font-mono text-xs text-zinc-900">
                  {(invoice.confirmations ?? "—").toString()} /{" "}
                  {(invoice.requiredConfirmations ?? "—").toString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">detectedAt</div>
                <div className="font-mono text-xs text-zinc-900">
                  {fmt(invoice.detectedAt ?? null)}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">confirmedAt</div>
                <div className="font-mono text-xs text-zinc-900">
                  {fmt(invoice.confirmedAt ?? null)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-sm font-semibold text-zinc-900">
            AML & decision
          </div>
          <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <div className="text-xs text-zinc-500">amlStatus</div>
                <div className="font-mono text-xs text-zinc-900">
                  {invoice.amlStatus ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">riskScore</div>
                <div className="font-mono text-xs text-zinc-900">
                  {invoice.riskScore ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">assetStatus</div>
                <div className="font-mono text-xs text-zinc-900">
                  {invoice.assetStatus ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">assetRiskScore</div>
                <div className="font-mono text-xs text-zinc-900">
                  {invoice.assetRiskScore ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">decisionStatus</div>
                <div className="font-mono text-xs text-zinc-900">
                  {invoice.decisionStatus ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">decidedAt</div>
                <div className="font-mono text-xs text-zinc-900">
                  {fmt(invoice.decidedAt ?? null)}
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-zinc-500">reason</div>
                <div className="text-sm text-zinc-900">
                  <span className="font-mono text-xs text-zinc-700">
                    {invoice.decisionReasonCode ?? "—"}
                  </span>
                  {invoice.decisionReasonText ? (
                    <span className="text-zinc-700">
                      {" "}
                      — {invoice.decisionReasonText}
                    </span>
                  ) : null}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">decidedBy</div>
                <div className="font-mono text-xs text-zinc-900">
                  {invoice.decidedBy ?? "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
