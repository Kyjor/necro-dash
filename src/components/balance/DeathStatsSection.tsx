import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDeathStats } from '../../hooks/useRunAnalytics';
import type { StatsScope } from '../../types/analytics';
import { num, prettyKey } from '../../utils/runFormat';
import { ChartWidget } from '../charts/ChartWidget';
import { StatsTable } from '../charts/StatsTable';

export function DeathStatsSection({ range, version }: StatsScope) {
  const { data = [], isLoading, error } = useDeathStats(range, version);
  const byFloor = useMemo(() => {
    const counts = new Map<number, number>();
    for (const d of data) {
      const floor = d.death_floor ?? 0;
      counts.set(floor, (counts.get(floor) ?? 0) + d.deaths);
    }
    return [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([floor, deaths]) => ({ floor: `F${floor}`, deaths }));
  }, [data]);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Deaths</h2>
      <ChartWidget title="Deaths by floor" isLoading={isLoading} error={error ?? null} isEmpty={data.length === 0}>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byFloor}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="floor" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="deaths" name="Deaths" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3">
          <StatsTable
            rows={data}
            rowKey={(d, i) => `${d.death_floor}-${d.death_enemies}-${i}`}
            initialSort="deaths"
            columns={[
              { key: 'death_enemies', label: 'Killed by', render: d => d.death_enemies.split(',').map(prettyKey).join(', ') },
              { key: 'death_floor', label: 'Floor' },
              { key: 'deaths', label: 'Deaths' },
              { key: 'avg_hp_start', label: 'HP entering', render: d => `${num(d.avg_hp_start, 0)} / ${num(d.avg_max_hp, 0)}` },
              { key: 'avg_turns', label: 'Avg turns', render: d => num(d.avg_turns, 1) },
              { key: 'avg_damage_taken', label: 'Avg dmg taken', render: d => num(d.avg_damage_taken, 1) },
            ]}
          />
        </div>
      </ChartWidget>
    </section>
  );
}
