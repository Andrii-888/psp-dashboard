// src/hooks/useInvoiceDetails.ts
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import type {
  Invoice,
  WebhookEvent,
  WebhookDispatchResult,
  AttachTransactionPayload,
  ProviderEvent,
} from "@/domain/invoices/types";

import {
  fetchInvoiceById,
  fetchInvoiceWebhooks,
  fetchInvoiceProviderEvents,
  dispatchInvoiceWebhooks,
  runInvoiceAml,
  attachInvoiceTransaction,
  setInvoiceDecision,
  expireInvoice,
  confirmInvoice,
} from "@/shared/api/pspApi";

const POLL_INTERVAL_MS = 3000;

interface UseInvoiceDetailsResult {
  invoice: Invoice | null;

  // Outgoing webhook queue (our webhooks)
  webhooks: WebhookEvent[];

  // Incoming provider audit trail (NOWPayments -> provider_events)
  providerEvents: ProviderEvent[];
  providerEventsLoading: boolean;

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
  handleReject: (reasonText?: string) => Promise<void>;
  handleHold: (reasonText?: string) => Promise<void>;
  handleExpire: () => Promise<void>;
  handleApprove: () => Promise<void>;
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

function ensureInvoice(res: unknown, fallbackMessage: string): Invoice {
  if (!res || typeof res !== "object") {
    throw new Error(fallbackMessage);
  }

  const r = res as { ok?: boolean; invoice?: Invoice | null };

  if (r.ok === false) {
    throw new Error(fallbackMessage);
  }

  if (!r.invoice) {
    throw new Error(fallbackMessage);
  }

  return r.invoice;
}

export function useInvoiceDetails(
  invoiceId: string | null
): UseInvoiceDetailsResult {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([]);
  const [providerEvents, setProviderEvents] = useState<ProviderEvent[]>([]);
  const [providerEventsLoading, setProviderEventsLoading] = useState(false);
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

  // ✅ guard: polling tick overlap protection
  const pollInFlightRef = useRef(false);

  // ✅ timeout id holder for cleanup
  const pollTimerRef = useRef<number | null>(null);

  // ✅ block polling only during mutations (so UI doesn't get overwritten mid-action)
  const isMutating = useMemo(() => {
    return dispatching || amlLoading || savingTx || actionLoading;
  }, [dispatching, amlLoading, savingTx, actionLoading]);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ================= RESET ON INVOICE CHANGE =================
  useEffect(() => {
    setError(null);
    setWebhookInfo(null);
    lastAutoAmlTxRef.current = null;

    // cleanup poll timer on id change
    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollInFlightRef.current = false;
  }, [invoiceId]);

  // ================= LOAD INVOICE + WEBHOOKS (initial load) =================
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
        setProviderEventsLoading(true);
        setError(null);
        setWebhookInfo(null);

        const [invoiceRes, webhooksRes, providerEventsRes] = await Promise.all([
          fetchInvoiceById(invoiceId),
          fetchInvoiceWebhooks(invoiceId),
          fetchInvoiceProviderEvents(invoiceId, 50),
        ]);

        if (cancelled) return;

        const invoice = ensureInvoice(invoiceRes, "Failed to load invoice");
        const webhooks = Array.isArray(webhooksRes?.items)
          ? webhooksRes.items
          : [];

        const providerEvents = providerEventsRes;

        setInvoice(invoice);
        setWebhooks(webhooks);
        setProviderEvents(providerEvents);

        const tx = normalizeTx(invoice?.txHash ?? null);
        lastAutoAmlTxRef.current =
          invoice?.amlStatus !== null && tx ? tx : null;
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load invoice";
        setError(message);
        toast.error(message);
      } finally {
        if (cancelled) return;
        setProviderEventsLoading(false);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  // ================= AUTO-POLL INVOICE (safe, non-overlapping) =================
  useEffect(() => {
    if (!invoiceId) return;
    if (loading) return;

    const status = invoice?.status ?? null;
    const txHash = invoice?.txHash ?? null;
    const amlStatus = invoice?.amlStatus ?? null;

    // ❌ nothing to poll
    if (!shouldPollInvoice({ status, txHash, amlStatus })) return;

    // ❌ do not poll during mutations
    if (isMutating) return;

    let cancelled = false;
    const currentId = invoiceId;

    const scheduleNext = () => {
      if (cancelled) return;
      pollTimerRef.current = window.setTimeout(() => {
        void tick();
      }, POLL_INTERVAL_MS);
    };

    const tick = async () => {
      if (cancelled) return;

      // ⏸️ tab hidden → just reschedule
      if (typeof document !== "undefined" && document.hidden) {
        scheduleNext();
        return;
      }

      // ⛔ prevent overlapping requests
      if (pollInFlightRef.current) {
        scheduleNext();
        return;
      }

      pollInFlightRef.current = true;
      let shouldContinue = true;

      try {
        const res = await fetchInvoiceById(currentId);
        if (cancelled) return;

        const next = ensureInvoice(res, "Failed to load invoice");
        setInvoice(next);

        // ✅ decide if polling should continue AFTER update
        shouldContinue = shouldPollInvoice({
          status: next?.status ?? null,
          txHash: next?.txHash ?? null,
          amlStatus: next?.amlStatus ?? null,
        });
      } catch {
        // transient error → retry later
        shouldContinue = true;
      } finally {
        pollInFlightRef.current = false;

        if (!cancelled && shouldContinue) {
          scheduleNext();
        }
      }
    };

    // ▶️ start immediately
    void tick();

    return () => {
      cancelled = true;

      if (pollTimerRef.current) {
        window.clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }

      pollInFlightRef.current = false;
    };
  }, [
    invoiceId,
    loading,
    invoice?.status,
    invoice?.txHash,
    invoice?.amlStatus,
    isMutating,
  ]);

  // ================= AUTO AML: txHash appeared -> run AML once =================
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
    if (isMutating) return; // ✅ don't interfere with actions

    if (lastAutoAmlTxRef.current === tx) return;

    let cancelled = false;

    (async () => {
      try {
        setAmlLoading(true);
        setError(null);

        lastAutoAmlTxRef.current = tx;

        const res = await runInvoiceAml(invId);
        if (cancelled) return;
        setInvoice(res.invoice);
      } catch (err: unknown) {
        if (cancelled) return;

        lastAutoAmlTxRef.current = null;

        const message =
          err instanceof Error ? err.message : "Failed to run AML check";
        setError(message);
        toast.error(message);
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
    isMutating,
  ]);

  // ================= RELOAD WEBHOOKS =================
  async function reloadWebhooks() {
    if (!invoiceId) return;

    try {
      setWebhooksLoading(true);
      setError(null);

      const wh = await fetchInvoiceWebhooks(invoiceId);
      if (!mountedRef.current) return;

      setWebhooks(wh.items);
    } catch (err: unknown) {
      if (!mountedRef.current) return;

      const message =
        err instanceof Error ? err.message : "Failed to load webhooks";
      setError(message);
      toast.error(message);
    } finally {
      if (mountedRef.current) {
        setWebhooksLoading(false);
      }
    }
  }

  // ================= DISPATCH WEBHOOKS =================
  async function handleDispatchWebhooks() {
    if (!invoiceId) return;
    if (isMutating) return;

    try {
      setDispatching(true);
      setError(null);
      setWebhookInfo(null);

      const res = await dispatchInvoiceWebhooks(invoiceId);
      if (!mountedRef.current) return;
      setWebhookInfo(res.result);

      await reloadWebhooks();
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      const message =
        err instanceof Error ? err.message : "Failed to dispatch webhooks";
      setError(message);
      toast.error(message);
    } finally {
      if (!mountedRef.current) return;
      setDispatching(false);
    }
  }

  // ================= AML CHECK (manual) =================
  async function handleRunAml() {
    if (!invoiceId || !invoice?.id) return;
    if (amlLoading || isMutating) return;

    try {
      setAmlLoading(true);
      setError(null);

      const res = await runInvoiceAml(invoice.id);

      // ✅ If API returned updated invoice — apply immediately
      if (res?.invoice) {
        setInvoice(res.invoice);

        const tx = normalizeTx(res.invoice.txHash ?? null);
        if (tx) lastAutoAmlTxRef.current = tx;
      } else {
        const invoiceRes = await fetchInvoiceById(invoiceId);
        const fresh = ensureInvoice(invoiceRes, "Failed to reload invoice");
        setInvoice(fresh);

        const tx = normalizeTx(fresh?.txHash ?? null);
        if (tx) lastAutoAmlTxRef.current = tx;
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to run AML check";
      setError(message);
      toast.error(message);
    } finally {
      setAmlLoading(false);
    }
  }

  // ================= ATTACH BLOCKCHAIN TX =================
  async function handleAttachTx(payload: AttachTransactionPayload) {
    if (!invoiceId) return;
    if (savingTx || isMutating) return;

    try {
      setSavingTx(true);
      setError(null);

      const res = await attachInvoiceTransaction(invoiceId, payload);
      setInvoice(res.invoice);

      lastAutoAmlTxRef.current = null;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to attach transaction";
      setError(message);
      toast.error(message);
    } finally {
      setSavingTx(false);
    }
  }

  // ================= OPERATOR ACTIONS =================
  async function handleConfirm() {
    if (!invoiceId) return;
    if (isMutating) return;

    try {
      setActionLoading(true);
      setError(null);

      const res = await confirmInvoice(invoiceId);
      setInvoice(res.invoice);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to confirm transaction";
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  }
  async function handleApprove() {
    if (!invoiceId) return;

    try {
      setActionLoading(true);
      setError(null);

      await setInvoiceDecision(invoiceId, "approve");

      const next = await fetchInvoiceById(invoiceId);
      setInvoice(next.invoice);
      toast.success("Invoice approved");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to approve invoice";
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(reasonText?: string) {
    if (!invoiceId) return;
    if (isMutating) return;

    const trimmed = typeof reasonText === "string" ? reasonText.trim() : "";

    try {
      setActionLoading(true);
      setError(null);

      await setInvoiceDecision(
        invoiceId,
        "reject",
        trimmed.length ? trimmed : undefined
      );

      const next = await fetchInvoiceById(invoiceId);
      setInvoice(next.invoice);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to reject invoice";
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleHold(reasonText?: string) {
    if (!invoiceId) return;
    if (isMutating) return;

    const trimmed = typeof reasonText === "string" ? reasonText.trim() : "";

    try {
      setActionLoading(true);
      setError(null);

      await setInvoiceDecision(
        invoiceId,
        "hold",
        trimmed.length ? trimmed : undefined
      );

      const next = await fetchInvoiceById(invoiceId);
      setInvoice(next.invoice);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to hold invoice";
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleExpire() {
    if (!invoiceId) return;
    if (isMutating) return;

    try {
      setActionLoading(true);
      setError(null);
      const res = await expireInvoice(invoiceId);
      setInvoice(res.invoice);
      toast.success("Invoice rejected");
      toast.success("Invoice placed on hold");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to expire invoice";
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  }

  return {
    invoice,
    webhooks,

    providerEvents,
    providerEventsLoading,

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
    handleHold,
    handleExpire,
    handleApprove,
  };
}
