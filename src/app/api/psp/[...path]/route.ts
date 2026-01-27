// src/app/api/psp/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// ---------------------------
// Dev base resolution (no prod fallback)
// ---------------------------
let cachedBase: string | null = null;
let lastProbeAt = 0;
const PROBE_TTL_MS = 15_000; // dev: probe at most once per 15s
let warnedOnce = false;

// Next 15: params can be Promise in route handlers ("sync dynamic APIs")
type RouteContext = {
  params?: Promise<{ path?: string[] | string }> | { path?: string[] | string };
};

type FeesByCurrencyRow = {
  currency: string;
  sum: string;
};

type FeesSummaryResponse = {
  merchantId: string;
  from: string | null;
  to: string | null;
  totalFiatSum: string;
  feesByCurrency: FeesByCurrencyRow[];
};

function chfOnlyFeesSummary(data: FeesSummaryResponse): FeesSummaryResponse {
  const chfRow = data.feesByCurrency.find(
    (r) => r.currency.trim().toUpperCase() === "CHF"
  );

  const chfSumNum = chfRow ? Number(chfRow.sum) : 0;
  const chfSum = Number.isFinite(chfSumNum) ? chfSumNum.toFixed(2) : "0.00";

  return {
    ...data,
    totalFiatSum: chfSum,
    feesByCurrency: chfRow ? [{ currency: "CHF", sum: chfSum }] : [],
  };
}

type AccountingSummaryResponse = {
  merchantId: string;
  from: string | null;
  to: string | null;
  confirmedCount: number;
  grossSum: string;
  feeSum: string;
  netSum: string;
  feeFiatSum: string;
  feeFiatCurrency: string;
};

function applyChfFeeToAccountingSummary(
  summary: AccountingSummaryResponse,
  fees: FeesSummaryResponse
): AccountingSummaryResponse {
  // Enforce CHF-first based on feesByCurrency (presentation layer rule)
  const rows = Array.isArray(fees.feesByCurrency) ? fees.feesByCurrency : [];
  const chfRow = rows.find(
    (r) =>
      String(r.currency ?? "")
        .trim()
        .toUpperCase() === "CHF"
  );

  const chfSum = String(chfRow?.sum ?? "0");

  return {
    ...summary,
    feeFiatCurrency: "CHF",
    feeFiatSum: chfSum,
  };
}

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

