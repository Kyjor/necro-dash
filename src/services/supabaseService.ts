import { subDays, subHours } from 'date-fns';
import { supabase } from './supabaseClient';
import type {
  CrashRow,
  CrashStats,
  DateRangeFilterValue,
  FeatureGateRow,
  FeatureGateStats,
  NamedCount,
  QueryBuilderRequest,
  QueryBuilderResult,
  RetentionInputEvent,
  RetentionStats,
  RunRow,
  RunStats,
  StartupRow,
  SurveyRow,
  SurveyStats,
  TimePoint,
} from '../types/analytics';

function labelOrUnknown(label: string | null): string {
  return label && label.trim().length > 0 ? label : 'Unknown';
}

function groupByDay<T>(rows: T[], dateValue: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = dateValue(row).slice(0, 10);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(row);
    } else {
      map.set(key, [row]);
    }
  }
  return map;
}

function toNamedCounts(records: Record<string, number>): NamedCount[] {
  return Object.entries(records)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function normalizeUserHash(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function buildRetentionStatsInJs(
  startupEvents: RetentionInputEvent[],
  runEvents: RetentionInputEvent[],
): RetentionStats {
  const allEvents = [...startupEvents, ...runEvents];
  const dayUsers = new Map<string, Set<string>>();
  const firstSeen = new Map<string, string>();

  for (const event of allEvents) {
    const day = event.created_at.slice(0, 10);
    if (!dayUsers.has(day)) dayUsers.set(day, new Set<string>());
    dayUsers.get(day)?.add(event.user_id_hash);

    const existing = firstSeen.get(event.user_id_hash);
    if (!existing || day < existing) {
      firstSeen.set(event.user_id_hash, day);
    }
  }

  const days = [...dayUsers.keys()].sort();
  const dau: RetentionStats['dau'] = [];
  const wau: RetentionStats['wau'] = [];
  const cohorts: RetentionStats['cohorts'] = [];

  for (const day of days) {
    const usersToday = dayUsers.get(day) ?? new Set<string>();
    dau.push({ date: day, value: usersToday.size });

    const weekStart = subDays(new Date(`${day}T00:00:00.000Z`), 6);
    const weekUsers = new Set<string>();
    for (const candidate of days) {
      const candidateDate = new Date(`${candidate}T00:00:00.000Z`);
      if (candidateDate >= weekStart && candidateDate <= new Date(`${day}T23:59:59.999Z`)) {
        for (const userId of dayUsers.get(candidate) ?? []) {
          weekUsers.add(userId);
        }
      }
    }
    wau.push({ date: day, value: weekUsers.size });

    let newUsers = 0;
    let returningUsers = 0;
    for (const userId of usersToday) {
      if (firstSeen.get(userId) === day) newUsers += 1;
      else returningUsers += 1;
    }
    cohorts.push({ date: day, newUsers, returningUsers });
  }

  return {
    startupsByDay: [],
    dau,
    wau,
    cohorts,
  };
}

export function getDateRangeStart(range: DateRangeFilterValue): string | null {
  const now = new Date();
  if (range.key === 'all') return null;
  if (range.key === 'custom') return range.from ?? null;
  if (range.key === '24h') return subHours(now, 24).toISOString();
  if (range.key === '3d') return subDays(now, 3).toISOString();
  if (range.key === '7d') return subDays(now, 7).toISOString();
  if (range.key === '14d') return subDays(now, 14).toISOString();
  if (range.key === '30d') return subDays(now, 30).toISOString();
  if (range.key === '60d') return subDays(now, 60).toISOString();
  if (range.key === '90d') return subDays(now, 90).toISOString();
  if (range.key === '180d') return subDays(now, 180).toISOString();
  return subDays(now, 365).toISOString();
}

export function getDateRangeEnd(range: DateRangeFilterValue): string | null {
  if (range.key !== 'custom') return null;
  return range.to ?? null;
}

function applyDateRange<TQuery extends { gte: (col: string, val: string) => TQuery; lte: (col: string, val: string) => TQuery }>(
  query: TQuery,
  range: DateRangeFilterValue,
): TQuery {
  const start = getDateRangeStart(range);
  const end = getDateRangeEnd(range);
  let next = query;
  if (start) {
    next = next.gte('created_at', start);
  }
  if (end) {
    next = next.lte('created_at', end);
  }
  return next;
}

async function queryTable<T extends object>(table: string, range: DateRangeFilterValue): Promise<T[]> {
  let query = supabase.from(table).select('*').order('created_at', { ascending: true });
  query = applyDateRange(query, range);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as T[];
}

export async function fetchCrashStats(range: DateRangeFilterValue): Promise<CrashStats> {
  const rows = await queryTable<CrashRow>('Crashes', range);
  const byDayMap = groupByDay(rows, r => r.created_at);
  const byOs: Record<string, number> = {};
  const byCpu: Record<string, number> = {};
  const byGpu: Record<string, number> = {};

  for (const row of rows) {
    byOs[labelOrUnknown(row.os_name)] = (byOs[labelOrUnknown(row.os_name)] ?? 0) + 1;
    byCpu[labelOrUnknown(row.cpu_name)] = (byCpu[labelOrUnknown(row.cpu_name)] ?? 0) + 1;
    byGpu[labelOrUnknown(row.gpu_name)] = (byGpu[labelOrUnknown(row.gpu_name)] ?? 0) + 1;
  }

  const byDay: TimePoint[] = [...byDayMap.entries()].map(([date, entries]) => ({
    date,
    value: entries.length,
  }));

  const ramScatter = rows
    .filter(row => row.ram_total !== null && row.ram_used !== null)
    .map(row => ({ x: row.ram_total as number, y: row.ram_used as number }));

  return {
    crashCount: rows.length,
    byDay,
    byOs: toNamedCounts(byOs),
    byCpu: toNamedCounts(byCpu),
    byGpu: toNamedCounts(byGpu),
    ramScatter,
  };
}

export async function fetchRunStats(range: DateRangeFilterValue): Promise<RunStats> {
  const rows = await queryTable<RunRow>('Runs', range);
  const byDayMap = groupByDay(rows, r => r.created_at);

  const byDay: TimePoint[] = [...byDayMap.entries()].map(([date, entries]) => ({
    date,
    value: entries.length,
  }));

  const floorsTrend = rows
    .filter(r => r.floors_climbed !== null)
    .map(r => ({ date: r.created_at.slice(0, 10), value: r.floors_climbed as number }));

  const healthTrend = rows
    .filter(r => r.current_health !== null && r.max_health !== null)
    .map(r => ({
      date: r.created_at.slice(0, 10),
      currentHealth: r.current_health as number,
      maxHealth: r.max_health as number,
    }));

  let floorSum = 0;
  let floorCount = 0;
  let ratioSum = 0;
  let ratioCount = 0;
  const durationBuckets: Record<string, number> = {};

  for (const run of rows) {
    if (run.floors_climbed !== null) {
      floorSum += run.floors_climbed;
      floorCount += 1;
    }

    if (run.current_health !== null && run.max_health && run.max_health > 0) {
      ratioSum += run.current_health / run.max_health;
      ratioCount += 1;
    }

    if (run.start_datetime && run.end_datetime) {
      const start = new Date(run.start_datetime).getTime();
      const end = new Date(run.end_datetime).getTime();
      if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
        const minutes = (end - start) / (1000 * 60);
        const bucket = minutes < 10 ? '<10m' : minutes < 20 ? '10-20m' : minutes < 40 ? '20-40m' : '40m+';
        durationBuckets[bucket] = (durationBuckets[bucket] ?? 0) + 1;
      }
    }
  }

  return {
    totalRuns: rows.length,
    avgFloorsClimbed: floorCount > 0 ? floorSum / floorCount : 0,
    avgHealthRatio: ratioCount > 0 ? ratioSum / ratioCount : 0,
    byDay,
    floorsTrend,
    healthTrend,
    durationDistribution: toNamedCounts(durationBuckets),
  };
}

function ratingDistribution(rows: SurveyRow[], key: keyof SurveyRow): NamedCount[] {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const value = row[key];
    if (typeof value === 'number') {
      const label = `${value}`;
      counts[label] = (counts[label] ?? 0) + 1;
    }
  }
  return toNamedCounts(counts);
}

