import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useRetentionStats } from '../../hooks/useRetentionStats';
import type { DateRangeFilterValue } from '../../types/analytics';
import { ChartWidget } from './ChartWidget';

export function UserRetentionSection({ range }: { range: DateRangeFilterValue }) {
  const { data, isLoading, error } = useRetentionStats(range);
  const hasData = !!data && (data.dau.length > 0 || data.startupsByDay.length > 0);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">User Retention</h2>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartWidget
          title="Startup Events Over Time"
          isLoading={isLoading}
          error={error ?? null}
          isEmpty={!data || data.startupsByDay.length === 0}
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.startupsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#6366f1" fill="#c7d2fe" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartWidget>
        <ChartWidget title="DAU / WAU Trends" isLoading={isLoading} error={error ?? null} isEmpty={!hasData}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.dau.map((point, idx) => ({ date: point.date, dau: point.value, wau: data?.wau[idx]?.value ?? 0 }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="dau" stroke="#0ea5e9" fill="#bae6fd" />
                <Area type="monotone" dataKey="wau" stroke="#14b8a6" fill="#99f6e4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartWidget>
        <ChartWidget title="New vs Returning Cohorts" isLoading={isLoading} error={error ?? null} isEmpty={!hasData}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.cohorts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="newUsers" stroke="#22c55e" dot={false} />
                <Line type="monotone" dataKey="returningUsers" stroke="#f97316" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartWidget>
      </div>
    </section>
  );
}
