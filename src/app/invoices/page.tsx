"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiltersBar } from "@/components/FiltersBar";
import { InvoicesTable } from "@/components/invoices/InvoicesTable";
import { InvoicesPageHeader } from "@/components/invoices/InvoicesPageHeader";

import { useInvoicesPage } from "@/hooks/useInvoicesPage";
import { useLiveInvoices } from "@/hooks/useLiveInvoices";

import { healthCheck } from "@/lib/pspApi";
import { ToastStack, type ToastItem } from "@/components/ui/ToastStack";

/* =========================
   Helpers
========================= */
function makeToastId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/* =========================
   Page
========================= */
export default function InvoicesPage() {
  const {
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
  } = useInvoicesPage();

  // eslint wants these used (we’ll plug into header later)
  void confirmedCount;
  void waitingCount;
  void highRiskCount;

  /* =========================
     API health
  ========================= */
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  /* =========================
     UI states
  ========================= */
  const [refreshing, setRefreshing] = useState(false);

  /* =========================
     Toasts
  ========================= */
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  function pushToast(message: string, variant: ToastItem["variant"] = "info") {
    setToasts((prev) => [...prev, { id: makeToastId(), message, variant }]);
  }

  function removeToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  /* =========================
     Live invoices (detect + sound)
     (polling is inside useInvoicesPage)
  ========================= */
  const resetKey = [
    statusFilter,
    amlFilter,
    search,
    minAmount,
    maxAmount,
    datePreset,
    txHashSearch,
    walletSearch,
    merchantSearch,
  ].join("|");

  const { liveOn, soundOn, toggleSound } = useLiveInvoices({
    invoices,
    reload, // ✅ ОБЯЗАТЕЛЬНО
    resetKey,
    onNewInvoices: (count) => {
      pushToast(
        count === 1
          ? "New invoice received"
          : `New invoices received: ${count}`,
        "success"
      );
    },
  });

  /* =========================
     Pagination (always 20)
  ========================= */
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const pagedInvoices = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return invoices.slice(start, start + PAGE_SIZE);
  }, [invoices, page]);

  const pageFrom = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageTo = Math.min(page * PAGE_SIZE, totalCount);

  /* =========================
     Health check (once)
  ========================= */
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    let mounted = true;

    (async () => {
      try {
        setApiOk(null);
        setApiError(null);
        await healthCheck();
        if (mounted) setApiOk(true);
      } catch (e) {
        if (!mounted) return;
        setApiOk(false);
        setApiError(e instanceof Error ? e.message : "Unknown error");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* =========================
     Actions
  ========================= */
  async function handleRefresh() {
    try {
      setRefreshing(true);
      await reload();
      pushToast("Invoices refreshed", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to refresh";
      setApiOk(false);
      setApiError(msg);
      pushToast(msg, "error");
    } finally {
      setRefreshing(false);
    }
  }

  /* =========================
     Render
  ========================= */
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-50 md:px-8 md:py-8">
      <ToastStack toasts={toasts} onRemove={removeToast} />

      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:gap-6">
        <InvoicesPageHeader
          apiOk={apiOk}
          apiError={apiError}
          lastUpdatedAt={lastUpdatedAt ?? null}
          liveOn={liveOn}
          soundOn={soundOn}
          toggleSound={toggleSound}
          loading={loading}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />

        {/* Filters */}
        <section className="apple-card-section">
          <FiltersBar
            status={statusFilter}
            onStatusChange={setStatusFilter}
            amlStatus={amlFilter}
            onAmlStatusChange={setAmlFilter}
            search={search}
            onSearchChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            minAmount={minAmount}
            maxAmount={maxAmount}
            onMinAmountChange={(v) => {
              setMinAmount(v);
              setPage(1);
            }}
            onMaxAmountChange={(v) => {
              setMaxAmount(v);
              setPage(1);
            }}
            datePreset={datePreset}
            onDatePresetChange={(v) => {
              setDatePreset(v);
              setPage(1);
            }}
            txHash={txHashSearch}
            onTxHashChange={(v) => {
              setTxHashSearch(v);
              setPage(1);
            }}
            walletAddress={walletSearch}
            onWalletAddressChange={(v) => {
              setWalletSearch(v);
              setPage(1);
            }}
            merchantId={merchantSearch}
            onMerchantIdChange={(v) => {
              setMerchantSearch(v);
              setPage(1);
            }}
          />
        </section>

        {/* Table */}
        <section className="apple-card overflow-hidden">
          <InvoicesTable
            invoices={pagedInvoices}
            loading={loading}
            error={error}
          />

          {totalCount > 0 && (
            <div className="mt-3 flex flex-col items-center justify-between gap-2 px-4 pb-4 text-xs text-slate-400 md:flex-row">
              <div>
                Showing{" "}
                <span className="font-medium text-slate-200">
                  {pageFrom}–{pageTo}
                </span>{" "}
                of{" "}
                <span className="font-medium text-slate-200">{totalCount}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-full bg-slate-800/60 px-3 py-1 ring-1 ring-slate-700/70 disabled:opacity-60"
                >
                  Prev
                </button>

                <span className="text-[11px]">
                  Page {page} / {totalPages}
                </span>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-full bg-slate-800/60 px-3 py-1 ring-1 ring-slate-700/70 disabled:opacity-60"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
