// src/lib/env.server.ts
// Centralized server-only environment access (PSP-dashboard)

function trim(v: string | undefined | null) {
  const s = (v ?? "").trim();
  return s.length ? s : "";
}

function stripTrailingSlashes(v: string) {
  return v.replace(/\/+$/, "");
}

function requireEnv(name: string, v: string) {
  if (!v) {
    throw new Error(`Missing required env: ${name}`);
  }
  return v;
}

export const env = {
  nodeEnv: trim(process.env.NODE_ENV) || "development",
  isProd: (trim(process.env.NODE_ENV) || "development") === "production",

  // PSP Core base URL (used by /api/psp/* proxy and server routes)
  pspApiUrl: (() => {
    const v =
      trim(process.env.PSP_API_URL) ||
      trim(process.env.PSP_API_BASE) ||
      trim(process.env.NEXT_PUBLIC_PSP_API_URL) ||
      "http://localhost:3001";
    return stripTrailingSlashes(v);
  })(),

  // Server-only service credentials (fallback if browser doesn't send headers)
  pspMerchantId: trim(process.env.PSP_MERCHANT_ID),
  pspApiKey: trim(process.env.PSP_API_KEY),

  // Dev/ops token (MUST be server-only; used for debug endpoints / inbox ops pages)
  pspInboxToken: trim(process.env.PSP_INBOX_TOKEN),

  // Webhook verify secret (server-only)
  pspWebhookSecret: trim(process.env.PSP_WEBHOOK_SECRET),

  // Public-only (client-side)
  nextPublicInboxToken: trim(process.env.NEXT_PUBLIC_PSP_INBOX_TOKEN),
} as const;

// Optional: strict checks for production boot (call where needed)
export function assertProdEnv() {
  if (!env.isProd) return;

  requireEnv("PSP_API_URL (or PSP_API_BASE)", env.pspApiUrl);
  requireEnv("PSP_MERCHANT_ID", env.pspMerchantId);
  requireEnv("PSP_API_KEY", env.pspApiKey);
  requireEnv("PSP_WEBHOOK_SECRET", env.pspWebhookSecret);

  // debug endpoints should not run in prod anyway, but keep it explicit
  // requireEnv("PSP_INBOX_TOKEN", env.pspInboxToken);
}
