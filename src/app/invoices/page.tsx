"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiltersBar } from "@/components/FiltersBar";
import { InvoicesTable } from "@/components/invoices/InvoicesTable";
import { useInvoicesPage } from "@/hooks/useInvoicesPage";
import { createInvoice, healthCheck } from "@/lib/pspApi";
import { ToastStack, type ToastItem } from "@/components/ui/ToastStack";

function makeToastId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

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

  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  // ✅ Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  function pushToast(message: string, variant: ToastItem["variant"] = "info") {
    const id = makeToastId();
    setToasts((prev) => [...prev, { id, message, variant }]);
  }
  function removeToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  // ✅ Pagination (client-side)
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // если фильтры поменялись и текущая страница стала невалидной — поправим
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const pagedInvoices = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return invoices.slice(start, start + PAGE_SIZE);
  }, [invoices, page]);

  const pageFrom = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageTo = Math.min(page * PAGE_SIZE, totalCount);

  // guard от двойного эффекта в dev (React StrictMode)
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
      } catch (e: unknown) {
        if (!mounted) return;

        setApiOk(false);
        setApiError(e instanceof Error ? e.message : "Unknown error");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await reload();
      pushToast("Invoices refreshed", "success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to refresh";
      setApiOk(false);
      setApiError(msg);
      pushToast(msg, "error");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCreateTestInvoice() {
    try {
      setCreating(true);

      await createInvoice({
        fiatAmount: 25,
        fiatCurrency: "CHF",
        cryptoCurrency: "USDT",
        network: "TRON",
        merchantId: "demo-merchant",
      });

      await reload();
      setPage(1);
      pushToast("Test invoice created", "success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create invoice";
      setApiOk(false);
      setApiError(msg);
      pushToast(msg, "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-50 md:px-8 md:py-8">
      <ToastStack toasts={toasts} onRemove={removeToast} />

      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:gap-6">
        {/* Header */}
        <header className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
              PSP Core — Invoices
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Internal dashboard for your Swiss crypto PSP core.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div
              className={[
                "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs backdrop-blur-md",
                apiOk === true
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200 shadow-[0_12px_35px_rgba(16,185,129,0.45)]"
                  : apiOk === false
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-200 shadow-[0_12px_35px_rgba(244,63,94,0.35)]"
                  : "border-slate-700/60 bg-slate-900/40 text-slate-300 shadow-[0_12px_35px_rgba(148,163,184,0.18)]",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-block h-2 w-2 rounded-full",
                  apiOk === true
                    ? "bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.45)]"
                    : apiOk === false
                    ? "bg-rose-400 shadow-[0_0_0_4px_rgba(244,63,94,0.35)]"
                    : "bg-slate-400 shadow-[0_0_0_4px_rgba(148,163,184,0.25)]",
                ].join(" ")}
              />
              <span className="font-medium">
                {apiOk === true
                  ? "Connected to PSP-core API"
                  : apiOk === false
                  ? "PSP-core API not reachable"
                  : "Checking PSP-core API…"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={loading || refreshing || creating}
                className="inline-flex items-center justify-center rounded-full bg-slate-800/60 px-4 py-1.5 text-xs font-medium text-slate-100 ring-1 ring-slate-700/70 transition hover:bg-slate-800/85 disabled:opacity-60"
              >
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>

              <button
                onClick={handleCreateTestInvoice}
                disabled={creating || apiOk === false}
                className="inline-flex items-center justify-center rounded-full bg-violet-500/20 px-4 py-1.5 text-xs font-medium text-violet-200 ring-1 ring-violet-500/30 transition hover:bg-violet-500/30 disabled:opacity-60"
              >
                {creating ? "Creating…" : "Create test invoice"}
              </button>
            </div>

            {lastUpdatedAt ? (
              <p className="text-[11px] text-slate-400">
                Updated:{" "}
                {lastUpdatedAt.toLocaleString("de-CH", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            ) : null}

            {apiOk === false && apiError ? (
              <p className="max-w-[420px] truncate text-[11px] text-rose-200/80">
                {apiError}
              </p>
            ) : null}
          </div>
        </header>

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

        {/* Main card with summary + table */}
        <section className="apple-card overflow-hidden">
          <div className="border-b border-slate-800/70 px-4 py-4 md:px-6 md:py-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
                  Invoices
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Showing latest records from your PSP core.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                <span className="rounded-full bg-slate-800/70 px-3 py-1">
                  Total:{" "}
                  <span className="font-semibold text-slate-50">
                    {totalCount}
                  </span>
                </span>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-200">
                  Confirmed:{" "}
                  <span className="font-semibold text-emerald-100">
                    {confirmedCount}
                  </span>
                </span>
                <span className="rounded-full bg-amber-500/10 px-3 py-1 text-amber-200">
                  Waiting:{" "}
                  <span className="font-semibold text-amber-100">
                    {waitingCount}
                  </span>
                </span>
                <span className="rounded-full bg-rose-500/12 px-3 py-1 text-rose-200 ring-1 ring-rose-500/40">
                  High-risk:{" "}
                  <span className="font-semibold text-rose-100">
                    {highRiskCount}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="px-3 py-3 md:px-4 md:py-4">
            <InvoicesTable
              invoices={pagedInvoices}
              loading={loading}
              error={error}
            />

            {/* ✅ Pagination controls */}
            {totalCount > 0 && (
              <div className="mt-3 flex flex-col items-center justify-between gap-2 px-1 text-xs text-slate-400 md:flex-row">
                <div>
                  Showing{" "}
                  <span className="font-medium text-slate-200">
                    {pageFrom}–{pageTo}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-slate-200">
                    {totalCount}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-full bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-100 ring-1 ring-slate-700/70 transition hover:bg-slate-800/85 disabled:opacity-60"
                  >
                    Prev
                  </button>

                  <span className="text-[11px] text-slate-500">
                    Page{" "}
                    <span className="font-medium text-slate-200">{page}</span> /{" "}
                    <span className="font-medium text-slate-200">
                      {totalPages}
                    </span>
                  </span>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-full bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-100 ring-1 ring-slate-700/70 transition hover:bg-slate-800/85 disabled:opacity-60"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
