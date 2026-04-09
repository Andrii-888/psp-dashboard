// src/app/accounting/invoice/page.tsx

import { notFound } from "next/navigation";
import { InvoiceLedgerEvent } from "@/shared/api/pspApi";
import InvoiceAccountingHeader from "@/features/accounting/invoice/ui/InvoiceAccountingHeader";
import Identification from "@/features/accounting/invoice/ui/Identification";
import Money from "@/features/accounting/invoice/ui/Money";
import FXReceipt from "@/features/accounting/invoice/ui/FXReceipt";
import BlockchainReference from "@/features/accounting/invoice/ui/BlockchainReference";
import Compliance from "@/features/accounting/invoice/ui/Compliance";
import Accounting from "@/features/accounting/invoice/ui/Accounting";

import ErrorState from "@/features/accounting/ui/ErrorState";
import { getInvoice } from "@/features/accounting/invoice/lib/getInvoice";

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

  const json = await res.json();
  console.log("DEBUG invoice json:", JSON.stringify(json, null, 2));
  return (
    json && typeof json === "object" && "data" in json ? json.data : json
  ) as Invoice;
}

async function fetchInvoiceLedgerFromCore(
  invoiceId: string
): Promise<unknown[]> {
  const baseUrl = getPspCoreBaseUrl();
  const { merchantId, apiKey } = getMerchantAuth();

  const url = `${baseUrl}/invoices/${encodeURIComponent(
    invoiceId
  )}/ledger?limit=100`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-merchant-id": merchantId,
        "x-api-key": apiKey,
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) return [];

    const json = await res.json();
    const data = (
      json && typeof json === "object" && "data" in (json as object)
        ? (json as Record<string, unknown>)["data"]
        : json
    ) as unknown;
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj["items"])) return obj["items"] as unknown[];
    }
    return [];
  } catch {
    return [];
  }
}

export default async function AccountingInvoicePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const invoiceId = typeof sp.invoiceId === "string" ? sp.invoiceId : "";
  if (!invoiceId) notFound();

  const apiKey = (process.env.PSP_API_KEY ?? "").trim();
  if (!apiKey) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <ErrorState
          title="Missing PSP_API_KEY"
          description="Set PSP_API_KEY in env (Vercel/locals) to load invoice details."
        />
      </div>
    );
  }

  const invoice = await fetchInvoiceFromCore(invoiceId);
  const ledgerEvents = await fetchInvoiceLedgerFromCore(invoiceId);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <InvoiceAccountingHeader invoice={invoice} />

      {/* SINGLE RECEIPT SURFACE (one "check") */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {/* Top subtle accent */}
        <div className="h-1 w-full bg-zinc-900/5" />

        {/* Sections inside: no individual cards, only dividers */}
        <div
          className={[
            "divide-y divide-zinc-100",
            "[&>section]:m-0",
            "[&>section]:rounded-none",
            "[&>section]:border-0",
            "[&>section]:shadow-none",
          ].join(" ")}
        >
          <Identification invoice={invoice} />
          <Money invoice={invoice} />
          <FXReceipt invoice={invoice} />
          <BlockchainReference invoice={invoice} />
          <Compliance invoice={invoice} />
          <Accounting
            invoiceId={invoiceId}
            invoice={invoice as Invoice}
            ledgerEvents={ledgerEvents as InvoiceLedgerEvent[]}
          />
        </div>

        {/* Footer note */}
        <div className="px-6 pb-6 pt-4 text-xs text-zinc-500">
          This receipt is a single-page accounting view. Long-term retention (10
          years) is supported by storing the underlying payment facts (invoice +
          ledger SSOT) and providing them on request.
        </div>
      </div>
    </div>
  );
}
