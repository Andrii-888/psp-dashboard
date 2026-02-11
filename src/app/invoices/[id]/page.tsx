// src/app/invoices/[id]/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useInvoiceDetails } from "@/hooks/useInvoiceDetails";
import { AuditTrailCard } from "@/components/invoice-details/sections/audit-trail";
import { InvoiceHeader } from "@/components/invoice-details/sections/header";
import { OverviewCard } from "@/components/invoice-details/sections/overview";
import { ComplianceDecisionCard } from "@/components/invoice-details/sections/compliance";
import { BlockchainCard } from "@/components/invoice-details/sections/blockchain";
import { WebhooksCard } from "@/components/invoice-details/sections/webhooks";
import { ProviderEventsCard } from "@/components/invoice-details/sections/provider-events";
import { OperatorActionsCard } from "@/components/invoice-details/sections/operator-actions";

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

  if (!invoiceId) {
    return (
      <main className="min-h-screen bg-page-gradient px-4 py-6 text-slate-50 md:px-8 md:py-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 md:gap-6">
          <section className="apple-card px-4 py-6 md:px-6 md:py-8">
            <p className="text-sm text-slate-200">Invoice ID is missing.</p>
            <p className="mt-1 text-xs text-slate-500">
              Redirecting back to invoices list…
            </p>
          </section>
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

        {!loading && !error && !invoice && (
          <section className="apple-card px-4 py-6 md:px-6 md:py-8">
            <p className="text-sm text-slate-200">Invoice not found.</p>
            <p className="mt-1 text-xs text-slate-500">
              It may have been deleted, expired, or the ID is invalid.
            </p>
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

            <BlockchainCard
              invoice={invoice}
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
