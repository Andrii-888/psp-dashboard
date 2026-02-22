import { useEffect, useRef, useState } from "react";

import type { Invoice } from "@/domain/invoices/types";
import { fetchInvoiceById } from "@/shared/api/pspApi";

type PollState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "done"; invoice: Invoice }
  | { state: "error"; error: string };

export function useInvoicePolling(invoiceId: string | null) {
  const [pollState, setPollState] = useState<PollState>({ state: "idle" });

  // browser interval => number
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!invoiceId) {
      setPollState({ state: "idle" });
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

    const id = invoiceId; // string
    let stopped = false;

    async function poll() {
      try {
        const res = await fetchInvoiceById(id);

        if (!res?.ok || !res.invoice) {
          throw new Error("Failed to load invoice");
        }

        const invoice = res.invoice;

        // always publish latest snapshot
        setPollState({ state: "done", invoice });

        const isFinalStatus =
          invoice.status === "expired" || invoice.status === "rejected";

        // ✅ IMPORTANT:
        // confirmed is NOT final for us until AML/decision is attached
        const hasAml =
          Boolean(invoice.amlCheckedAt) ||
          invoice.amlStatus !== null ||
          typeof invoice.riskScore === "number";

        const hasDecision = invoice.decisionStatus != null;

        const isComplete =
          invoice.status === "confirmed" && (hasAml || hasDecision);

        if (isFinalStatus || isComplete) {
          stopped = true;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Polling error";
        setPollState({ state: "error", error: message });
        // keep polling on transient errors? -> stop to avoid loops
        stopped = true;
      }
    }

    void poll();

    timerRef.current = window.setInterval(() => {
      if (!stopped) void poll();
    }, 2000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [invoiceId]);

  return pollState;
}
