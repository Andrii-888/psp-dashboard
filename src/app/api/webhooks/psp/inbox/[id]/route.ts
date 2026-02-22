// src/app/api/webhooks/psp/inbox/[id]/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { inboxGetAsync } from "@/shared/lib/webhookInboxStore";

type RouteCtx = {
  params: Promise<{ id: string }>;
};

type ErrResponse =
  | { ok: false; error: "UNAUTHORIZED" }
  | { ok: false; error: "CONFIG_MISSING"; details: string }
  | { ok: false; error: "ID_MISSING" }
  | { ok: false; error: "NOT_FOUND"; id: string };

function isDev() {
  return process.env.NODE_ENV === "development";
}

function guardInbox(req: NextRequest): NextResponse<ErrResponse> | null {
  // In dev keep it open for convenience
  if (isDev()) return null;

  const expected = (process.env.PSP_INBOX_TOKEN ?? "").trim();
  if (!expected) {
    return NextResponse.json(
      {
        ok: false,
        error: "CONFIG_MISSING",
        details: "Missing PSP_INBOX_TOKEN in environment",
      },
      { status: 500 }
    );
  }

  const provided = (req.headers.get("x-psp-inbox-token") ?? "").trim();
  if (!provided || provided !== expected) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  return null;
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const guard = guardInbox(req);
  if (guard) return guard;

  const { id } = await ctx.params;
  const safeId = (id ?? "").trim();

  if (!safeId) {
    return NextResponse.json(
      { ok: false, error: "ID_MISSING" },
      { status: 400 }
    );
  }

  const item = await inboxGetAsync(safeId);

  if (!item) {
    return NextResponse.json(
      { ok: false, error: "NOT_FOUND", id: safeId },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, item }, { status: 200 });
}
