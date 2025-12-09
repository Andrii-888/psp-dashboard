"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  fetchInvoice,
  fetchInvoiceWebhooks,
  dispatchInvoiceWebhooks,
  type Invoice,
  type WebhookEvent,
  type WebhookDispatchResult,
} from "@/lib/pspApi";
import { InvoiceHeader } from "@/components/invoice-details/InvoiceHeader";
import { OverviewCard } from "@/components/invoice-details/OverviewCard";
import { BlockchainCard } from "@/components/invoice-details/BlockchainCard";
import { WebhooksCard } from "@/components/invoice-details/WebhooksCard";

export default function InvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const idParam = params?.id;
  const invoiceId =
    typeof idParam === "string"
      ? idParam
      : Array.isArray(idParam)
      ? idParam[0]
      : "";

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [webhooksLoading, setWebhooksLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webhookInfo, setWebhookInfo] = useState<WebhookDispatchResult | null>(
    null
  );

  useEffect(() => {
    if (!invoiceId) return;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [inv, wh] = await Promise.all([
          fetchInvoice(invoiceId),
          fetchInvoiceWebhooks(invoiceId),
        ]);

        setInvoice(inv);
        setWebhooks(wh);
      } catch (err: any) {
        setError(err?.message || "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [invoiceId]);

  async function reloadWebhooks() {
    if (!invoiceId) return;
    try {
      setWebhooksLoading(true);
      const wh = await fetchInvoiceWebhooks(invoiceId);
      setWebhooks(wh);
    } catch (err: any) {
      setError(err?.message || "Failed to load webhooks");
    } finally {
      setWebhooksLoading(false);
    }
  }

  async function handleDispatchWebhooks() {
    if (!invoiceId) return;
    try {
      setDispatching(true);
      setWebhookInfo(null);
      const result = await dispatchInvoiceWebhooks(invoiceId);
      setWebhookInfo(result);
      await reloadWebhooks();
    } catch (err: any) {
      setError(err?.message || "Failed to dispatch webhooks");
    } finally {
      setDispatching(false);
    }
  }

  if (!invoiceId) {
    return (
      <main className="min-h-screen bg-page-gradient px-4 py-6 text-slate-900 md:px-8 md:py-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-slate-500">Invoice id is missing.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-page-gradient px-4 py-6 text-slate-900 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 md:gap-6">
        {/* Header */}
        <InvoiceHeader
          invoice={invoice}
          onBack={() => router.push("/invoices")}
        />

        {/* Loading */}
        {loading && (
          <section className="apple-card apple-card-content px-4 py-6 md:px-6 md:py-8">
            <p className="text-sm text-slate-500">Loading invoice…</p>
          </section>
        )}

        {/* Error */}
        {!loading && error && (
          <section className="apple-card apple-card-content px-4 py-6 md:px-6 md:py-8">
            <p className="text-sm text-rose-200">{error}</p>
          </section>
        )}

        {/* Content */}
        {!loading && !error && invoice && (
          <>
            <OverviewCard invoice={invoice} />
            <BlockchainCard invoice={invoice} />
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
