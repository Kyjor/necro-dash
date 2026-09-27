import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DateRangeFilter } from '../components/charts/DateRangeFilter';
import { OutcomeBadge } from '../components/runs/OutcomeBadge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Select } from '../components/ui/Select';
import { Spinner } from '../components/ui/Spinner';
import { useDashboardDateRange } from '../hooks/useDashboardDateRange';
import { useRunFilterOptions, useRunList } from '../hooks/useRunAnalytics';
import { RUNS_PAGE_SIZE } from '../services/runAnalyticsService';
import type { RunOutcome } from '../types/analytics';
import { formatDuration, prettyKey } from '../utils/runFormat';

const OUTCOME_OPTIONS = [
  { value: '', label: 'All outcomes' },
  { value: 'won', label: 'Won' },
  { value: 'died', label: 'Died' },
  { value: 'abandoned', label: 'Abandoned' },
];

export function RunsScreen() {
  const navigate = useNavigate();
  const { range, setRange, from, to, setFrom, setTo, rangeValue, options } = useDashboardDateRange('30d');
  const [outcome, setOutcome] = useState<RunOutcome | ''>('');
  const [character, setCharacter] = useState('');
  const [version, setVersion] = useState('');
  const [page, setPage] = useState(0);

  const filterOptions = useRunFilterOptions();
  const { data, isLoading, isFetching, error } = useRunList(
    { range: rangeValue, outcome: outcome || undefined, character: character || undefined, version: version || undefined },
    page,
  );
  const pageCount = data ? Math.max(1, Math.ceil(data.total / RUNS_PAGE_SIZE)) : 1;

  // Any filter change restarts pagination.
  const withReset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(0);
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 pb-safe-bottom">
      <header className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Runs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Every finished and abandoned run. Tap one for its full record.</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Select
            label="Outcome"
            value={outcome}
            onChange={e => withReset(setOutcome)(e.target.value as RunOutcome | '')}
            options={OUTCOME_OPTIONS}
          />
          <Select
            label="Character"
            value={character}
            onChange={e => withReset(setCharacter)(e.target.value)}
            options={[
              { value: '', label: 'All characters' },
              ...(filterOptions.data?.characters ?? []).map(c => ({ value: c, label: prettyKey(c) })),
            ]}
          />
          <Select
            label="Version"
            value={version}
            onChange={e => withReset(setVersion)(e.target.value)}
            options={[
              { value: '', label: 'All versions' },
              ...(filterOptions.data?.versions ?? []).map(v => ({ value: v, label: v })),
            ]}
          />
        </div>
      </header>

      {isLoading ? (
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
              <Card key={run.id} onClick={() => navigate(`/runs/${run.uuid}`)}>
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
      )}
      <div className="h-20" />
    </div>
  );
}
