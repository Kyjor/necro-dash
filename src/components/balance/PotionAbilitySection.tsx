import { useAbilityStats, usePotionStats } from '../../hooks/useRunAnalytics';
import type { StatsScope } from '../../types/analytics';
import { num, pct, prettyKey } from '../../utils/runFormat';
import { ChartWidget } from '../charts/ChartWidget';
import { StatsTable } from '../charts/StatsTable';

export function PotionAbilitySection({ range, version }: StatsScope) {
  const potions = usePotionStats(range, version);
  const abilities = useAbilityStats(range, version);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Potions & Abilities</h2>
      <ChartWidget
        title="Potions"
        isLoading={potions.isLoading}
        error={potions.error ?? null}
        isEmpty={(potions.data ?? []).length === 0}
      >
        <StatsTable
          rows={potions.data ?? []}
          rowKey={p => p.potion_key}
          initialSort="gained"
          columns={[
            { key: 'potion_key', label: 'Potion', render: p => prettyKey(p.potion_key) },
            { key: 'runs', label: 'Runs' },
            { key: 'gained', label: 'Gained' },
            { key: 'used', label: 'Used' },
            { key: 'sold', label: 'Sold' },
            { key: 'discarded', label: 'Discarded' },
            { key: 'use_rate', label: 'Use %', render: p => pct(p.use_rate) },
            { key: 'win_rate_when_used', label: 'Win % (used)', render: p => pct(p.win_rate_when_used) },
            { key: 'offered', label: 'Offered' },
            { key: 'chosen', label: 'Chosen' },
            { key: 'bought', label: 'Bought' },
          ]}
        />
      </ChartWidget>
      <ChartWidget
        title="Active abilities"
        isLoading={abilities.isLoading}
        error={abilities.error ?? null}
        isEmpty={(abilities.data ?? []).length === 0}
      >
        <StatsTable
          rows={abilities.data ?? []}
          rowKey={a => a.ability_key}
          initialSort="total_uses"
          columns={[
            { key: 'ability_key', label: 'Ability', render: a => prettyKey(a.ability_key) },
            { key: 'runs_held', label: 'Runs held' },
            { key: 'runs_used', label: 'Runs used' },
            { key: 'usage_rate', label: 'Used %', render: a => pct(a.usage_rate) },
            { key: 'total_uses', label: 'Uses' },
            { key: 'avg_uses_per_run', label: 'Uses/run', render: a => num(a.avg_uses_per_run, 1) },
            { key: 'win_rate_when_used', label: 'Win % (used)', render: a => pct(a.win_rate_when_used) },
          ]}
        />
      </ChartWidget>
    </section>
  );
}
