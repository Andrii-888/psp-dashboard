// src/app/api/psp/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Next 15: params can be Promise in route handlers ("sync dynamic APIs")
type RouteContext = {
  params?: Promise<{ path?: string[] | string }> | { path?: string[] | string };
};

// Reads first non-empty env from the list
function envAny(names: string[]): string {
  for (const n of names) {
    const v = (process.env[n] ?? "").trim();
    if (v) return v;
  }
  throw new Error(`Missing env: one of ${names.join(", ")}`);
}

function derivePathFromUrl(req: NextRequest): string[] {
  // /api/psp/<...> => берём всё после /api/psp
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

function stripTrailingSlashes(v: string) {
  return v.replace(/\/+$/, "");
}

function joinPaths(basePath: string, tailPath: string): string {
  const a = basePath.replace(/\/+$/, "");
  const b = (tailPath || "").replace(/^\/+/, "");
  if (!a && !b) return "/";
  if (!a) return `/${b}`;
  if (!b) return a.startsWith("/") ? a : `/${a}`;
  const joined = `${a}/${b}`.replace(/\/{2,}/g, "/");
  return joined.startsWith("/") ? joined : `/${joined}`;
}

async function proxy(req: NextRequest, ctx: RouteContext): Promise<Response> {
  try {
    // ✅ Base URL (server-only env preferred). Fallback for compatibility.
    const base = stripTrailingSlashes(
      envAny(["PSP_API_URL", "PSP_API_BASE", "NEXT_PUBLIC_PSP_API_URL"])
    );

    // ✅ Credentials (server-only)
    const merchantId = envAny(["PSP_MERCHANT_ID"]);
    const apiKey = envAny(["PSP_API_KEY"]);

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

    // ✅ URL-safe build + correct query-string
    const url = new URL(base);
    url.pathname = joinPaths(url.pathname || "/", pathname);

    // IMPORTANT: NextRequest.nextUrl.search includes leading "?"
    // URL.search expects WITHOUT "?"
    const qs = req.nextUrl.search;
    url.search = qs.startsWith("?") ? qs.slice(1) : qs;

    // Copy incoming headers but prevent spoofing + remove hop-by-hop
    const headers = new Headers(req.headers);

    headers.delete("accept-encoding");
    headers.delete("host");
    headers.delete("connection");
    headers.delete("content-length");

    // Prevent client spoofing of auth headers
    headers.delete("x-merchant-id");
    headers.delete("x-api-key");

    headers.set("x-merchant-id", merchantId);
    headers.set("x-api-key", apiKey);

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

    // Pass-through safe headers
    const resHeaders = new Headers();
    const ct = upstream.headers.get("content-type");
    if (ct) resHeaders.set("content-type", ct);
    resHeaders.set("cache-control", "no-store");

    // Debug headers only in dev
    if (process.env.NODE_ENV !== "production") {
      resHeaders.set("x-psp-proxy-hit", "1");
      resHeaders.set("x-psp-proxy-target", url.toString());
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
