import { useEffect, useRef, useState } from "react";

import type { Invoice } from "@/domain/invoices/types";
import { fetchInvoiceById } from "@/lib/pspApi";

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
        setPollState({ state: "loading" });

        const res = await fetchInvoiceById(id);

        if (!res?.ok || !res.invoice) {
          throw new Error("Failed to load invoice");
        }

        const invoice = res.invoice;

        if (invoice.status === "confirmed" || invoice.status === "expired") {
          setPollState({ state: "done", invoice });
          stopped = true;
          return;
        }

        // keep polling
        setPollState({ state: "loading" });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Polling error";
        setPollState({ state: "error", error: message });
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
