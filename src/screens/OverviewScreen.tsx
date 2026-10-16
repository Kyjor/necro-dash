import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DateRangeFilter } from '../components/charts/DateRangeFilter';
import { KpiCard } from '../components/charts/KpiCard';
import { OutcomeBadge } from '../components/runs/OutcomeBadge';
import { Card, SectionHeader } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { useCrashStats } from '../hooks/useCrashStats';
import { useDashboardDateRange } from '../hooks/useDashboardDateRange';
import { useRetentionStats } from '../hooks/useRetentionStats';
import { useCharacterStats, useDeathStats, useRunList, useTreasureStats } from '../hooks/useRunAnalytics';
import { useSurveyStats } from '../hooks/useSurveyStats';
import { formatDuration, num, pct, prettyKey, shortUserId } from '../utils/runFormat';

function InsightRow({
  label,
  title,
  detail,
  tone = 'neutral',
}: {
  label: string;
  title: string;
  detail?: string;
  tone?: 'neutral' | 'good' | 'warn' | 'danger';
}) {
  const dotColor =
    tone === 'good'
      ? 'bg-emerald-500'
      : tone === 'warn'
        ? 'bg-amber-500'
        : tone === 'danger'
          ? 'bg-red-500'
          : 'bg-primary-500';

  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-b-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</span>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
        {detail ? <p className="text-[11px] text-gray-500 dark:text-gray-400">{detail}</p> : null}
      </div>
    </div>
  );
}

