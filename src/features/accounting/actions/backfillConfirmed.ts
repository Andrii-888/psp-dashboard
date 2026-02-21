"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { runBackfillConfirmed } from "../lib/api";
import { toFetchHeaders } from "../lib/serverUtils";

export async function backfillConfirmedAction(formData: FormData) {
  const merchantId = String(formData.get("merchantId") ?? "");
  const limit = String(formData.get("limit") ?? "20");
  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "");

  const qs = new URLSearchParams();
  if (merchantId) qs.set("merchantId", merchantId);
  if (limit) qs.set("limit", limit);
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);

  let inserted = 0;
  let errorMsg = "";

  try {
    const hReadonly = await headers();
    const h = toFetchHeaders(hReadonly);

    const res = await runBackfillConfirmed({
      merchantId,
      headers: h,
      from,
      to,
    });

    inserted = Number(res.inserted ?? 0);
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : "Backfill failed";
  }

  if (errorMsg) {
    qs.set("backfillError", errorMsg);
    qs.delete("backfillInserted");
  } else {
    qs.set("backfillInserted", String(inserted));
    qs.delete("backfillError");
  }

  revalidatePath("/accounting");
  redirect(`/accounting?${qs.toString()}`);
}
