"use client";

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

    reload,
    lastUpdatedAt,
  } = useInvoicesPage();

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

  /* =========================
     Render
  ========================= */
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-50 md:px-8 md:py-8">
      <ToastStack toasts={toasts} onRemove={removeToast} />

      <div className="mx-auto flex w-full max-w-none flex-col gap-4 md:gap-6">
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

        {/* Filters */}
        <section className="apple-card-section">
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
    </main>
  );
}
