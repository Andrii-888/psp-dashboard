"use client";

import { useEffect, useState } from "react";

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

const POLL_INTERVAL_MS = 15000; // 15 секунд

interface UseInvoiceDetailsResult {
  invoice: Invoice | null;
  webhooks: WebhookEvent[];
  loading: boolean;
  webhooksLoading: boolean;
  dispatching: boolean;
  amlLoading: boolean;
  savingTx: boolean;
  error: string | null;
  webhookInfo: WebhookDispatchResult | null;

  reloadWebhooks: () => Promise<void>;
  handleDispatchWebhooks: () => Promise<void>;
  handleRunAml: () => Promise<void>;
  handleAttachTx: (payload: AttachTransactionPayload) => Promise<void>;
  handleConfirm: () => Promise<void>;
  handleReject: () => Promise<void>;
  handleExpire: () => Promise<void>;
}

function shouldPollInvoice(inv: Invoice | null) {
  const status = inv?.status;
  // poll только пока invoice "живой"
  return status === "waiting";
}

export function useInvoiceDetails(
  invoiceId: string | null
): UseInvoiceDetailsResult {
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
    let mounted = true;

    if (!invoiceId) {
      setInvoice(null);
      setWebhooks([]);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    async function load(currentId: string) {
      try {
        setLoading(true);
        setError(null);

        const [inv, wh] = await Promise.all([
          fetchInvoice(currentId),
          fetchInvoiceWebhooks(currentId),
        ]);

        if (!mounted) return;
        setInvoice(inv);
        setWebhooks(wh);
      } catch (err: unknown) {
        if (!mounted) return;
        const message =
          err instanceof Error ? err.message : "Failed to load invoice";
        setError(message);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load(invoiceId);

    return () => {
      mounted = false;
    };
  }, [invoiceId]);

  // =============== AUTO-POLL ИНВОЙСА (только пока waiting) =================
  useEffect(() => {
    if (!invoiceId) return;
    if (!shouldPollInvoice(invoice)) return;

    let mounted = true;
    const currentId = invoiceId;

    const intervalId = setInterval(async () => {
      try {
        const latest = await fetchInvoice(currentId);
        if (!mounted) return;
        setInvoice(latest);
      } catch {
        // тихо игнорируем временные сетевые ошибки
      }
    }, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [invoiceId, invoice?.status]);

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

  return {
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
  };
}
