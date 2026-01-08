import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { inboxList, inboxMeta } from "@/lib/webhookInboxStore";

export const runtime = "nodejs";

type ListItem = {
  id: string;
  ts: string;
  preview?: string;
};

type OkResponse = {
  ok: true;
  storage: "mem";
  count: number;
  max: number;
  items: ListItem[];
};

type ErrResponse =
  | { ok: false; error: "UNAUTHORIZED" }
  | { ok: false; error: "CONFIG_MISSING"; details: string };

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

export async function GET(
  req: NextRequest
): Promise<NextResponse<OkResponse | ErrResponse>> {
  const guard = guardInbox(req);
  if (guard) return guard;

  const meta = inboxMeta();
  const items = inboxList();

  return NextResponse.json(
    {
      ok: true,
      storage: meta.storage,
      count: meta.count,
      max: meta.max,
      items: items.map((x) => ({
        id: x.id,
        ts: x.ts,
        preview: x.preview,
      })),
    },
    { status: 200 }
  );
}
