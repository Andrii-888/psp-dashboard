import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

type StoredWebhook = {
  id: string;
  ts: string;
  contentType: string | null;
  body: string;
};

declare global {
  // Fallback ONLY for local dev when KV is not configured

  var __WEBHOOKS_STORE__: StoredWebhook[] | undefined;
}

function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

function notFound() {
  return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
}

function getMemoryStore(): StoredWebhook[] {
  if (!global.__WEBHOOKS_STORE__) global.__WEBHOOKS_STORE__ = [];
  return global.__WEBHOOKS_STORE__;
}

// KV keys
const KV_LIST_KEY = "psp:webhooks:list";
const KV_ITEM_PREFIX = "psp:webhooks:item:";
const MAX_ITEMS = 100;

function hasKvEnv(): boolean {
  // Support common env names used by @vercel/kv across setups
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.VERCEL_KV_REST_API_TOKEN ?? "";
  const url =
    process.env.KV_REST_API_URL ?? process.env.VERCEL_KV_REST_API_URL ?? "";
  return token.trim().length > 0 && url.trim().length > 0;
}

type KvClient = {
  set: (key: string, value: unknown) => Promise<unknown>;
  get: <T = unknown>(key: string) => Promise<T | null>;
  del: (...keys: string[]) => Promise<unknown>;
  lpush: (key: string, ...values: string[]) => Promise<unknown>;
  lrange: <T = unknown>(key: string, start: number, end: number) => Promise<T>;
  ltrim: (key: string, start: number, end: number) => Promise<unknown>;
  mget: <T = unknown>(...keys: string[]) => Promise<T>;
};

async function getKv(): Promise<KvClient | null> {
  if (!hasKvEnv()) return null;
  try {
    // Lazy import so local dev doesn't crash when KV isn't configured
    const mod = await import("@vercel/kv");
    return mod.kv as unknown as KvClient;
  } catch {
    return null;
  }
}

async function storeAppend(item: StoredWebhook): Promise<"kv" | "mem"> {
  const kv = await getKv();
  if (kv) {
    await kv.set(`${KV_ITEM_PREFIX}${item.id}`, item);
    await kv.lpush(KV_LIST_KEY, item.id);
    await kv.ltrim(KV_LIST_KEY, 0, MAX_ITEMS - 1);
    return "kv";
  }

  const mem = getMemoryStore();
  mem.unshift(item);
  if (mem.length > MAX_ITEMS) mem.length = MAX_ITEMS;
  return "mem";
}

async function storeRead(): Promise<{
  storage: "kv" | "mem";
  items: StoredWebhook[];
}> {
  const kv = await getKv();
  if (kv) {
    const ids = await kv.lrange<string[]>(KV_LIST_KEY, 0, MAX_ITEMS - 1);
    const list = Array.isArray(ids) ? ids : [];
    if (list.length === 0) return { storage: "kv", items: [] };

    const keys = list.map((id) => `${KV_ITEM_PREFIX}${id}`);
    const vals = await kv.mget<(StoredWebhook | null)[]>(...keys);

    const items = vals
      .filter((x): x is StoredWebhook => Boolean(x && typeof x === "object"))
      .slice(0, MAX_ITEMS);

    return { storage: "kv", items };
  }

  const mem = getMemoryStore();
  return { storage: "mem", items: mem.slice(0, MAX_ITEMS) };
}

async function storeClear(): Promise<"kv" | "mem"> {
  const kv = await getKv();
  if (kv) {
    const ids = await kv.lrange<string[]>(KV_LIST_KEY, 0, MAX_ITEMS - 1);
    const list = Array.isArray(ids) ? ids : [];
    if (list.length > 0) {
      const keys = list.map((id) => `${KV_ITEM_PREFIX}${id}`);
      await kv.del(...keys);
    }
    await kv.del(KV_LIST_KEY);
    return "kv";
  }

  global.__WEBHOOKS_STORE__ = [];
  return "mem";
}