async function canReach(baseUrl: string): Promise<boolean> {
  try {
    const u = new URL(baseUrl);
    u.pathname = joinPaths(u.pathname || "/", "health");
    u.search = "";
    const r = await fetch(u.toString(), { method: "GET", cache: "no-store" });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * Returns:
 * - production: preferredClean (no probing)
 * - dev:
 *   - if preferred is not local -> preferredClean
 *   - if preferred is local and reachable -> preferredClean
 *   - if preferred is local and NOT reachable -> "" (meaning "offline")
 */
async function resolveBase(preferredBase: string): Promise<string> {
  const preferredClean = stripTrailingSlashes(preferredBase);

  // prod: deterministic, no probing
  if (process.env.NODE_ENV === "production") return preferredClean;

  // dev cache
  const now = Date.now();
  if (cachedBase !== null && now - lastProbeAt < PROBE_TTL_MS)
    return cachedBase;
  lastProbeAt = now;

  const isLocal =
    preferredClean.includes("localhost") ||
    preferredClean.includes("127.0.0.1");

  if (!isLocal) {
    cachedBase = preferredClean;
    return cachedBase;
  }

  const ok = await canReach(preferredClean);
  if (ok) {
    cachedBase = preferredClean;
    return cachedBase;
  }

  cachedBase = "";

  if (!warnedOnce) {
    warnedOnce = true;
    console.warn(
      `[api/psp proxy] PSP Core is not reachable at ${preferredClean}. Start psp-core locally (or set PSP_API_URL).`
    );
  }

  return cachedBase;
}

// ---------------------------
// Error cause helper (safe)
// ---------------------------
type FetchCause = {
  name?: string;
  message?: string;
  code?: string;
  errno?: string;
  syscall?: string;
  address?: string;
  port?: number;
};

function getFetchCause(e: unknown): FetchCause | null {
  if (typeof e !== "object" || e === null) return null;

  const withCause = e as { cause?: unknown };
  const c = withCause.cause;
  if (typeof c !== "object" || c === null) return null;

  const obj = c as Record<string, unknown>;

  const pickStr = (k: string): string | undefined => {
    const v = obj[k];
    return typeof v === "string" ? v : undefined;
  };

  const pickNum = (k: string): number | undefined => {
    const v = obj[k];
    return typeof v === "number" ? v : undefined;
  };

  return {
    name: pickStr("name"),
    message: pickStr("message"),
    code: pickStr("code"),
    errno: pickStr("errno"),
    syscall: pickStr("syscall"),
    address: pickStr("address"),
    port: pickNum("port"),
  };
}

// ---------------------------
// CHF-first helpers
// ---------------------------
const CHF = "CHF";

function filterInvoicesChf(payload: unknown): unknown {
  const isChf = (x: unknown): boolean => {
    if (typeof x !== "object" || x === null) return false;
    const fiatCurrency = (x as { fiatCurrency?: unknown }).fiatCurrency;
    return (
      String(fiatCurrency ?? "")
        .trim()
        .toUpperCase() === CHF
    );
  };

  // core returns array for /invoices
  if (Array.isArray(payload)) return payload.filter(isChf);

  // if someday it returns { items: [...] }
  if (payload && typeof payload === "object") {
    const obj = payload as { items?: unknown };
    if (Array.isArray(obj.items)) {
      return {
        ...(payload as object),
        items: (obj.items as unknown[]).filter(isChf),
      };
    }
  }

  return payload;
}

// ---------------------------
// Proxy
// ---------------------------
async function proxy(req: NextRequest, ctx: RouteContext): Promise<Response> {
  // We need pathname early (for CSV/dev offline responses)
  const params = await readParams(ctx);
  const raw = params.path;

  const pathFromParams = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
    ? [raw]
    : [];

  const path = (pathFromParams.length ? pathFromParams : derivePathFromUrl(req))
    .map((p) => p.trim())
    .filter(Boolean);

  // ⬇️ нормализуем: убираем возможный trailing slash
  const pathname = path.join("/").replace(/\/+$/, "");

  const isCsv =
    pathname.toLowerCase().endsWith(".csv") ||
    (req.headers.get("accept") ?? "").toLowerCase().includes("text/csv");

  // Base URL of PSP Core (NO /api). Prefer server-only envs.
  const basePreferred =
    envAnyOpt(["PSP_API_URL", "PSP_API_BASE", "NEXT_PUBLIC_PSP_API_URL"]) ??
    "http://localhost:3001";

  const baseClean = await resolveBase(basePreferred);

  // Dev offline: do NOT fallback to prod, return fast 503
  if (!baseClean) {
    if (isCsv) {
      return new NextResponse(
        `CSV export unavailable: PSP Core is offline in dev.\nStart psp-core locally on ${basePreferred}.\n`,
        {
          status: 503,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "no-store",
          },
        }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        where: "api/psp proxy",
        error:
          "PSP Core is offline (dev). Start psp-core locally or set PSP_API_URL.",
      },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }

  try {
    // ✅ Credentials:
    // Prefer ENV (server-controlled) so browser requests work.
    // In dev, allow override from incoming headers ONLY if provided.
    const envMerchantId = envAnyOpt(["PSP_MERCHANT_ID", "DEMO_MERCHANT_ID"]);
    const envApiKey = envAnyOpt(["PSP_API_KEY", "DEMO_API_KEY"]);

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

    const allowIncomingOverride = process.env.NODE_ENV !== "production";

    // ✅ ENV wins always. Incoming headers are fallback (dev/manual).
    const merchantId =
      envMerchantId ??
      (allowIncomingOverride ? incomingMerchantId : null) ??
      null;
    const apiKey =
      envApiKey ?? (allowIncomingOverride ? incomingApiKey : null) ?? null;

    // ✅ Build upstream URL safely + preserve querystring
    const url = new URL(baseClean);
    url.pathname = joinPaths(url.pathname || "/", pathname);

    const qs = req.nextUrl.search; // includes leading "?"
    url.search = qs.startsWith("?") ? qs.slice(1) : qs;

    // ✅ Minimal upstream headers (avoid forwarding browser/hop-by-hop headers)
    const headers = new Headers();

    // Preserve content-type for requests with body
    const ctIn = pickHeader(req.headers, "content-type");
    if (ctIn) headers.set("content-type", ctIn);

    // Accept: CSV vs JSON
    headers.set("accept", isCsv ? "text/csv" : "application/json");

    // Stable user-agent for upstream logs
    headers.set("user-agent", "psp-dashboard-proxy/1.0");

    // Auth (server-controlled)
    if (merchantId) headers.set("x-merchant-id", merchantId);
    if (apiKey) headers.set("x-api-key", apiKey);

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
    const outCt = upstream.headers.get("content-type");
    const outCd = upstream.headers.get("content-disposition");

    if (outCt) resHeaders.set("content-type", outCt);
    if (outCd) resHeaders.set("content-disposition", outCd);
    resHeaders.set("cache-control", "no-store");

    // ✅ Health passthrough (JSON only) — used by UI availability check
    if (!isCsv && pathname === "health") {
      const json = await upstream.json().catch(() => null);

      return NextResponse.json(json, {
        status: upstream.status,
        headers: resHeaders,
      });
    }

    // ✅ Special case: CHF-first for invoices list (JSON only)
    if (!isCsv && pathname === "invoices") {
      const json = await upstream.json().catch(() => null);
      const out = upstream.ok ? filterInvoicesChf(json) : json;

      return NextResponse.json(out, {
        status: upstream.status,
        headers: resHeaders,
      });
    }

    // ✅ Special case: CHF-first for accounting entries list (JSON only)
    if (!isCsv && pathname === "accounting/entries") {
      const json = await upstream.json().catch(() => null);

      type EntryLike = Record<string, unknown>;

      const isObj = (v: unknown): v is EntryLike =>
        typeof v === "object" && v !== null;

      const normalizeChfEntry = (x: EntryLike): EntryLike => {
        const currency = String(x.currency ?? "")
          .trim()
          .toUpperCase();
        if (currency !== "CHF") return x;

        return {
          ...x,
          currency: "CHF",
          fiatCurrency: x.fiatCurrency ?? "CHF",
          feeFiatCurrency: x.feeFiatCurrency ?? "CHF",
        };
      };

      const onlyChfAndNormalized = (arr: unknown[]) =>
        (arr ?? [])
          .filter(isObj)
          .filter(
            (x) =>
              String(x.currency ?? "")
                .trim()
                .toUpperCase() === "CHF"
          )
          .map(normalizeChfEntry);

      const out =
        upstream.ok && Array.isArray(json) ? onlyChfAndNormalized(json) : json;

      return NextResponse.json(out, {
        status: upstream.status,
        headers: resHeaders,
      });
    }

    // ✅ CHF-only: fees summary endpoint (JSON)
    if (!isCsv && pathname === "accounting/summary/fees") {
      const json = await upstream.json().catch(() => null);
      const out = upstream.ok ? chfOnlyFeesSummary(json) : json;

      return NextResponse.json(out, {
        status: upstream.status,
        headers: resHeaders,
      });
    }

    // ✅ CHF-only: accounting summary (feeFiatSum + feeFiatCurrency)
    if (!isCsv && pathname === "accounting/summary") {
      const summaryJson = (await upstream
        .json()
        .catch(() => null)) as AccountingSummaryResponse | null;

      if (!upstream.ok || !summaryJson) {
        return NextResponse.json(summaryJson, {
          status: upstream.status,
          headers: resHeaders,
        });
      }

      // fetch fees summary and enforce CHF-only
      const feesUrl = new URL(baseClean);
      feesUrl.pathname = joinPaths(
        feesUrl.pathname || "/",
        "accounting/summary/fees"
      );

      const feesUpstream = await fetch(
        feesUrl.toString() + (req.nextUrl.search || ""),
        {
          method: "GET",
          headers,
          cache: "no-store",
          redirect: "manual",
        }
      );

      const feesJsonRaw: unknown = await feesUpstream.json().catch(() => null);

      const feesJson =
        feesJsonRaw && typeof feesJsonRaw === "object"
          ? (feesJsonRaw as FeesSummaryResponse)
          : null;

      // Normalize fees -> CHF-first (do not allow null/non-CHF in dashboard summary)
      const feesChf: FeesSummaryResponse | null =
        feesUpstream.ok && feesJson
          ? ({
              ...feesJson,
              totalFiatSum: String(feesJson.totalFiatSum ?? "0"),
            } satisfies FeesSummaryResponse)
          : null;

      const out = feesChf
        ? applyChfFeeToAccountingSummary(summaryJson, feesChf)
        : summaryJson;

      return NextResponse.json(out, {
        status: upstream.status,
        headers: resHeaders,
      });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const cause = getFetchCause(e);

    // Server-side debug only
    if (process.env.NODE_ENV !== "production") {
      console.error("[api/psp proxy] error:", { message, cause });
    }

    // ✅ For proxy/network failures return 502 (not 500)
    return NextResponse.json(
      { ok: false, where: "api/psp proxy", error: message },
      {
        status: 502,
        headers: {
          "cache-control": "no-store",
        },
      }
    );
  }
  // ✅ TypeScript guard: should never reach here, but keeps Promise<Response> strict
  return NextResponse.json(
    {
      ok: false,
      where: "api/psp proxy",
      error: "Proxy fell through without response",
    },
    { status: 500, headers: { "cache-control": "no-store" } }
  );
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
