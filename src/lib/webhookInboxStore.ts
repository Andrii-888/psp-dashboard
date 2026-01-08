// src/lib/webhookInboxStore.ts

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

function getStore(): InboxStore {
  const g = globalThis as GlobalWithInbox;

  if (!g.__PSP_WEBHOOK_INBOX_STORE__) {
    g.__PSP_WEBHOOK_INBOX_STORE__ = { items: [], max: 50 };
  }

  return g.__PSP_WEBHOOK_INBOX_STORE__;
}

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
