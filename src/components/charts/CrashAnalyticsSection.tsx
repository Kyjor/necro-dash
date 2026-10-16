import { useState } from 'react';
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
  const [showHardware, setShowHardware] = useState(false);
  const hasData = !!data && data.crashCount > 0;
  const topOs = data?.byOs?.[0];
  const topGpu = data?.byGpu?.[0];

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          label="Total Crashes"
          value={isLoading || !data ? '--' : `${data.crashCount}`}
          tone={!isLoading && data ? (data.crashCount === 0 ? 'good' : 'danger') : 'neutral'}
          helper={data?.crashCount === 0 ? '100% crash-free in period' : 'Recorded crash events'}
        />
        <KpiCard
          label="Top Affected OS"
          value={isLoading ? '--' : topOs ? topOs.name : 'None'}
          helper={topOs ? `${topOs.value} crashes` : undefined}
        />
        <KpiCard
          label="Top Affected GPU"
          value={isLoading ? '--' : topGpu ? topGpu.name : 'None'}
          helper={topGpu ? `${topGpu.value} crashes` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartWidget title="Crash Frequency Over Time" isLoading={isLoading} error={error ?? null} isEmpty={!hasData}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.byDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#ef4444" fill="#fecaca" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartWidget>

        <ChartWidget title="Crash Distribution by OS" isLoading={isLoading} error={error ?? null} isEmpty={!hasData}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.byOs}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartWidget>
      </div>

      {hasData ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowHardware(v => !v)}
            className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
          >
            {showHardware ? 'Hide hardware diagnostics (CPU / GPU / RAM)' : 'Show hardware diagnostics (CPU / GPU / RAM) →'}
          </button>

          {showHardware ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <ChartWidget title="CPU Distribution" isLoading={isLoading} error={error ?? null} isEmpty={!hasData}>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data?.byCpu} dataKey="value" nameKey="name" outerRadius={80} fill="#10b981" />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartWidget>

              <ChartWidget title="GPU Distribution" isLoading={isLoading} error={error ?? null} isEmpty={!hasData}>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data?.byGpu} dataKey="value" nameKey="name" outerRadius={80} fill="#f59e0b" />
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
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid />
                      <XAxis dataKey="x" name="Total RAM" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="y" name="Used RAM" tick={{ fontSize: 10 }} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter data={data?.ramScatter} fill="#8b5cf6" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </ChartWidget>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
