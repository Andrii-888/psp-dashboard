// src/app/api/auth/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    merchantId?: string;
    apiKey?: string;
  };

  const merchantId = String(body.merchantId ?? "").trim();
  const apiKey = String(body.apiKey ?? "").trim();

  if (!merchantId || !apiKey) {
    return NextResponse.json(
      { ok: false, error: "merchantId and apiKey are required" },
      { status: 400 }
    );
  }

  const res = NextResponse.json({ ok: true });

  // httpOnly cookies so SSR can read them, client JS cannot
  res.cookies.set("psp_merchant_id", merchantId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  res.cookies.set("psp_api_key", apiKey, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });

  res.cookies.set("psp_merchant_id", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  res.cookies.set("psp_api_key", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}
