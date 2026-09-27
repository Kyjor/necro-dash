export type DateRangeKey = '24h' | '3d' | '7d' | '14d' | '30d' | '60d' | '90d' | '180d' | '365d' | 'all' | 'custom';

export interface DateRangeFilterValue {
  key: DateRangeKey;
  from?: string;
  to?: string;
}

export interface CrashRow {
  id: number;
  created_at: string;
  error_message: string | null;
  os_name: string | null;
  cpu_name: string | null;
  gpu_name: string | null;
  ram_total: number | null;
  ram_used: number | null;
  user_id_hash: string | number | null;
}

export interface FeatureGateRow {
  fg_id: string;
  id: number;
  created_at: string;
  master_toggle: boolean | null;
  staging_toggle: boolean | null;
  alpha_toggle: boolean | null;
  sample: number | null;
}

export interface RunRow {
  id: number;
  created_at: string;
  floors_climbed: number | null;
  max_health: number | null;
  current_health: number | null;
  user_id_hash: string | number | null;
  uuid: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
  feature_gates: string | null;
}

export interface SurveyRow {
  id: number;
  created_at: string;
  pacing: number | null;
  variety: number | null;
  would_play_again: number | null;
  would_recommend: number | null;
  comments: string | null;
}

export interface StartupRow {
  id: number;
  created_at: string;
  user_id_hash: string | number | null;
}

export interface TimePoint {
  date: string;
  value: number;
}

export interface NamedCount {
  name: string;
  value: number;
}

export interface CrashStats {
  crashCount: number;
  byDay: TimePoint[];
  byOs: NamedCount[];
  byCpu: NamedCount[];
  byGpu: NamedCount[];
  ramScatter: Array<{ x: number; y: number }>;
}

export interface RunStats {
  totalRuns: number;
  avgFloorsClimbed: number;
  avgHealthRatio: number;
  byDay: TimePoint[];
  floorsTrend: TimePoint[];
  healthTrend: Array<{ date: string; currentHealth: number; maxHealth: number }>;
  durationDistribution: NamedCount[];
}

export interface SurveyStats {
  ratingDistributions: {
    pacing: NamedCount[];
    variety: NamedCount[];
    wouldPlayAgain: NamedCount[];
    wouldRecommend: NamedCount[];
  };
  trends: Array<{
    date: string;
    pacing: number;
    variety: number;
    wouldPlayAgain: number;
    wouldRecommend: number;
  }>;
  comments: Array<{ id: number; created_at: string; comments: string }>;
}

export interface FeatureGateStats {
  toggleOverview: Array<{ name: string; enabled: number; disabled: number }>;
  sampleDistribution: NamedCount[];
}

export interface RetentionInputEvent {
  created_at: string;
  user_id_hash: string;
}

export interface RetentionStats {
  startupsByDay: TimePoint[];
  dau: TimePoint[];
  wau: TimePoint[];
  cohorts: Array<{ date: string; newUsers: number; returningUsers: number }>;
}

export type QueryableAnalyticsTable =
  | 'Crashes'
  | 'FeatureGates'
  | 'Runs'
  | 'Surveys'
  | 'Startups'
  | 'run_treasures'
  | 'run_pieces'
  | 'run_potions'
  | 'run_battles'
  | 'run_events';
export type QueryAggregate = 'none' | 'count' | 'sum' | 'avg';
export type QueryOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like';

export interface QueryBuilderRequest {
  table: QueryableAnalyticsTable;
  columns: string[];
  dateRange: DateRangeFilterValue;
  whereColumn?: string;
  whereOperator?: QueryOperator;
  whereValue?: string;
  groupBy?: string;
  aggregate?: QueryAggregate;
  aggregateColumn?: string;
  limit?: number;
}

export interface QueryBuilderResult {
  columns: string[];
  rows: Record<string, unknown>[];
}

// ---------------------------------------------------------------- run analytics (RunRecorder payload)

export type RunOutcome = 'won' | 'died' | 'abandoned';

export interface RunFilters {
  range: DateRangeFilterValue;
  outcome?: RunOutcome;
  character?: string;
  version?: string;
}

/** Scalar columns of a Runs row. `run_uuid` is null for rows recorded before the run recorder existed. */
export interface RunListRow {
  id: number;
  uuid: string;
  created_at: string;
  run_uuid: string | null;
  outcome: RunOutcome | null;
  character_key: string | null;
  game_version: string | null;
  final_floor: number | null;
  floors_climbed: number | null;
  death_floor: number | null;
  death_enemies: string | null;
  play_time_seconds: number | null;
  current_gold: number | null;
  run_won: boolean | null;
}

