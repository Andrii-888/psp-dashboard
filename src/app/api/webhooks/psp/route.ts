// src/app/api/webhooks/psp/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

type StoredWebhook = {
  id: string;
  ts: string;
  contentType: string | null;
  body: string;
};

interface WebhookGlobal {
  __WEBHOOKS_STORE__?: StoredWebhook[];
}

function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

function notFound(): NextResponse {
  return NextResponse.json({ message: "Not found" }, { status: 404 });
}

function getStore(): StoredWebhook[] {
  const g = globalThis as unknown as WebhookGlobal;
  if (!g.__WEBHOOKS_STORE__) g.__WEBHOOKS_STORE__ = [];
  return g.__WEBHOOKS_STORE__;
}

function parsePspSignature(header: string): { t: number; v1: string } | null {
  if (!header || typeof header !== "string") return null;

  const parts = header.split(",").map((p) => p.trim());
  const map = new Map<string, string>();

  for (const p of parts) {
    const [k, ...rest] = p.split("=");
    if (!k || rest.length === 0) continue;
    map.set(k.trim(), rest.join("=").trim());
  }

  const tRaw = map.get("t");
  const v1 = map.get("v1");

  const t = tRaw ? Number(tRaw) : NaN;
  if (!Number.isFinite(t) || t <= 0) return null;
  if (!v1 || !/^[a-f0-9]{64}$/i.test(v1)) return null;

  return { t: Math.floor(t), v1 };
}

function timingSafeEqualHex(aHex: string, bHex: string): boolean {
  const a = Buffer.from(aHex, "hex");
  const b = Buffer.from(bHex, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function verifyPspSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  const parsed = parsePspSignature(signatureHeader);
  if (!parsed) return false;

  const payloadToSign = `${parsed.t}.${rawBody}`;

  const expectedV1 = crypto
    .createHmac("sha256", secret)
    .update(payloadToSign, "utf8")
    .digest("hex");

  return timingSafeEqualHex(parsed.v1, expectedV1);
}

function safeJson(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const secret = (process.env.PSP_WEBHOOK_SECRET ?? "").trim();
  if (!secret) {
    // важно: если секрет не задан — psp-core будет получать 500 и ретраить
    return new NextResponse("Missing PSP_WEBHOOK_SECRET", { status: 500 });
  }

  const raw = await req.text();

  const sig = req.headers.get("psp-signature");
  if (!sig) {
    return NextResponse.json(
      { ok: false, error: "missing psp-signature" },
      { status: 401 }
    );
  }

  const ok = verifyPspSignature(raw, sig, secret);
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "invalid signature" },
      { status: 401 }
    );
  }

  const item: StoredWebhook = {
    id: `wh_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    ts: new Date().toISOString(),
    contentType: req.headers.get("content-type"),
    body: raw,
  };

  // in-memory store — только для dev/одного инстанса
  const store = getStore();
  store.unshift(item);
  if (store.length > 100) store.length = 100;

  const json = safeJson(raw);
  const invoiceId = (json?.invoiceId ?? json?.invoice_id ?? null) as unknown;
  const eventType = (json?.eventType ?? json?.event_type ?? null) as unknown;

  console.log("[psp-webhook] received", {
    id: item.id,
    ts: item.ts,
    contentType: item.contentType,
    len: raw.length,
    invoiceId,
    eventType,
    preview: raw.slice(0, 300),
  });

  return NextResponse.json({ ok: true, id: item.id });
}

export async function GET() {
  if (isProd()) return notFound();

  const store = getStore();
  return NextResponse.json({
    ok: true,
    note: "In-memory store on Vercel is not reliable (serverless). Use Vercel Logs or KV/DB for persistent webhook history.",
    count: store.length,
    items: store.map((x) => ({
      id: x.id,
      ts: x.ts,
      contentType: x.contentType,
      preview: x.body.slice(0, 300),
    })),
  });
}

export async function DELETE() {
  if (isProd()) return notFound();

  const g = globalThis as unknown as WebhookGlobal;
  g.__WEBHOOKS_STORE__ = [];
  return NextResponse.json({ ok: true, cleared: true });
}
