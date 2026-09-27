import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useCharacterStats } from '../../hooks/useRunAnalytics';
import type { StatsScope } from '../../types/analytics';
import { formatDuration, num, pct, prettyKey } from '../../utils/runFormat';
import { ChartWidget } from '../charts/ChartWidget';
import { KpiCard } from '../charts/KpiCard';
import { StatsTable } from '../charts/StatsTable';

export function CharacterStatsSection({ range, version }: StatsScope) {
  const { data = [], isLoading, error } = useCharacterStats(range, version);
  const runs = data.reduce((sum, c) => sum + c.runs, 0);
  const wins = data.reduce((sum, c) => sum + c.wins, 0);
  const finished = data.reduce((sum, c) => sum + c.wins + c.deaths, 0);
  const chartData = data.map(c => ({ name: prettyKey(c.character_key), winRate: (c.win_rate ?? 0) * 100 }));

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Characters</h2>
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Runs" value={isLoading ? '--' : `${runs}`} />
        <KpiCard label="Win rate" value={isLoading ? '--' : pct(finished > 0 ? wins / finished : null)} helper="won / (won + died)" />
      </div>
      <ChartWidget title="Win rate by character" isLoading={isLoading} error={error ?? null} isEmpty={data.length === 0}>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis unit="%" tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Bar dataKey="winRate" name="Win rate" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3">
          <StatsTable
            rows={data}
            rowKey={c => c.character_key}
            initialSort="runs"
            columns={[
              { key: 'character_key', label: 'Character', render: c => prettyKey(c.character_key) },
              { key: 'runs', label: 'Runs' },
              { key: 'wins', label: 'Won' },
              { key: 'deaths', label: 'Died' },
              { key: 'abandoned', label: 'Abandoned' },
              { key: 'win_rate', label: 'Win %', render: c => pct(c.win_rate) },
              { key: 'avg_final_floor', label: 'Avg floor', render: c => num(c.avg_final_floor, 1) },
              { key: 'avg_play_time_seconds', label: 'Avg time', render: c => formatDuration(c.avg_play_time_seconds) },
              { key: 'avg_battles', label: 'Avg battles', render: c => num(c.avg_battles, 1) },
              { key: 'avg_treasures', label: 'Avg treasures', render: c => num(c.avg_treasures, 1) },
            ]}
          />
        </div>
      </ChartWidget>
    </section>
  );
}
