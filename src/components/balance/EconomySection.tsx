import { useEconomyStats } from '../../hooks/useRunAnalytics';
import type { StatsScope } from '../../types/analytics';
import { num } from '../../utils/runFormat';
import { ChartWidget } from '../charts/ChartWidget';
import { KpiCard } from '../charts/KpiCard';
import { StatsTable } from '../charts/StatsTable';

const TOTAL_KPIS: Array<[string, string]> = [
  ['gold_earned', 'Avg gold earned / run'],
  ['gold_spent', 'Avg gold spent / run'],
  ['queue_rerolls', 'Avg queue rerolls / run'],
  ['swaps', 'Avg swaps / run'],
];

export function EconomySection({ range, version }: StatsScope) {
  const { data = [], isLoading, error } = useEconomyStats(range, version);
  const totals = new Map(data.filter(r => r.category === 'total').map(r => [r.item_kind, r]));
  const shopRows = data.filter(r => r.category !== 'total');

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {TOTAL_KPIS.map(([key, label]) => (
          <KpiCard key={key} label={label} value={isLoading ? '--' : num(totals.get(key)?.avg_value, 1)} />
        ))}
      </div>
      <ChartWidget title="Shops & Rewards" isLoading={isLoading} error={error ?? null} isEmpty={shopRows.length === 0}>
        <StatsTable
          rows={shopRows}
          rowKey={r => `${r.category}-${r.item_kind}`}
          initialSort="events"
          columns={[
            { key: 'category', label: 'Action', render: r => r.category.replace(/_/g, ' ') },
            { key: 'item_kind', label: 'Kind', render: r => r.item_kind || '—' },
            { key: 'events', label: 'Count' },
            { key: 'avg_value', label: 'Avg gold', render: r => num(r.avg_value, 1) },
            { key: 'runs', label: 'Runs', secondary: true },
            { key: 'total_value', label: 'Total gold', secondary: true },
          ]}
        />
      </ChartWidget>
    </section>
  );
}
