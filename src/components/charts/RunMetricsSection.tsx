import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useRunMetrics } from '../../hooks/useRunMetrics';
import type { DateRangeFilterValue } from '../../types/analytics';
import { ChartWidget } from './ChartWidget';
import { KpiCard } from './KpiCard';

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function RunMetricsSection({ range }: { range: DateRangeFilterValue }) {
  const { data, isLoading, error } = useRunMetrics(range);
  const hasData = !!data && data.totalRuns > 0;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Run Metrics</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Runs" value={isLoading || !data ? '--' : `${data.totalRuns}`} />
        <KpiCard label="Avg Floors Climbed" value={isLoading || !data ? '--' : data.avgFloorsClimbed.toFixed(2)} />
        <KpiCard
          label="Avg Health Ratio"
          value={isLoading || !data ? '--' : pct(data.avgHealthRatio)}
          helper="current_health / max_health"
        />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartWidget title="Run Frequency Over Time" isLoading={isLoading} error={error ?? null} isEmpty={!hasData}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.byDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#2563eb" fill="#bfdbfe" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartWidget>
        <ChartWidget title="Floors Climbed Trend" isLoading={isLoading} error={error ?? null} isEmpty={!hasData}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.floorsTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#16a34a" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartWidget>
        <ChartWidget title="Health Trend" isLoading={isLoading} error={error ?? null} isEmpty={!hasData}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.healthTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="currentHealth" stroke="#f97316" dot={false} />
                <Line type="monotone" dataKey="maxHealth" stroke="#ef4444" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartWidget>
        <ChartWidget
          title="Run Duration Distribution"
          isLoading={isLoading}
          error={error ?? null}
          isEmpty={!hasData || (data?.durationDistribution.length ?? 0) === 0}
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.durationDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartWidget>
      </div>
    </section>
  );
}
