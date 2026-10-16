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
  const topPlayed = [...data].sort((a, b) => b.runs - a.runs)[0];
  const topWin = [...data]
    .filter(c => c.wins + c.deaths >= 2 && c.win_rate !== null)
    .sort((a, b) => (b.win_rate ?? 0) - (a.win_rate ?? 0))[0] ?? topPlayed;
  const chartData = data.map(c => ({ name: prettyKey(c.character_key), winRate: (c.win_rate ?? 0) * 100 }));

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Runs" value={isLoading ? '--' : `${runs}`} helper={`${finished} finished`} />
        <KpiCard
          label="Overall Win Rate"
          value={isLoading ? '--' : pct(finished > 0 ? wins / finished : null)}
          helper="won / (won + died)"
          tone="good"
        />
        <KpiCard
          label="Most Played"
          value={isLoading || !topPlayed ? '--' : prettyKey(topPlayed.character_key)}
          helper={topPlayed ? `${topPlayed.runs} runs` : undefined}
        />
        <KpiCard
          label="Highest Win Rate"
          value={isLoading || !topWin ? '--' : prettyKey(topWin.character_key)}
          helper={topWin ? `${pct(topWin.win_rate)} win rate` : undefined}
          tone="good"
        />
      </div>

      <ChartWidget title="Character Performance" isLoading={isLoading} error={error ?? null} isEmpty={data.length === 0}>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis unit="%" tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Bar dataKey="winRate" name="Win rate" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4">
          <StatsTable
            rows={data}
            rowKey={c => c.character_key}
            initialSort="runs"
            columns={[
              { key: 'character_key', label: 'Character', render: c => prettyKey(c.character_key) },
              { key: 'runs', label: 'Runs' },
              { key: 'win_rate', label: 'Win %', render: c => pct(c.win_rate) },
              { key: 'avg_final_floor', label: 'Avg floor', render: c => num(c.avg_final_floor, 1) },
              { key: 'avg_play_time_seconds', label: 'Avg time', render: c => formatDuration(c.avg_play_time_seconds) },
              { key: 'wins', label: 'Won', secondary: true },
              { key: 'deaths', label: 'Died', secondary: true },
              { key: 'abandoned', label: 'Abandoned', secondary: true },
              { key: 'avg_battles', label: 'Avg battles', render: c => num(c.avg_battles, 1), secondary: true },
              { key: 'avg_treasures', label: 'Avg treasures', render: c => num(c.avg_treasures, 1), secondary: true },
            ]}
          />
        </div>
      </ChartWidget>
    </section>
  );
}
