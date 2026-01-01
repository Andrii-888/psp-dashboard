import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const raw = await req.text();
  console.log("[webhooks] received", {
    ts: new Date().toISOString(),
    method: "POST",
    contentType: req.headers.get("content-type"),
    len: raw.length,
    preview: raw.slice(0, 200),
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, method: "GET" });
}
