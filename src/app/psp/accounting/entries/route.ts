// src/app/api/psp/accounting/entries/route.ts

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pickStr(v: string | null, fallback: string) {
  const s = (v ?? "").trim();
  return s.length ? s : fallback;
}

function getPspBaseUrl() {
  const envUrl =
    process.env.PSP_API_URL ||
    process.env.NEXT_PUBLIC_PSP_API_URL ||
    process.env.PSP_CORE_URL;

  if (envUrl) return envUrl.replace(/\/+$/, "");

  // Dev fallback: local psp-core
  return "http://localhost:3001";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const merchantId = pickStr(
      url.searchParams.get("merchantId"),
      "demo-merchant"
    );
    const limitRaw = Number(pickStr(url.searchParams.get("limit"), "20"));
    const limit = Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(limitRaw, 200))
      : 20;

    const base = getPspBaseUrl();
    const upstream = new URL("/accounting/entries", base);
    upstream.searchParams.set("merchantId", merchantId);
    upstream.searchParams.set("limit", String(limit));

    const r = await fetch(upstream, {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });

    const text = await r.text();

    if (!r.ok) {
      return NextResponse.json(
        { error: "upstream_error", status: r.status },
        { status: 502 }
      );
    }

    // Upstream returns JSON array
    return new NextResponse(text, {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch {
    return NextResponse.json({ error: "proxy_failed" }, { status: 500 });
  }
}
