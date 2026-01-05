// src/app/api/psp/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// Next 15: params can be Promise in route handlers ("sync dynamic APIs")
type RouteContext = {
  params?: Promise<{ path?: string[] | string }> | { path?: string[] | string };
};

function derivePathFromUrl(req: NextRequest): string[] {
  // /api/psp/<...>  => берем всё после /api/psp
  const parts = req.nextUrl.pathname.split("/").filter(Boolean);
  const apiIdx = parts.indexOf("api");
  const pspIdx = parts.indexOf("psp");
  if (apiIdx === -1 || pspIdx === -1 || pspIdx < apiIdx) return [];
  return parts.slice(pspIdx + 1);
}

async function readParams(
  ctx: RouteContext
): Promise<{ path?: string[] | string }> {
  const p = ctx.params;
  if (!p) return {};
  return typeof (p as Promise<unknown>).then === "function"
    ? await (p as Promise<{ path?: string[] | string }>)
    : (p as { path?: string[] | string });
}

async function proxy(req: NextRequest, ctx: RouteContext): Promise<Response> {
  try {
    const base = mustEnv("PSP_API_BASE").replace(/\/+$/, "");
    const merchantId = mustEnv("PSP_MERCHANT_ID");
    const apiKey = mustEnv("PSP_API_KEY");

    const params = await readParams(ctx);
    const raw = params.path;

    const pathFromParams = Array.isArray(raw)
      ? raw
      : typeof raw === "string"
      ? [raw]
      : [];
    const path = pathFromParams.length
      ? pathFromParams
      : derivePathFromUrl(req);

    const pathname = path.join("/");
    const target = `${base}/${pathname}${req.nextUrl.search}`;

    const headers = new Headers(req.headers);

    headers.delete("accept-encoding");
    headers.delete("host");
    headers.delete("connection");
    headers.delete("content-length");

    headers.set("x-merchant-id", merchantId);
    headers.set("x-api-key", apiKey);
    if (!headers.get("accept")) headers.set("accept", "application/json");

    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const body = hasBody ? await req.arrayBuffer() : undefined;

    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });

    const resHeaders = new Headers();
    const ct = upstream.headers.get("content-type");
    if (ct) resHeaders.set("content-type", ct);
    resHeaders.set("cache-control", "no-store");

    // debug headers only in dev
    if (process.env.NODE_ENV !== "production") {
      resHeaders.set("x-psp-proxy-hit", "1");
      resHeaders.set("x-psp-proxy-target", target);
      resHeaders.set("x-psp-proxy-path", pathname || "(empty)");
    }

    const data = await upstream.arrayBuffer();

    return new NextResponse(data, {
      status: upstream.status,
      headers: resHeaders,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { ok: false, where: "api/psp proxy", error: message },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}
export async function POST(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}
