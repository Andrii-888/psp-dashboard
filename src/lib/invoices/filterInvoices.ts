// src/lib/invoices/filterInvoices.ts
import type { Invoice } from "@/lib/pspApi";

export interface InvoiceFilterParams {
  statusFilter: string;
  amlFilter: string;
  search: string;
  minAmount: string;
  maxAmount: string;
  datePreset: "all" | "today" | "7d" | "30d";
  txHashSearch: string;
  walletSearch: string;
  merchantSearch: string;
}

export function filterInvoices(
  data: Invoice[],
  {
    statusFilter,
    amlFilter,
    search,
    minAmount,
    maxAmount,
    datePreset,
    txHashSearch,
    walletSearch,
    merchantSearch,
  }: InvoiceFilterParams
): Invoice[] {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );

  return data.filter((inv) => {
    // 🔎 Поиск по ID
    const matchSearch = search
      ? inv.id.toLowerCase().includes(search.toLowerCase())
      : true;

    // 🟢 Статус
    const matchStatus =
      statusFilter === "all" ? true : inv.status === statusFilter;

    // 🧩 AML
    const matchAml =
      amlFilter === "all"
        ? true
        : amlFilter === "none"
        ? inv.amlStatus == null
        : inv.amlStatus === amlFilter;

    // 💰 Сумма
    let matchAmount = true;

    const min = minAmount ? Number(minAmount.replace(",", ".")) : undefined;
    const max = maxAmount ? Number(maxAmount.replace(",", ".")) : undefined;

    if (typeof min === "number" && !Number.isNaN(min)) {
      if (inv.fiatAmount < min) matchAmount = false;
    }

    if (typeof max === "number" && !Number.isNaN(max)) {
      if (inv.fiatAmount > max) matchAmount = false;
    }

    // 📆 Дата
    let matchDate = true;
    const createdAt = new Date(inv.createdAt);

    switch (datePreset) {
      case "today": {
        matchDate = createdAt >= startOfToday;
        break;
      }
      case "7d": {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchDate = createdAt >= sevenDaysAgo;
        break;
      }
      case "30d": {
        const thirtyDaysAgo = new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000
        );
        matchDate = createdAt >= thirtyDaysAgo;
        break;
      }
      case "all":
      default:
        matchDate = true;
    }

    // 🔗 txHash / wallet / merchantId
    const matchTxHash = txHashSearch
      ? (inv.txHash ?? "").toLowerCase().includes(txHashSearch.toLowerCase())
      : true;

    const matchWallet = walletSearch
      ? (inv.walletAddress ?? "")
          .toLowerCase()
          .includes(walletSearch.toLowerCase())
      : true;

    const matchMerchant = merchantSearch
      ? (inv.merchantId ?? "")
          .toLowerCase()
          .includes(merchantSearch.toLowerCase())
      : true;

    return (
      matchSearch &&
      matchStatus &&
      matchAml &&
      matchAmount &&
      matchDate &&
      matchTxHash &&
      matchWallet &&
      matchMerchant
    );
  });
}
