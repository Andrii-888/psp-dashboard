"use client";

import { useEffect, useMemo, useState } from "react";

type UseClientPaginationParams<T> = {
  items: T[];
  totalCount: number; // у тебя это totalCount (может быть больше items.length)
  pageSize?: number; // по умолчанию 20
};

export function useClientPagination<T>({
  items,
  totalCount,
  pageSize = 20,
}: UseClientPaginationParams<T>) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // если фильтры поменялись и текущая страница стала невалидной — поправим
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const pageFrom = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageTo = Math.min(page * pageSize, totalCount);

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
    pageSize,

    pagedItems,
    pageFrom,
    pageTo,

    canPrev,
    canNext,
    prevPage,
    nextPage,
  };
}
