// src/app/invoices/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  fetchInvoice,
  fetchInvoiceWebhooks,
  dispatchInvoiceWebhooks,
  runInvoiceAmlCheck,
  confirmInvoice,
  expireInvoice,
  rejectInvoice,
  type Invoice,
  type WebhookEvent,
  type WebhookDispatchResult,
} from "@/lib/pspApi";

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
      : "";

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [webhooksLoading, setWebhooksLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [amlLoading, setAmlLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webhookInfo, setWebhookInfo] = useState<WebhookDispatchResult | null>(
    null
  );

  // 🔁 начальная загрузка инвойса + webhooks
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
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load invoice");
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [invoiceId]);

  // 🔁 обновить только webhooks
  async function reloadWebhooks() {
    if (!invoiceId) return;
    try {
      setWebhooksLoading(true);
      const wh = await fetchInvoiceWebhooks(invoiceId);
      setWebhooks(wh);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load webhooks");
      }
    } finally {
      setWebhooksLoading(false);
    }
  }

  // 🚚 отправка pending webhooks
  async function handleDispatchWebhooks() {
    if (!invoiceId) return;
    try {
      setDispatching(true);
      setWebhookInfo(null);
      const result = await dispatchInvoiceWebhooks(invoiceId);
      setWebhookInfo(result);
      await reloadWebhooks();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to dispatch webhooks");
      }
    } finally {
      setDispatching(false);
    }
  }

  // ✅ запуск AUTO AML проверки
  async function handleRunAml() {
    if (!invoiceId || !invoice) return;

    try {
      setAmlLoading(true);
      setError(null);

      const updated = await runInvoiceAmlCheck(invoice.id);
      setInvoice(updated);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to run AML check");
      }
    } finally {
      setAmlLoading(false);
    }
  }

  // ✅ операторские действия: Confirm / Expire / Reject
  async function handleStatusChange(
    action: "confirm" | "expire" | "reject"
  ): Promise<void> {
    if (!invoiceId) return;

    try {
      setStatusUpdating(true);
      setError(null);

      let apiFn: (id: string) => Promise<Invoice>;

      switch (action) {
        case "confirm":
          apiFn = confirmInvoice;
          break;
        case "expire":
          apiFn = expireInvoice;
          break;
        case "reject":
          apiFn = rejectInvoice;
          break;
      }

      const updated = await apiFn(invoiceId);
      setInvoice(updated);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to update invoice status");
      }
    } finally {
      setStatusUpdating(false);
    }
  }

  const handleBack = () => {
    router.push("/invoices");
  };

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
              loading={statusUpdating}
              onConfirm={() => handleStatusChange("confirm")}
              onExpire={() => handleStatusChange("expire")}
              onReject={() => handleStatusChange("reject")}
            />

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
