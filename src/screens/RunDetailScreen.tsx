import { useNavigate, useParams } from 'react-router-dom';
import { StatsTable } from '../components/charts/StatsTable';
import { OutcomeBadge } from '../components/runs/OutcomeBadge';
import { RunBattlesSection } from '../components/runs/RunBattlesSection';
import { RunLoadoutCard } from '../components/runs/RunLoadoutCard';
import { RunTimeline } from '../components/runs/RunTimeline';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { useRunDetail } from '../hooks/useRunAnalytics';
import type { RunDetail, RunItemStats } from '../types/analytics';
import { formatDuration, prettyKey } from '../utils/runFormat';

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-words">{value ?? '—'}</p>
    </div>
  );
}

const LEGACY_FIELDS: Array<[keyof RunDetail, string]> = [
  ['floors_climbed', 'Floors climbed'],
  ['current_health', 'HP'],
  ['max_health', 'Max HP'],
  ['current_gold', 'Gold'],
  ['gold_spent', 'Gold spent'],
  ['potions_used', 'Potions used'],
  ['rerolls_used', 'Rerolls'],
  ['switches_used', 'Swaps'],
  ['drags_used', 'Queue placements'],
  ['enemies_killed', 'Kills'],
  ['turns_taken', 'Turns'],
  ['longest_combo', 'Longest combo'],
  ['total_damage_dealt', 'Damage dealt'],
  ['health_lost', 'HP lost'],
  ['health_gained', 'HP gained'],
];

function LegacyCounters({ run }: { run: RunDetail }) {
  return (
    <Card className="space-y-3">
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Run Counters</h2>
      <div className="grid grid-cols-3 gap-3">
        {LEGACY_FIELDS.map(([key, label]) => (
          <Field key={key} label={label} value={run[key] as number | null} />
        ))}
      </div>
      {run.relics_used ? <Field label="Relics" value={run.relics_used} /> : null}
    </Card>
  );
}

function UsageCard({ stats }: { stats: RunItemStats }) {
  const abilities = Object.entries(stats.abilities ?? {}).map(([key, v]) => ({ key, used: v.used ?? 0 }));
  const potions = Object.entries(stats.potions ?? {}).map(([key, v]) => ({
    key,
    gained: v.gained ?? 0,
    used: v.used ?? 0,
    sold: v.sold ?? 0,
    discarded: v.discarded ?? 0,
  }));
  const pieces = Object.entries(stats.pieces ?? {}).map(([key, v]) => ({
    key,
    matched: v.matched ?? 0,
    count_total: v.count_total ?? 0,
  }));
  const totals = Object.entries(stats.totals ?? {});

  return (
    <Card className="space-y-4">
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Usage</h2>
      {totals.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {totals.map(([key, value]) => (
            <Field key={key} label={key.replace(/_/g, ' ')} value={value} />
          ))}
        </div>
      ) : null}
      {abilities.length > 0 ? (
        <StatsTable
          rows={abilities}
          rowKey={a => a.key}
          initialSort="used"
          columns={[
            { key: 'key', label: 'Ability', render: a => prettyKey(a.key) },
            { key: 'used', label: 'Uses' },
          ]}
        />
      ) : null}
      {potions.length > 0 ? (
        <StatsTable
          rows={potions}
          rowKey={p => p.key}
          initialSort="gained"
          columns={[
            { key: 'key', label: 'Potion', render: p => prettyKey(p.key) },
            { key: 'gained', label: 'Gained' },
            { key: 'used', label: 'Used' },
            { key: 'sold', label: 'Sold' },
            { key: 'discarded', label: 'Discarded' },
          ]}
        />
      ) : null}
      {pieces.length > 0 ? (
        <StatsTable
          rows={pieces}
          rowKey={p => p.key}
          initialSort="matched"
          columns={[
            { key: 'key', label: 'Piece', render: p => prettyKey(p.key) },
            { key: 'matched', label: 'Matches' },
            { key: 'count_total', label: 'Pieces cleared' },
          ]}
        />
      ) : null}
    </Card>
  );
}

export function RunDetailScreen() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const { data: run, isLoading, error } = useRunDetail(uuid);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 pb-safe-bottom">
      <Button variant="ghost" size="sm" onClick={() => navigate('/runs')}>
        ← Runs
      </Button>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="text-primary-500" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error.message}</p>
      ) : !run ? (
        <EmptyState emoji="🔍" title="Run not found" />
      ) : (
        <>
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {run.character_key ? prettyKey(run.character_key) : 'Unknown character'}
              </h1>
              <OutcomeBadge run={run} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Floor" value={run.final_floor ?? run.floors_climbed} />
              <Field label="Play time" value={formatDuration(run.play_time_seconds)} />
              <Field label="Version" value={run.game_version} />
              <Field label="Seed" value={run.seed} />
              <Field label="Ended" value={new Date(run.created_at).toLocaleString()} />
              <Field label="Battles" value={run.battles?.length ?? null} />
            </div>
            {run.outcome === 'died' ? (
              <p className="text-sm text-red-500">
                Died on floor {run.death_floor ?? '?'} to{' '}
                {(run.death_enemies ?? '').split(',').filter(Boolean).map(prettyKey).join(', ') || 'unknown'}
              </p>
            ) : null}
            {run.run_uuid ? null : (
              <p className="text-xs text-amber-600">
                Legacy run: recorded before full run analytics, so only summary counters are available.
              </p>
            )}
          </Card>

          <LegacyCounters run={run} />
          {run.loadout ? <RunLoadoutCard loadout={run.loadout} /> : null}
          {run.item_stats ? <UsageCard stats={run.item_stats} /> : null}
          {run.battles && run.battles.length > 0 ? <RunBattlesSection battles={run.battles} /> : null}
          {run.timeline && run.timeline.length > 0 ? (
            <RunTimeline events={run.timeline} dropped={run.item_stats?.dropped_events ?? 0} />
          ) : null}
        </>
      )}
      <div className="h-20" />
    </div>
  );
}
