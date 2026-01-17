// src/app/api/psp/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Next 15: params can be Promise in route handlers ("sync dynamic APIs")
type RouteContext = {
  params?: Promise<{ path?: string[] | string }> | { path?: string[] | string };
};

// Reads first non-empty env from the list (optional)
function envAnyOpt(names: string[]): string | null {
  for (const n of names) {
    const v = (process.env[n] ?? "").trim();
    if (v) return v;
  }
  return null;
}

function stripTrailingSlashes(v: string) {
  return v.replace(/\/+$/, "");
}

function joinPaths(basePath: string, tailPath: string): string {
  const a = (basePath || "").replace(/\/+$/, "");
  const b = (tailPath || "").replace(/^\/+/, "");
  if (!a && !b) return "/";
  if (!a) return `/${b}`;
  if (!b) return a.startsWith("/") ? a : `/${a}`;
  const joined = `${a}/${b}`.replace(/\/{2,}/g, "/");
  return joined.startsWith("/") ? joined : `/${joined}`;
}

function pickHeader(headers: Headers, key: string): string | null {
  const v = headers.get(key);
  const s = (v ?? "").trim();
  return s.length ? s : null;
}

function derivePathFromUrl(req: NextRequest): string[] {
  // /api/psp/<...> => take everything after /api/psp
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
    // ✅ Base URL of PSP Core (NO /api). Prefer server-only envs.
    const base =
      envAnyOpt(["PSP_API_URL", "PSP_API_BASE", "NEXT_PUBLIC_PSP_API_URL"]) ??
      "http://localhost:3001";

    const baseClean = stripTrailingSlashes(base);

    // ✅ Credentials:
    // - Prefer incoming request headers (dev / manual testing)
    // - Fallback to env (production)
    const incomingMerchantId =
      pickHeader(req.headers, "x-merchant-id") ??
      pickHeader(req.headers, "x-merchant");

    const incomingApiKey =
      pickHeader(req.headers, "x-api-key") ??
      (() => {
        const auth = pickHeader(req.headers, "authorization");
        if (!auth) return null;
        const m = auth.match(/^Bearer\s+(.+)$/i);
        return m?.[1]?.trim() ? m[1].trim() : null;
      })();

    const envMerchantId = envAnyOpt(["PSP_MERCHANT_ID", "DEMO_MERCHANT_ID"]);
    const envApiKey = envAnyOpt(["PSP_API_KEY", "DEMO_API_KEY"]);

    const merchantId = incomingMerchantId ?? envMerchantId;
    const apiKey = incomingApiKey ?? envApiKey;

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
    const pathname = path.join("/"); // e.g. "invoices/123"

    // ✅ Build upstream URL safely + preserve querystring
    const url = new URL(baseClean);
    url.pathname = joinPaths(url.pathname || "/", pathname);

    const qs = req.nextUrl.search; // includes leading "?"
    url.search = qs.startsWith("?") ? qs.slice(1) : qs;

    // ✅ Copy incoming headers + remove hop-by-hop headers
    const headers = new Headers(req.headers);

    headers.delete("accept-encoding");
    headers.delete("host");
    headers.delete("connection");
    headers.delete("content-length");

    // ✅ Always control auth headers (avoid leaking client auth)
    headers.delete("x-merchant-id");
    headers.delete("x-merchant");
    headers.delete("x-api-key");
    headers.delete("authorization");

    if (merchantId) headers.set("x-merchant-id", merchantId);
    if (apiKey) headers.set("x-api-key", apiKey);

    if (!headers.get("accept")) headers.set("accept", "application/json");

    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const body = hasBody ? await req.arrayBuffer() : undefined;

    const upstream = await fetch(url.toString(), {
      method: req.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });

    // ✅ Return only safe headers back to client
    const resHeaders = new Headers();
    const ct = upstream.headers.get("content-type");
    if (ct) resHeaders.set("content-type", ct);
    resHeaders.set("cache-control", "no-store");

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
export async function PUT(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}
export async function HEAD(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}
