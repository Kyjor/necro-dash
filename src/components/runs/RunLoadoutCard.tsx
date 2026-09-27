import { useMemo } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { StatsTable } from '../charts/StatsTable';
import type { RunLoadout } from '../../types/analytics';
import { prettyKey } from '../../utils/runFormat';

export function RunLoadoutCard({ loadout }: { loadout: RunLoadout }) {
  const pieces = useMemo(() => {
    const byKey = new Map<string, number[]>();
    for (const p of loadout.pieces ?? []) {
      const weights = byKey.get(p.key) ?? [];
      weights.push(p.weight);
      byKey.set(p.key, weights);
    }
    return [...byKey.entries()]
      .map(([key, weights]) => ({ key, weights: weights.sort((a, b) => a - b) }))
      .sort((a, b) => b.weights.length - a.weights.length);
  }, [loadout.pieces]);

  return (
    <Card className="space-y-4">
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Final Loadout</h2>

      <div className="grid grid-cols-3 gap-2">
        {Object.entries(loadout.stats ?? {}).map(([name, value]) => (
          <div key={name} className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-2">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{name.replace(/_/g, ' ')}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Treasures ({loadout.treasures?.length ?? 0})</h3>
        <StatsTable
          rows={loadout.treasures ?? []}
          rowKey={(t, i) => `${t.key}-${i}`}
          columns={[
            { key: 'key', label: 'Treasure', render: t => prettyKey(t.key) },
            { key: 'source', label: 'Source' },
            { key: 'floor', label: 'Floor' },
            { key: 'node', label: 'Node' },
            { key: 'triggers', label: 'Uses' },
          ]}
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Pieces ({loadout.pieces?.length ?? 0})</h3>
        <ul className="space-y-1 text-sm">
          {pieces.map(p => (
            <li key={p.key} className="flex justify-between gap-2">
              <span className="text-gray-900 dark:text-gray-100">
                {prettyKey(p.key)} ×{p.weights.length}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 text-right">weights {p.weights.join(', ')}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Potions</h3>
        <div className="flex flex-wrap gap-1">
          {(loadout.potions ?? []).length === 0 ? (
            <span className="text-xs text-gray-500 dark:text-gray-400">None held</span>
          ) : (
            loadout.potions.map((p, i) => <Badge key={`${p}-${i}`} label={prettyKey(p)} color="#7c3aed" />)
          )}
        </div>
      </div>
    </Card>
  );
}