// ===== SIGNATURE =====
// supported:
// "t=123, v1=abcd..."
// "t=123; v1=abcd..."
// "t=123,v1=abcd..."
function parsePspSignature(header: string): { t: number; v1: string } | null {
  if (!header || typeof header !== "string") return null;

  const parts = header
    .split(/[;,]/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const map = new Map<string, string>();

  for (const p of parts) {
    const [kRaw, ...rest] = p.split("=");
    if (!kRaw || rest.length === 0) continue;

    const k = kRaw.trim();
    const v = rest.join("=").trim();
    if (!k || !v) continue;

    map.set(k, v);
  }

  const tRaw = map.get("t");
  const v1Raw = map.get("v1");

  const t = tRaw ? Number(tRaw) : NaN;
  if (!Number.isFinite(t) || t <= 0) return null;

  const v1 = (v1Raw ?? "").trim().toLowerCase();
  if (!v1 || !/^[a-f0-9]{64}$/i.test(v1)) return null;

  return { t: Math.floor(t), v1 };
}

function timingSafeEqualHex(aHex: string, bHex: string): boolean {
  const a = Buffer.from(aHex, "hex");
  const b = Buffer.from(bHex, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function computeExpectedV1(raw: string, t: number, secret: string): string {
  const payload = `${t}.${raw}`;
  return crypto
    .createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("hex");
}

function verifySignatureDetailed(
  raw: string,
  header: string,
  secret: string
):
  | {
      ok: true;
      parsed: { t: number; v1: string };
      expected: string;
      rawSha: string;
    }
  | {
      ok: false;
      reason: string;
      parsed?: { t: number; v1: string };
      got?: string;
      expected?: string;
      rawSha?: string;
    } {
  const parsed = parsePspSignature(header);
  if (!parsed) return { ok: false, reason: "bad_header" };

  const rawSha = crypto.createHash("sha256").update(raw, "utf8").digest("hex");

  const expected = computeExpectedV1(raw, parsed.t, secret);
  const got = parsed.v1;

  const ok = timingSafeEqualHex(got, expected);

  return ok
    ? { ok: true, parsed, expected, rawSha }
    : { ok: false, reason: "mismatch", parsed, got, expected, rawSha };
}

// ===== HANDLERS =====

export async function POST(req: Request) {
  const secret = (process.env.PSP_WEBHOOK_SECRET ?? "").trim();
  if (!secret) {
    return new NextResponse("Missing PSP_WEBHOOK_SECRET", { status: 500 });
  }

  const raw = await req.text();

  const sig =
    req.headers.get("psp-signature") ??
    req.headers.get("x-psp-signature") ??
    req.headers.get("psp_signature");

  if (!sig) {
    if (!isProd()) {
      console.log("[psp-webhook] missing signature header", {
        headers: Object.fromEntries(req.headers.entries()),
        rawLen: raw.length,
        rawSha: crypto.createHash("sha256").update(raw, "utf8").digest("hex"),
        preview: raw.slice(0, 220),
      });
    }

    return NextResponse.json(
      { ok: false, error: "missing psp-signature" },
      { status: 401 }
    );
  }

  const v = verifySignatureDetailed(raw, sig, secret);

  if (!v.ok) {
    if (!isProd()) {
      console.log("[psp-webhook] invalid signature", {
        reason: v.reason,
        sig,
        parsed: v.parsed ?? null,
        got: (v.got ?? "").slice(0, 64),
        expected: (v.expected ?? "").slice(0, 64),
        rawLen: raw.length,
        rawSha: v.rawSha ?? null,
        secretLen: secret.length,
        contentType: req.headers.get("content-type"),
        preview: raw.slice(0, 220),
      });
    }

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

  const storage = await storeAppend(item);

  if (!isProd()) {
    console.log("[psp-webhook] received", {
      id: item.id,
      t: v.parsed.t,
      v1: v.parsed.v1.slice(0, 16),
      expectedPrefix: v.expected.slice(0, 16),
      rawLen: raw.length,
      rawSha: v.rawSha,
      storage,
      preview: raw.slice(0, 220),
    });
  }

  return NextResponse.json({ ok: true, id: item.id, storage });
}

export async function GET() {
  if (isProd()) return notFound();

  const { storage, items } = await storeRead();

  return NextResponse.json({
    ok: true,
    secretSet: Boolean((process.env.PSP_WEBHOOK_SECRET ?? "").trim()),
    storage,
    count: items.length,
    items: items.map((x) => ({
      id: x.id,
      ts: x.ts,
      preview: x.body.slice(0, 220),
    })),
  });
}

export async function DELETE() {
  if (isProd()) return notFound();
  const storage = await storeClear();
  return NextResponse.json({ ok: true, cleared: true, storage });
}
