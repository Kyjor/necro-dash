import { useState } from 'react';
import { CrashAnalyticsSection } from '../components/charts/CrashAnalyticsSection';
import { DateRangeFilter } from '../components/charts/DateRangeFilter';
import { FeatureGatesSection } from '../components/charts/FeatureGatesSection';
import { RunMetricsSection } from '../components/charts/RunMetricsSection';
import { SurveySentimentSection } from '../components/charts/SurveySentimentSection';
import { UserRetentionSection } from '../components/charts/UserRetentionSection';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { useDashboardDateRange } from '../hooks/useDashboardDateRange';

type OpsTab = 'engagement' | 'crashes' | 'sentiment' | 'experiments';

export function StatsScreen() {
  const { range, setRange, from, to, setFrom, setTo, rangeValue, options } = useDashboardDateRange('30d');
  const [tab, setTab] = useState<OpsTab>('engagement');

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 pb-safe-bottom">
      <header className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Health & Ops</h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Player retention, session metrics, crash stability, and survey feedback.
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
        </div>

        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'engagement', label: 'Engagement & Retention' },
            { value: 'crashes', label: 'Crashes' },
            { value: 'sentiment', label: 'Survey Sentiment' },
            { value: 'experiments', label: 'Feature Gates' },
          ]}
        />
      </header>

      {tab === 'engagement' ? (
        <div className="space-y-6">
          <UserRetentionSection range={rangeValue} />
          <RunMetricsSection range={rangeValue} />
        </div>
      ) : null}
      {tab === 'crashes' ? <CrashAnalyticsSection range={rangeValue} /> : null}
      {tab === 'sentiment' ? <SurveySentimentSection range={rangeValue} /> : null}
      {tab === 'experiments' ? <FeatureGatesSection range={rangeValue} /> : null}

      <div className="h-20" />
    </div>
  );
}
