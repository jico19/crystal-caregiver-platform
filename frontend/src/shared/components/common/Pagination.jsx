import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function getPageWindow(current, last) {
  if (last <= 7) {
    return Array.from({ length: last }, (_, i) => i + 1);
  }
  const window = new Set([1, last]);
  for (let p = current - 1; p <= current + 1; p += 1) {
    if (p > 1 && p < last) window.add(p);
  }
  const sorted = [...window].sort((a, b) => a - b);
  const withEllipsis = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) withEllipsis.push('...');
    withEllipsis.push(p);
    prev = p;
  }
  return withEllipsis;
}

export default function Pagination({
  page,
  pages,
  total,
  pageSize,
  listLabel = 'results',
  onPageChange,
  onPageSizeChange,
  showPageSize = true,
}) {
  if (!pages || pages <= 1) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const window = getPageWindow(page, pages);

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-200" aria-label="Pagination">
      <div className="text-xs text-slate-500">
        Showing <strong className="text-slate-700 font-semibold">{first}–{last}</strong> of <strong className="text-slate-700 font-semibold">{total}</strong> {listLabel}
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-xs text-slate-700 border-slate-200"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          ‹ Prev
        </Button>

        {window.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-xs text-slate-400" aria-hidden="true">
              …
            </span>
          ) : (
            <Button
              key={p}
              type="button"
              variant={p === page ? 'default' : 'outline'}
              size="sm"
              className={`h-8 w-8 p-0 text-xs ${
                p === page
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold'
                  : 'text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          )
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-xs text-slate-700 border-slate-200"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          Next ›
        </Button>
      </div>

      {showPageSize && onPageSizeChange && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Per page</span>
          <Select value={String(pageSize)} onValueChange={(val) => onPageSizeChange(Number(val))}>
            <SelectTrigger className="h-8 w-18 text-xs bg-white border-slate-200">
              <SelectValue placeholder={String(pageSize)} />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)} className="text-xs">
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </nav>
  );
}