export async function fetchSurveyStats(range: DateRangeFilterValue): Promise<SurveyStats> {
  const rows = await queryTable<SurveyRow>('Surveys', range);
  const grouped = groupByDay(rows, r => r.created_at);
  const trends: SurveyStats['trends'] = [];

  for (const [date, items] of grouped.entries()) {
    const totals = { pacing: 0, variety: 0, wouldPlayAgain: 0, wouldRecommend: 0 };
    const counts = { pacing: 0, variety: 0, wouldPlayAgain: 0, wouldRecommend: 0 };
    for (const row of items) {
      if (row.pacing !== null) {
        totals.pacing += row.pacing;
        counts.pacing += 1;
      }
      if (row.variety !== null) {
        totals.variety += row.variety;
        counts.variety += 1;
      }
      if (row.would_play_again !== null) {
        totals.wouldPlayAgain += row.would_play_again;
        counts.wouldPlayAgain += 1;
      }
      if (row.would_recommend !== null) {
        totals.wouldRecommend += row.would_recommend;
        counts.wouldRecommend += 1;
      }
    }

    trends.push({
      date,
      pacing: counts.pacing > 0 ? totals.pacing / counts.pacing : 0,
      variety: counts.variety > 0 ? totals.variety / counts.variety : 0,
      wouldPlayAgain: counts.wouldPlayAgain > 0 ? totals.wouldPlayAgain / counts.wouldPlayAgain : 0,
      wouldRecommend: counts.wouldRecommend > 0 ? totals.wouldRecommend / counts.wouldRecommend : 0,
    });
  }

  return {
    ratingDistributions: {
      pacing: ratingDistribution(rows, 'pacing'),
      variety: ratingDistribution(rows, 'variety'),
      wouldPlayAgain: ratingDistribution(rows, 'would_play_again'),
      wouldRecommend: ratingDistribution(rows, 'would_recommend'),
    },
    trends,
    comments: rows
      .filter(r => (r.comments ?? '').trim().length > 0)
      .map(r => ({ id: r.id, created_at: r.created_at, comments: r.comments as string })),
  };
}

