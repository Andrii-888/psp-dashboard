// src/app/accounting/invoice/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";

import { InvoiceOverview } from "./components/InvoiceOverview";
import { InvoicePaymentInstructions } from "./components/InvoicePaymentInstructions";
import { InvoiceTransaction } from "./components/InvoiceTransaction";
import { InvoiceAmlDecision } from "./components/InvoiceAmlDecision";

import { getInvoice } from "./lib/getInvoice";
import { toQuery } from "../lib/searchParams";

type FxContext = {
  invoiceId: string;

  fiatAmount: number;
  fiatCurrency: string;

  cryptoAmount: number;
  cryptoCurrency: string;

  fxRate: number | null;
  fxPair: string | null;
  fxSource: string | null;
  fxLockedAt: string | null;
};

type Invoice = Awaited<ReturnType<typeof getInvoice>>;

function envAnyOpt(names: string[]): string | null {
  for (const n of names) {
    const v = (process.env[n] ?? "").trim();
    if (v) return v;
  }
  return null;
}

function getPspCoreBaseUrl(): string {
  return (
    envAnyOpt(["PSP_API_URL", "PSP_API_BASE", "NEXT_PUBLIC_PSP_API_URL"]) ??
    "http://localhost:3001"
  ).replace(/\/+$/, "");
}

function getMerchantAuth(): { merchantId: string; apiKey: string } {
  const merchantId = envAnyOpt(["PSP_MERCHANT_ID"]) ?? "demo-merchant";
  const apiKey = envAnyOpt(["PSP_API_KEY"]) ?? "";
  return { merchantId, apiKey };
}

async function fetchInvoiceFromCore(invoiceId: string): Promise<Invoice> {
  const baseUrl = getPspCoreBaseUrl();
  const { merchantId, apiKey } = getMerchantAuth();

  if (!apiKey) notFound();

  const url = `${baseUrl}/invoices/${encodeURIComponent(invoiceId)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-merchant-id": merchantId,
      "x-api-key": apiKey,
      accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) notFound();

  return (await res.json()) as Invoice;
}

async function fetchFxContext(invoiceId: string): Promise<FxContext | null> {
  const baseUrl = getPspCoreBaseUrl();
  const { merchantId, apiKey } = getMerchantAuth();

  if (!apiKey) return null;

  const url = `${baseUrl}/accounting/entries/${encodeURIComponent(
    invoiceId
  )}/context`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-merchant-id": merchantId,
      "x-api-key": apiKey,
      accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = (await res.json()) as FxContext;
  if (!data || typeof data.invoiceId !== "string") return null;

  return data;
}

export default async function AccountingInvoicePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const invoiceId = typeof sp.invoiceId === "string" ? sp.invoiceId : "";
  const merchantIdQs = typeof sp.merchantId === "string" ? sp.merchantId : "";
  const limit = typeof sp.limit === "string" ? sp.limit : "";
  const from = typeof sp.from === "string" ? sp.from : "";
  const to = typeof sp.to === "string" ? sp.to : "";

  if (!invoiceId) notFound();

  // ✅ Always fetch invoice from PSP-core via env base URL (no relative /api URLs on server)
  const invoice = await fetchInvoiceFromCore(invoiceId);

  // ✅ FX context (read-only audit metadata)
  const fx = await fetchFxContext(invoiceId);

  const backQs = toQuery({
    merchantId: merchantIdQs || (invoice.merchantId ?? ""),
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

        <Link
          href={`/accounting${backQs}`}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
        >
          ← Back to Accounting
        </Link>
      </div>

      {/* ✅ FX Context card */}
      <div className="mb-4 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="text-sm font-semibold text-zinc-900">FX context</div>

        {fx ? (
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="text-xs text-zinc-700">
              <span className="font-semibold text-zinc-900">Pair:</span>{" "}
              {fx.fxPair ?? "—"}
            </div>
            <div className="text-xs text-zinc-700">
              <span className="font-semibold text-zinc-900">Rate:</span>{" "}
              {typeof fx.fxRate === "number" ? fx.fxRate : "—"}
            </div>
            <div className="text-xs text-zinc-700">
              <span className="font-semibold text-zinc-900">Source:</span>{" "}
              {fx.fxSource ?? "—"}
            </div>
            <div className="text-xs text-zinc-700">
              <span className="font-semibold text-zinc-900">Locked at:</span>{" "}
              {fx.fxLockedAt
                ? new Date(fx.fxLockedAt).toLocaleString("de-CH")
                : "—"}
            </div>

            <div className="text-xs text-zinc-700">
              <span className="font-semibold text-zinc-900">Fiat:</span>{" "}
              {fx.fiatAmount} {fx.fiatCurrency}
            </div>
            <div className="text-xs text-zinc-700">
              <span className="font-semibold text-zinc-900">Crypto:</span>{" "}
              {fx.cryptoAmount} {fx.cryptoCurrency}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-zinc-500">
            FX context is not available (missing PSP_API_KEY or API not
            reachable).
          </p>
        )}
      </div>

      <InvoiceOverview invoice={invoice} />
      <InvoicePaymentInstructions invoice={invoice} />
      <InvoiceTransaction invoice={invoice} />
      <InvoiceAmlDecision invoice={invoice} />
    </div>
  );
}
