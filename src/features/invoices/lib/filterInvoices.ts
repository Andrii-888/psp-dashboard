// src/lib/invoices/filterInvoices.ts
import type { Invoice } from "@/domain/invoices/types";

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

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function parseAmount(raw: string): number | null {
  const v = raw.trim();
  if (!v) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function filterInvoices(
  data: Invoice[],
  params: InvoiceFilterParams
): Invoice[] {
  const {
    statusFilter,
    amlFilter,
    search,
    minAmount,
    maxAmount,
    datePreset,
    txHashSearch,
    walletSearch,
    merchantSearch,
  } = params;

  const searchQ = search ? norm(search) : "";
  const txQ = txHashSearch ? norm(txHashSearch) : "";
  const walletQ = walletSearch ? norm(walletSearch) : "";
  const merchantQ = merchantSearch ? norm(merchantSearch) : "";

  const min = parseAmount(minAmount);
  const max = parseAmount(maxAmount);

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

  let dateFrom: Date | null = null;
  if (datePreset === "today") {
    dateFrom = startOfToday;
  } else if (datePreset === "7d") {
    dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (datePreset === "30d") {
    dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return data.filter((inv) => {
    // 🔎 Поиск по ID
    const matchSearch = searchQ ? inv.id.toLowerCase().includes(searchQ) : true;

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
    if (min !== null && inv.fiatAmount < min) matchAmount = false;
    if (max !== null && inv.fiatAmount > max) matchAmount = false;

    // 📆 Дата
    const matchDate = dateFrom ? new Date(inv.createdAt) >= dateFrom : true;

    // 🔗 txHash / wallet / merchantId
    const matchTxHash = txQ
      ? (inv.txHash ?? "").toLowerCase().includes(txQ)
      : true;

    const matchWallet = walletQ
      ? (inv.walletAddress ?? "").toLowerCase().includes(walletQ)
      : true;

    const matchMerchant = merchantQ
      ? (inv.merchantId ?? "").toLowerCase().includes(merchantQ)
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
