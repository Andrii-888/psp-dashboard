"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

import { useInvoiceDetails } from "@/hooks/useInvoiceDetails";

import { InvoiceHeader } from "@/components/invoice-details/InvoiceHeader";
import { OverviewCard } from "@/components/invoice-details/OverviewCard";
import { BlockchainCard } from "@/components/invoice-details/BlockchainCard";
import { WebhooksCard } from "@/components/invoice-details/WebhooksCard";
import { OperatorActionsCard } from "@/components/invoice-details/OperatorActionsCard";

export default function InvoiceDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const idParam = params?.id;
  const invoiceId =
    typeof idParam === "string"
      ? idParam
      : Array.isArray(idParam)
      ? idParam[0]
      : null;

  const {
    invoice,
    webhooks,
    loading,
    webhooksLoading,
    dispatching,
    amlLoading,
    savingTx,
    error,
    webhookInfo,
    reloadWebhooks,
    handleDispatchWebhooks,
    handleRunAml,
    handleAttachTx,
    handleConfirm,
    handleReject,
    handleExpire,
  } = useInvoiceDetails(invoiceId);

  // ✅ Умный back: сохраняет фильтры/URL, если пришли со списка
  const handleBack = () => {
    // если пользователь пришел со списка — вернёмся туда же (/invoices?...filters)
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    // если открыли страницу напрямую — идем на список без параметров
    router.push("/invoices");
  };

  // UX: если invoiceId нет — можно сразу вернуть на список
  useEffect(() => {
    if (!invoiceId) {
      // небольшой safety: не ломаем рендер, просто редирект
      router.push("/invoices");
    }
  }, [invoiceId, router]);

  if (!invoiceId) {
    return (
      <main className="min-h-screen bg-page-gradient px-4 py-6 text-slate-50 md:px-8 md:py-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-slate-400">Invoice id is missing.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-page-gradient px-4 py-6 text-slate-50 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 md:gap-6">
        <InvoiceHeader invoice={invoice} onBack={handleBack} />

        {loading && (
          <section className="apple-card px-4 py-6 md:px-6 md:py-8">
            <p className="text-sm text-slate-400">Loading invoice…</p>
          </section>
        )}

        {!loading && error && (
          <section className="apple-card px-4 py-6 md:px-6 md:py-8">
            <p className="text-sm text-rose-200">{error}</p>
          </section>
        )}

        {!loading && !error && invoice && (
          <>
            <OverviewCard
              invoice={invoice}
              onRunAml={handleRunAml}
              amlLoading={amlLoading}
            />

            <OperatorActionsCard
              invoice={invoice}
              onConfirm={handleConfirm}
              onReject={handleReject}
              onExpire={handleExpire}
            />

            <BlockchainCard
              invoice={invoice}
              savingTx={savingTx}
              onAttachTx={handleAttachTx}
            />

            <WebhooksCard
              webhooks={webhooks}
              webhookInfo={webhookInfo}
              webhooksLoading={webhooksLoading}
              dispatching={dispatching}
              onReload={reloadWebhooks}
              onDispatch={handleDispatchWebhooks}
            />
          </>
        )}
      </div>
    </main>
  );
}
