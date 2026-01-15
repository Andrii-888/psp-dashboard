// src/app/accounting/components/AccountingTableClient.tsx

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import AccountingTable from "./AccountingTable";
import type { AccountingEntryRaw } from "../lib/types";

export default function AccountingTableClient({
  entries,
}: {
  entries: AccountingEntryRaw[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleInvoiceClick(invoiceId: string) {
    const qs = new URLSearchParams(searchParams.toString());
    qs.set("invoiceId", invoiceId);

    router.push(`/accounting/invoice?${qs.toString()}`);
  }

  return (
    <AccountingTable entries={entries} onInvoiceClick={handleInvoiceClick} />
  );
}
