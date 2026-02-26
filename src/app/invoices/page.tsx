"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FiltersBar } from "@/features/invoices/ui/FiltersBar";
import { InvoicesTable } from "@/features/invoices/ui/InvoicesTable";
import { InvoicesPageHeader } from "@/features/invoices/ui/InvoicesPageHeader";
import { PaginationBar } from "@/shared/ui/table/PaginationBar";

import { useInvoicesPage } from "@/features/invoices/hooks/useInvoicesPage";
import { useLiveInvoices } from "@/features/invoices/hooks/useLiveInvoices";

import { useApiHealth } from "@/shared/hooks/useApiHealth";

import { ToastStack } from "@/shared/ui/components/ToastStack";
import { useToasts } from "@/shared/hooks/useToasts";
import { usePagination } from "@/shared/hooks/usePagination";

import { useInvoicesActions } from "@/features/invoices/actions/useInvoicesActions";

/* =========================
   Page
========================= */
function InvoicesPageInner() {
  const sp = useSearchParams();
  const decision = sp.get("decision") ?? undefined;
  const risk = sp.get("risk") ?? undefined;

  const status = sp.get("status") ?? undefined;
  const aml = sp.get("aml") ?? undefined;

  const router = useRouter();

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

    reload,
    lastUpdatedAt,
  } = useInvoicesPage({ decision, risk, status, aml });

  const { toasts, pushToast, removeToast } = useToasts();

  const { refreshing, refresh } = useInvoicesActions({ reload, pushToast });

  /* =========================
     API health
  ========================= */
  const { apiOk, apiError } = useApiHealth();

  /* =========================
     Query key for views
     - Used to reset LIVE detection state (new invoices notifications)
     - Used to reset Pagination to page 1 when filters change
  ========================= */
  const viewKey = [
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

  /* =========================
     Live invoices (detect + sound)
     Note: polling is inside useInvoicesPage()
  ========================= */
  const { liveOn, soundOn, toggleSound } = useLiveInvoices({
    invoices,
    reload, // required: refresh list on new invoice events
    resetKey: viewKey,
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

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      setScrolled(el.scrollTop > 4);
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const {
    page,
    setPage,
    totalPages,
    pageFrom,
    pageTo,
    pagedItems: pagedInvoices,
  } = usePagination({
    items: invoices,
    totalCount,
    pageSize: PAGE_SIZE,
    resetKey: viewKey,
  });

  useEffect(() => {
    // Берём текущий query напрямую из URL, чтобы не зависеть от sp (который меняется при replace)
    const current = new URLSearchParams(window.location.search);

    if (statusFilter && statusFilter !== "all")
      current.set("status", statusFilter);
    else current.delete("status");

    if (amlFilter && amlFilter !== "all") current.set("aml", amlFilter);
    else current.delete("aml");

    const nextQuery = current.toString();
    const nextUrl = nextQuery ? `/invoices?${nextQuery}` : "/invoices";

    // Guard: если URL уже такой же — не трогаем (убирает дёргание)
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl === nextUrl) return;

    router.replace(nextUrl);
  }, [statusFilter, amlFilter, router]);
  /* =========================
     Render
  ========================= */
  return (
    <main className="h-screen overflow-hidden bg-slate-950 px-4 py-6 text-slate-50 md:px-8 md:py-8">
      <ToastStack toasts={toasts} onRemove={removeToast} />

      <div className="mx-auto flex h-full w-full max-w-none flex-col">
        {/* Sticky top area */}
        <div
          className={[
            "sticky top-0 z-30 -mx-4 bg-slate-950/95 px-4 pb-4 backdrop-blur md:-mx-8 md:px-8 transition-shadow",
            scrolled
              ? "shadow-[0_2px_8px_rgba(0,0,0,0.4)] border-b border-slate-800"
              : "",
          ].join(" ")}
        >
          <div className="pt-0 md:pt-0">
            <InvoicesPageHeader
              apiOk={apiOk}
              apiError={apiError}
              lastUpdatedAt={lastUpdatedAt ?? null}
              liveOn={liveOn}
              soundOn={soundOn}
              toggleSound={toggleSound}
              loading={loading}
              refreshing={refreshing}
              onRefresh={refresh}
            />
          </div>

          {/* Filters */}
          <section className="apple-card-section mt-4">
            <FiltersBar
              status={statusFilter}
              onStatusChange={setStatusFilter}
              amlStatus={amlFilter}
              onAmlStatusChange={setAmlFilter}
              search={search}
              onSearchChange={setSearch}
              minAmount={minAmount}
              maxAmount={maxAmount}
              onMinAmountChange={setMinAmount}
              onMaxAmountChange={setMaxAmount}
              datePreset={datePreset}
              onDatePresetChange={setDatePreset}
              txHash={txHashSearch}
              onTxHashChange={setTxHashSearch}
              walletAddress={walletSearch}
              onWalletAddressChange={setWalletSearch}
              merchantId={merchantSearch}
              onMerchantIdChange={setMerchantSearch}
            />
          </section>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400">Active filters:</span>
            <button
              type="button"
              onClick={() =>
                router.push(
                  decision === "queue"
                    ? "/invoices"
                    : "/invoices?decision=queue"
                )
              }
              className={[
                "rounded-full px-3 py-1 ring-1 transition",
                decision === "queue"
                  ? "bg-amber-500/15 text-amber-200 ring-amber-500/30"
                  : "bg-white/5 text-slate-200 ring-white/10 hover:bg-white/10",
              ].join(" ")}
            >
              Queue
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  risk === "high" ? "/invoices" : "/invoices?risk=high"
                )
              }
              className={[
                "rounded-full px-3 py-1 ring-1 transition",
                risk === "high"
                  ? "bg-rose-500/15 text-rose-200 ring-rose-500/30"
                  : "bg-white/5 text-slate-200 ring-white/10 hover:bg-white/10",
              ].join(" ")}
            >
              High risk
            </button>

            <button
              type="button"
              onClick={() => router.push("/invoices")}
              className="ml-2 rounded-full bg-white/5 px-3 py-1 text-slate-200 ring-1 ring-white/10 hover:bg-white/10"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pt-4">
          {/* Table */}
          <section className="apple-card overflow-hidden">
            <InvoicesTable
              invoices={pagedInvoices}
              loading={loading}
              error={error}
            />

            <PaginationBar
              page={page}
              totalPages={totalPages}
              pageFrom={pageFrom}
              pageTo={pageTo}
              totalCount={totalCount}
              onPrev={() => setPage(page - 1)}
              onNext={() => setPage(page + 1)}
            />
          </section>
        </div>
      </div>
    </main>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-slate-300">Loading invoices…</div>
      }
    >
      <InvoicesPageInner />
    </Suspense>
  );
}
