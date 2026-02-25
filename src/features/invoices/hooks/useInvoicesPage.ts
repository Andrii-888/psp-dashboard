"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchOperatorInvoices, type Invoice } from "@/shared/api/pspApi";
import {
  filterInvoices,
  type InvoiceFilterParams,
} from "@/features/invoices/lib/filterInvoices";

export type DatePreset = "all" | "today" | "7d" | "30d";

type ReloadOptions = {
  silent?: boolean; // ✅ для polling: не дергаем UI
};

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

  reload: (opts?: ReloadOptions) => Promise<void>;
  lastUpdatedAt: Date | null;
}

const POLL_INTERVAL_MS = 3000;

const CHF = "CHF";

// ✅ стабильный fingerprint (без sort; предполагаем stable order от API)
function fingerprint(invoices: Invoice[]): string {
  return invoices
    .map((inv) => {
      return [
        inv.id,
        inv.status ?? "",
        inv.txStatus ?? "",
        inv.txHash ?? "",
        inv.walletAddress ?? "",
        inv.amlStatus ?? "",
        String(inv.riskScore ?? ""),
        String(inv.confirmations ?? 0),
        inv.detectedAt ?? "",
        inv.confirmedAt ?? "",
        inv.createdAt ?? "",
        inv.expiresAt ?? "",
      ].join("|");
    })
    .join("\n");
}

export function useInvoicesPage(
  searchParams?: Record<string, string | string[] | undefined>
): UseInvoicesPageResult {
  const decisionParam =
    typeof searchParams?.decision === "string"
      ? searchParams.decision.toLowerCase()
      : undefined;

  const riskParam =
    typeof searchParams?.risk === "string"
      ? searchParams.risk.toLowerCase()
      : undefined;

  const statusParam =
    typeof searchParams?.status === "string"
      ? searchParams.status.toLowerCase()
      : undefined;

  const amlParam =
    typeof searchParams?.aml === "string"
      ? searchParams.aml.toLowerCase()
      : undefined;

  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>(
    statusParam && statusParam.length > 0 ? statusParam : "all"
  );

  const [amlFilter, setAmlFilter] = useState<string>(
    amlParam && amlParam.length > 0 ? amlParam : "all"
  );
  const [search, setSearch] = useState<string>("");

  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");

  const [datePreset, setDatePreset] = useState<DatePreset>("all");

  const [txHashSearch, setTxHashSearch] = useState<string>("");
  const [walletSearch, setWalletSearch] = useState<string>("");
  const [merchantSearch, setMerchantSearch] = useState<string>("");

  // ✅ хранит последний fingerprint, чтобы не менять state без причины
  const lastFpRef = useRef<string>("");

  // ✅ защита от параллельных reload (polling + manual)
  const inFlightRef = useRef(false);

  // ✅ пометка что первый load уже был (после него включаем polling)
  const [didInitialLoad, setDidInitialLoad] = useState(false);

  const reload = useCallback(async (opts?: ReloadOptions) => {
    const silent = opts?.silent === true;

    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      const items = await fetchOperatorInvoices({ limit: 500 });

      const nextChf = items.filter((i) => {
        // CHF-first: invoices with missing/unknown fiatCurrency are dropped (no non-CHF / no null in UI)
        const cur = String(i.fiatCurrency ?? "")
          .trim()
          .toUpperCase();
        return cur === CHF;
      });

      const nextFp = fingerprint(nextChf);
      if (nextFp === lastFpRef.current) return;

      lastFpRef.current = nextFp;
      setAllInvoices(nextChf);
      setLastUpdatedAt(new Date());
      if (!silent) setError(null);
    } catch (err: unknown) {
      if (!silent) {
        const message =
          err instanceof Error ? err.message : "Failed to load invoices";
        setError(message);
      }
    } finally {
      inFlightRef.current = false;
      if (!silent) setLoading(false);
    }
  }, []);

  // ✅ initial load (normal, с loading)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      await reload({ silent: false });
      if (!cancelled) setDidInitialLoad(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [reload]);

  // ✅ polling: every 3s after initial load, silently (no UI flicker)
  useEffect(() => {
    if (!didInitialLoad) return;

    const id = window.setInterval(() => {
      void reload({ silent: true });
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [didInitialLoad, reload]);

  const filterParams: InvoiceFilterParams = useMemo(
    () => ({
      statusFilter,
      amlFilter,
      search,
      minAmount,
      maxAmount,
      datePreset,
      txHashSearch,
      walletSearch,
      merchantSearch,
    }),
    [
      statusFilter,
      amlFilter,
      search,
      minAmount,
      maxAmount,
      datePreset,
      txHashSearch,
      walletSearch,
      merchantSearch,
    ]
  );

  const invoices = useMemo(() => {
    let base = filterInvoices(allInvoices, filterParams);

    const norm = (v: unknown) => String(v ?? "").toLowerCase();

    // decision filter
    if (decisionParam) {
      if (decisionParam === "queue") {
        base = base.filter((inv) => {
          const ds = norm(inv.decisionStatus);
          return ds === "pending" || ds === "hold" || ds === "";
        });
      } else {
        base = base.filter((inv) => norm(inv.decisionStatus) === decisionParam);
      }
    }

    // risk filter
    if (riskParam === "high") {
      base = base.filter((inv) => {
        const risk = Number(inv.riskScore);
        const asset = Number(inv.assetRiskScore);
        const r = Math.max(
          Number.isFinite(risk) ? risk : 0,
          Number.isFinite(asset) ? asset : 0
        );
        return r >= 70;
      });
    }

    return base;
  }, [allInvoices, filterParams, decisionParam, riskParam]);

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
