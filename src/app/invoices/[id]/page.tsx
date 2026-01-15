//src/app/invoices/[id]/page.tsx/
"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

import { useInvoiceDetails } from "@/hooks/useInvoiceDetails";

import { AuditTrailCard } from "@/components/invoice-details/overview/AuditTrailCard";

import { InvoiceHeader } from "@/components/invoice-details/InvoiceHeader";
import { OverviewCard } from "@/components/invoice-details/OverviewCard";
import { ComplianceDecisionCard } from "@/components/invoice-details/ComplianceDecisionCard";
import { BlockchainCard } from "@/components/invoice-details/BlockchainCard";
import { WebhooksCard } from "@/components/invoice-details/WebhooksCard";
import { ProviderEventsCard } from "@/components/invoice-details/ProviderEventsCard";
import { OperatorActionsCard } from "@/components/invoice-details/OperatorActionsCard";

type InvoiceRouteParams = {
  id?: string | string[];
};

export default function InvoiceDetailsPage() {
  const router = useRouter();
  const params = useParams<InvoiceRouteParams>();

  const idParam = params?.id;
  const invoiceId =
    typeof idParam === "string"
      ? idParam
      : Array.isArray(idParam)
      ? idParam[0] ?? null
      : null;

  const {
    invoice,
    webhooks,
    providerEvents,
    providerEventsLoading,
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

  // ⬅️ Back logic
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/invoices");
  };

  // ⬅️ Guard: no id → list
  useEffect(() => {
    if (!invoiceId) router.replace("/invoices");
  }, [invoiceId, router]);

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
              savingTx={savingTx}
              onAttachTx={handleAttachTx}
            />

            <ComplianceDecisionCard
              invoice={invoice}
              onDecide={async (payload) => {
                if (process.env.NODE_ENV !== "production") {
                  console.log("COMPLIANCE_DECISION", {
                    invoiceId: invoice.id,
                    ...payload,
                  });
                }
              }}
            />

            <OperatorActionsCard
              invoice={invoice}
              onConfirm={handleConfirm}
              onReject={handleReject}
              onExpire={handleExpire}
            />

            <AuditTrailCard invoice={invoice} />

            <ProviderEventsCard
              events={providerEvents}
              loading={providerEventsLoading}
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
