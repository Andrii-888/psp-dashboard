import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { inboxGet } from "@/lib/webhookInboxStore";

type RouteCtx = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, ctx: RouteCtx) {
  // 🔒 dev-only guard
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  const safeId = (id ?? "").trim();

  if (!safeId) {
    return NextResponse.json(
      { ok: false, error: "ID_MISSING" },
      { status: 400 }
    );
  }

  const item = inboxGet(safeId);

  if (!item) {
    return NextResponse.json(
      { ok: false, error: "NOT_FOUND", id: safeId },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, item }, { status: 200 });
}
