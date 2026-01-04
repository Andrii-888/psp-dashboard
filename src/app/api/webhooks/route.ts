import { NextResponse } from "next/server";

type StoredWebhook = {
  id: string;
  ts: string;
  method: string;
  contentType: string | null;
  body: string;
};

declare global {
  var __WEBHOOKS_STORE__: StoredWebhook[] | undefined;
}

function getStore(): StoredWebhook[] {
  if (!globalThis.__WEBHOOKS_STORE__) globalThis.__WEBHOOKS_STORE__ = [];
  return globalThis.__WEBHOOKS_STORE__;
}

export async function POST(req: Request) {
  const raw = await req.text();

  const item: StoredWebhook = {
    id: `wh_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    ts: new Date().toISOString(),
    method: "POST",
    contentType: req.headers.get("content-type"),
    body: raw,
  };

  const store = getStore();
  store.unshift(item);
  // ограничим память
  if (store.length > 100) store.length = 100;

  console.log("[webhooks] received", {
    ts: item.ts,
    len: raw.length,
    preview: raw.slice(0, 200),
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const store = getStore();
  return NextResponse.json({
    ok: true,
    count: store.length,
    items: store.map((x) => ({
      id: x.id,
      ts: x.ts,
      contentType: x.contentType,
      preview: x.body.slice(0, 300),
    })),
  });
}

// опционально: очистка для тестов
export async function DELETE() {
  globalThis.__WEBHOOKS_STORE__ = [];
  return NextResponse.json({ ok: true, cleared: true });
}
