// src/lib/webhookInboxStore.ts
import { kv } from "@vercel/kv";

export type InboxItem = {
  id: string;
  ts: string;
  preview?: string;
  rawBody?: string;
  headers?: Record<string, string>;
};

type InboxStore = {
  items: InboxItem[];
  max: number;
};

type GlobalWithInbox = typeof globalThis & {
  __PSP_WEBHOOK_INBOX_STORE__?: InboxStore;
};

const KV_ITEMS_KEY = "psp:webhookInbox:items";
const KV_MAX_KEY = "psp:webhookInbox:max";

function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

function getStore(): InboxStore {
  const g = globalThis as GlobalWithInbox;

  if (!g.__PSP_WEBHOOK_INBOX_STORE__) {
    g.__PSP_WEBHOOK_INBOX_STORE__ = { items: [], max: 50 };
  }

  return g.__PSP_WEBHOOK_INBOX_STORE__;
}

// --- KV helpers (safe) ---
function kvEnabled(): boolean {
  // Vercel KV обычно прокидывает эти переменные (или похожие)
  const url =
    (process.env.KV_REST_API_URL ?? "").trim() ||
    (process.env.UPSTASH_REDIS_REST_URL ?? "").trim() ||
    (process.env.KV_URL ?? "").trim();
  const token =
    (process.env.KV_REST_API_TOKEN ?? "").trim() ||
    (process.env.UPSTASH_REDIS_REST_TOKEN ?? "").trim();

  return Boolean(isProd() && url && token);
}

async function kvGetMax(fallback: number): Promise<number> {
  try {
    const v = await kv.get<number>(KV_MAX_KEY);
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
  } catch {
    return fallback;
  }
}

async function kvSetMax(max: number): Promise<void> {
  try {
    await kv.set(KV_MAX_KEY, max);
  } catch {
    // ignore
  }
}

async function kvGetItems(): Promise<InboxItem[]> {
  try {
    const v = await kv.get<InboxItem[] | null>(KV_ITEMS_KEY);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

async function kvSetItems(items: InboxItem[]): Promise<void> {
  try {
    await kv.set(KV_ITEMS_KEY, items);
  } catch {
    // ignore
  }
}

// ===== Sync API (dev/local) =====
// Оставляем как есть, чтобы ничего не ломать локально.

export function inboxSetMax(max: number): void {
  const store = getStore();
  store.max = Math.max(1, Math.floor(max));
  if (store.items.length > store.max) {
    store.items = store.items.slice(0, store.max);
  }
}

export function inboxAdd(item: InboxItem): void {
  const store = getStore();

  // newest first
  store.items = [item, ...store.items];

  if (store.items.length > store.max) {
    store.items = store.items.slice(0, store.max);
  }
}

export function inboxList(): InboxItem[] {
  return getStore().items;
}

export function inboxGet(id: string): InboxItem | undefined {
  return getStore().items.find((x) => x.id === id);
}

export function inboxClear(): void {
  getStore().items = [];
}

export function inboxMeta(): { storage: "mem"; count: number; max: number } {
  const s = getStore();
  return { storage: "mem", count: s.items.length, max: s.max };
}

// ===== Async KV API (production) =====
// Эти функции будем подключать в route.ts на следующем микро-шаге (1 файл).
// Сейчас просто добавляем, чтобы было готово и безопасно.

export async function inboxSetMaxAsync(max: number): Promise<void> {
  const m = Math.max(1, Math.floor(max));

  // всегда держим mem в порядке (на всякий)
  inboxSetMax(m);

  if (!kvEnabled()) return;

  await kvSetMax(m);

  const items = await kvGetItems();
  if (items.length > m) {
    await kvSetItems(items.slice(0, m));
  }
}

export async function inboxAddAsync(item: InboxItem): Promise<void> {
  // always keep mem too
  inboxAdd(item);

  if (!kvEnabled()) return;

  const max = await kvGetMax(50);
  const items = await kvGetItems();

  const next = [item, ...items].slice(0, max);
  await kvSetItems(next);
}

export async function inboxListAsync(): Promise<InboxItem[]> {
  if (!kvEnabled()) return inboxList();
  return kvGetItems();
}

export async function inboxGetAsync(
  id: string
): Promise<InboxItem | undefined> {
  if (!kvEnabled()) return inboxGet(id);

  const items = await kvGetItems();
  return items.find((x) => x.id === id);
}

export async function inboxClearAsync(): Promise<void> {
  inboxClear();

  if (!kvEnabled()) return;

  await kvSetItems([]);
}

export async function inboxMetaAsync(): Promise<{
  storage: "kv" | "mem";
  count: number;
  max: number;
}> {
  if (!kvEnabled()) {
    const m = inboxMeta();
    return { storage: "mem", count: m.count, max: m.max };
  }

  const max = await kvGetMax(50);
  const items = await kvGetItems();
  return { storage: "kv", count: items.length, max };
}