export function OverviewScreen() {
  const navigate = useNavigate();
  const { range, setRange, from, to, setFrom, setTo, rangeValue, options } = useDashboardDateRange('30d');

  const characters = useCharacterStats(rangeValue);
  const treasures = useTreasureStats(rangeValue);
  const deaths = useDeathStats(rangeValue);
  const crashes = useCrashStats(rangeValue);
  const retention = useRetentionStats(rangeValue);
  const surveys = useSurveyStats(rangeValue);
  const recentRuns = useRunList({ range: rangeValue }, 0);

  const pulse = useMemo(() => {
    const charRows = characters.data ?? [];
    const totalRuns = charRows.reduce((s, c) => s + c.runs, 0);
    const wins = charRows.reduce((s, c) => s + c.wins, 0);
    const totalDeaths = charRows.reduce((s, c) => s + c.deaths, 0);
    const finished = wins + totalDeaths;
    const winRate = finished > 0 ? wins / finished : null;

    const dauPoints = retention.data?.dau ?? [];
    const latestDau = dauPoints.length > 0 ? dauPoints[dauPoints.length - 1].value : 0;
    const peakDau = dauPoints.reduce((m, p) => Math.max(m, p.value), 0);
    const wauPoints = retention.data?.wau ?? [];
    const latestWau = wauPoints.length > 0 ? wauPoints[wauPoints.length - 1].value : 0;

    return {
      totalRuns: totalRuns || (recentRuns.data?.total ?? 0),
      wins,
      totalDeaths,
      winRate,
      latestDau,
      peakDau,
      latestWau,
    };
  }, [characters.data, recentRuns.data?.total, retention.data]);

  const balanceInsights = useMemo(() => {
    const charRows = characters.data ?? [];
    const mostPlayedChar = [...charRows].sort((a, b) => b.runs - a.runs)[0];
    const bestWinChar = [...charRows]
      .filter(c => c.wins + c.deaths >= 2 && c.win_rate !== null)
      .sort((a, b) => (b.win_rate ?? 0) - (a.win_rate ?? 0))[0] ?? mostPlayedChar;

    const treasureRows = treasures.data ?? [];
    const minSampleTreasures = treasureRows.filter(t => t.finished >= 2 && t.win_rate !== null);
    const topTreasure = (minSampleTreasures.length > 0 ? minSampleTreasures : treasureRows).sort(
      (a, b) => (b.win_rate ?? 0) - (a.win_rate ?? 0),
    )[0];

    const topKiller = (deaths.data ?? [])[0];

    return { mostPlayedChar, bestWinChar, topTreasure, topKiller };
  }, [characters.data, treasures.data, deaths.data]);

  const sentimentSummary = useMemo(() => {
    const trends = surveys.data?.trends ?? [];
    if (trends.length === 0) return null;
    const avg = (key: 'pacing' | 'variety' | 'wouldPlayAgain' | 'wouldRecommend') => {
      const valid = trends.map(t => t[key]).filter(v => v > 0);
      return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
    };
    return {
      pacing: avg('pacing'),
      variety: avg('variety'),
      playAgain: avg('wouldPlayAgain'),
      recommend: avg('wouldRecommend'),
      latestComment: (surveys.data?.comments ?? [])[0] ?? null,
    };
  }, [surveys.data]);

  const crashCount = crashes.data?.crashCount ?? 0;
  const topCrashOs = crashes.data?.byOs?.[0];
  const recentFive = (recentRuns.data?.rows ?? []).slice(0, 5);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-5 pb-safe-bottom">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Overview</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            At-a-glance game health, balance outliers, and recent player activity.
          </p>
        </div>
        <DateRangeFilter
          value={range}
          onChange={setRange}
          options={options}
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
        />
      </header>

      {/* Top Pulse KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Recorded Runs"
          value={characters.isLoading ? '--' : `${pulse.totalRuns}`}
          helper={`${pulse.wins} won · ${pulse.totalDeaths} died`}
          onClick={() => navigate('/runs')}
        />
        <KpiCard
          label="Overall Win Rate"
          value={characters.isLoading ? '--' : pct(pulse.winRate)}
          helper="won / finished runs"
          tone={
            pulse.winRate === null
              ? 'neutral'
              : pulse.winRate >= 0.25 && pulse.winRate <= 0.65
                ? 'good'
                : 'warn'
          }
          onClick={() => navigate('/balance')}
        />
        <KpiCard
          label="Crashes"
          value={crashes.isLoading ? '--' : `${crashCount}`}
          helper={crashCount === 0 ? 'No crashes in period' : `Top OS: ${topCrashOs?.name ?? 'Unknown'}`}
          tone={crashes.isLoading ? 'neutral' : crashCount === 0 ? 'good' : 'danger'}
          onClick={() => navigate('/stats')}
        />
        <KpiCard
          label="Active Players (WAU)"
          value={retention.isLoading ? '--' : `${pulse.latestWau}`}
          helper={`Latest DAU: ${pulse.latestDau} · Peak: ${pulse.peakDau}`}
          onClick={() => navigate('/stats')}
        />
      </div>

      {/* Two-column Takeaways: Balance & Meta + Stability & Sentiment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="space-y-2">
          <SectionHeader
            title="Balance & Meta Outliers"
            action={
              <button
                type="button"
                onClick={() => navigate('/balance')}
                className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
              >
                Explore Balance →
              </button>
            }
          />
          {characters.isLoading || treasures.isLoading || deaths.isLoading ? (
            <div className="py-8 flex justify-center">
              <Spinner size="sm" className="text-primary-500" />
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
              <InsightRow
                label="Best Character Win %"
                title={
                  balanceInsights.bestWinChar
                    ? `${prettyKey(balanceInsights.bestWinChar.character_key)} (${pct(balanceInsights.bestWinChar.win_rate)})`
                    : '—'
                }
                detail={
                  balanceInsights.bestWinChar
                    ? `${balanceInsights.bestWinChar.runs} runs · avg floor ${num(balanceInsights.bestWinChar.avg_final_floor, 1)}`
                    : undefined
                }
                tone="good"
              />
              <InsightRow
                label="Most Played Character"
                title={
                  balanceInsights.mostPlayedChar
                    ? `${prettyKey(balanceInsights.mostPlayedChar.character_key)} (${balanceInsights.mostPlayedChar.runs} runs)`
                    : '—'
                }
                detail={
                  balanceInsights.mostPlayedChar
                    ? `Win rate ${pct(balanceInsights.mostPlayedChar.win_rate)}`
                    : undefined
                }
              />
              <InsightRow
                label="Top Winning Treasure"
                title={
                  balanceInsights.topTreasure
                    ? `${prettyKey(balanceInsights.topTreasure.treasure_key)} (${pct(balanceInsights.topTreasure.win_rate)})`
                    : '—'
                }
                detail={
                  balanceInsights.topTreasure
                    ? `Picked ${pct(balanceInsights.topTreasure.pick_rate)} · ${balanceInsights.topTreasure.runs} runs`
                    : undefined
                }
                tone="good"
              />
              <InsightRow
                label="#1 Run Killer"
                title={
                  balanceInsights.topKiller
                    ? balanceInsights.topKiller.death_enemies.split(',').map(prettyKey).join(', ')
                    : 'No deaths recorded'
                }
                detail={
                  balanceInsights.topKiller
                    ? `Floor ${balanceInsights.topKiller.death_floor ?? '?'} · ${balanceInsights.topKiller.deaths} deaths`
                    : undefined
                }
                tone={balanceInsights.topKiller ? 'danger' : 'neutral'}
              />
            </div>
          )}
        </Card>

        <Card className="space-y-2">
          <SectionHeader
            title="Stability & Player Sentiment"
            action={
              <button
                type="button"
                onClick={() => navigate('/stats')}
                className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
              >
                Health & Ops →
              </button>
            }
          />
          {crashes.isLoading || surveys.isLoading ? (
            <div className="py-8 flex justify-center">
              <Spinner size="sm" className="text-primary-500" />
            </div>
          ) : (
            <div className="space-y-2">
              <InsightRow
                label="Crash Status"
                title={crashCount === 0 ? '100% Crash-Free' : `${crashCount} crashes logged`}
                detail={topCrashOs ? `${topCrashOs.name} (${topCrashOs.value})` : undefined}
                tone={crashCount === 0 ? 'good' : 'danger'}
              />
              <InsightRow
                label="Pacing / Variety"
                title={
                  sentimentSummary
                    ? `${num(sentimentSummary.pacing, 1)} / ${num(sentimentSummary.variety, 1)} avg score`
                    : 'No surveys in range'
                }
                detail="Player survey ratings"
              />
              <InsightRow
                label="Play Again / Recommend"
                title={
                  sentimentSummary
                    ? `${num(sentimentSummary.playAgain, 1)} / ${num(sentimentSummary.recommend, 1)} avg score`
                    : '—'
                }
                tone={
                  sentimentSummary?.recommend && sentimentSummary.recommend >= 3.5 ? 'good' : 'neutral'
                }
              />
              {sentimentSummary?.latestComment ? (
                <div className="mt-2 rounded-xl bg-gray-50 dark:bg-gray-900/50 p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Latest Feedback · {new Date(sentimentSummary.latestComment.created_at).toLocaleDateString()}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                    "{sentimentSummary.latestComment.comments}"
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Runs Feed */}
      <Card className="space-y-3">
        <SectionHeader
          title="Recent Runs"
          action={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/runs?view=players')}
                className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Group by Player
              </button>
              <button
                type="button"
                onClick={() => navigate('/runs')}
                className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
              >
                All Runs ({recentRuns.data?.total ?? 0}) →
              </button>
            </div>
          }
        />

        {recentRuns.isLoading ? (
          <div className="py-6 flex justify-center">
            <Spinner size="sm" className="text-primary-500" />
          </div>
        ) : recentFive.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 py-4 text-center">
            No runs recorded in this date range.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {recentFive.map(run => (
              <div
                key={run.id}
                onClick={() => navigate(`/runs/${run.uuid}`)}
                className="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-gray-50/70 dark:hover:bg-gray-700/30 rounded-lg px-2 -mx-2 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {run.character_key ? prettyKey(run.character_key) : 'Unknown character'}
                    </span>
                    {run.user_id_hash ? (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          navigate(`/players/${encodeURIComponent(String(run.user_id_hash))}`);
                        }}
                        className="rounded-md bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 font-mono text-[10px] text-gray-600 dark:text-gray-300 hover:bg-primary-500/15 hover:text-primary-600 dark:hover:text-primary-400"
                        title={`Open player profile for ${run.user_id_hash}`}
                      >
                        👤 {shortUserId(run.user_id_hash)}
                      </button>
                    ) : null}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Floor {run.final_floor ?? run.floors_climbed ?? '—'} · {formatDuration(run.play_time_seconds)}
                    {run.outcome === 'died' && run.death_enemies
                      ? ` · Killed by ${run.death_enemies.split(',').map(prettyKey).join(', ')}`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <OutcomeBadge run={run} />
                  <span className="text-gray-300 dark:text-gray-600">›</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="h-20" />
    </div>
  );
}
