import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function joinPaths(basePath: string, tailPath: string): string {
  const a = (basePath || "").replace(/\/+$/, "");
  const b = (tailPath || "").replace(/^\/+/, "");
  return `${a}/${b}`.replace(/\/{2,}/g, "/");
}

function envAnyOpt(names: string[]): string | null {
  for (const n of names) {
    const v = (process.env[n] ?? "").trim();
    if (v) return v;
  }
  return null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return proxy(req, resolvedParams.path);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return proxy(req, resolvedParams.path);
}

async function proxy(req: NextRequest, pathParts: string[]) {
  const pathname = Array.isArray(pathParts) ? pathParts.join("/") : String(pathParts);
  const basePreferred = envAnyOpt(["PSP_API_URL"]) ?? "http://localhost:3001";
  
  const merchantId = envAnyOpt(["PSP_MERCHANT_ID", "DEMO_MERCHANT_ID"]);
  const apiKey = envAnyOpt(["PSP_API_KEY", "DEMO_API_KEY"]);
  const internalKey = envAnyOpt(["PSP_INTERNAL_KEY"]);

  const url = new URL(basePreferred);
  url.pathname = joinPaths(url.pathname, pathname);
  url.search = req.nextUrl.search;

  const headers = new Headers();
  const ctIn = req.headers.get("content-type");
  if (ctIn) headers.set("content-type", ctIn);
  headers.set("accept", "application/json");
  
  if (merchantId) headers.set("x-merchant-id", merchantId);
  if (apiKey) headers.set("x-api-key", apiKey);
  if (internalKey) headers.set("X-PSP-Internal-Key", internalKey);

  try {
    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const body = hasBody ? await req.arrayBuffer() : undefined;
    
    const upstream = await fetch(url.toString(), {
      method: req.method,
      headers,
      body,
      cache: "no-store",
    });

    const resHeaders = new Headers();
    const outCt = upstream.headers.get("content-type");
    if (outCt) resHeaders.set("content-type", outCt);

    const data = await upstream.json().catch(() => ({ error: "Non-JSON response" }));
    return NextResponse.json(data, { status: upstream.status, headers: resHeaders });
  } catch (e) {
    return NextResponse.json({ error: "Proxy failed", message: String(e) }, { status: 502 });
  }
}
