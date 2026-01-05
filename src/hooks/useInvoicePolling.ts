import { useEffect, useRef, useState } from "react";

type Invoice = {
  id: string;
  status: string;
  txStatus?: string | null;
  confirmations?: number;
  requiredConfirmations?: number;
};

type PollState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "done"; invoice: Invoice }
  | { state: "error"; error: string };

function safePreview(text: string, max = 200) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

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

    const id = invoiceId; // ✅ здесь id уже string
    let stopped = false;

    async function poll() {
      try {
        setPollState({ state: "loading" });

        const res = await fetch(`/api/psp/invoices/${encodeURIComponent(id)}`, {
          cache: "no-store",
          headers: { accept: "application/json" },
        });

        const ct = res.headers.get("content-type") ?? "";
        const raw = await res.text();
        console.log("[poll] res", {
          ok: res.ok,
          status: res.status,
          ct,
          preview: raw.slice(0, 300),
        });

        if (!res.ok) {
          if (ct.includes("application/json")) {
            try {
              const j = JSON.parse(raw) as { message?: string; error?: string };
              throw new Error(j.message || j.error || `HTTP ${res.status}`);
            } catch {
              throw new Error(`HTTP ${res.status}: ${safePreview(raw)}`);
            }
          }
          throw new Error(`HTTP ${res.status}: ${safePreview(raw)}`);
        }

        // 🔴 ВАЖНО: МЕНЯЕМ ТОЛЬКО ЭТОТ БЛОК
        if (!ct.includes("application/json")) {
          throw new Error(
            `Response is not valid JSON. ct=${ct}. preview=${raw.slice(0, 200)}`
          );
        }

        const invoice = JSON.parse(raw) as Invoice;

        if (invoice.status === "confirmed" || invoice.status === "expired") {
          setPollState({ state: "done", invoice });
          stopped = true;
          return;
        }

        setPollState({ state: "loading" });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Polling error";
        setPollState({ state: "error", error: message });
        stopped = true;
      }
    }

    poll();

    timerRef.current = window.setInterval(() => {
      if (!stopped) poll();
    }, 2000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [invoiceId]);

  return pollState;
}
