"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  fetchInvoice,
  fetchInvoiceWebhooks,
  dispatchInvoiceWebhooks,
  runInvoiceAmlCheck,
  attachInvoiceTransaction,
  confirmInvoice,
  rejectInvoice,
  expireInvoice,
  type Invoice,
  type WebhookEvent,
  type WebhookDispatchResult,
  type AttachTransactionPayload,
} from "@/lib/pspApi";

import { InvoiceHeader } from "@/components/invoice-details/InvoiceHeader";
import { OverviewCard } from "@/components/invoice-details/OverviewCard";
import { BlockchainCard } from "@/components/invoice-details/BlockchainCard";
import { WebhooksCard } from "@/components/invoice-details/WebhooksCard";
import { OperatorActionsCard } from "@/components/invoice-details/OperatorActionsCard";

const POLL_INTERVAL_MS = 15000; // 15 секунд

export default function InvoiceDetailsPage() {
  const router = useRouter();
  const params = useParams();

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
  const [amlLoading, setAmlLoading] = useState(false);
  const [savingTx, setSavingTx] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webhookInfo, setWebhookInfo] = useState<WebhookDispatchResult | null>(
    null
  );

  // =============== LOAD INVOICE + WEBHOOKS (первичная загрузка) =================

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
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load invoice";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [invoiceId]);

  // =============== AUTO-POLL ИНВОЙСА КАЖДЫЕ 15 СЕКУНД =================

  useEffect(() => {
    if (!invoiceId) return;

    const intervalId = setInterval(async () => {
      try {
        const latest = await fetchInvoice(invoiceId);
        setInvoice(latest);
      } catch {
        // здесь тихо игнорируем, чтобы не спамить ошибками при временных сетевых проблемах
      }
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [invoiceId]);

  // ================= RELOAD WEBHOOKS =================

  async function reloadWebhooks() {
    if (!invoiceId) return;

    try {
      setWebhooksLoading(true);
      const wh = await fetchInvoiceWebhooks(invoiceId);
      setWebhooks(wh);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load webhooks";
      setError(message);
    } finally {
      setWebhooksLoading(false);
    }
  }

  // ================= DISPATCH WEBHOOKS =================

  async function handleDispatchWebhooks() {
    if (!invoiceId) return;
    try {
      setDispatching(true);
      setWebhookInfo(null);

      const result = await dispatchInvoiceWebhooks(invoiceId);
      setWebhookInfo(result);

      await reloadWebhooks();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to dispatch webhooks";
      setError(message);
    } finally {
      setDispatching(false);
    }
  }

  // ================= AML CHECK =================

  async function handleRunAml() {
    if (!invoiceId || !invoice) return;

    try {
      setAmlLoading(true);
      setError(null);

      const updated = await runInvoiceAmlCheck(invoice.id);
      setInvoice(updated);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to run AML check";
      setError(message);
    } finally {
      setAmlLoading(false);
    }
  }

  // ================= ATTACH BLOCKCHAIN TX =================

  async function handleAttachTx(payload: AttachTransactionPayload) {
    if (!invoiceId) return;

    try {
      setSavingTx(true);
      setError(null);

      const updated = await attachInvoiceTransaction(invoiceId, payload);
      setInvoice(updated);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to attach transaction";
      setError(message);
    } finally {
      setSavingTx(false);
    }
  }

  // ================= OPERATOR ACTIONS =================

  async function handleConfirm() {
    if (!invoiceId) return;
    try {
      setError(null);
      const updated = await confirmInvoice(invoiceId);
      setInvoice(updated);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to confirm invoice";
      setError(message);
    }
  }

  async function handleReject() {
    if (!invoiceId) return;
    try {
      setError(null);
      const updated = await rejectInvoice(invoiceId);
      setInvoice(updated);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to reject invoice";
      setError(message);
    }
  }

  async function handleExpire() {
    if (!invoiceId) return;
    try {
      setError(null);
      const updated = await expireInvoice(invoiceId);
      setInvoice(updated);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to expire invoice";
      setError(message);
    }
  }

  // ================= NAVIGATION =================

  const handleBack = () => {
    router.push("/invoices");
  };

  // ================= RENDER =================

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
