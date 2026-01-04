import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

type StoredWebhook = {
  id: string;
  ts: string;
  method: string;
  contentType: string | null;
  body: string;
};

interface WebhookGlobal {
  __WEBHOOKS_STORE__?: StoredWebhook[];
}

function getStore(): StoredWebhook[] {
  const g = globalThis as unknown as WebhookGlobal;
  if (!g.__WEBHOOKS_STORE__) g.__WEBHOOKS_STORE__ = [];
  return g.__WEBHOOKS_STORE__;
}

function parsePspSignature(header: string): { t: number; v1: string } | null {
  if (!header || typeof header !== "string") return null;

  // accepts: "t=123, v1=abcd" (spaces optional)
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

export async function POST(req: Request) {
  const secret = (process.env.PSP_WEBHOOK_SECRET ?? "").trim();
  if (!secret) {
    return new NextResponse("Missing PSP_WEBHOOK_SECRET", { status: 500 });
  }

  const raw = await req.text();

  // ✅ EXACT header name from psp-core: 'psp-signature'
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
    method: "POST",
    contentType: req.headers.get("content-type"),
    body: raw,
  };

  const store = getStore();
  store.unshift(item);
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

export async function DELETE() {
  const g = globalThis as unknown as WebhookGlobal;
  g.__WEBHOOKS_STORE__ = [];
  return NextResponse.json({ ok: true, cleared: true });
}
