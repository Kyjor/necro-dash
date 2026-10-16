import { supabase } from './supabaseClient';
import { getDateRangeEnd, getDateRangeStart } from './supabaseService';
import type {
  AbilityStat,
  CharacterStat,
  CrashRow,
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
  RunOutcome,
  TreasureStat,
  UserCharacterBreakdown,
  UserItemPreference,
  UserNemesisStat,
  UserPlaystyleMetrics,
  UserProfileData,
  UserRunSummary,
} from '../types/analytics';

export const RUNS_PAGE_SIZE = 50;

const RUN_LIST_COLUMNS = [
  'id',
  'uuid',
  'created_at',
  'user_id_hash',
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

function resolveOutcome(row: Pick<RunListRow, 'outcome' | 'run_won'>): RunOutcome | null {
  if (row.outcome) return row.outcome;
  if (row.run_won === true) return 'won';
  if (row.run_won === false) return 'died';
  return null;
}

function resolvePlayTimeSeconds(row: RunListRow & { start_datetime?: string | null; end_datetime?: string | null }): number | null {
  if (row.play_time_seconds !== null && row.play_time_seconds !== undefined && Number.isFinite(row.play_time_seconds)) {
    return row.play_time_seconds;
  }
  if (row.start_datetime && row.end_datetime) {
    const start = new Date(row.start_datetime).getTime();
    const end = new Date(row.end_datetime).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      return Math.round((end - start) / 1000);
    }
  }
  return null;
}

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
  if (filters.userId) query = query.eq('user_id_hash', filters.userId);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as unknown as RunListRow[], total: count ?? 0 };
}

/** Aggregates runs by user_id_hash within the selected filter scope, sorted by total runtime descending. */
export async function fetchUserRunSummaries(filters: Omit<RunFilters, 'userId'>): Promise<UserRunSummary[]> {
  let query = supabase
    .from('Runs')
    .select(`${RUN_LIST_COLUMNS},start_datetime,end_datetime`)
    .order('created_at', { ascending: false })
    .limit(3000);

  const start = getDateRangeStart(filters.range);
  const end = getDateRangeEnd(filters.range);
  if (start) query = query.gte('created_at', start);
  if (end) query = query.lte('created_at', end);
  if (filters.outcome) query = query.eq('outcome', filters.outcome);
  if (filters.character) query = query.eq('character_key', filters.character);
  if (filters.version) query = query.eq('game_version', filters.version);

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as unknown as Array<RunListRow & { start_datetime?: string | null; end_datetime?: string | null }>;

  const byUser = new Map<
    string,
    {
      runs: number;
      wins: number;
      deaths: number;
      abandoned: number;
      bestFloor: number | null;
      floorSum: number;
      floorCount: number;
      playTimeSum: number;
      playTimeCount: number;
      characters: Map<string, number>;
      firstSeen: string;
      lastSeen: string;
      days: Set<string>;
    }
  >();

  for (const row of rows) {
    const rawUser = row.user_id_hash !== null && row.user_id_hash !== undefined ? String(row.user_id_hash).trim() : '';
    const userId = rawUser || 'anonymous';
    let entry = byUser.get(userId);
    if (!entry) {
      entry = {
        runs: 0,
        wins: 0,
        deaths: 0,
        abandoned: 0,
        bestFloor: null,
        floorSum: 0,
        floorCount: 0,
        playTimeSum: 0,
        playTimeCount: 0,
        characters: new Map(),
        firstSeen: row.created_at,
        lastSeen: row.created_at,
        days: new Set(),
      };
      byUser.set(userId, entry);
    }

    entry.runs += 1;
    entry.days.add(row.created_at.slice(0, 10));

    const outcome = resolveOutcome(row);
    if (outcome === 'won') entry.wins += 1;
    else if (outcome === 'died') entry.deaths += 1;
    else if (outcome === 'abandoned') entry.abandoned += 1;

    const floor = row.final_floor ?? row.floors_climbed;
    if (floor !== null && floor !== undefined) {
      entry.floorSum += floor;
      entry.floorCount += 1;
      if (entry.bestFloor === null || floor > entry.bestFloor) {
        entry.bestFloor = floor;
      }
    }

    const duration = resolvePlayTimeSeconds(row);
    if (duration !== null) {
      entry.playTimeSum += duration;
      entry.playTimeCount += 1;
    }

    if (row.character_key) {
      entry.characters.set(row.character_key, (entry.characters.get(row.character_key) ?? 0) + 1);
    }

    if (row.created_at < entry.firstSeen) entry.firstSeen = row.created_at;
    if (row.created_at > entry.lastSeen) entry.lastSeen = row.created_at;
  }

  return [...byUser.entries()]
    .map(([user_id, s]) => {
      const finished = s.wins + s.deaths;
      let favorite_character: string | null = null;
      let maxCharCount = 0;
      for (const [charKey, count] of s.characters.entries()) {
        if (count > maxCharCount) {
          maxCharCount = count;
          favorite_character = charKey;
        }
      }

      return {
        user_id,
        runs: s.runs,
        wins: s.wins,
        deaths: s.deaths,
        abandoned: s.abandoned,
        win_rate: finished > 0 ? s.wins / finished : null,
        best_floor: s.bestFloor,
        avg_floor: s.floorCount > 0 ? s.floorSum / s.floorCount : null,
        total_play_time_seconds: s.playTimeSum,
        avg_play_time_seconds: s.playTimeCount > 0 ? s.playTimeSum / s.playTimeCount : null,
        favorite_character,
        first_seen: s.firstSeen,
        last_seen: s.lastSeen,
        active_days: s.days.size,
      };
    })
    .sort((a, b) => b.total_play_time_seconds - a.total_play_time_seconds || b.runs - a.runs);
}

