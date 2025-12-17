// src/app/webhooks/psp/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const bodyText = await req.text();

  // Логи в Vercel будут видны в "Functions logs"
  console.log("[WEBHOOK RECEIVED]", {
    at: new Date().toISOString(),
    timestamp: req.headers.get("psp-timestamp"),
    signature: req.headers.get("psp-signature"),
    bodyPreview: bodyText.slice(0, 500),
  });

  // MVP: просто подтверждаем приём
  return NextResponse.json({ ok: true }, { status: 200 });
}
