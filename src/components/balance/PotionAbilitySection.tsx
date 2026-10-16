import { useAbilityStats, usePotionStats } from '../../hooks/useRunAnalytics';
import type { StatsScope } from '../../types/analytics';
import { num, pct, prettyKey } from '../../utils/runFormat';
import { ChartWidget } from '../charts/ChartWidget';
import { StatsTable } from '../charts/StatsTable';

export function PotionAbilitySection({ range, version }: StatsScope) {
  const potions = usePotionStats(range, version);
  const abilities = useAbilityStats(range, version);

  return (
    <section className="space-y-4">
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
            { key: 'gained', label: 'Gained' },
            { key: 'used', label: 'Used' },
            { key: 'use_rate', label: 'Use %', render: p => pct(p.use_rate) },
            { key: 'win_rate_when_used', label: 'Win % (used)', render: p => pct(p.win_rate_when_used) },
            { key: 'runs', label: 'Runs', secondary: true },
            { key: 'sold', label: 'Sold', secondary: true },
            { key: 'discarded', label: 'Discarded', secondary: true },
            { key: 'offered', label: 'Offered', secondary: true },
            { key: 'chosen', label: 'Chosen', secondary: true },
            { key: 'bought', label: 'Bought', secondary: true },
          ]}
        />
      </ChartWidget>
      <ChartWidget
        title="Active Abilities"
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
            { key: 'total_uses', label: 'Total uses' },
            { key: 'usage_rate', label: 'Used %', render: a => pct(a.usage_rate) },
            { key: 'win_rate_when_used', label: 'Win % (used)', render: a => pct(a.win_rate_when_used) },
            { key: 'runs_held', label: 'Runs held', secondary: true },
            { key: 'runs_used', label: 'Runs used', secondary: true },
            { key: 'avg_uses_per_run', label: 'Uses/run', render: a => num(a.avg_uses_per_run, 1), secondary: true },
          ]}
        />
      </ChartWidget>
    </section>
  );
}
