"use client";

type Props = {
  page: number;
  totalPages: number;
  pageFrom: number;
  pageTo: number;
  totalCount: number;
  onPrev: () => void;
  onNext: () => void;
};

export function PaginationBar({
  page,
  totalPages,
  pageFrom,
  pageTo,
  totalCount,
  onPrev,
  onNext,
}: Props) {
  if (totalCount <= 0) return null;

  return (
    <div className="mt-3 flex flex-col items-center justify-between gap-2 px-4 pb-4 text-xs text-slate-400 md:flex-row">
      <div>
        Showing{" "}
        <span className="font-medium text-slate-200">
          {pageFrom}–{pageTo}
        </span>{" "}
        of <span className="font-medium text-slate-200">{totalCount}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={page <= 1}
          className="rounded-full bg-slate-800/60 px-3 py-1 ring-1 ring-slate-700/70 disabled:opacity-60"
        >
          Prev
        </button>

        <span className="text-[11px]">
          Page {page} / {totalPages}
        </span>

        <button
          onClick={onNext}
          disabled={page >= totalPages}
          className="rounded-full bg-slate-800/60 px-3 py-1 ring-1 ring-slate-700/70 disabled:opacity-60"
        >
          Next
        </button>
      </div>
    </div>
  );
}
