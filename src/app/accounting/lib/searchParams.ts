// src/app/accounting/lib/searchParams.ts

export type SearchParamsValue = string | string[] | undefined;
export type SearchParams = Record<string, SearchParamsValue>;

export function pick(sp: SearchParams, key: string, fallback = ""): string {
  const v = sp?.[key];
  if (Array.isArray(v)) return v[0] ?? fallback;
  if (typeof v === "string") return v;
  return fallback;
}
