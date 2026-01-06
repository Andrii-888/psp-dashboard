import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";

type StoredWebhook = {
  id: string;
  ts: string;
  contentType: string | null;
  body: string;
};

const KV_LIST_KEY = "psp:webhooks:list";
const KV_ITEM_PREFIX = "psp:webhooks:item:";
const MAX_ITEMS = 100;

export async function GET(req: Request) {
  const token = req.headers.get("x-psp-inbox-token");
  const expected = (process.env.PSP_INBOX_TOKEN ?? "").trim();

  if (!expected || token !== expected) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  const ids = await kv.lrange<string[]>(KV_LIST_KEY, 0, MAX_ITEMS - 1);
  const keys = ids.map((id) => `${KV_ITEM_PREFIX}${id}`);

  const items = await kv.mget<(StoredWebhook | null)[]>(...keys);

  const safeItems = items.filter((x): x is StoredWebhook =>
    Boolean(x && typeof x === "object" && "id" in x)
  );

  return NextResponse.json({
    ok: true,
    count: safeItems.length,
    items: safeItems.map((x) => ({
      id: x.id,
      ts: x.ts,
      contentType: x.contentType,
      preview: x.body.slice(0, 220),
    })),
  });
}
