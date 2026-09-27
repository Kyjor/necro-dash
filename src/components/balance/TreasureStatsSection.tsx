import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTreasureStats } from '../../hooks/useRunAnalytics';
import type { StatsScope, TreasureStat } from '../../types/analytics';
import { num, pct, prettyKey } from '../../utils/runFormat';
import { ChartWidget } from '../charts/ChartWidget';
import { StatsTable } from '../charts/StatsTable';

const CHART_LIMIT = 12;

function topSource(t: TreasureStat): string {
  const entries = Object.entries(t.sources ?? {});
  if (entries.length === 0) return '—';
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

export function TreasureStatsSection({ range, version }: StatsScope) {
  const { data = [], isLoading, error } = useTreasureStats(range, version);
  const chartData = [...data]
    .sort((a, b) => b.runs - a.runs)
    .slice(0, CHART_LIMIT)
    .map(t => ({ name: prettyKey(t.treasure_key), winRate: (t.win_rate ?? 0) * 100, pickRate: (t.pick_rate ?? 0) * 100 }));

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Treasures</h2>
      <ChartWidget
        title={`Win / pick rate (top ${CHART_LIMIT} by runs)`}
        isLoading={isLoading}
        error={error ?? null}
        isEmpty={data.length === 0}
      >
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" unit="%" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Legend />
              <Bar dataKey="winRate" name="Win rate" fill="#16a34a" />
              <Bar dataKey="pickRate" name="Pick rate" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Win rate: runs ending with the treasure that were won. Pick rate: chosen / offered on reward screens.
        </p>
        <div className="mt-3">
          <StatsTable
            rows={data}
            rowKey={t => t.treasure_key}
            initialSort="runs"
            columns={[
              { key: 'treasure_key', label: 'Treasure', render: t => prettyKey(t.treasure_key) },
              { key: 'runs', label: 'Runs' },
              { key: 'win_rate', label: 'Win %', render: t => pct(t.win_rate) },
              { key: 'pick_rate', label: 'Pick %', render: t => pct(t.pick_rate) },
              { key: 'offered', label: 'Offered' },
              { key: 'chosen', label: 'Chosen' },
              { key: 'bought', label: 'Bought' },
              { key: 'avg_triggers', label: 'Avg uses', render: t => num(t.avg_triggers, 1) },
              { key: 'avg_acquired_floor', label: 'Got on floor', render: t => num(t.avg_acquired_floor, 1) },
              { key: 'avg_final_floor', label: 'Avg final floor', render: t => num(t.avg_final_floor, 1) },
              { key: 'sources', label: 'Top source', render: topSource },
            ]}
          />
        </div>
      </ChartWidget>
    </section>
  );
}
