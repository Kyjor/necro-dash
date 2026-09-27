import { useMemo, useState } from 'react';
import type { DateRangeFilterValue, DateRangeKey } from '../types/analytics';

export const DATE_RANGE_OPTIONS: Array<{ value: DateRangeKey; label: string }> = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '3d', label: 'Last 3 days' },
  { value: '7d', label: 'Last 7 days' },
  { value: '14d', label: 'Last 14 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '60d', label: 'Last 60 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '180d', label: 'Last 180 days' },
  { value: '365d', label: 'Last 365 days' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
];

export function useDashboardDateRange(defaultRange: DateRangeKey = '30d') {
  const [range, setRangeKey] = useState<DateRangeKey>(defaultRange);
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const optionMap = useMemo(() => new Map(DATE_RANGE_OPTIONS.map(opt => [opt.value, opt])), []);

  const setRange = (value: DateRangeKey) => {
    setRangeKey(value);
    if (value !== 'custom') {
      setFrom('');
      setTo('');
    }
  };

  const rangeValue: DateRangeFilterValue = {
    key: range,
    from: range === 'custom' && from ? new Date(from).toISOString() : undefined,
    to: range === 'custom' && to ? new Date(`${to}T23:59:59.999Z`).toISOString() : undefined,
  };

  return { range, setRange, from, to, setFrom, setTo, rangeValue, options: DATE_RANGE_OPTIONS, optionMap };
}
