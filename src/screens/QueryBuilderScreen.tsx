import { DateRangeFilter } from '../components/charts/DateRangeFilter';
import { QueryBuilderSection } from '../components/charts/QueryBuilderSection';
import { useDashboardDateRange } from '../hooks/useDashboardDateRange';

export function QueryBuilderScreen() {
  const { range, setRange, from, to, setFrom, setTo, rangeValue, options } = useDashboardDateRange('30d');

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6 pb-safe-bottom">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Query Builder</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Build custom analytics queries, aggregate quickly, and inspect raw rows.
          </p>
        </div>
        <DateRangeFilter
          value={range}
          onChange={setRange}
          options={options}
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
        />
      </header>

      <QueryBuilderSection dateRange={rangeValue} />
    </div>
  );
}
