// src/app/accounting/invoice/lib/getInvoice.ts

import type { Invoice } from "@/domain/invoices/types";
import { fetchInvoiceById } from "@/lib/pspApi";

export async function getInvoice(invoiceId: string): Promise<Invoice> {
  const res = await fetchInvoiceById(invoiceId);

  if (!res?.ok || !res.invoice || typeof res.invoice !== "object") {
    throw new Error("Invoice not found");
  }

  return res.invoice;
}
