"use client";

import { useRouter } from "next/navigation";

export default function ErrorState({
  title = "Something went wrong",
  description = "We couldn’t load accounting data.",
}: {
  title?: string;
  description?: string;
}) {
  const router = useRouter();

  return (
    <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
      <div className="text-sm font-semibold text-zinc-900">{title}</div>

      <div className="mt-1 text-sm text-zinc-600">{description}</div>

      <button
        type="button"
        onClick={() => router.refresh()}
        className="mt-4 inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
      >
        Retry
      </button>
    </div>
  );
}
