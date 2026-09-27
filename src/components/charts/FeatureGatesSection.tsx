import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useFeatureGateStats } from '../../hooks/useFeatureGateStats';
import type { DateRangeFilterValue } from '../../types/analytics';
import { ChartWidget } from './ChartWidget';

export function FeatureGatesSection({ range }: { range: DateRangeFilterValue }) {
  const { data, isLoading, error } = useFeatureGateStats(range);
  const hasData = !!data && data.toggleOverview.length > 0;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Feature Gates</h2>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartWidget title="Toggle Status Overview" isLoading={isLoading} error={error ?? null} isEmpty={!hasData}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.toggleOverview}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="enabled" fill="#22c55e" />
                <Bar dataKey="disabled" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartWidget>
        <ChartWidget title="Sample Distribution" isLoading={isLoading} error={error ?? null} isEmpty={!hasData}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.sampleDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartWidget>
      </div>
    </section>
  );
}
