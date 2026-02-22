"use client";

import { useMemo } from "react";
import { CopyButton } from "@/shared/ui/components/CopyButton";

interface Props {
  events: unknown[];
  loading: boolean;
  onDispatch?: () => Promise<void> | void;
}

// ---------- safe helpers (no any) ----------
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function pickString(v: unknown, keys: string[]): string | null {
  if (!isRecord(v)) return null;
  for (const k of keys) {
    const val = v[k];
    if (typeof val === "string" && val.trim()) return val;
  }
  return null;
}

function pickNumber(v: unknown, keys: string[]): number | null {
  if (!isRecord(v)) return null;
  for (const k of keys) {
    const val = v[k];
    if (typeof val === "number" && Number.isFinite(val)) return val;
  }
  return null;
}

const DATE_FMT = new Intl.DateTimeFormat("de-CH", {
  timeZone: "Europe/Zurich",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatTs(ts?: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return DATE_FMT.format(d);
}

// ---- JSON pretty with "jq-like" coloring ----
function classifyToken(token: string) {
  if (token === "null") return "null";
  if (token === "true" || token === "false") return "bool";
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(token)) return "num";
  return "plain";
}

function JsonPretty({ value }: { value: unknown }) {
  const json = useMemo(() => {
    try {
      return JSON.stringify(value, null, 2) ?? "";
    } catch {
      return String(value ?? "");
    }
  }, [value]);

  const parts = useMemo(() => {
    const out: Array<{ t: string; k: string }> = [];
    const re =
      /("(?:\\.|[^"\\])*")(\s*:)?|(\bnull\b|\btrue\b|\bfalse\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}\[\],:])/g;

    let last = 0;
    let m: RegExpExecArray | null;

    while ((m = re.exec(json)) !== null) {
      if (m.index > last)
        out.push({ t: json.slice(last, m.index), k: "plain" });

      const str = m[1];
      const isKeyColon = m[2];
      const lit = m[3];
      const num = m[4];
      const punc = m[5];

      if (str) {
        if (isKeyColon) {
          out.push({ t: str, k: "key" });
          out.push({ t: ":", k: "punc" });
        } else {
          out.push({ t: str, k: "str" });
        }
      } else if (lit) {
        out.push({ t: lit, k: classifyToken(lit) });
      } else if (num) {
        out.push({ t: num, k: "num" });
      } else if (punc) {
        out.push({ t: punc, k: "punc" });
      }

      last = re.lastIndex;
    }

    if (last < json.length)
      out.push({ t: json.slice(last), m: "plain" } as never);
    return out;
  }, [json]);

  // tiny fix: avoid the `as never` above by making the last push consistent
  const safeParts = useMemo(() => {
    return parts.map((p) =>
      "k" in p ? p : { t: (p as unknown as { t: string }).t, k: "plain" }
    );
  }, [parts]);

  return (
    <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3 text-[12px] leading-5">
      {safeParts.map((p, i) => (
        <span
          key={i}
          className={
            p.k === "key"
              ? "text-sky-300"
              : p.k === "str"
              ? "text-emerald-300"
              : p.k === "num"
              ? "text-amber-300"
              : p.k === "null"
              ? "text-zinc-400"
              : p.k === "bool"
              ? "text-purple-300"
              : p.k === "punc"
              ? "text-zinc-200"
              : "text-zinc-200"
          }
        >
          {p.t}
        </span>
      ))}
    </pre>
  );
}

export function InvoiceWebhooksCard({ events, loading, onDispatch }: Props) {
  if (loading) {
    return <p className="text-xs text-slate-400">Loading webhook events…</p>;
  }

  if (!events.length) {
    return <p className="text-xs text-slate-500">No webhook events yet.</p>;
  }

  // Try to render an operator-friendly table when possible.
  const rows = events.filter(isRecord).map((ev) => {
    const id =
      pickString(ev, ["id", "webhookId", "eventId", "deliveryId"]) ?? "—";
    const status = pickString(ev, ["status", "deliveryStatus", "state"]) ?? "—";
    const url = pickString(ev, ["url", "targetUrl", "endpoint"]) ?? null;

    const tsRaw =
      pickString(ev, [
        "createdAt",
        "ts",
        "timestamp",
        "sentAt",
        "receivedAt",
      ]) ?? null;

    const http = pickNumber(ev, ["httpStatus", "statusCode"]) ?? null;

    return { id, status, url, tsRaw, http, raw: ev };
  });

  return (
    <div className="space-y-3">
      <table className="min-w-full border-separate border-spacing-y-1 text-[11px]">
        <thead>
          <tr className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
            <th className="px-2 py-1 text-left">Delivery ID</th>
            <th className="px-2 py-1 text-left">Status</th>
            <th className="px-2 py-1 text-left">Endpoint</th>
            <th className="px-2 py-1 text-left">Time</th>
            <th className="px-2 py-1 text-right">Actions</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r, idx) => (
            <tr
              key={`${r.id}-${idx}`}
              className="rounded-2xl bg-slate-900/60 text-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.55)]"
            >
              <td className="px-2 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-300">{r.id}</span>
                  {r.id !== "—" ? <CopyButton value={r.id} size="sm" /> : null}
                </div>
              </td>
              <td className="px-2 py-2">
                <span
                  className={[
                    "rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
                    r.status === "sent"
                      ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/20"
                      : r.status === "failed"
                      ? "bg-red-500/10 text-red-200 ring-red-500/20"
                      : "bg-amber-500/10 text-amber-200 ring-amber-500/20",
                  ].join(" ")}
                >
                  {r.status.toUpperCase()}
                </span>
              </td>
              <td className="px-2 py-2">
                {r.url ? (
                  <span className="block max-w-72 truncate font-mono text-slate-300">
                    {r.url}
                  </span>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </td>
              <td className="px-2 py-2 text-slate-400">{formatTs(r.tsRaw)}</td>
              <td className="px-2 py-2 text-right text-slate-300">
                {r.http ?? "—"}
              </td>
              <td className="px-2 py-2 text-right">
                {r.status === "failed" ? (
                  <button
                    type="button"
                    onClick={() => void onDispatch?.()}
                    className="text-[11px] text-amber-300 hover:underline"
                  >
                    Retry
                  </button>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* raw payload (operator-grade debugging) */}
      <details className="rounded-xl border border-white/10 bg-white/5 p-3">
        <summary className="cursor-pointer text-xs text-slate-300">
          Show raw webhook events JSON
        </summary>
        <JsonPretty value={events} />
      </details>
    </div>
  );
}
