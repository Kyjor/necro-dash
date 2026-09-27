import { DateRangeFilter } from '../components/charts/DateRangeFilter';
import { CrashAnalyticsSection } from '../components/charts/CrashAnalyticsSection';
import { FeatureGatesSection } from '../components/charts/FeatureGatesSection';
import { RunMetricsSection } from '../components/charts/RunMetricsSection';
import { SurveySentimentSection } from '../components/charts/SurveySentimentSection';
import { UserRetentionSection } from '../components/charts/UserRetentionSection';
import { useDashboardDateRange } from '../hooks/useDashboardDateRange';

export function StatsScreen() {
  const { range, setRange, from, to, setFrom, setTo, rangeValue, options } = useDashboardDateRange('30d');

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6 pb-safe-bottom">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Explore crashes, run quality, sentiment, feature rollout behavior, and retention.
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

      <CrashAnalyticsSection range={rangeValue} />
      <RunMetricsSection range={rangeValue} />
      <SurveySentimentSection range={rangeValue} />
      <FeatureGatesSection range={rangeValue} />
      <UserRetentionSection range={rangeValue} />
    </div>
  );
}
