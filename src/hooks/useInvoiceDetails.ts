"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  actionLoading: boolean;
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

function shouldPollInvoice(args: {
  status?: Invoice["status"] | null;
  txHash?: string | null;
  amlStatus?: Invoice["amlStatus"] | null;
}) {
  const isOpen = args.status === "waiting";
  const hasTx = Boolean(args.txHash?.trim());
  const amlPending = hasTx && args.amlStatus === null;

  // poll пока invoice открыт ИЛИ пока ждём AML после txHash
  return isOpen || amlPending;
}

function normalizeTx(tx: string | null | undefined): string | null {
  const t = tx?.trim();
  return t ? t : null;
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
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [webhookInfo, setWebhookInfo] = useState<WebhookDispatchResult | null>(
    null
  );

  // txHash, для которого мы уже запускали AML (auto/manual)
  const lastAutoAmlTxRef = useRef<string | null>(null);

  // ✅ глобальная защита от гонок: если выполняется действие — polling не перетирает invoice
  const isBusy = useMemo(() => {
    return (
      loading ||
      webhooksLoading ||
      dispatching ||
      amlLoading ||
      savingTx ||
      actionLoading
    );
  }, [
    loading,
    webhooksLoading,
    dispatching,
    amlLoading,
    savingTx,
    actionLoading,
  ]);

  // ================= RESET ON INVOICE CHANGE =================
  useEffect(() => {
    // при смене invoiceId сбрасываем transient-состояния
    setError(null);
    setWebhookInfo(null);
    lastAutoAmlTxRef.current = null;
  }, [invoiceId]);

  // ================= LOAD INVOICE + WEBHOOKS (первичная загрузка) =================
  useEffect(() => {
    let cancelled = false;

    if (!invoiceId) {
      setInvoice(null);
      setWebhooks([]);
      setError(null);
      setWebhookInfo(null);
      setLoading(false);
      lastAutoAmlTxRef.current = null;
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);
        setWebhookInfo(null);

        const [inv, wh] = await Promise.all([
          fetchInvoice(invoiceId),
          fetchInvoiceWebhooks(invoiceId),
        ]);

        if (cancelled) return;

        setInvoice(inv);
        setWebhooks(wh);

        const tx = normalizeTx(inv?.txHash ?? null);
        lastAutoAmlTxRef.current = inv.amlStatus !== null && tx ? tx : null;
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load invoice";
        setError(message);
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  // ================= AUTO-POLL INVOICE =================
  useEffect(() => {
    if (!invoiceId) return;

    const status = invoice?.status ?? null;
    const txHash = invoice?.txHash ?? null;
    const amlStatus = invoice?.amlStatus ?? null;

    if (!shouldPollInvoice({ status, txHash, amlStatus })) return;

    // ✅ пока идёт действие — polling не запускаем, чтобы не перетирать invoice в UI
    if (isBusy) return;

    let cancelled = false;
    const currentId = invoiceId;

    const tick = async () => {
      try {
        const latest = await fetchInvoice(currentId);
        if (cancelled) return;
        setInvoice(latest);
      } catch {
        // тихо игнорируем временные сетевые ошибки
      }
    };

    // сразу один тик, потом интервал
    void tick();

    const intervalId = setInterval(() => {
      void tick();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [invoiceId, invoice?.status, invoice?.txHash, invoice?.amlStatus, isBusy]);

  // ================= AUTO AML: txHash появился -> AML запускаем 1 раз =================
  useEffect(() => {
    if (!invoiceId) return;

    const invId = invoice?.id ?? null;
    const tx = normalizeTx(invoice?.txHash ?? null);
    const amlStatus = invoice?.amlStatus ?? null;

    if (!invId) return;

    const hasTx = Boolean(tx);
    const amlMissing = amlStatus === null;

    if (!hasTx || !amlMissing) return;
    if (amlLoading) return;
    if (actionLoading || savingTx || dispatching) return; // ✅ не мешаем операциям

    // уже запускали авто-AML для этого txHash — не повторяем
    if (lastAutoAmlTxRef.current === tx) return;

    let cancelled = false;

    (async () => {
      try {
        setAmlLoading(true);
        setError(null);

        // фиксируем сразу, чтобы не было дублей из-за polling
        lastAutoAmlTxRef.current = tx;

        const updated = await runInvoiceAmlCheck(invId);
        if (cancelled) return;
        setInvoice(updated);
      } catch (err: unknown) {
        if (cancelled) return;

        // если упало — разрешаем повтор (или кнопкой)
        lastAutoAmlTxRef.current = null;

        const message =
          err instanceof Error ? err.message : "Failed to run AML check";
        setError(message);
      } finally {
        if (cancelled) return;
        setAmlLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    invoiceId,
    invoice?.id,
    invoice?.txHash,
    invoice?.amlStatus,
    amlLoading,
    actionLoading,
    savingTx,
    dispatching,
  ]);

  // ================= RELOAD WEBHOOKS =================
  async function reloadWebhooks() {
    if (!invoiceId) return;

    try {
      setWebhooksLoading(true);
      setError(null);
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
    if (dispatching || actionLoading || savingTx) return;

    try {
      setDispatching(true);
      setError(null);
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

  // ================= AML CHECK (manual) =================
  async function handleRunAml() {
    if (!invoiceId || !invoice?.id) return;
    if (amlLoading || actionLoading || savingTx || dispatching) return;

    try {
      setAmlLoading(true);
      setError(null);

      const updated = await runInvoiceAmlCheck(invoice.id);
      setInvoice(updated);

      const tx = normalizeTx(updated?.txHash ?? null);
      if (tx) lastAutoAmlTxRef.current = tx;
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
    if (savingTx || actionLoading || dispatching) return;

    try {
      setSavingTx(true);
      setError(null);

      const updated = await attachInvoiceTransaction(invoiceId, payload);
      setInvoice(updated);

      // новый txHash -> разрешаем авто-AML (сбрасываем "уже делали")
      lastAutoAmlTxRef.current = null;
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
    if (actionLoading || savingTx || dispatching || amlLoading) return;

    try {
      setActionLoading(true);
      setError(null);
      const updated = await confirmInvoice(invoiceId);
      setInvoice(updated);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to confirm invoice";
      setError(message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!invoiceId) return;
    if (actionLoading || savingTx || dispatching || amlLoading) return;

    try {
      setActionLoading(true);
      setError(null);
      const updated = await rejectInvoice(invoiceId);
      setInvoice(updated);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to reject invoice";
      setError(message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleExpire() {
    if (!invoiceId) return;
    if (actionLoading || savingTx || dispatching || amlLoading) return;

    try {
      setActionLoading(true);
      setError(null);
      const updated = await expireInvoice(invoiceId);
      setInvoice(updated);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to expire invoice";
      setError(message);
    } finally {
      setActionLoading(false);
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
    actionLoading,
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
