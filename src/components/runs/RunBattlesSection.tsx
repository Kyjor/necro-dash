import { useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '../ui/Card';
import { StatsTable } from '../charts/StatsTable';
import type { RunBattle } from '../../types/analytics';
import { formatDuration, prettyKey } from '../../utils/runFormat';

function CountList({ title, counts }: { title: string; counts: Record<string, number> }) {
  const entries = Object.entries(counts ?? {}).sort((a, b) => b[1] - a[1]);
  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{title}</p>
      {entries.length === 0 ? (
        <p className="text-xs text-gray-400">—</p>
      ) : (
        entries.map(([key, n]) => (
          <p key={key} className="text-xs text-gray-800 dark:text-gray-200">
            {prettyKey(key)} ×{n}
          </p>
        ))
      )}
    </div>
  );
}

export function RunBattlesSection({ battles }: { battles: RunBattle[] }) {
  const [selected, setSelected] = useState<RunBattle | null>(null);
  const hpData = battles.map(b => ({
    battle: `#${b.index} F${b.floor}`,
    start: b.hp_start,
    end: b.hp_end ?? null,
    max: b.max_hp_start,
  }));

  return (
    <>
      <Card className="space-y-2">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">HP Over Run</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hpData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="battle" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="max" name="Max HP" stroke="#9ca3af" dot={false} />
              <Line type="monotone" dataKey="start" name="HP at start" stroke="#2563eb" />
              <Line type="monotone" dataKey="end" name="HP at end" stroke="#dc2626" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="space-y-2">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Battles ({battles.length})</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">Tap a battle for matches, abilities and potions used.</p>
        <StatsTable
          rows={battles}
          rowKey={b => `${b.index}`}
          initialSort="index"
          onRowClick={b => setSelected(prev => (prev?.index === b.index ? null : b))}
          columns={[
            { key: 'index', label: '#' },
            { key: 'floor', label: 'Floor' },
            { key: 'enemies', label: 'Enemies', render: b => (b.enemies ?? []).map(prettyKey).join(', ') },
            { key: 'result', label: 'Result' },
            { key: 'hp_start', label: 'HP', render: b => `${b.hp_start} → ${b.hp_end ?? '?'}` },
            { key: 'turns', label: 'Turns' },
            { key: 'damage_dealt', label: 'Dealt' },
            { key: 'damage_taken', label: 'Taken' },
            { key: 'max_hit', label: 'Max hit' },
            { key: 'max_combo', label: 'Max combo' },
            { key: 'swaps', label: 'Swaps' },
            { key: 'queue_placements', label: 'Queued' },
            { key: 'rerolls', label: 'Rerolls' },
            { key: 'death_prevented', label: 'Saved' },
            { key: 'duration', label: 'Time', render: b => formatDuration(b.duration) },
          ]}
        />
        {selected ? (
          <div className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3 space-y-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Battle #{selected.index} · {selected.category || 'battle'} · {selected.result}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <CountList
                title="Matches"
                counts={Object.fromEntries(Object.entries(selected.matches ?? {}).map(([k, m]) => [k, m.times]))}
              />
              <CountList title="Abilities" counts={selected.abilities} />
              <CountList title="Potions" counts={selected.potions} />
            </div>
          </div>
        ) : null}
      </Card>
    </>
  );
}
