import { supabase } from './supabaseClient';
import { getDateRangeEnd, getDateRangeStart } from './supabaseService';
import type {
  AbilityStat,
  CharacterStat,
  DateRangeFilterValue,
  DeathStat,
  EconomyStat,
  PieceStat,
  PotionStat,
  RunDetail,
  RunFilterOptions,
  RunFilters,
  RunListPage,
  RunListRow,
  TreasureStat,
} from '../types/analytics';

export const RUNS_PAGE_SIZE = 50;

const RUN_LIST_COLUMNS = [
  'id',
  'uuid',
  'created_at',
  'run_uuid',
  'outcome',
  'character_key',
  'game_version',
  'final_floor',
  'floors_climbed',
  'death_floor',
  'death_enemies',
  'play_time_seconds',
  'current_gold',
  'run_won',
].join(',');

export async function fetchRunList(filters: RunFilters, page: number): Promise<RunListPage> {
  const from = page * RUNS_PAGE_SIZE;
  let query = supabase
    .from('Runs')
    .select(RUN_LIST_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + RUNS_PAGE_SIZE - 1);

  const start = getDateRangeStart(filters.range);
  const end = getDateRangeEnd(filters.range);
  if (start) query = query.gte('created_at', start);
  if (end) query = query.lte('created_at', end);
  if (filters.outcome) query = query.eq('outcome', filters.outcome);
  if (filters.character) query = query.eq('character_key', filters.character);
  if (filters.version) query = query.eq('game_version', filters.version);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as unknown as RunListRow[], total: count ?? 0 };
}

/** Looked up by the table's own `uuid` so legacy rows (no `run_uuid`) are reachable too. */
export async function fetchRunDetail(uuid: string): Promise<RunDetail | null> {
  const { data, error } = await supabase.from('Runs').select('*').eq('uuid', uuid).maybeSingle();
  if (error) throw error;
  return (data ?? null) as RunDetail | null;
}

export async function fetchRunFilterOptions(): Promise<RunFilterOptions> {
  const { data, error } = await supabase
    .from('Runs')
    .select('character_key,game_version')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  const rows = (data ?? []) as Array<{ character_key: string | null; game_version: string | null }>;
  const distinct = (values: Array<string | null>) =>
    [...new Set(values.filter((v): v is string => !!v && v.trim().length > 0))].sort();
  return {
    characters: distinct(rows.map(r => r.character_key)),
    versions: distinct(rows.map(r => r.game_version)),
  };
}

type StatsFetcher<T> = (range: DateRangeFilterValue, version?: string) => Promise<T[]>;

function statsRpc<T>(fn: string): StatsFetcher<T> {
  return async (range, version) => {
    const { data, error } = await supabase.rpc(fn, {
      p_from: getDateRangeStart(range),
      p_to: getDateRangeEnd(range),
      p_version: version || null,
    });
    if (error) throw error;
    return (data ?? []) as T[];
  };
}

export const fetchTreasureStats = statsRpc<TreasureStat>('treasure_stats');
export const fetchPieceStats = statsRpc<PieceStat>('piece_stats');
export const fetchPotionStats = statsRpc<PotionStat>('potion_stats');
export const fetchAbilityStats = statsRpc<AbilityStat>('ability_stats');
export const fetchCharacterStats = statsRpc<CharacterStat>('character_stats');
export const fetchDeathStats = statsRpc<DeathStat>('death_stats');
export const fetchEconomyStats = statsRpc<EconomyStat>('economy_stats');
