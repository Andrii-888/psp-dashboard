// src/app/dev/invoice-poll/page.tsx
"use client";

import { notFound } from "next/navigation";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useInvoicePolling } from "@/hooks/useInvoicePolling";

export default function InvoicePollPage() {
  // Dev-only page: in production it should not exist
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const sp = useSearchParams();

  // берём id из query (?id=...), если есть
  const idFromUrl = sp.get("id");

  // ручной режим: ввод + запуск кнопкой
  const [input, setInput] = useState("");
  const [manualInvoiceId, setManualInvoiceId] = useState<string | null>(null);

  // если в URL есть id — он главный, иначе берем то, что запустили вручную
  const invoiceId = idFromUrl ?? manualInvoiceId;

  const state = useInvoicePolling(invoiceId);

  return (
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
        Dev · Invoice Poll
      </h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste invoice id..."
          style={{
            flex: 1,
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
        />
        <button
          onClick={() => setManualInvoiceId(input.trim() ? input.trim() : null)}
          style={{
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Start
        </button>
        <button
          onClick={() => {
            setInput("");
            setManualInvoiceId(null);
          }}
          style={{
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Clear
        </button>
      </div>

      <div style={{ marginBottom: 12, fontSize: 14 }}>
        <div>
          <b>idFromUrl:</b>{" "}
          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo" }}>
            {idFromUrl ?? "null"}
          </span>
        </div>
        <div>
          <b>manualInvoiceId:</b>{" "}
          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo" }}>
            {manualInvoiceId ?? "null"}
          </span>
        </div>
        <div>
          <b>invoiceId (active):</b>{" "}
          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo" }}>
            {invoiceId ?? "null"}
          </span>
        </div>
        <div>
          <b>pollState:</b>{" "}
          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo" }}>
            {state.state}
          </span>
        </div>
      </div>

      {state.state === "idle" && (
        <div style={{ opacity: 0.7 }}>Set invoice id to start polling.</div>
      )}

      {state.state === "loading" && (
        <div style={{ opacity: 0.9 }}>Polling… (every 2s)</div>
      )}

      {state.state === "error" && (
        <div
          style={{
            padding: 12,
            border: "1px solid #f5c2c2",
            background: "#fff5f5",
            borderRadius: 8,
            color: "#b00020",
            whiteSpace: "pre-wrap",
          }}
        >
          {state.error}
        </div>
      )}

      {state.state === "done" && (
        <div
          style={{
            padding: 12,
            border: "1px solid #cfe8cf",
            background: "#f4fff4",
            borderRadius: 8,
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <b>Status:</b>{" "}
            <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo" }}>
              {state.invoice.status}
            </span>
            {" · "}
            <b>Tx:</b>{" "}
            <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo" }}>
              {state.invoice.txStatus ?? "null"}
            </span>
          </div>

          <pre
            style={{
              margin: 0,
              padding: 12,
              borderRadius: 8,
              background: "rgba(0,0,0,0.04)",
              overflow: "auto",
              fontSize: 12,
              lineHeight: 1.4,
            }}
          >
            {JSON.stringify(state.invoice, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