export interface LoadoutTreasure {
  key: string;
  source: string;
  floor: number | null;
  node: number | null;
  triggers: number;
}

export interface LoadoutPiece {
  key: string;
  weight: number;
}

export interface RunLoadout {
  character: string;
  stats: Record<string, number>;
  treasures: LoadoutTreasure[];
  pieces: LoadoutPiece[];
  potions: string[];
  floor: number;
  node: number;
  room: number;
  elapsed: number;
}

export interface RunTimelineEvent {
  type: string;
  t: number;
  floor: number;
  node: number;
  [field: string]: unknown;
}

export interface RunBattle {
  index: number;
  floor: number;
  node: number;
  room?: number;
  t_start: number;
  category: string;
  name: string;
  enemies: string[];
  result: string;
  hp_start: number;
  hp_end?: number;
  max_hp_start: number;
  max_hp_end?: number;
  shield_start: number;
  gold_start: number;
  turns: number;
  damage_dealt: number;
  damage_taken: number;
  max_hit: number;
  max_combo: number;
  swaps: number;
  queue_placements: number;
  rerolls: number;
  kills: number;
  death_prevented: number;
  duration?: number;
  matches: Record<string, { times: number; count: number }>;
  abilities: Record<string, number>;
  potions: Record<string, number>;
}

export interface RunItemStats {
  treasures: Record<string, { source?: string; floor?: number; node?: number; t?: number; triggers?: number }>;
  potions: Record<string, { gained?: number; used?: number; sold?: number; discarded?: number }>;
  abilities: Record<string, { used?: number }>;
  pieces: Record<string, { matched?: number; count_total?: number }>;
  totals: Record<string, number>;
  dropped_events: number;
  started_at: string;
}

export interface RunDetail extends RunListRow {
  seed: number | null;
  max_health: number | null;
  current_health: number | null;
  relics_used: string | null;
  potions_used: number | null;
  rerolls_used: number | null;
  switches_used: number | null;
  drags_used: number | null;
  gold_spent: number | null;
  enemies_killed: number | null;
  turns_taken: number | null;
  longest_combo: number | null;
  total_damage_dealt: number | null;
  health_lost: number | null;
  health_gained: number | null;
  loadout: RunLoadout | null;
  timeline: RunTimelineEvent[] | null;
  battles: RunBattle[] | null;
  item_stats: RunItemStats | null;
}

export interface RunListPage {
  rows: RunListRow[];
  total: number;
}

export interface RunFilterOptions {
  characters: string[];
  versions: string[];
}

/** Filters shared by the stats RPCs. */
export interface StatsScope {
  range: DateRangeFilterValue;
  version?: string;
}

// Rows returned by the stats RPCs (see supabase/migrations/*_run_analytics.sql). Rates are 0..1.

export interface TreasureStat {
  treasure_key: string;
  runs: number;
  wins: number;
  finished: number;
  win_rate: number | null;
  avg_final_floor: number | null;
  avg_acquired_floor: number | null;
  avg_triggers: number | null;
  offered: number;
  chosen: number;
  bought: number;
  pick_rate: number | null;
  sources: Record<string, number>;
}

export interface PieceStat {
  piece_key: string;
  runs: number;
  wins: number;
  finished: number;
  win_rate: number | null;
  avg_copies: number | null;
  avg_weight: number | null;
  times_matched: number;
  pieces_matched: number;
  offered: number;
  chosen: number;
  bought: number;
  pick_rate: number | null;
}

export interface PotionStat {
  potion_key: string;
  runs: number;
  gained: number;
  used: number;
  sold: number;
  discarded: number;
  use_rate: number | null;
  runs_used: number;
  win_rate_when_used: number | null;
  offered: number;
  chosen: number;
  bought: number;
}

export interface AbilityStat {
  ability_key: string;
  runs_held: number;
  runs_used: number;
  usage_rate: number | null;
  total_uses: number;
  avg_uses_per_run: number | null;
  win_rate_when_used: number | null;
}

export interface CharacterStat {
  character_key: string;
  runs: number;
  wins: number;
  deaths: number;
  abandoned: number;
  win_rate: number | null;
  avg_final_floor: number | null;
  avg_play_time_seconds: number | null;
  avg_battles: number | null;
  avg_treasures: number | null;
}

export interface DeathStat {
  death_floor: number | null;
  death_enemies: string;
  deaths: number;
  avg_turns: number | null;
  avg_damage_taken: number | null;
  avg_hp_start: number | null;
  avg_max_hp: number | null;
}

export interface EconomyStat {
  category: string;
  item_kind: string;
  events: number;
  runs: number;
  total_value: number;
  avg_value: number;
}
