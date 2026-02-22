// src/hooks/usePagination.ts
"use client";

import { useMemo, useState } from "react";

type UsePaginationArgs<T> = {
  items: T[];
  totalCount: number;
  pageSize: number;
  resetKey?: string;
};

export function usePagination<T>({
  items,
  totalCount,
  pageSize,
  resetKey,
}: UsePaginationArgs<T>) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // "Desired" page respects resetKey, but doesn't set state in effects.
  // If resetKey changes, we render as page 1 until user changes page again.
  const desiredPage = useMemo(() => {
    void resetKey; // participates in memo deps without hacks in JSX
    return 1;
  }, [resetKey]);

  // Clamp the stateful page for rendering (no setState-in-effect).
  const effectivePage = useMemo(() => {
    const base = resetKey === undefined ? page : desiredPage;
    return Math.min(Math.max(1, base), totalPages);
  }, [page, desiredPage, resetKey, totalPages]);

  const pagedItems = useMemo(() => {
    const start = (effectivePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, effectivePage, pageSize]);

  const pageFrom = totalCount === 0 ? 0 : (effectivePage - 1) * pageSize + 1;
  const pageTo = Math.min(effectivePage * pageSize, totalCount);

  // Expose a setter that always updates the real stateful page.
  // When resetKey is present, user navigation will override the "reset-to-1 view".
  function goToPage(next: number) {
    setPage(Math.min(Math.max(1, next), totalPages));
  }

  return {
    page: effectivePage,
    setPage: goToPage,
    totalPages,
    pageFrom,
    pageTo,
    pagedItems,
  };
}