export async function fetchFeatureGateStats(range: DateRangeFilterValue): Promise<FeatureGateStats> {
  const rows = await queryTable<FeatureGateRow>('FeatureGates', range);
  const toggles = [
    { key: 'master_toggle', name: 'Master' },
    { key: 'staging_toggle', name: 'Staging' },
    { key: 'alpha_toggle', name: 'Alpha' },
  ] as const;

  const toggleOverview = toggles.map(toggle => {
    let enabled = 0;
    let disabled = 0;
    for (const row of rows) {
      if (row[toggle.key]) enabled += 1;
      else disabled += 1;
    }
    return { name: toggle.name, enabled, disabled };
  });

  const sampleCounts: Record<string, number> = {};
  for (const row of rows) {
    const key = row.sample === null ? 'Unknown' : `${row.sample}`;
    sampleCounts[key] = (sampleCounts[key] ?? 0) + 1;
  }

  return {
    toggleOverview,
    sampleDistribution: toNamedCounts(sampleCounts),
  };
}

export async function fetchRetentionStats(range: DateRangeFilterValue): Promise<RetentionStats> {
  const [startupRows, runRows] = await Promise.all([
    queryTable<StartupRow>('Startups', range),
    queryTable<RunRow>('Runs', range),
  ]);

  const startupEvents: RetentionInputEvent[] = startupRows
    .map(r => ({ created_at: r.created_at, user_id_hash: normalizeUserHash(r.user_id_hash) }))
    .filter((event): event is RetentionInputEvent => event.user_id_hash !== null);

  const runEvents: RetentionInputEvent[] = runRows
    .map(r => ({ created_at: r.created_at, user_id_hash: normalizeUserHash(r.user_id_hash) }))
    .filter((event): event is RetentionInputEvent => event.user_id_hash !== null);

  const startupByDayMap = groupByDay(startupRows, row => row.created_at);
  const startupsByDay: TimePoint[] = [...startupByDayMap.entries()].map(([date, rows]) => ({
    date,
    value: rows.length,
  }));

  // Works both in Tauri runtime and plain browser dev mode.
  let retention: RetentionStats = buildRetentionStatsInJs(startupEvents, runEvents);
  try {
    const tauriApi = await import('@tauri-apps/api/core');
    if (typeof tauriApi.invoke === 'function') {
      retention = await tauriApi.invoke<RetentionStats>('build_retention_stats', {
        startupEvents,
        runEvents,
      });
    }
  } catch {
    // Keep JS fallback when Tauri bridge is unavailable.
  }

  return {
    ...retention,
    startupsByDay,
  };
}

