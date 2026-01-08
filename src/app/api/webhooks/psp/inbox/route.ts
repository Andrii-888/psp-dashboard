import { NextResponse } from "next/server";
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

type ErrResponse = { ok: false; error: "UNAUTHORIZED" };

export async function GET(): Promise<NextResponse<OkResponse | ErrResponse>> {
  // 🔒 dev-only guard
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

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