/** Fetches a comprehensive lifetime profile for a single player (user_id_hash). */
export async function fetchUserProfile(userId: string): Promise<UserProfileData | null> {
  const [runsRes, startupsRes, crashesRes] = await Promise.all([
    supabase
      .from('Runs')
      .select(
        [
          RUN_LIST_COLUMNS,
          'start_datetime',
          'end_datetime',
          'max_health',
          'current_health',
          'potions_used',
          'rerolls_used',
          'switches_used',
          'drags_used',
          'gold_spent',
          'enemies_killed',
          'turns_taken',
          'longest_combo',
          'total_damage_dealt',
          'health_lost',
          'health_gained',
          'loadout',
          'battles',
          'item_stats',
        ].join(','),
      )
      .eq('user_id_hash', userId)
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('Startups')
      .select('id,created_at', { count: 'exact' })
      .eq('user_id_hash', userId),
    supabase
      .from('Crashes')
      .select('id,created_at,os_name,cpu_name,gpu_name')
      .eq('user_id_hash', userId)
      .order('created_at', { ascending: false }),
  ]);

  if (runsRes.error) throw runsRes.error;

  const fullRuns = (runsRes.data ?? []) as unknown as Array<
    RunDetail & { start_datetime?: string | null; end_datetime?: string | null }
  >;
  const crashRows = (crashesRes.data ?? []) as unknown as CrashRow[];
  const startupCount = startupsRes.count ?? (startupsRes.data?.length ?? 0);

  if (fullRuns.length === 0 && startupCount === 0 && crashRows.length === 0) {
    return null;
  }

  let wins = 0;
  let deaths = 0;
  let abandoned = 0;
  let bestFloor: number | null = null;
  let floorSum = 0;
  let floorCount = 0;
  let playTimeSum = 0;
  let playTimeCount = 0;
  const activeDays = new Set<string>();
  let firstSeen = fullRuns[fullRuns.length - 1]?.created_at ?? new Date().toISOString();
  let lastSeen = fullRuns[0]?.created_at ?? firstSeen;

  const charMap = new Map<
    string,
    {
      runs: number;
      wins: number;
      deaths: number;
      abandoned: number;
      bestFloor: number | null;
      floorSum: number;
      floorCount: number;
      playTimeSum: number;
    }
  >();

  const treasureMap = new Map<string, { runs: number; wins: number; finished: number; uses: number }>();
  const pieceMap = new Map<string, { runs: number; wins: number; finished: number; uses: number }>();
  const potionMap = new Map<string, { runs: number; wins: number; finished: number; uses: number }>();
  const abilityMap = new Map<string, { runs: number; wins: number; finished: number; uses: number }>();
  const nemesisMap = new Map<string, { deaths: number; floorSum: number; floorCount: number }>();

  let turnsSum = 0;
  let turnsCount = 0;
  let killsSum = 0;
  let killsCount = 0;
  let dmgSum = 0;
  let dmgCount = 0;
  let hpLostSum = 0;
  let hpLostCount = 0;
  let hpGainedSum = 0;
  let hpGainedCount = 0;
  let goldSpentSum = 0;
  let goldSpentCount = 0;
  let rerollsSum = 0;
  let rerollsCount = 0;
  let swapsSum = 0;
  let swapsCount = 0;
  let dragsSum = 0;
  let dragsCount = 0;
  let potionsUsedSum = 0;
  let potionsUsedCount = 0;
  let maxComboEver: number | null = null;
  let maxHitEver: number | null = null;
  let totalBattles = 0;
  let battleTurnsSum = 0;

  const floorProgression: UserProfileData['floor_progression'] = [];

  for (const run of fullRuns) {
    activeDays.add(run.created_at.slice(0, 10));
    if (run.created_at < firstSeen) firstSeen = run.created_at;
    if (run.created_at > lastSeen) lastSeen = run.created_at;

    const outcome = resolveOutcome(run);
    const isFinished = outcome === 'won' || outcome === 'died';
    if (outcome === 'won') wins += 1;
    else if (outcome === 'died') deaths += 1;
    else if (outcome === 'abandoned') abandoned += 1;

    const floor = run.final_floor ?? run.floors_climbed;
    if (floor !== null && floor !== undefined) {
      floorSum += floor;
      floorCount += 1;
      if (bestFloor === null || floor > bestFloor) bestFloor = floor;
    }

    const duration = resolvePlayTimeSeconds(run);
    if (duration !== null) {
      playTimeSum += duration;
      playTimeCount += 1;
    }

    floorProgression.push({
      date: run.created_at.slice(0, 10),
      floor: floor ?? 0,
      outcome,
      playTimeSeconds: duration ?? 0,
    });

    // Character breakdown
    const charKey = run.character_key || 'unknown';
    const cEntry = charMap.get(charKey) ?? {
      runs: 0,
      wins: 0,
      deaths: 0,
      abandoned: 0,
      bestFloor: null,
      floorSum: 0,
      floorCount: 0,
      playTimeSum: 0,
    };
    cEntry.runs += 1;
    if (outcome === 'won') cEntry.wins += 1;
    else if (outcome === 'died') cEntry.deaths += 1;
    else if (outcome === 'abandoned') cEntry.abandoned += 1;
    if (floor !== null && floor !== undefined) {
      cEntry.floorSum += floor;
      cEntry.floorCount += 1;
      if (cEntry.bestFloor === null || floor > cEntry.bestFloor) cEntry.bestFloor = floor;
    }
    if (duration !== null) cEntry.playTimeSum += duration;
    charMap.set(charKey, cEntry);

    // Nemesis enemies on death
    if (outcome === 'died' && run.death_enemies) {
      const nKey = run.death_enemies.trim();
      if (nKey) {
        const nEntry = nemesisMap.get(nKey) ?? { deaths: 0, floorSum: 0, floorCount: 0 };
        nEntry.deaths += 1;
        const dFloor = run.death_floor ?? floor;
        if (dFloor !== null && dFloor !== undefined) {
          nEntry.floorSum += dFloor;
          nEntry.floorCount += 1;
        }
        nemesisMap.set(nKey, nEntry);
      }
    }

    // Playstyle counters (prefer modern item_stats.totals or fallback to scalar columns)
    const totals = run.item_stats?.totals ?? {};
    const turns = run.turns_taken ?? totals.turns;
    if (turns !== null && turns !== undefined) {
      turnsSum += turns;
      turnsCount += 1;
    }
    const kills = run.enemies_killed ?? totals.kills;
    if (kills !== null && kills !== undefined) {
      killsSum += kills;
      killsCount += 1;
    }
    const dmg = run.total_damage_dealt ?? totals.damage_dealt;
    if (dmg !== null && dmg !== undefined) {
      dmgSum += dmg;
      dmgCount += 1;
    }
    if (run.health_lost !== null && run.health_lost !== undefined) {
      hpLostSum += run.health_lost;
      hpLostCount += 1;
    }
    if (run.health_gained !== null && run.health_gained !== undefined) {
      hpGainedSum += run.health_gained;
      hpGainedCount += 1;
    }
    const goldSpent = run.gold_spent ?? totals.gold_spent;
    if (goldSpent !== null && goldSpent !== undefined) {
      goldSpentSum += goldSpent;
      goldSpentCount += 1;
    }
    const rerolls = run.rerolls_used ?? totals.queue_rerolls;
    if (rerolls !== null && rerolls !== undefined) {
      rerollsSum += rerolls;
      rerollsCount += 1;
    }
    const swaps = run.switches_used ?? totals.swaps;
    if (swaps !== null && swaps !== undefined) {
      swapsSum += swaps;
      swapsCount += 1;
    }
    const drags = run.drags_used ?? totals.queue_placements;
    if (drags !== null && drags !== undefined) {
      dragsSum += drags;
      dragsCount += 1;
    }
    const potionsUsed = run.potions_used ?? totals.potions_used;
    if (potionsUsed !== null && potionsUsed !== undefined) {
      potionsUsedSum += potionsUsed;
      potionsUsedCount += 1;
    }
    if (run.longest_combo !== null && run.longest_combo !== undefined) {
      if (maxComboEver === null || run.longest_combo > maxComboEver) maxComboEver = run.longest_combo;
    }

    // Battles inspection
    for (const b of run.battles ?? []) {
      totalBattles += 1;
      battleTurnsSum += b.turns ?? 0;
      if (b.max_combo && (maxComboEver === null || b.max_combo > maxComboEver)) {
        maxComboEver = b.max_combo;
      }
      if (b.max_hit && (maxHitEver === null || b.max_hit > maxHitEver)) {
        maxHitEver = b.max_hit;
      }
    }

    // Loadout Treasures
    const seenTreasures = new Set<string>();
    for (const t of run.loadout?.treasures ?? []) {
      if (!t.key || seenTreasures.has(t.key)) continue;
      seenTreasures.add(t.key);
      const tEntry = treasureMap.get(t.key) ?? { runs: 0, wins: 0, finished: 0, uses: 0 };
      tEntry.runs += 1;
      if (outcome === 'won') tEntry.wins += 1;
      if (isFinished) tEntry.finished += 1;
      tEntry.uses += t.triggers ?? 0;
      treasureMap.set(t.key, tEntry);
    }

    // Loadout Pieces
    const seenPieces = new Set<string>();
    for (const p of run.loadout?.pieces ?? []) {
      if (!p.key || seenPieces.has(p.key)) continue;
      seenPieces.add(p.key);
      const pEntry = pieceMap.get(p.key) ?? { runs: 0, wins: 0, finished: 0, uses: 0 };
      pEntry.runs += 1;
      if (outcome === 'won') pEntry.wins += 1;
      if (isFinished) pEntry.finished += 1;
      const matched = run.item_stats?.pieces?.[p.key]?.matched ?? 0;
      pEntry.uses += matched;
      pieceMap.set(p.key, pEntry);
    }

    // Potions used
    for (const [pKey, pStat] of Object.entries(run.item_stats?.potions ?? {})) {
      const used = pStat.used ?? 0;
      if (used <= 0 && (pStat.gained ?? 0) <= 0) continue;
      const pEntry = potionMap.get(pKey) ?? { runs: 0, wins: 0, finished: 0, uses: 0 };
      pEntry.runs += 1;
      if (used > 0) {
        if (outcome === 'won') pEntry.wins += 1;
        if (isFinished) pEntry.finished += 1;
      }
      pEntry.uses += used;
      potionMap.set(pKey, pEntry);
    }

    // Abilities used
    for (const [aKey, aStat] of Object.entries(run.item_stats?.abilities ?? {})) {
      const used = aStat.used ?? 0;
      if (used <= 0) continue;
      const aEntry = abilityMap.get(aKey) ?? { runs: 0, wins: 0, finished: 0, uses: 0 };
      aEntry.runs += 1;
      if (outcome === 'won') aEntry.wins += 1;
      if (isFinished) aEntry.finished += 1;
      aEntry.uses += used;
      abilityMap.set(aKey, aEntry);
    }
  }

  const characters: UserCharacterBreakdown[] = [...charMap.entries()]
    .map(([character_key, c]) => ({
      character_key,
      runs: c.runs,
      wins: c.wins,
      deaths: c.deaths,
      abandoned: c.abandoned,
      win_rate: c.wins + c.deaths > 0 ? c.wins / (c.wins + c.deaths) : null,
      best_floor: c.bestFloor,
      avg_floor: c.floorCount > 0 ? c.floorSum / c.floorCount : null,
      total_play_time_seconds: c.playTimeSum,
    }))
    .sort((a, b) => b.runs - a.runs);

  const toItemList = (map: Map<string, { runs: number; wins: number; finished: number; uses: number }>): UserItemPreference[] =>
    [...map.entries()]
      .map(([key, v]) => ({
        key,
        runs: v.runs,
        wins: v.wins,
        win_rate: v.finished > 0 ? v.wins / v.finished : null,
        total_uses: v.uses,
      }))
      .sort((a, b) => b.runs - a.runs || b.total_uses - a.total_uses);

  const nemeses: UserNemesisStat[] = [...nemesisMap.entries()]
    .map(([enemies, n]) => ({
      enemies,
      deaths: n.deaths,
      avg_floor: n.floorCount > 0 ? n.floorSum / n.floorCount : null,
    }))
    .sort((a, b) => b.deaths - a.deaths);

  const finishedTotal = wins + deaths;
  const summary: UserRunSummary = {
    user_id: userId,
    runs: fullRuns.length,
    wins,
    deaths,
    abandoned,
    win_rate: finishedTotal > 0 ? wins / finishedTotal : null,
    best_floor: bestFloor,
    avg_floor: floorCount > 0 ? floorSum / floorCount : null,
    total_play_time_seconds: playTimeSum,
    avg_play_time_seconds: playTimeCount > 0 ? playTimeSum / playTimeCount : null,
    favorite_character: characters[0]?.character_key ?? null,
    first_seen: firstSeen,
    last_seen: lastSeen,
    active_days: activeDays.size,
  };

  const playstyle: UserPlaystyleMetrics = {
    avg_turns_per_run: turnsCount > 0 ? turnsSum / turnsCount : null,
    avg_kills_per_run: killsCount > 0 ? killsSum / killsCount : null,
    avg_damage_dealt: dmgCount > 0 ? dmgSum / dmgCount : null,
    avg_hp_lost: hpLostCount > 0 ? hpLostSum / hpLostCount : null,
    avg_hp_gained: hpGainedCount > 0 ? hpGainedSum / hpGainedCount : null,
    avg_gold_spent: goldSpentCount > 0 ? goldSpentSum / goldSpentCount : null,
    avg_rerolls: rerollsCount > 0 ? rerollsSum / rerollsCount : null,
    avg_swaps: swapsCount > 0 ? swapsSum / swapsCount : null,
    avg_drags: dragsCount > 0 ? dragsSum / dragsCount : null,
    avg_potions_used: potionsUsedCount > 0 ? potionsUsedSum / potionsUsedCount : null,
    max_combo_ever: maxComboEver,
    max_single_hit_ever: maxHitEver,
    total_battles: totalBattles,
    avg_turns_per_battle: totalBattles > 0 ? battleTurnsSum / totalBattles : null,
  };

  const latestCrash = crashRows[0];

  return {
    summary,
    startup_count: startupCount,
    crash_count: crashRows.length,
    os_name: latestCrash?.os_name ?? null,
    cpu_name: latestCrash?.cpu_name ?? null,
    gpu_name: latestCrash?.gpu_name ?? null,
    playstyle,
    characters,
    top_treasures: toItemList(treasureMap),
    top_pieces: toItemList(pieceMap),
    top_potions: toItemList(potionMap),
    top_abilities: toItemList(abilityMap),
    nemeses,
    floor_progression: floorProgression.reverse(),
    runs: fullRuns.map(r => ({
      id: r.id,
      uuid: r.uuid,
      created_at: r.created_at,
      user_id_hash: r.user_id_hash,
      run_uuid: r.run_uuid,
      outcome: r.outcome,
      character_key: r.character_key,
      game_version: r.game_version,
      final_floor: r.final_floor,
      floors_climbed: r.floors_climbed,
      death_floor: r.death_floor,
      death_enemies: r.death_enemies,
      play_time_seconds: resolvePlayTimeSeconds(r),
      current_gold: r.current_gold,
      run_won: r.run_won,
    })),
  };
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
    .select('character_key,game_version,user_id_hash')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    character_key: string | null;
    game_version: string | null;
    user_id_hash: string | number | null;
  }>;
  const distinct = (values: Array<string | null>) =>
    [...new Set(values.filter((v): v is string => !!v && v.trim().length > 0))].sort();

  const userCounts = new Map<string, number>();
  for (const r of rows) {
    if (r.user_id_hash !== null && r.user_id_hash !== undefined) {
      const uid = String(r.user_id_hash).trim();
      if (uid) userCounts.set(uid, (userCounts.get(uid) ?? 0) + 1);
    }
  }
  const users = [...userCounts.entries()]
    .map(([userId, runs]) => ({ userId, runs }))
    .sort((a, b) => b.runs - a.runs);

  return {
    characters: distinct(rows.map(r => r.character_key)),
    versions: distinct(rows.map(r => r.game_version)),
    users,
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