export async function runCustomQuery(request: QueryBuilderRequest): Promise<QueryBuilderResult> {
  const selectedColumns = request.columns.length > 0 ? request.columns.join(',') : '*';
  let query = supabase.from(request.table).select(selectedColumns);
  query = applyDateRange(query, request.dateRange);

  if (request.whereColumn && request.whereOperator && request.whereValue && request.whereValue.trim().length > 0) {
    const value = request.whereValue.trim();
    if (request.whereOperator === 'eq') query = query.eq(request.whereColumn, value);
    if (request.whereOperator === 'neq') query = query.neq(request.whereColumn, value);
    if (request.whereOperator === 'gt') query = query.gt(request.whereColumn, value);
    if (request.whereOperator === 'gte') query = query.gte(request.whereColumn, value);
    if (request.whereOperator === 'lt') query = query.lt(request.whereColumn, value);
    if (request.whereOperator === 'lte') query = query.lte(request.whereColumn, value);
    if (request.whereOperator === 'like') query = query.ilike(request.whereColumn, `%${value}%`);
  }

  const limit = Math.min(Math.max(request.limit ?? 100, 1), 500);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  const rows = (data ?? []) as unknown as Record<string, unknown>[];

  if (request.aggregate && request.aggregate !== 'none') {
    const grouped = new Map<string, number[]>();
    const groupByKey = request.groupBy?.trim() || 'all';
    const metricKey = request.aggregateColumn?.trim() || 'id';

    for (const row of rows) {
      const groupValue = String(row[groupByKey] ?? 'Unknown');
      const metricRaw = row[metricKey];
      const metric = Number(metricRaw);
      const bucket = grouped.get(groupValue) ?? [];
      if (request.aggregate === 'count') {
        bucket.push(1);
      } else if (Number.isFinite(metric)) {
        bucket.push(metric);
      }
      grouped.set(groupValue, bucket);
    }

    const aggregatedRows = [...grouped.entries()].map(([group, values]) => {
      if (request.aggregate === 'count') {
        return { group, value: values.length };
      }
      const sum = values.reduce((acc, value) => acc + value, 0);
      if (request.aggregate === 'sum') return { group, value: sum };
      return { group, value: values.length > 0 ? sum / values.length : 0 };
    });

    return {
      columns: ['group', 'value'],
      rows: aggregatedRows,
    };
  }

  const columns = rows.length > 0 ? Object.keys(rows[0]) : request.columns;
  return { columns, rows };
}
