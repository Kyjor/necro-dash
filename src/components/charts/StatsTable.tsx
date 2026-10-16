import { useMemo, useState, type ReactNode } from 'react';

export interface StatsColumn<T> {
  key: keyof T & string;
  label: string;
  render?: (row: T) => ReactNode;
  /** Hidden by default in compact mode until the user expands all columns. */
  secondary?: boolean;
}

interface StatsTableProps<T> {
  rows: T[];
  columns: StatsColumn<T>[];
  rowKey: (row: T, index: number) => string;
  initialSort?: keyof T & string;
  onRowClick?: (row: T) => void;
  defaultRowLimit?: number;
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

/** Click a header to sort (descending first, click again for ascending). */
export function StatsTable<T extends object>({
  rows,
  columns,
  rowKey,
  initialSort,
  onRowClick,
  defaultRowLimit = 10,
}: StatsTableProps<T>) {
  const [sortKey, setSortKey] = useState<(keyof T & string) | undefined>(initialSort);
  const [desc, setDesc] = useState(true);
  const [showAllCols, setShowAllCols] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);

  const secondaryCount = useMemo(() => columns.filter(c => c.secondary).length, [columns]);
  const visibleColumns = useMemo(
    () => (showAllCols || secondaryCount === 0 ? columns : columns.filter(c => !c.secondary)),
    [columns, showAllCols, secondaryCount],
  );

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const out = [...rows].sort((a, b) => compare(a[sortKey], b[sortKey]));
    return desc ? out.reverse() : out;
  }, [rows, sortKey, desc]);

  const visibleRows = useMemo(
    () => (showAllRows || sorted.length <= defaultRowLimit ? sorted : sorted.slice(0, defaultRowLimit)),
    [sorted, showAllRows, defaultRowLimit],
  );

  function onHeader(key: keyof T & string) {
    if (key === sortKey) setDesc(d => !d);
    else {
      setSortKey(key);
      setDesc(true);
    }
  }

  return (
    <div className="space-y-2">
      {secondaryCount > 0 ? (
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-0.5">
          <span>
            Showing {visibleColumns.length} of {columns.length} metrics
          </span>
          <button
            type="button"
            onClick={() => setShowAllCols(v => !v)}
            className="font-medium text-primary-600 dark:text-primary-400 hover:underline"
          >
            {showAllCols ? 'Compact view' : `Show +${secondaryCount} more columns`}
          </button>
        </div>
      ) : null}

      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-auto max-h-[28rem]">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
            <tr>
              {visibleColumns.map(col => (
                <th key={col.key} className="text-left p-2.5 font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  <button type="button" onClick={() => onHeader(col.key)} className="inline-flex items-center gap-1">
                    <span>{col.label}</span>
                    {sortKey === col.key ? (
                      <span className="text-primary-500">{desc ? '▼' : '▲'}</span>
                    ) : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => (
              <tr
                key={rowKey(row, index)}
                className={[
                  'border-t border-gray-100 dark:border-gray-700/70',
                  onRowClick ? 'cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-700/30 active:bg-gray-100 dark:active:bg-gray-700/50' : '',
                ].join(' ')}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {visibleColumns.map(col => (
                  <td key={col.key} className="p-2.5 text-gray-800 dark:text-gray-200 align-top whitespace-nowrap">
                    {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length > defaultRowLimit ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShowAllRows(v => !v)}
            className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline py-1"
          >
            {showAllRows ? `Show top ${defaultRowLimit}` : `Show all ${sorted.length} rows`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
