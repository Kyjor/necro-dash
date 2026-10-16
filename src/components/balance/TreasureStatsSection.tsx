import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTreasureStats } from '../../hooks/useRunAnalytics';
import type { StatsScope, TreasureStat } from '../../types/analytics';
import { num, pct, prettyKey } from '../../utils/runFormat';
import { ChartWidget } from '../charts/ChartWidget';
import { KpiCard } from '../charts/KpiCard';
import { StatsTable } from '../charts/StatsTable';

const CHART_LIMIT = 10;

function topSource(t: TreasureStat): string {
  const entries = Object.entries(t.sources ?? {});
  if (entries.length === 0) return '—';
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

export function TreasureStatsSection({ range, version }: StatsScope) {
  const { data = [], isLoading, error } = useTreasureStats(range, version);
  const qualified = data.filter(t => t.finished >= 2 && t.win_rate !== null);
  const bestWin = [...(qualified.length > 0 ? qualified : data)].sort((a, b) => (b.win_rate ?? 0) - (a.win_rate ?? 0))[0];
  const mostPicked = [...data].filter(t => t.offered >= 2).sort((a, b) => (b.pick_rate ?? 0) - (a.pick_rate ?? 0))[0];
  const mostHeld = [...data].sort((a, b) => b.runs - a.runs)[0];

  const chartData = [...data]
    .sort((a, b) => b.runs - a.runs)
    .slice(0, CHART_LIMIT)
    .map(t => ({
      name: prettyKey(t.treasure_key),
      winRate: (t.win_rate ?? 0) * 100,
      pickRate: (t.pick_rate ?? 0) * 100,
    }));

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          label="Highest Win Rate"
          value={isLoading || !bestWin ? '--' : prettyKey(bestWin.treasure_key)}
          helper={bestWin ? `${pct(bestWin.win_rate)} win rate (${bestWin.runs} runs)` : undefined}
          tone="good"
        />
        <KpiCard
          label="Highest Pick Rate"
          value={isLoading || !mostPicked ? '--' : prettyKey(mostPicked.treasure_key)}
          helper={mostPicked ? `${pct(mostPicked.pick_rate)} (${mostPicked.chosen}/${mostPicked.offered} offered)` : undefined}
        />
        <KpiCard
          label="Most Held in Runs"
          value={isLoading || !mostHeld ? '--' : prettyKey(mostHeld.treasure_key)}
          helper={mostHeld ? `${mostHeld.runs} runs · ${num(mostHeld.avg_triggers, 1)} avg triggers` : undefined}
        />
      </div>

      <ChartWidget
        title={`Treasures (Top ${CHART_LIMIT} by Runs)`}
        isLoading={isLoading}
        error={error ?? null}
        isEmpty={data.length === 0}
      >
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" unit="%" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={95} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Legend />
              <Bar dataKey="winRate" name="Win rate" fill="#16a34a" />
              <Bar dataKey="pickRate" name="Pick rate" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4">
          <StatsTable
            rows={data}
            rowKey={t => t.treasure_key}
            initialSort="runs"
            columns={[
              { key: 'treasure_key', label: 'Treasure', render: t => prettyKey(t.treasure_key) },
              { key: 'runs', label: 'Runs' },
              { key: 'win_rate', label: 'Win %', render: t => pct(t.win_rate) },
              { key: 'pick_rate', label: 'Pick %', render: t => pct(t.pick_rate) },
              { key: 'avg_triggers', label: 'Avg uses', render: t => num(t.avg_triggers, 1) },
              { key: 'offered', label: 'Offered', secondary: true },
              { key: 'chosen', label: 'Chosen', secondary: true },
              { key: 'bought', label: 'Bought', secondary: true },
              { key: 'avg_acquired_floor', label: 'Got on floor', render: t => num(t.avg_acquired_floor, 1), secondary: true },
              { key: 'avg_final_floor', label: 'Avg final floor', render: t => num(t.avg_final_floor, 1), secondary: true },
              { key: 'sources', label: 'Top source', render: topSource, secondary: true },
            ]}
          />
        </div>
      </ChartWidget>
    </section>
  );
}
