// src/app/api/psp/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Next 15: params can be Promise in route handlers ("sync dynamic APIs")
type RouteContext = {
  params?: Promise<{ path?: string[] | string }> | { path?: string[] | string };
};

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

function safeJsonParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function proxy(req: NextRequest, ctx: RouteContext): Promise<Response> {
  try {
    const base =
      envAnyOpt(["PSP_API_URL", "PSP_API_BASE", "NEXT_PUBLIC_PSP_API_URL"]) ??
      "http://localhost:3001";

    const baseClean = stripTrailingSlashes(base);

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
    const pathname = path.join("/");

    const url = new URL(baseClean);
    url.pathname = joinPaths(url.pathname || "/", pathname);

    // ✅ forward querystring exactly
    url.search = req.nextUrl.search;

    // ✅ debug flag
    const debug = req.nextUrl.searchParams.get("__debug") === "1";

    const headers = new Headers(req.headers);

    headers.delete("accept-encoding");
    headers.delete("host");
    headers.delete("connection");
    headers.delete("content-length");

    // Never forward client auth headers upstream
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

    const ct = upstream.headers.get("content-type") ?? "";
    const status = upstream.status;

    // If debug requested AND upstream is JSON -> wrap response with __debug
    if (debug && ct.toLowerCase().includes("application/json")) {
      const text = await upstream.text();
      const parsed = safeJsonParse(text);

      const payload =
        parsed && typeof parsed === "object"
          ? { ...(parsed as Record<string, unknown>) }
          : { data: parsed ?? text };

      const wrapped = {
        __debug: {
          target: url.toString(),
          path: pathname || "(empty)",
          query: req.nextUrl.search || "(none)",
          auth: `${merchantId ? "m:1" : "m:0"}:${apiKey ? "k:1" : "k:0"}`,
          base: baseClean,
        },
        ...payload,
      };

      return NextResponse.json(wrapped, {
        status,
        headers: { "cache-control": "no-store" },
      });
    }

    // Normal pass-through (binary safe)
    const data = await upstream.arrayBuffer();

    const resHeaders = new Headers();
    if (ct) resHeaders.set("content-type", ct);
    resHeaders.set("cache-control", "no-store");

    return new NextResponse(data, { status, headers: resHeaders });
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
