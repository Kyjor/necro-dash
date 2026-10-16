import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartWidget } from '../components/charts/ChartWidget';
import { KpiCard } from '../components/charts/KpiCard';
import { StatsTable } from '../components/charts/StatsTable';
import { OutcomeBadge } from '../components/runs/OutcomeBadge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { Spinner } from '../components/ui/Spinner';
import { useUserProfile } from '../hooks/useRunAnalytics';
import type { UserItemPreference } from '../types/analytics';
import { formatDuration, formatTotalRuntime, num, pct, prettyKey, shortUserId } from '../utils/runFormat';

type ProfileTab = 'overview' | 'builds' | 'runs';
type BuildSubTab = 'treasures' | 'pieces' | 'potions' | 'abilities';

function StatMetric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">{value}</p>
      {sub ? <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p> : null}
    </div>
  );
}

function ItemPreferenceTable({ rows, itemLabel }: { rows: UserItemPreference[]; itemLabel: string }) {
  if (rows.length === 0) {
    return <p className="text-xs text-gray-500 dark:text-gray-400 py-4 text-center">No recorded {itemLabel.toLowerCase()} data for this player.</p>;
  }
  return (
    <StatsTable
      rows={rows}
      rowKey={r => r.key}
      initialSort="runs"
      defaultRowLimit={12}
      columns={[
        { key: 'key', label: itemLabel, render: r => prettyKey(r.key) },
        { key: 'runs', label: 'Runs held/used' },
        { key: 'win_rate', label: 'Win %', render: r => pct(r.win_rate) },
        { key: 'total_uses', label: 'Total uses/matches' },
        { key: 'wins', label: 'Wins', secondary: true },
      ]}
    />
  );
}

