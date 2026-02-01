"use client";

import { useEffect, useMemo, useState } from "react";

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

type InboxListItem = {
  id: string;
  ts: string;
  preview?: string;
};

type InboxListResponse = {
  ok: true;
  storage: "mem" | "kv";
  count: number;
  max: number;
  items: InboxListItem[];
};

type InboxItem = {
  id: string;
  ts: string;
  preview?: string;
  rawBody?: string;
  headers?: Record<string, string>;
};

// ---------- safe helpers (no any) ----------
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function hasOkTrue(v: unknown): v is Record<string, unknown> & { ok: true } {
  return isRecord(v) && v.ok === true;
}

function hasOkFalse(
  v: unknown
): v is Record<string, unknown> & { ok: false; error?: unknown } {
  return isRecord(v) && v.ok === false;
}

function pickErrorMessage(v: unknown, fallback: string): string {
  if (hasOkFalse(v)) {
    const err = v.error;
    if (typeof err === "string" && err.trim()) return err;
  }
  return fallback;
}

function safeJsonParse(raw?: string): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
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
      if (m.index > last) {
        out.push({ t: json.slice(last, m.index), k: "plain" });
      }

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

    if (last < json.length) out.push({ t: json.slice(last), k: "plain" });
    return out;
  }, [json]);

  return (
    <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3 text-[12px] leading-5">
      {parts.map((p, i) => (
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

export function WebhookInboxCard() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [list, setList] = useState<InboxListResponse | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [itemLoading, setItemLoading] = useState(false);
  const [itemErr, setItemErr] = useState<string | null>(null);
  const [item, setItem] = useState<InboxItem | null>(null);

  async function loadList() {
    setLoading(true);
    setErr(null);

    try {
      const r = await fetch("/api/webhooks/psp/inbox", { cache: "no-store" });

      const j: unknown = await r.json();

      if (!r.ok) {
        throw new Error(pickErrorMessage(j, `HTTP ${r.status}`));
      }

      if (!hasOkTrue(j)) {
        throw new Error(pickErrorMessage(j, "Failed to load inbox"));
      }

      // ensure shape: { ok: true, storage, count, max, items }
      const storage = (j.storage ?? null) as unknown;
      const count = (j.count ?? null) as unknown;
      const max = (j.max ?? null) as unknown;
      const items = (j.items ?? null) as unknown;

      if (
        (storage !== "mem" && storage !== "kv") ||
        typeof count !== "number" ||
        typeof max !== "number" ||
        !Array.isArray(items)
      ) {
        throw new Error("Bad response shape");
      }

      const typed: InboxListResponse = {
        ok: true,
        storage,
        count,
        max,
        items: items
          .filter((x): x is Record<string, unknown> => isRecord(x))
          .map((x) => ({
            id: typeof x.id === "string" ? x.id : "",
            ts: typeof x.ts === "string" ? x.ts : "",
            preview: typeof x.preview === "string" ? x.preview : undefined,
          }))
          .filter((x) => x.id && x.ts),
      };

      setList(typed);

      if (selectedId && !typed.items.some((x) => x.id === selectedId)) {
        setSelectedId(null);
        setItem(null);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load inbox";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  async function loadItem(id: string) {
    setItemLoading(true);
    setItemErr(null);

    try {
      const r = await fetch(
        `/api/webhooks/psp/inbox/${encodeURIComponent(id)}`,
        { cache: "no-store" }
      );

      const j: unknown = await r.json();

      if (!r.ok) {
        throw new Error(pickErrorMessage(j, `HTTP ${r.status}`));
      }

      if (!hasOkTrue(j)) {
        throw new Error(pickErrorMessage(j, "Failed to load item"));
      }

      // ensure shape: { ok: true, item: {...} }
      if (!isRecord(j.item)) {
        throw new Error("Bad response shape");
      }

      const it = j.item;

      const typedItem: InboxItem = {
        id: typeof it.id === "string" ? it.id : id,
        ts: typeof it.ts === "string" ? it.ts : "",
        preview: typeof it.preview === "string" ? it.preview : undefined,
        rawBody: typeof it.rawBody === "string" ? it.rawBody : undefined,
        headers: isRecord(it.headers)
          ? Object.fromEntries(
              Object.entries(it.headers).flatMap(([k, v]) =>
                typeof v === "string" ? [[k, v]] : []
              )
            )
          : undefined,
      };

      setItem(typedItem);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load item";
      setItemErr(msg);
      setItem(null);
    } finally {
      setItemLoading(false);
    }
  }

  async function clearInbox() {
    setLoading(true);
    setErr(null);

    try {
      const r = await fetch("/api/webhooks/psp/inbox", { method: "DELETE" });
      const j: unknown = await r.json();

      if (!r.ok || !hasOkTrue(j)) {
        throw new Error(pickErrorMessage(j, `HTTP ${r.status}`));
      }

      setSelectedId(null);
      setItem(null);
      await loadList();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to clear inbox";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="card mt-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title">Webhook Inbox (Debug)</h2>
          <p className="text-sm text-zinc-400">
            Incoming PSP webhooks captured by dashboard. (Dev open, Prod
            requires token header)
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={loadList}
            className="btn"
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={clearInbox}
            className="btn btn-danger"
            disabled={loading}
          >
            Clear
          </button>
        </div>
      </div>

      {err ? (
        <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Left: list */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="text-sm text-zinc-300">
            <span className="text-zinc-400">storage:</span>{" "}
            <span className="font-medium">{list?.storage ?? "—"}</span>{" "}
            <span className="text-zinc-500">•</span>{" "}
            <span className="text-zinc-400">count:</span>{" "}
            <span className="font-medium">{list?.count ?? "—"}</span>{" "}
            <span className="text-zinc-500">•</span>{" "}
            <span className="text-zinc-400">max:</span>{" "}
            <span className="font-medium">{list?.max ?? "—"}</span>
          </div>

          <div className="mt-3 max-h-96 overflow-auto rounded-xl border border-white/10">
            {list?.items?.length ? (
              <ul className="divide-y divide-white/10">
                {list.items.map((x) => {
                  const active = x.id === selectedId;
                  return (
                    <li key={x.id}>
                      <button
                        type="button"
                        className={[
                          "w-full text-left px-3 py-2 transition",
                          active ? "bg-white/10" : "hover:bg-white/5",
                        ].join(" ")}
                        onClick={() => {
                          setSelectedId(x.id);
                          void loadItem(x.id);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-sm font-medium text-zinc-100">
                            {x.id}
                          </div>
                          <div className="shrink-0 text-xs text-zinc-400">
                            {formatTs(x.ts)}
                          </div>
                        </div>
                        {x.preview ? (
                          <div className="mt-1 line-clamp-2 text-xs text-zinc-400">
                            {x.preview}
                          </div>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-4 text-sm text-zinc-400">
                No items yet. Send a webhook to populate the inbox.
              </div>
            )}
          </div>
        </div>

        {/* Right: details */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-sm text-zinc-300">
              <span className="text-zinc-400">selected:</span>{" "}
              <span className="font-medium">{selectedId ?? "—"}</span>
            </div>
            <button
              type="button"
              className="btn"
              disabled={!selectedId || itemLoading}
              onClick={() => selectedId && void loadItem(selectedId)}
            >
              {itemLoading ? "Loading…" : "Reload"}
            </button>
          </div>

          {itemErr ? (
            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {itemErr}
            </div>
          ) : null}

          {!item && !itemLoading ? (
            <div className="mt-3 text-sm text-zinc-400">
              Pick an item on the left to see raw payload and headers.
            </div>
          ) : null}

          {item ? (
            <div className="mt-3">
              <div className="text-xs text-zinc-400">{formatTs(item.ts)}</div>

              <div className="mt-3">
                <div className="text-sm font-medium text-zinc-200">rawBody</div>
                <JsonPretty value={safeJsonParse(item.rawBody)} />
              </div>

              <div className="mt-4">
                <div className="text-sm font-medium text-zinc-200">headers</div>
                <JsonPretty value={item.headers ?? {}} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
