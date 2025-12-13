"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchInvoices, type Invoice } from "@/lib/pspApi";

export type DatePreset = "all" | "today" | "7d" | "30d";

interface UseInvoicesPageResult {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;

  statusFilter: string;
  setStatusFilter: (value: string) => void;

  amlFilter: string;
  setAmlFilter: (value: string) => void;

  search: string;
  setSearch: (value: string) => void;

  minAmount: string;
  setMinAmount: (value: string) => void;

  maxAmount: string;
  setMaxAmount: (value: string) => void;

  datePreset: DatePreset;
  setDatePreset: (value: DatePreset) => void;

  txHashSearch: string;
  setTxHashSearch: (value: string) => void;

  walletSearch: string;
  setWalletSearch: (value: string) => void;

  merchantSearch: string;
  setMerchantSearch: (value: string) => void;

  totalCount: number;
  confirmedCount: number;
  waitingCount: number;
  highRiskCount: number;

  // ✅ NEW
  reload: () => Promise<void>;
  lastUpdatedAt: Date | null;
}

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function parseNumberInput(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function useInvoicesPage(): UseInvoicesPageResult {
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [amlFilter, setAmlFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");

  const [datePreset, setDatePreset] = useState<DatePreset>("all");

  const [txHashSearch, setTxHashSearch] = useState<string>("");
  const [walletSearch, setWalletSearch] = useState<string>("");
  const [merchantSearch, setMerchantSearch] = useState<string>("");

  // ✅ NEW: один источник правды для загрузки/обновления
  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchInvoices();
      setAllInvoices(Array.isArray(data) ? data : []);
      setLastUpdatedAt(new Date());
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load invoices";
      setError(message);
      setAllInvoices([]);
      setLastUpdatedAt(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ 1) Загружаем с API только один раз (на старте)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (cancelled) return;
      await reload();
    })();

    return () => {
      cancelled = true;
    };
  }, [reload]);

  // ✅ 2) Фильтруем локально (без повторных запросов)
  const invoices = useMemo(() => {
    const q = normalize(search);
    const qTx = normalize(txHashSearch);
    const qWallet = normalize(walletSearch);
    const qMerchant = normalize(merchantSearch);

    const min = parseNumberInput(minAmount);
    const max = parseNumberInput(maxAmount);

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

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return allInvoices.filter((inv) => {
      const matchSearch = q ? normalize(inv.id).includes(q) : true;

      const matchStatus =
        statusFilter === "all" ? true : inv.status === statusFilter;

      const matchAml =
        amlFilter === "all"
          ? true
          : amlFilter === "none"
          ? inv.amlStatus == null
          : inv.amlStatus === amlFilter;

      let matchAmount = true;
      if (min !== null && inv.fiatAmount < min) matchAmount = false;
      if (max !== null && inv.fiatAmount > max) matchAmount = false;

      let matchDate = true;
      const createdAt = new Date(inv.createdAt);
      if (Number.isNaN(createdAt.getTime())) {
        matchDate = true;
      } else {
        switch (datePreset) {
          case "today":
            matchDate = createdAt >= startOfToday;
            break;
          case "7d":
            matchDate = createdAt >= sevenDaysAgo;
            break;
          case "30d":
            matchDate = createdAt >= thirtyDaysAgo;
            break;
          case "all":
          default:
            matchDate = true;
        }
      }

      const matchTxHash = qTx
        ? normalize(inv.txHash ?? "").includes(qTx)
        : true;

      const matchWallet = qWallet
        ? normalize(inv.walletAddress ?? "").includes(qWallet)
        : true;

      const matchMerchant = qMerchant
        ? normalize(inv.merchantId ?? "").includes(qMerchant)
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
  }, [
    allInvoices,
    statusFilter,
    amlFilter,
    search,
    minAmount,
    maxAmount,
    datePreset,
    txHashSearch,
    walletSearch,
    merchantSearch,
  ]);

  const totalCount = invoices.length;
  const confirmedCount = invoices.filter(
    (inv) => inv.status === "confirmed"
  ).length;
  const waitingCount = invoices.filter(
    (inv) => inv.status === "waiting"
  ).length;
  const highRiskCount = invoices.filter(
    (inv) => inv.amlStatus === "risky"
  ).length;

  return {
    invoices,
    loading,
    error,

    statusFilter,
    setStatusFilter,

    amlFilter,
    setAmlFilter,

    search,
    setSearch,

    minAmount,
    setMinAmount,

    maxAmount,
    setMaxAmount,

    datePreset,
    setDatePreset,

    txHashSearch,
    setTxHashSearch,

    walletSearch,
    setWalletSearch,

    merchantSearch,
    setMerchantSearch,

    totalCount,
    confirmedCount,
    waitingCount,
    highRiskCount,

    reload,
    lastUpdatedAt,
  };
}
