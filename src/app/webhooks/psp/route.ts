// src/app/webhooks/psp/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function timingSafeEqualHex(aHex: string, bHex: string) {
  const a = Buffer.from(aHex, "hex");
  const b = Buffer.from(bHex, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function parseSignatureHeader(header: string | null) {
  // expected: "t=123, v1=abc..."
  if (!header) return null;
  const parts = header.split(",").map((p) => p.trim());
  const t = parts.find((p) => p.startsWith("t="))?.slice(2);
  const v1 = parts.find((p) => p.startsWith("v1="))?.slice(3);
  if (!t || !v1) return null;
  return { t, v1 };
}

function computeV1(secret: string, timestamp: string, bodyText: string) {
  // payload to sign: `${timestamp}.${body}`
  const signed = `${timestamp}.${bodyText}`;
  return crypto.createHmac("sha256", secret).update(signed).digest("hex");
}

export async function POST(req: NextRequest) {
  const secret = (process.env.PSP_WEBHOOK_SECRET ?? "").trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "Missing PSP_WEBHOOK_SECRET" },
      { status: 500 }
    );
  }

  const bodyText = await req.text();

  // Sender header: "psp-signature: t=..., v1=..."
  const signature = req.headers.get("psp-signature");
  const parsed = parseSignatureHeader(signature);
  if (!parsed) {
    return NextResponse.json(
      { ok: false, error: "Missing/invalid signature" },
      { status: 401 }
    );
  }

  // Some senders also send "psp-timestamp", but it's optional
  const headerTimestamp = req.headers.get("psp-timestamp");
  const timestamp =
    headerTimestamp && headerTimestamp.trim()
      ? headerTimestamp.trim()
      : parsed.t;

  // if both exist, they must match
  if (
    headerTimestamp &&
    headerTimestamp.trim() &&
    headerTimestamp.trim() !== parsed.t
  ) {
    return NextResponse.json(
      { ok: false, error: "Timestamp mismatch" },
      { status: 401 }
    );
  }

  // Replay protection (±5 minutes)
  const now = Math.floor(Date.now() / 1000);
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 5 * 60) {
    return NextResponse.json(
      { ok: false, error: "Stale timestamp" },
      { status: 401 }
    );
  }

  const expectedV1 = computeV1(secret, timestamp, bodyText);
  const ok = timingSafeEqualHex(expectedV1, parsed.v1);

  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "Bad signature" },
      { status: 401 }
    );
  }

  // ✅ Optional: parse for nicer logs (не обязательно)
  let parsedBody: any = null;
  try {
    parsedBody = JSON.parse(bodyText);
  } catch {}

  console.log("[WEBHOOK RECEIVED]", {
    at: new Date().toISOString(),
    timestamp,
    signature,
    eventType: parsedBody?.eventType ?? null,
    invoiceId: parsedBody?.invoiceId ?? null,
    bodyPreview: bodyText.slice(0, 500),
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