export function PlayerProfileScreen() {
  const { userId: rawUserId } = useParams<{ userId: string }>();
  const userId = rawUserId ? decodeURIComponent(rawUserId) : undefined;
  const navigate = useNavigate();
  const { data: profile, isLoading, error } = useUserProfile(userId);
  const [tab, setTab] = useState<ProfileTab>('overview');
  const [buildTab, setBuildTab] = useState<BuildSubTab>('treasures');

  const playstyleTags = useMemo(() => {
    if (!profile) return [];
    const tags: Array<{ label: string; tone: 'good' | 'warn' | 'neutral' }> = [];
    const { summary, playstyle } = profile;

    if (summary.total_play_time_seconds >= 3600 * 5) {
      tags.push({ label: 'Power Grinder (5h+)', tone: 'good' });
    } else if (summary.runs >= 10) {
      tags.push({ label: 'Dedicated Runner', tone: 'good' });
    }

    if (summary.win_rate !== null && summary.win_rate >= 0.4) {
      tags.push({ label: `High Win Rate (${pct(summary.win_rate)})`, tone: 'good' });
    }

    if (playstyle.avg_rerolls !== null && playstyle.avg_rerolls >= 4) {
      tags.push({ label: 'Heavy Reroller', tone: 'neutral' });
    }
    if (playstyle.avg_swaps !== null && playstyle.avg_swaps >= 8) {
      tags.push({ label: 'Tactical Swapper', tone: 'neutral' });
    }
    if (playstyle.avg_potions_used !== null && playstyle.avg_potions_used >= 3) {
      tags.push({ label: 'Alchemist (High Potion Use)', tone: 'neutral' });
    }
    if (summary.runs > 0 && summary.abandoned / summary.runs >= 0.3) {
      tags.push({ label: 'Frequent Restarter', tone: 'warn' });
    }

    return tags;
  }, [profile]);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 pb-safe-bottom">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/runs?view=players')}>
          ← All Players
        </Button>
        {userId ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/runs?user=${encodeURIComponent(userId)}`)}
          >
            Filter in Runs Feed
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="text-primary-500" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error.message}</p>
      ) : !profile ? (
        <EmptyState emoji="👤" title="Player not found" description="No runs or events found for this user ID." />
      ) : (
        <>
          {/* Hero Player Identity Card */}
          <Card className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
                    Player Profile
                  </span>
                  <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:text-gray-300">
                    {profile.summary.active_days} active {profile.summary.active_days === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <h1 className="mt-1 text-lg sm:text-xl font-mono font-bold text-gray-900 dark:text-gray-100 break-all">
                  {profile.summary.user_id}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  First seen {new Date(profile.summary.first_seen).toLocaleDateString()} · Last active{' '}
                  {new Date(profile.summary.last_seen).toLocaleString()}
                </p>
              </div>

              {playstyleTags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 sm:justify-end">
                  {playstyleTags.map(tag => (
                    <span
                      key={tag.label}
                      className={[
                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
                        tag.tone === 'good'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : tag.tone === 'warn'
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                            : 'bg-primary-500/10 text-primary-700 dark:text-primary-300',
                      ].join(' ')}
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {profile.os_name || profile.gpu_name || profile.startup_count > 0 || profile.crash_count > 0 ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                <span>App launches: <strong className="text-gray-800 dark:text-gray-200">{profile.startup_count}</strong></span>
                <span>Crashes: <strong className={profile.crash_count > 0 ? 'text-red-500' : 'text-emerald-600'}>{profile.crash_count}</strong></span>
                {profile.os_name ? <span>OS: <strong className="text-gray-800 dark:text-gray-200">{profile.os_name}</strong></span> : null}
                {profile.gpu_name ? <span>GPU: <strong className="text-gray-800 dark:text-gray-200">{profile.gpu_name}</strong></span> : null}
              </div>
            ) : null}
          </Card>

          {/* Headline Lifetime KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Total Runtime"
              value={formatTotalRuntime(profile.summary.total_play_time_seconds)}
              helper={`Avg ${formatDuration(profile.summary.avg_play_time_seconds)} / run`}
              tone="good"
            />
            <KpiCard
              label="Total Runs"
              value={`${profile.summary.runs}`}
              helper={`${profile.summary.wins}W · ${profile.summary.deaths}D · ${profile.summary.abandoned}A`}
            />
            <KpiCard
              label="Win Rate"
              value={pct(profile.summary.win_rate)}
              helper="won / finished runs"
              tone={profile.summary.win_rate && profile.summary.win_rate >= 0.3 ? 'good' : 'neutral'}
            />
            <KpiCard
              label="Best Floor"
              value={profile.summary.best_floor !== null ? `Floor ${profile.summary.best_floor}` : '—'}
              helper={`Avg floor ${num(profile.summary.avg_floor, 1)}`}
            />
          </div>

          {/* Sub-Navigation */}
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: 'overview', label: 'Playstyle & Characters' },
              { value: 'builds', label: 'Favorite Builds & Items' },
              { value: 'runs', label: 'Run History', count: profile.runs.length },
            ]}
          />

          {/* TAB 1: Playstyle, Characters, Progression, Nemeses */}
          {tab === 'overview' ? (
            <div className="space-y-4">
              {/* How They Play Fingerprint */}
              <Card className="space-y-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    Playstyle & Decision Fingerprint
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Per-run averages and all-time records showing how {shortUserId(profile.summary.user_id)} plays.
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <StatMetric
                    label="Queue Placements / Run"
                    value={num(profile.playstyle.avg_drags, 1)}
                    sub="Pieces placed"
                  />
                  <StatMetric
                    label="Swaps / Run"
                    value={num(profile.playstyle.avg_swaps, 1)}
                    sub="Board manipulation"
                  />
                  <StatMetric
                    label="Queue Rerolls / Run"
                    value={num(profile.playstyle.avg_rerolls, 1)}
                    sub="RNG mitigation"
                  />
                  <StatMetric
                    label="Potions Used / Run"
                    value={num(profile.playstyle.avg_potions_used, 1)}
                    sub="Consumable reliance"
                  />
                  <StatMetric
                    label="Avg Turns / Run"
                    value={num(profile.playstyle.avg_turns_per_run, 1)}
                    sub={profile.playstyle.avg_turns_per_battle ? `${num(profile.playstyle.avg_turns_per_battle, 1)} / battle` : undefined}
                  />
                  <StatMetric
                    label="Avg Damage Dealt"
                    value={num(profile.playstyle.avg_damage_dealt, 0)}
                    sub={`${num(profile.playstyle.avg_kills_per_run, 1)} kills / run`}
                  />
                  <StatMetric
                    label="Avg Gold Spent"
                    value={num(profile.playstyle.avg_gold_spent, 0)}
                    sub="Shop investment / run"
                  />
                  <StatMetric
                    label="All-Time Records"
                    value={
                      profile.playstyle.max_combo_ever !== null
                        ? `${profile.playstyle.max_combo_ever}x combo`
                        : '—'
                    }
                    sub={
                      profile.playstyle.max_single_hit_ever !== null
                        ? `Max hit: ${profile.playstyle.max_single_hit_ever} dmg`
                        : undefined
                    }
                  />
                </div>
              </Card>

              {/* Character Breakdown */}
              <ChartWidget
                title="Character Breakdown"
                isLoading={false}
                error={null}
                isEmpty={profile.characters.length === 0}
              >
                <div className="h-44 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={profile.characters.map(c => ({
                        name: prettyKey(c.character_key),
                        runs: c.runs,
                        wins: c.wins,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="runs" name="Runs" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="wins" name="Wins" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <StatsTable
                  rows={profile.characters}
                  rowKey={c => c.character_key}
                  initialSort="runs"
                  columns={[
                    { key: 'character_key', label: 'Character', render: c => prettyKey(c.character_key) },
                    { key: 'runs', label: 'Runs' },
                    { key: 'win_rate', label: 'Win %', render: c => pct(c.win_rate) },
                    { key: 'best_floor', label: 'Best floor', render: c => c.best_floor ?? '—' },
                    {
                      key: 'total_play_time_seconds',
                      label: 'Runtime',
                      render: c => formatTotalRuntime(c.total_play_time_seconds),
                    },
                    { key: 'wins', label: 'Won', secondary: true },
                    { key: 'deaths', label: 'Died', secondary: true },
                    { key: 'abandoned', label: 'Abandoned', secondary: true },
                    { key: 'avg_floor', label: 'Avg floor', render: c => num(c.avg_floor, 1), secondary: true },
                  ]}
                />
              </ChartWidget>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Floor Progression Over Time */}
                <ChartWidget
                  title="Floor Progression Across Runs"
                  isLoading={false}
                  error={null}
                  isEmpty={profile.floor_progression.length === 0}
                >
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={profile.floor_progression.map((p, idx) => ({ run: `#${idx + 1}`, floor: p.floor, date: p.date }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="run" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="floor" name="Floor reached" stroke="#8b5cf6" fill="#ddd6fe" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </ChartWidget>

                {/* Top Nemeses (What kills this player) */}
                <ChartWidget
                  title="Biggest Nemeses (Killed By)"
                  isLoading={false}
                  error={null}
                  isEmpty={profile.nemeses.length === 0}
                  emptyTitle="No recorded deaths"
                  emptyDescription="This player hasn't died to any enemies yet."
                >
                  <StatsTable
                    rows={profile.nemeses}
                    rowKey={n => n.enemies}
                    initialSort="deaths"
                    defaultRowLimit={6}
                    columns={[
                      {
                        key: 'enemies',
                        label: 'Enemy',
                        render: n => n.enemies.split(',').map(prettyKey).join(', '),
                      },
                      { key: 'deaths', label: 'Deaths' },
                      { key: 'avg_floor', label: 'Avg floor', render: n => num(n.avg_floor, 1) },
                    ]}
                  />
                </ChartWidget>
              </div>
            </div>
          ) : null}

          {/* TAB 2: Favorite Builds & Items */}
          {tab === 'builds' ? (
            <Card className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    Build & Item Preferences
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Items this player drafts, holds in final loadouts, and triggers most often.
                  </p>
                </div>
                <SegmentedControl
                  size="sm"
                  value={buildTab}
                  onChange={setBuildTab}
                  options={[
                    { value: 'treasures', label: 'Treasures', count: profile.top_treasures.length },
                    { value: 'pieces', label: 'Pieces', count: profile.top_pieces.length },
                    { value: 'potions', label: 'Potions', count: profile.top_potions.length },
                    { value: 'abilities', label: 'Abilities', count: profile.top_abilities.length },
                  ]}
                />
              </div>

              {buildTab === 'treasures' ? (
                <ItemPreferenceTable rows={profile.top_treasures} itemLabel="Treasure" />
              ) : null}
              {buildTab === 'pieces' ? (
                <ItemPreferenceTable rows={profile.top_pieces} itemLabel="Piece" />
              ) : null}
              {buildTab === 'potions' ? (
                <ItemPreferenceTable rows={profile.top_potions} itemLabel="Potion" />
              ) : null}
              {buildTab === 'abilities' ? (
                <ItemPreferenceTable rows={profile.top_abilities} itemLabel="Ability" />
              ) : null}
            </Card>
          ) : null}

          {/* TAB 3: Full Run History for this Player */}
          {tab === 'runs' ? (
            <div className="space-y-2">
              {profile.runs.map(run => (
                <Card key={run.id} onClick={() => navigate(`/runs/${run.uuid}`)} className="p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {run.character_key ? prettyKey(run.character_key) : 'Unknown character'}
                    </span>
                    <OutcomeBadge run={run} />
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-3">
                    <span>Floor {run.final_floor ?? run.floors_climbed ?? '—'}</span>
                    <span>{formatDuration(run.play_time_seconds)}</span>
                    {run.game_version ? <span>v{run.game_version}</span> : null}
                    <span>{new Date(run.created_at).toLocaleString()}</span>
                  </div>
                  {run.outcome === 'died' && run.death_enemies ? (
                    <p className="mt-1 text-xs text-red-500">
                      Killed by {run.death_enemies.split(',').map(prettyKey).join(', ')}
                    </p>
                  ) : null}
                </Card>
              ))}
            </div>
          ) : null}
        </>
      )}
      <div className="h-20" />
    </div>
  );
}
