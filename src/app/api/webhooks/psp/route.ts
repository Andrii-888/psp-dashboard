// src/app/api/webhooks/psp/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";

import {
  inboxAddAsync,
  inboxListAsync,
  inboxMetaAsync,
} from "@/lib/webhookInboxStore";

export const runtime = "nodejs";

function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

function notFound() {
  return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
}

// Reads first non-empty env from the list (optional)
function envAnyOpt(names: string[]): string | null {
  for (const n of names) {
    const v = (process.env[n] ?? "").trim();
    if (v) return v;
  }
  return null;
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
        method: req.method,
        url: req.url,
        path: new URL(req.url).pathname,
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

  // ✅ STEP-2 DEBUG (TEMP, PROD-SAFE)
  console.log("[psp-webhook] verify input", {
    method: req.method,
    url: req.url,
    path: new URL(req.url).pathname,
    sigPrefix80: sig.slice(0, 80),
    rawLen: raw.length,
  });

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
      {
        ok: false,
        error: "invalid signature",
        debug: isProd()
          ? undefined
          : {
              reason: v.reason,
              sig,
              parsed: v.parsed ?? null,
              got: v.got ?? null,
              expected: v.expected ?? null,
              rawSha: v.rawSha ?? null,
              rawLen: raw.length,
              contentType: req.headers.get("content-type"),
            },
      },
      { status: 401 }
    );
  }

  // Type from inboxAddAsync signature — no any
  type InboxItem = Parameters<typeof inboxAddAsync>[0];

  const item: InboxItem = {
    id: `wh_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    ts: new Date().toISOString(),
    preview: raw.slice(0, 220),
    rawBody: raw,
    headers: Object.fromEntries(req.headers.entries()),
  };

  await inboxAddAsync(item);

  if (!isProd()) {
    console.log("[psp-webhook] received", {
      id: item.id,
      t: v.parsed.t,
      v1: v.parsed.v1.slice(0, 16),
      expectedPrefix: v.expected.slice(0, 16),
      rawLen: raw.length,
      rawSha: v.rawSha,
      preview: raw.slice(0, 220),
    });
  }

  const meta = await inboxMetaAsync();
  return NextResponse.json({ ok: true, id: item.id, storage: meta.storage });
}

export async function GET(req: Request) {
  // Production: allow listing only with token
  const token = new URL(req.url).searchParams.get("token") ?? "";

  const expected =
    envAnyOpt(["PSP_INBOX_TOKEN", "NEXT_PUBLIC_PSP_INBOX_TOKEN"]) ?? "";

  const allow = Boolean(expected) && token === expected;

  // Production behavior:
  // - no token      -> 404 (route hidden)
  // - token mismatch -> 401 (helps debug env/token issues)
  if (isProd() && !allow) {
    if (!token) return notFound();

    return NextResponse.json(
      {
        ok: false,
        error: "forbidden",
        expectedSet: Boolean(expected),
      },
      { status: 401 }
    );
  }

  const [meta, items] = await Promise.all([inboxMetaAsync(), inboxListAsync()]);

  return NextResponse.json({
    ok: true,
    secretSet: Boolean((process.env.PSP_WEBHOOK_SECRET ?? "").trim()),
    storage: meta.storage,
    count: meta.count,
    max: meta.max,
    items,
  });
}

export async function DELETE() {
  if (isProd()) return notFound();
  return notFound();
}
