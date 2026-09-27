import { useMemo, useState, type ReactNode } from 'react';

export interface StatsColumn<T> {
  key: keyof T & string;
  label: string;
  render?: (row: T) => ReactNode;
}

interface StatsTableProps<T> {
  rows: T[];
  columns: StatsColumn<T>[];
  rowKey: (row: T, index: number) => string;
  initialSort?: keyof T & string;
  onRowClick?: (row: T) => void;
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

/** Click a header to sort (descending first, click again for ascending). */
export function StatsTable<T extends object>({ rows, columns, rowKey, initialSort, onRowClick }: StatsTableProps<T>) {
  const [sortKey, setSortKey] = useState<(keyof T & string) | undefined>(initialSort);
  const [desc, setDesc] = useState(true);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const out = [...rows].sort((a, b) => compare(a[sortKey], b[sortKey]));
    return desc ? out.reverse() : out;
  }, [rows, sortKey, desc]);

  function onHeader(key: keyof T & string) {
    if (key === sortKey) setDesc(d => !d);
    else {
      setSortKey(key);
      setDesc(true);
    }
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-auto max-h-[28rem]">
      <table className="min-w-full text-xs">
        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
          <tr>
            {columns.map(col => (
              <th key={col.key} className="text-left p-2 font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                <button type="button" onClick={() => onHeader(col.key)}>
                  {col.label}
                  {sortKey === col.key ? (desc ? ' ▼' : ' ▲') : ''}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, index) => (
            <tr
              key={rowKey(row, index)}
              className={[
                'border-t border-gray-100 dark:border-gray-700',
                onRowClick ? 'cursor-pointer active:bg-gray-50 dark:active:bg-gray-700/40' : '',
              ].join(' ')}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map(col => (
                <td key={col.key} className="p-2 text-gray-800 dark:text-gray-200 align-top whitespace-nowrap">
                  {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
