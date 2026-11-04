import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';

export default function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  emptyMessage = 'No records found.',
  isLoading = false,
  onRowClick = null,
  className = '',
}) {
  return (
    <div className={`overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-xs ${className}`.trim()}>
      <Table>
        <TableHeader className="bg-slate-50/80">
          <TableRow className="border-b border-slate-200">
            {columns.map((col, idx) => (
              <TableHead
                key={col.key || idx}
                className={`py-3 px-3.5 text-left text-xs font-semibold text-slate-700 ${col.headerClassName || ''}`}
              >
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 4 }).map((_, rIdx) => (
              <TableRow key={`skeleton-${rIdx}`} className="border-b border-slate-100 last:border-0">
                {columns.map((col, cIdx) => (
                  <TableCell key={`skeleton-cell-${cIdx}`} className="py-3 px-3.5">
                    <div className="h-4 w-3/4 bg-slate-100 animate-pulse rounded" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!isLoading && data.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="py-10 text-center text-xs text-slate-500"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            data.map((row, rIdx) => {
              const rowKey = row[keyField] ?? rIdx;
              const isClickable = Boolean(onRowClick);

              return (
                <TableRow
                  key={rowKey}
                  onClick={isClickable ? () => onRowClick(row) : undefined}
                  className={`border-b border-slate-100 last:border-0 transition-colors ${
                    isClickable ? 'hover:bg-slate-50 cursor-pointer' : 'hover:bg-slate-50/50'
                  }`}
                >
                  {columns.map((col, cIdx) => (
                    <TableCell
                      key={col.key || cIdx}
                      className={`py-3 px-3.5 text-xs text-slate-700 ${col.cellClassName || ''}`}
                    >
                      {col.render ? col.render(row[col.key], row, rIdx) : (row[col.key] ?? '—')}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </div>
  );
}
