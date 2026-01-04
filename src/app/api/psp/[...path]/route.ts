import { NextResponse } from "next/server";

export const runtime = "nodejs";

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

type RouteContext = { params: { path?: string[] } };

async function proxy(req: Request, ctx: RouteContext): Promise<Response> {
  const base = mustEnv("PSP_API_BASE").replace(/\/+$/, "");
  const merchantId = mustEnv("PSP_MERCHANT_ID");
  const apiKey = mustEnv("PSP_API_KEY");

  const path = (ctx.params.path ?? []).join("/");
  const url = new URL(req.url);
  const target = `${base}/${path}${url.search}`;

  const headers = new Headers(req.headers);
  headers.set("x-merchant-id", merchantId);
  headers.set("x-api-key", apiKey);
  headers.set("accept", "application/json");

  // убираем то, что нельзя/не нужно проксировать
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");

  const body =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : await req.text();

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body,
    cache: "no-store",
  });

  const contentType =
    upstream.headers.get("content-type") ?? "application/json";
  const text = await upstream.text();

  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": contentType,
      "cache-control": "no-store",
    },
  });
}

export async function GET(req: Request, ctx: RouteContext) {
  return proxy(req, ctx);
}
export async function POST(req: Request, ctx: RouteContext) {
  return proxy(req, ctx);
}
export async function PATCH(req: Request, ctx: RouteContext) {
  return proxy(req, ctx);
}
export async function DELETE(req: Request, ctx: RouteContext) {
  return proxy(req, ctx);
}
