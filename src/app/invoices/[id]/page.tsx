"use client";

import { useEffect, useMemo } from "react";
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

  const invoiceId = useMemo(() => {
    const idParam = (params as any)?.id;
    if (typeof idParam === "string") return idParam;
    if (Array.isArray(idParam)) return idParam[0] ?? null;
    return null;
  }, [params]);

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

  // ✅ Умный back: если пришли со списка — вернёмся туда же
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/invoices");
  };

  // ✅ Если invoiceId нет — уходим на список (без мигания)
  useEffect(() => {
    if (!invoiceId) router.replace("/invoices");
  }, [invoiceId, router]);

  // пока router.replace происходит — ничего не рисуем
  if (!invoiceId) return null;

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
