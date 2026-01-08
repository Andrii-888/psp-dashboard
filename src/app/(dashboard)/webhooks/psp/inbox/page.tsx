"use client";

import * as React from "react";

type InboxItem = {
  id: string;
  ts: string | number;
  preview?: string | null;
};

type InboxResponse = {
  ok: boolean;
  count: number;
  items: InboxItem[];
  meta?: Record<string, unknown>;
  error?: string;
};

type InboxItemDetail = InboxItem & {
  rawBody?: string;
  headers?: Record<string, string>;
};

type InboxDetailResponse = {
  ok: boolean;
  item?: InboxItemDetail;
  error?: string;
};

type JsonToken =
  | { t: "punct"; v: string }
  | { t: "key"; v: string }
  | { t: "string"; v: string }
  | { t: "number"; v: string }
  | { t: "bool"; v: string }
  | { t: "null"; v: string }
  | { t: "ws"; v: string };

function formatTs(ts: InboxItem["ts"]) {
  try {
    if (typeof ts === "number") return new Date(ts * 1000).toLocaleString();
    const d = new Date(ts);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString();
    return String(ts);
  } catch {
    return String(ts);
  }
}

function safeParseJson(input: string): unknown | null {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

/**
 * Tokenize pretty JSON string into tokens for jq-like coloring.
 * Keys are detected as "string" immediately followed (ignoring whitespace) by ":".
 */
function tokenizePrettyJson(pretty: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  const s = pretty;
  const len = s.length;

  let i = 0;

  const push = (t: JsonToken["t"], v: string) => tokens.push({ t, v });

  const isWs = (c: string) =>
    c === " " || c === "\n" || c === "\t" || c === "\r";

  // helper: peek next non-ws char index from position p (exclusive)
  const nextNonWs = (p: number) => {
    let j = p;
    while (j < len && isWs(s[j]!)) j++;
    return j;
  };

  while (i < len) {
    const c = s[i]!;

    // whitespace
    if (isWs(c)) {
      let j = i + 1;
      while (j < len && isWs(s[j]!)) j++;
      push("ws", s.slice(i, j));
      i = j;
      continue;
    }

    // string
    if (c === '"') {
      let j = i + 1;
      let esc = false;
      while (j < len) {
        const ch = s[j]!;
        if (esc) {
          esc = false;
          j++;
          continue;
        }
        if (ch === "\\") {
          esc = true;
          j++;
          continue;
        }
        if (ch === '"') {
          j++;
          break;
        }
        j++;
      }
      const str = s.slice(i, j); // includes quotes

      // detect key: next non-ws after this string is ':'
      const k = nextNonWs(j);
      const isKey = k < len && s[k] === ":";

      push(isKey ? "key" : "string", str);
      i = j;
      continue;
    }

    // number (basic JSON number)
    if (c === "-" || (c >= "0" && c <= "9")) {
      let j = i + 1;
      while (j < len) {
        const ch = s[j]!;
        const ok =
          (ch >= "0" && ch <= "9") ||
          ch === "." ||
          ch === "e" ||
          ch === "E" ||
          ch === "+" ||
          ch === "-";
        if (!ok) break;
        j++;
      }
      push("number", s.slice(i, j));
      i = j;
      continue;
    }

    // literals: true/false/null
    if (s.startsWith("true", i)) {
      push("bool", "true");
      i += 4;
      continue;
    }
    if (s.startsWith("false", i)) {
      push("bool", "false");
      i += 5;
      continue;
    }
    if (s.startsWith("null", i)) {
      push("null", "null");
      i += 4;
      continue;
    }

    // punctuation
    push("punct", c);
    i++;
  }

  return tokens;
}

function JsonPrettyJq({ value }: { value: unknown }) {
  const pretty = React.useMemo(() => JSON.stringify(value, null, 2), [value]);
  const tokens = React.useMemo(() => tokenizePrettyJson(pretty), [pretty]);

  const cls: Record<JsonToken["t"], string> = {
    punct: "text-muted-foreground",
    ws: "",
    key: "text-sky-500",
    string: "text-emerald-500",
    number: "text-yellow-500",
    bool: "text-orange-400",
    null: "text-zinc-500",
  };

  return (
    <pre className="rounded-md border bg-muted/20 p-3 text-xs overflow-auto whitespace-pre font-mono">
      {tokens.map((tok, idx) => (
        <span key={idx} className={cls[tok.t]}>
          {tok.v}
        </span>
      ))}
    </pre>
  );
}

export default function PspWebhookInboxPage() {
  const [items, setItems] = React.useState<InboxItem[]>([]);
  const [count, setCount] = React.useState<number>(0);

  const [loadingList, setLoadingList] = React.useState(false);
  const [listError, setListError] = React.useState<string | null>(null);

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);

  const [detailError, setDetailError] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<InboxItemDetail | null>(null);

  const [query, setQuery] = React.useState("");

  const token = process.env.NEXT_PUBLIC_PSP_INBOX_TOKEN;

  const loadList = React.useCallback(async () => {
    setLoadingList(true);
    setListError(null);

    try {
      if (!token) {
        setItems([]);
        setCount(0);
        setListError("Missing NEXT_PUBLIC_PSP_INBOX_TOKEN in .env.local");
        return;
      }

      const res = await fetch("/api/webhooks/psp/inbox", {
        headers: { "x-psp-inbox-token": token },
        cache: "no-store",
      });

      const data = (await res.json()) as InboxResponse;

      if (!res.ok || !data.ok) {
        setItems([]);
        setCount(0);
        setListError(
          data && data.error
            ? data.error
            : `Request failed: ${res.status} ${res.statusText}`
        );
        return;
      }

      setItems(Array.isArray(data.items) ? data.items : []);
      setCount(
        typeof data.count === "number" ? data.count : data.items?.length ?? 0
      );
    } catch (e: unknown) {
      setItems([]);
      setCount(0);
      setListError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoadingList(false);
    }
  }, [token]);

  const loadDetail = React.useCallback(
    async (id: string) => {
      setSelectedId(id);
      setLoadingDetail(true);
      setDetailError(null);
      setDetail(null);

      try {
        if (!token) {
          setDetailError("Missing NEXT_PUBLIC_PSP_INBOX_TOKEN in .env.local");
          return;
        }

        const res = await fetch(
          `/api/webhooks/psp/inbox/${encodeURIComponent(id)}`,
          {
            headers: { "x-psp-inbox-token": token },
            cache: "no-store",
          }
        );

        const data = (await res.json()) as InboxDetailResponse;

        if (!res.ok || !data.ok || !data.item) {
          setDetailError(
            data?.error || `Request failed: ${res.status} ${res.statusText}`
          );
          return;
        }

        setDetail(data.item);
      } catch (e: unknown) {
        setDetailError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoadingDetail(false);
      }
    },
    [token]
  );

  const refreshSelected = React.useCallback(() => {
    if (!selectedId) return;
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  React.useEffect(() => {
    void loadList();
  }, [loadList]);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      void loadList();
      refreshSelected();
    }, 3000);

    return () => window.clearInterval(id);
  }, [loadList, refreshSelected]);

  const filteredItems = React.useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((it) => (it.preview ?? "").toLowerCase().includes(q));
  }, [items, query]);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const headersJson = detail?.headers ?? null;
  const rawParsed = detail?.rawBody ? safeParseJson(detail.rawBody) : null;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">PSP Webhook Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Events received from psp-core (debug inbox). Count:{" "}
            <span className="font-medium">{count}</span>
          </p>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search invoiceId / eventType…"
          className="h-9 w-64 rounded-md border bg-background px-3 text-sm"
        />

        <button
          type="button"
          onClick={() => void loadList()}
          disabled={loadingList}
          className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60"
        >
          {loadingList ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {listError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <div className="font-medium">Error</div>
          <div className="opacity-90">{listError}</div>
        </div>
      ) : null}

      {/* LIST */}
      <div className="rounded-lg border overflow-hidden">
        <div className="grid grid-cols-12 gap-3 bg-muted/40 px-4 py-2 text-xs font-medium">
          <div className="col-span-3">Time</div>
          <div className="col-span-4">ID</div>
          <div className="col-span-5">Preview</div>
        </div>

        <div className="divide-y">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              No events yet. Use resend in psp-core and hit Refresh.
            </div>
          ) : (
            filteredItems.map((it) => {
              const active = it.id === selectedId;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => void loadDetail(it.id)}
                  className={[
                    "w-full text-left grid grid-cols-12 gap-3 px-4 py-3 text-sm hover:bg-muted/30",
                    active ? "bg-muted/40" : "",
                  ].join(" ")}
                >
                  <div className="col-span-3 text-muted-foreground">
                    {formatTs(it.ts)}
                  </div>
                  <div className="col-span-4 font-mono text-xs break-all">
                    {it.id}
                  </div>
                  <div className="col-span-5 truncate">{it.preview ?? ""}</div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* DETAIL */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-medium">Selected event</div>
            <div className="text-xs text-muted-foreground font-mono break-all">
              {selectedId ?? "—"}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {loadingDetail
              ? "Loading detail…"
              : detail
              ? "Detail loaded"
              : "Not loaded"}
          </div>
        </div>

        {detailError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs">
            {detailError}
          </div>
        ) : null}

        {!detail ? (
          <div className="text-sm text-muted-foreground">
            Click an item to load detail.
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Headers
              </div>
              {headersJson ? (
                <JsonPrettyJq value={headersJson} />
              ) : (
                <div className="text-xs text-muted-foreground">—</div>
              )}
            </div>

            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Raw body
              </div>
              {rawParsed !== null ? (
                <JsonPrettyJq value={rawParsed} />
              ) : (
                <pre className="rounded-md border bg-muted/20 p-3 text-xs overflow-auto whitespace-pre font-mono">
                  {detail.rawBody ?? ""}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Auth: requests require{" "}
        <span className="font-mono">x-psp-inbox-token</span> (from{" "}
        <span className="font-mono">NEXT_PUBLIC_PSP_INBOX_TOKEN</span>).
      </div>
    </div>
  );
}
