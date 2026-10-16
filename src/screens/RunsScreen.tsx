import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DateRangeFilter } from '../components/charts/DateRangeFilter';
import { KpiCard } from '../components/charts/KpiCard';
import { StatsTable } from '../components/charts/StatsTable';
import { OutcomeBadge } from '../components/runs/OutcomeBadge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { Spinner } from '../components/ui/Spinner';
import { useDashboardDateRange } from '../hooks/useDashboardDateRange';
import { useRunFilterOptions, useRunList, useUserRunSummaries } from '../hooks/useRunAnalytics';
import { RUNS_PAGE_SIZE } from '../services/runAnalyticsService';
import type { RunOutcome } from '../types/analytics';
import { formatDuration, formatTotalRuntime, num, pct, prettyKey, shortUserId } from '../utils/runFormat';

type RunsViewMode = 'runs' | 'players';

export function RunsScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialUser = searchParams.get('user') ?? '';
  const initialView = (searchParams.get('view') === 'players' ? 'players' : 'runs') as RunsViewMode;

  const { range, setRange, from, to, setFrom, setTo, rangeValue, options } = useDashboardDateRange('30d');
  const [viewMode, setViewModeState] = useState<RunsViewMode>(initialView);
  const [outcome, setOutcome] = useState<RunOutcome | ''>('');
  const [character, setCharacter] = useState('');
  const [version, setVersion] = useState('');
  const [userId, setUserIdState] = useState(initialUser);
  const [page, setPage] = useState(0);

  const setUserId = (nextUser: string) => {
    setUserIdState(nextUser);
    setPage(0);
    const next = new URLSearchParams(searchParams);
    if (nextUser) next.set('user', nextUser);
    else next.delete('user');
    setSearchParams(next, { replace: true });
  };

  const setViewMode = (nextMode: RunsViewMode) => {
    setViewModeState(nextMode);
    const next = new URLSearchParams(searchParams);
    if (nextMode === 'players') next.set('view', 'players');
    else next.delete('view');
    setSearchParams(next, { replace: true });
  };

  const filterOptions = useRunFilterOptions();
  const baseFilters = {
    range: rangeValue,
    outcome: outcome || undefined,
    character: character || undefined,
    version: version || undefined,
  };

  const { data, isLoading, isFetching, error } = useRunList(
    { ...baseFilters, userId: userId || undefined },
    page,
  );

  const userSummaries = useUserRunSummaries(baseFilters, viewMode === 'players' || !!userId);

  const selectedPlayerSummary = useMemo(() => {
    if (!userId || !userSummaries.data) return null;
    return userSummaries.data.find(u => u.user_id === userId) ?? null;
  }, [userId, userSummaries.data]);

  const pageCount = data ? Math.max(1, Math.ceil(data.total / RUNS_PAGE_SIZE)) : 1;

  // Any filter change restarts pagination.
  const withReset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(0);
  };

  const openPlayerProfile = (targetUserId: string) => {
    if (!targetUserId || targetUserId === 'anonymous') return;
    navigate(`/players/${encodeURIComponent(targetUserId)}`);
  };

  const totalPlayers = userSummaries.data?.length ?? 0;
  const totalRuntimeAllPlayers = (userSummaries.data ?? []).reduce((s, u) => s + u.total_play_time_seconds, 0);
  const topRuntimePlayer = userSummaries.data?.[0];

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 pb-safe-bottom">
      <header className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Runs & Players</h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Browse individual runs or inspect player leaderboards by total runtime.
            </p>
          </div>
          <DateRangeFilter
            value={range}
            onChange={withReset(setRange)}
            options={options}
            from={from}
            to={to}
            onFromChange={withReset(setFrom)}
            onToChange={withReset(setTo)}
          />
        </div>

        {/* View Toggle + Outcome Quick Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SegmentedControl
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: 'runs', label: 'All Runs', count: data?.total },
              { value: 'players', label: 'Player Leaderboard', count: userSummaries.data?.length },
            ]}
          />

          <SegmentedControl
            size="sm"
            value={outcome}
            onChange={withReset(setOutcome)}
            options={[
              { value: '', label: 'All' },
              { value: 'won', label: 'Won' },
              { value: 'died', label: 'Died' },
              { value: 'abandoned', label: 'Abandoned' },
            ]}
          />
        </div>

        {/* Compact Filter Bar: Character, Version, User ID */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by character"
            value={character}
            onChange={e => withReset(setCharacter)(e.target.value)}
            className="rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-900 dark:text-gray-100"
          >
            <option value="">All characters</option>
            {(filterOptions.data?.characters ?? []).map(c => (
              <option key={c} value={c}>
                {prettyKey(c)}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by version"
            value={version}
            onChange={e => withReset(setVersion)(e.target.value)}
            className="rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-900 dark:text-gray-100"
          >
            <option value="">All versions</option>
            {(filterOptions.data?.versions ?? []).map(v => (
              <option key={v} value={v}>
                v{v}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by player user ID"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            className="rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-900 dark:text-gray-100 font-mono"
          >
            <option value="">All players (User ID)</option>
            {(filterOptions.data?.users ?? []).map(u => (
              <option key={u.userId} value={u.userId}>
                {shortUserId(u.userId)} ({u.runs} runs)
              </option>
            ))}
          </select>

          <input
            type="text"
            value={userId}
            onChange={e => setUserId(e.target.value.trim())}
            placeholder="Paste user_id_hash…"
            aria-label="Search exact user_id_hash"
            className="rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-mono text-gray-900 dark:text-gray-100 placeholder-gray-400 w-44"
          />

          {(outcome || character || version || userId) ? (
            <button
              type="button"
              onClick={() => {
                setOutcome('');
                setCharacter('');
                setVersion('');
                setUserId('');
                setPage(0);
              }}
              className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline px-1.5"
            >
              Reset filters
            </button>
          ) : null}
        </div>
      </header>

      {/* Active Player Filter Banner */}
      {userId ? (
        <Card className="border-primary-500/30 bg-primary-500/5 dark:bg-primary-500/10 p-3.5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
                Filtered by Player User ID
              </p>
              <p className="text-sm font-mono font-bold text-gray-900 dark:text-gray-100 break-all">
                {userId}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" onClick={() => openPlayerProfile(userId)}>
                Full Player Profile →
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setUserId('')}>
                Clear
              </Button>
            </div>
          </div>
          {selectedPlayerSummary ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-xs">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Total runtime: </span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatTotalRuntime(selectedPlayerSummary.total_play_time_seconds)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Runs: </span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedPlayerSummary.runs}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Win %: </span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{pct(selectedPlayerSummary.win_rate)}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Best floor: </span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedPlayerSummary.best_floor ?? '—'}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Main: </span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {selectedPlayerSummary.favorite_character ? prettyKey(selectedPlayerSummary.favorite_character) : '—'}
                </span>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      {/* View Mode 1: Player Leaderboard (sorted by Total Runtime) */}
      {viewMode === 'players' ? (
        userSummaries.isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner className="text-primary-500" />
          </div>
        ) : userSummaries.error ? (
          <p className="text-sm text-red-500">{userSummaries.error.message}</p>
        ) : !userSummaries.data || userSummaries.data.length === 0 ? (
          <EmptyState emoji="👥" title="No players found" description="Try a wider date range or different filters." />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <KpiCard
                label="#1 By Total Runtime"
                value={topRuntimePlayer ? shortUserId(topRuntimePlayer.user_id) : '--'}
                helper={
                  topRuntimePlayer
                    ? `${formatTotalRuntime(topRuntimePlayer.total_play_time_seconds)} · ${topRuntimePlayer.runs} runs`
                    : undefined
                }
                tone="good"
                onClick={topRuntimePlayer ? () => openPlayerProfile(topRuntimePlayer.user_id) : undefined}
              />
              <KpiCard
                label="Cumulative Runtime"
                value={formatTotalRuntime(totalRuntimeAllPlayers)}
                helper={`Across ${totalPlayers} unique players`}
              />
              <KpiCard
                label="Avg Runtime / Player"
                value={totalPlayers > 0 ? formatTotalRuntime(totalRuntimeAllPlayers / totalPlayers) : '--'}
              />
            </div>

            <Card className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Player Leaderboard (Ranked by Total Runtime)
                </h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Tap a player to open their profile
                </span>
              </div>
              <StatsTable
                rows={userSummaries.data}
                rowKey={u => u.user_id}
                initialSort="total_play_time_seconds"
                defaultRowLimit={25}
                onRowClick={u => openPlayerProfile(u.user_id)}
                columns={[
                  {
                    key: 'user_id',
                    label: 'Player ID',
                    render: u => (
                      <span className="font-mono font-medium text-primary-600 dark:text-primary-400" title={u.user_id}>
                        👤 {shortUserId(u.user_id)}
                      </span>
                    ),
                  },
                  {
                    key: 'total_play_time_seconds',
                    label: 'Total runtime',
                    render: u => (
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {formatTotalRuntime(u.total_play_time_seconds)}
                      </span>
                    ),
                  },
                  { key: 'runs', label: 'Runs' },
                  { key: 'win_rate', label: 'Win %', render: u => pct(u.win_rate) },
                  { key: 'best_floor', label: 'Best floor', render: u => u.best_floor ?? '—' },
                  {
                    key: 'favorite_character',
                    label: 'Main char',
                    render: u => (u.favorite_character ? prettyKey(u.favorite_character) : '—'),
                  },
                  { key: 'active_days', label: 'Days active', secondary: true },
                  {
                    key: 'avg_play_time_seconds',
                    label: 'Avg run time',
                    render: u => formatDuration(u.avg_play_time_seconds),
                    secondary: true,
                  },
                  { key: 'wins', label: 'Won', secondary: true },
                  { key: 'deaths', label: 'Died', secondary: true },
                  { key: 'abandoned', label: 'Abandoned', secondary: true },
                  { key: 'avg_floor', label: 'Avg floor', render: u => num(u.avg_floor, 1), secondary: true },
                  {
                    key: 'last_seen',
                    label: 'Last active',
                    render: u => new Date(u.last_seen).toLocaleDateString(),
                    secondary: true,
                  },
                ]}
              />
            </Card>
          </div>
        )
      ) : (
        /* View Mode 2: Individual Runs List */
        isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner className="text-primary-500" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">{error.message}</p>
        ) : !data || data.rows.length === 0 ? (
          <EmptyState emoji="🗺️" title="No runs" description="Try a wider date range or different filters." />
        ) : (
          <>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {data.total} runs{isFetching ? ' · refreshing…' : ''}
            </p>
            <div className="space-y-2">
              {data.rows.map(run => (
                <Card key={run.id} onClick={() => navigate(`/runs/${run.uuid}`)} className="p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {run.character_key ? prettyKey(run.character_key) : 'Unknown character'}
                      </span>
                      {run.user_id_hash ? (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            openPlayerProfile(String(run.user_id_hash));
                          }}
                          className="rounded-md bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 font-mono text-[10px] text-gray-600 dark:text-gray-300 hover:bg-primary-500/15 hover:text-primary-600 dark:hover:text-primary-400 shrink-0"
                          title={`Open player profile for ${run.user_id_hash}`}
                        >
                          👤 {shortUserId(run.user_id_hash)}
                        </button>
                      ) : null}
                    </div>
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
            <div className="flex items-center justify-between">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                Prev
              </Button>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Page {page + 1} / {pageCount}
              </span>
              <Button variant="secondary" size="sm" disabled={page + 1 >= pageCount} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </>
        )
      )}
      <div className="h-20" />
    </div>
  );
}
