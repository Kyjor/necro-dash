import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useRetentionStats } from '../../hooks/useRetentionStats';
import type { DateRangeFilterValue } from '../../types/analytics';
import { ChartWidget } from './ChartWidget';
import { KpiCard } from './KpiCard';

export function UserRetentionSection({ range }: { range: DateRangeFilterValue }) {
  const { data, isLoading, error } = useRetentionStats(range);
  const hasData = !!data && (data.dau.length > 0 || data.startupsByDay.length > 0);

  const latestDau = data?.dau.length ? data.dau[data.dau.length - 1].value : 0;
  const peakDau = (data?.dau ?? []).reduce((m, p) => Math.max(m, p.value), 0);
  const latestWau = data?.wau.length ? data.wau[data.wau.length - 1].value : 0;
  const totalStartups = (data?.startupsByDay ?? []).reduce((s, p) => s + p.value, 0);

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Player Retention & Activity</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Latest DAU" value={isLoading ? '--' : `${latestDau}`} helper={`Peak DAU: ${peakDau}`} />
        <KpiCard label="Latest WAU" value={isLoading ? '--' : `${latestWau}`} helper="Rolling 7-day active users" />
        <KpiCard label="Total Startups" value={isLoading ? '--' : `${totalStartups}`} helper="App launches in range" />
        <KpiCard
          label="Stickiness (DAU/WAU)"
          value={isLoading || latestWau === 0 ? '--' : `${((latestDau / latestWau) * 100).toFixed(0)}%`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartWidget title="DAU / WAU Trends" isLoading={isLoading} error={error ?? null} isEmpty={!hasData}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.dau.map((point, idx) => ({ date: point.date, dau: point.value, wau: data?.wau[idx]?.value ?? 0 }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="wau" name="WAU" stroke="#14b8a6" fill="#99f6e4" />
                <Area type="monotone" dataKey="dau" name="DAU" stroke="#0ea5e9" fill="#bae6fd" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartWidget>

        <ChartWidget title="New vs Returning Users" isLoading={isLoading} error={error ?? null} isEmpty={!hasData}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.cohorts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="newUsers" name="New users" stroke="#22c55e" dot={false} />
                <Line type="monotone" dataKey="returningUsers" name="Returning users" stroke="#f97316" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartWidget>
      </div>
    </section>
  );
}
