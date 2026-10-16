import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDeathStats } from '../../hooks/useRunAnalytics';
import type { StatsScope } from '../../types/analytics';
import { num, prettyKey } from '../../utils/runFormat';
import { ChartWidget } from '../charts/ChartWidget';
import { KpiCard } from '../charts/KpiCard';
import { StatsTable } from '../charts/StatsTable';

export function DeathStatsSection({ range, version }: StatsScope) {
  const { data = [], isLoading, error } = useDeathStats(range, version);

  const byFloor = useMemo(() => {
    const counts = new Map<number, number>();
    for (const d of data) {
      const floor = d.death_floor ?? 0;
      counts.set(floor, (counts.get(floor) ?? 0) + d.deaths);
    }
    return [...counts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([floor, deaths]) => ({ floor: `F${floor}`, rawFloor: floor, deaths }));
  }, [data]);

  const totalDeaths = data.reduce((s, d) => s + d.deaths, 0);
  const topKiller = data[0];
  const deadliestFloor = [...byFloor].sort((a, b) => b.deaths - a.deaths)[0];

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Total Deaths" value={isLoading ? '--' : `${totalDeaths}`} />
        <KpiCard
          label="#1 Run Killer"
          value={isLoading || !topKiller ? '--' : topKiller.death_enemies.split(',').map(prettyKey).join(', ')}
          helper={topKiller ? `Floor ${topKiller.death_floor ?? '?'} · ${topKiller.deaths} deaths` : undefined}
          tone={topKiller ? 'danger' : 'neutral'}
        />
        <KpiCard
          label="Deadliest Floor"
          value={isLoading || !deadliestFloor ? '--' : deadliestFloor.floor}
          helper={deadliestFloor ? `${deadliestFloor.deaths} deaths on this floor` : undefined}
          tone={deadliestFloor ? 'warn' : 'neutral'}
        />
      </div>

      <ChartWidget title="Deaths by Floor" isLoading={isLoading} error={error ?? null} isEmpty={data.length === 0}>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byFloor}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="floor" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="deaths" name="Deaths" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4">
          <StatsTable
            rows={data}
            rowKey={(d, i) => `${d.death_floor}-${d.death_enemies}-${i}`}
            initialSort="deaths"
            columns={[
              { key: 'death_enemies', label: 'Killed by', render: d => d.death_enemies.split(',').map(prettyKey).join(', ') },
              { key: 'death_floor', label: 'Floor' },
              { key: 'deaths', label: 'Deaths' },
              { key: 'avg_damage_taken', label: 'Avg dmg taken', render: d => num(d.avg_damage_taken, 1) },
              { key: 'avg_hp_start', label: 'HP entering', render: d => `${num(d.avg_hp_start, 0)} / ${num(d.avg_max_hp, 0)}`, secondary: true },
              { key: 'avg_turns', label: 'Avg turns', render: d => num(d.avg_turns, 1), secondary: true },
            ]}
          />
        </div>
      </ChartWidget>
    </section>
  );
}
