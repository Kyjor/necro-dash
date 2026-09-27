import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartWidget } from './ChartWidget';
import { KpiCard } from './KpiCard';
import { useCrashStats } from '../../hooks/useCrashStats';
import type { DateRangeFilterValue } from '../../types/analytics';

export function CrashAnalyticsSection({ range }: { range: DateRangeFilterValue }) {
  const { data, isLoading, error } = useCrashStats(range);
  const hasData = !!data && data.crashCount > 0;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Crash Analytics</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Crash Count" value={isLoading || !data ? '--' : `${data.crashCount}`} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartWidget title="Crash Frequency Over Time" isLoading={isLoading} error={error ?? null} isEmpty={!hasData}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.byDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#ef4444" fill="#fecaca" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartWidget>

        <ChartWidget title="Crash Distribution by OS" isLoading={isLoading} error={error ?? null} isEmpty={!hasData}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.byOs}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartWidget>

        <ChartWidget title="CPU Distribution" isLoading={isLoading} error={error ?? null} isEmpty={!hasData}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.byCpu} dataKey="value" nameKey="name" outerRadius={90} fill="#10b981" />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartWidget>

        <ChartWidget title="GPU Distribution" isLoading={isLoading} error={error ?? null} isEmpty={!hasData}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.byGpu} dataKey="value" nameKey="name" outerRadius={90} fill="#f59e0b" />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartWidget>

        <ChartWidget
          title="RAM Usage at Crash Time"
          isLoading={isLoading}
          error={error ?? null}
          isEmpty={!hasData || (data?.ramScatter.length ?? 0) === 0}
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid />
                <XAxis dataKey="x" name="Total RAM" />
                <YAxis dataKey="y" name="Used RAM" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={data?.ramScatter} fill="#8b5cf6" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </ChartWidget>
      </div>
    </section>
  );
}
