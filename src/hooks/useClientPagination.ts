"use client";

import { useMemo, useState } from "react";

type UseClientPaginationParams<T> = {
  items: T[];
  totalCount: number; // может быть больше items.length
  pageSize?: number; // по умолчанию 20
};

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

export function useClientPagination<T>({
  items,
  totalCount,
  pageSize = 20,
}: UseClientPaginationParams<T>) {
  const safePageSize = Math.max(1, Number(pageSize) || 20);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalCount / safePageSize));
  }, [totalCount, safePageSize]);

  // храним "сырой" page, но наружу отдаём всегда clamped
  const [pageState, setPageState] = useState(1);

  const page = useMemo(() => {
    return clamp(pageState, 1, totalPages);
  }, [pageState, totalPages]);

  // ✅ setPage сохраняем как API, но клампим внутри
  const setPage = (next: number | ((prev: number) => number)) => {
    setPageState((prev) => {
      const v = typeof next === "function" ? next(prev) : next;
      return clamp(Number(v) || 1, 1, totalPages);
    });
  };

  const pagedItems = useMemo(() => {
    const start = (page - 1) * safePageSize;
    return items.slice(start, start + safePageSize);
  }, [items, page, safePageSize]);

  const pageFrom = totalCount === 0 ? 0 : (page - 1) * safePageSize + 1;
  const pageTo = Math.min(page * safePageSize, totalCount);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  function prevPage() {
    setPage((p) => Math.max(1, p - 1));
  }

  function nextPage() {
    setPage((p) => Math.min(totalPages, p + 1));
  }

  function resetPage() {
    setPage(1);
  }

  return {
    page,
    setPage,
    resetPage,

    totalPages,
    pageSize: safePageSize,

    pagedItems,
    pageFrom,
    pageTo,

    canPrev,
    canNext,
    prevPage,
    nextPage,
  };
}
