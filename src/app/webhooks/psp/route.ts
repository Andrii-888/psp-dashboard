// src/app/webhooks/psp/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function timingSafeEqualHex(a: string, b: string) {
  const aa = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function parseSignatureHeader(
  sig: string | null
): { t: string; v1: string } | null {
  if (!sig) return null;

  // format: "t=..., v1=..."
  const parts = sig.split(",").map((p) => p.trim());
  const tPart = parts.find((p) => p.startsWith("t="));
  const v1Part = parts.find((p) => p.startsWith("v1="));
  if (!tPart || !v1Part) return null;

  const t = tPart.slice(2);
  const v1 = v1Part.slice(3);
  if (!t || !v1) return null;

  return { t, v1 };
}

export async function POST(req: NextRequest) {
  const bodyText = await req.text();

  const timestamp = req.headers.get("psp-timestamp") ?? "";
  const signature = req.headers.get("psp-signature");
  const parsed = parseSignatureHeader(signature);

  const secret = process.env.PSP_WEBHOOK_SECRET ?? "";

  // 1) must have secret + signature
  if (!secret || !parsed || !timestamp) {
    console.log("[WEBHOOK REJECTED]", {
      reason: "missing secret/signature/timestamp",
    });
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // 2) verify timestamp matches header (extra sanity)
  // (your signer uses psp-timestamp header; signature contains t=... too)
  if (parsed.t !== timestamp) {
    console.log("[WEBHOOK REJECTED]", {
      reason: "timestamp mismatch",
      header: timestamp,
      sigT: parsed.t,
    });
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // 3) compute expected signature: HMAC_SHA256(secret, `${t}.${body}`)
  const signedPayload = `${parsed.t}.${bodyText}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  const ok = timingSafeEqualHex(expected, parsed.v1);

  if (!ok) {
    console.log("[WEBHOOK REJECTED]", { reason: "bad signature", t: parsed.t });
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // ✅ accepted
  console.log("[WEBHOOK RECEIVED]", {
    at: new Date().toISOString(),
    timestamp,
    signature,
    bodyPreview: bodyText.slice(0, 500),
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
