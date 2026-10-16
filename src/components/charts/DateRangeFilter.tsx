import type { DateRangeKey } from '../../types/analytics';

interface DateRangeFilterProps {
  value: DateRangeKey;
  onChange: (value: DateRangeKey) => void;
  options: Array<{ value: DateRangeKey; label: string }>;
  from?: string;
  to?: string;
  onFromChange?: (value: string) => void;
  onToChange?: (value: string) => void;
}

const QUICK_RANGES: Array<{ value: DateRangeKey; shortLabel: string }> = [
  { value: '24h', shortLabel: '24h' },
  { value: '7d', shortLabel: '7d' },
  { value: '30d', shortLabel: '30d' },
  { value: '90d', shortLabel: '90d' },
  { value: 'all', shortLabel: 'All' },
];

export function DateRangeFilter({
  value,
  onChange,
  options,
  from,
  to,
  onFromChange,
  onToChange,
}: DateRangeFilterProps) {
  const quickSet = new Set(QUICK_RANGES.map(r => r.value));
  const extraOptions = options.filter(o => !quickSet.has(o.value));
  const isExtraSelected = !quickSet.has(value);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center rounded-xl bg-gray-100 dark:bg-gray-800 p-1 gap-0.5">
        {QUICK_RANGES.map(preset => {
          const active = value === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange(preset.value)}
              className={[
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                active
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
              ].join(' ')}
            >
              {preset.shortLabel}
            </button>
          );
        })}
        <select
          aria-label="More date ranges"
          value={isExtraSelected ? value : ''}
          onChange={e => {
            if (e.target.value) onChange(e.target.value as DateRangeKey);
          }}
          className={[
            'px-2 py-1 rounded-lg text-xs font-medium bg-transparent cursor-pointer focus:outline-none',
            isExtraSelected
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400',
          ].join(' ')}
        >
          <option value="" disabled>
            More…
          </option>
          {extraOptions.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {value === 'custom' ? (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <input
            type="date"
            aria-label="From date"
            value={from ?? ''}
            onChange={e => onFromChange?.(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1 text-xs text-gray-900 dark:text-gray-100"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            aria-label="To date"
            value={to ?? ''}
            onChange={e => onToChange?.(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1 text-xs text-gray-900 dark:text-gray-100"
          />
        </div>
      ) : null}
    </div>
  );
}
