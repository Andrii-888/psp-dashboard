// src/app/accounting/invoice/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";

import { InvoiceOverview } from "./components/InvoiceOverview";
import { InvoicePaymentInstructions } from "./components/InvoicePaymentInstructions";
import { InvoiceTransaction } from "./components/InvoiceTransaction";
import { InvoiceAmlDecision } from "./components/InvoiceAmlDecision";

import { getInvoice } from "./lib/getInvoice";
import { toQuery } from "../lib/searchParams";

export default async function AccountingInvoicePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const invoiceId = typeof sp.invoiceId === "string" ? sp.invoiceId : "";
  const merchantId = typeof sp.merchantId === "string" ? sp.merchantId : "";
  const limit = typeof sp.limit === "string" ? sp.limit : "";
  const from = typeof sp.from === "string" ? sp.from : "";
  const to = typeof sp.to === "string" ? sp.to : "";

  if (!invoiceId) notFound();

  const invoice = await getInvoice(invoiceId);

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

        <Link
          href={`/accounting${backQs}`}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
        >
          ← Back to Accounting
        </Link>
      </div>

      <InvoiceOverview invoice={invoice} />
      <InvoicePaymentInstructions invoice={invoice} />
      <InvoiceTransaction invoice={invoice} />
      <InvoiceAmlDecision invoice={invoice} />
    </div>
  );
}
