import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fetchAbilityStats,
  fetchCharacterStats,
  fetchDeathStats,
  fetchEconomyStats,
  fetchPieceStats,
  fetchPotionStats,
  fetchRunDetail,
  fetchRunFilterOptions,
  fetchRunList,
  fetchTreasureStats,
  fetchUserProfile,
  fetchUserRunSummaries,
} from '../services/runAnalyticsService';
import type { DateRangeFilterValue, RunFilters } from '../types/analytics';

const STALE_MS = 60_000;

function rangeKey(range: DateRangeFilterValue) {
  return [range.key, range.from ?? '', range.to ?? ''];
}

export function useRunList(filters: RunFilters, page: number) {
  return useQuery({
    queryKey: [
      'run-analytics',
      'list',
      ...rangeKey(filters.range),
      filters.outcome ?? '',
      filters.character ?? '',
      filters.version ?? '',
      filters.userId ?? '',
      page,
    ],
    queryFn: () => fetchRunList(filters, page),
    placeholderData: keepPreviousData,
    staleTime: STALE_MS,
  });
}

export function useUserRunSummaries(filters: Omit<RunFilters, 'userId'>, enabled = true) {
  return useQuery({
    queryKey: [
      'run-analytics',
      'user-summaries',
      ...rangeKey(filters.range),
      filters.outcome ?? '',
      filters.character ?? '',
      filters.version ?? '',
    ],
    queryFn: () => fetchUserRunSummaries(filters),
    placeholderData: keepPreviousData,
    enabled,
    staleTime: STALE_MS,
  });
}

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['run-analytics', 'user-profile', userId ?? ''],
    queryFn: () => fetchUserProfile(userId as string),
    enabled: !!userId,
    staleTime: STALE_MS,
  });
}

export function useRunDetail(uuid: string | undefined) {
  return useQuery({
    queryKey: ['run-analytics', 'detail', uuid ?? ''],
    queryFn: () => fetchRunDetail(uuid as string),
    enabled: !!uuid,
    staleTime: STALE_MS,
  });
}

export function useRunFilterOptions() {
  return useQuery({
    queryKey: ['run-analytics', 'filter-options'],
    queryFn: fetchRunFilterOptions,
    staleTime: 5 * STALE_MS,
  });
}

function useStats<T>(
  name: string,
  fetcher: (range: DateRangeFilterValue, version?: string) => Promise<T[]>,
  range: DateRangeFilterValue,
  version?: string,
) {
  return useQuery({
    queryKey: ['run-analytics', name, ...rangeKey(range), version ?? ''],
    queryFn: () => fetcher(range, version),
    staleTime: STALE_MS,
  });
}

export const useTreasureStats = (range: DateRangeFilterValue, version?: string) =>
  useStats('treasures', fetchTreasureStats, range, version);
export const usePieceStats = (range: DateRangeFilterValue, version?: string) =>
  useStats('pieces', fetchPieceStats, range, version);
export const usePotionStats = (range: DateRangeFilterValue, version?: string) =>
  useStats('potions', fetchPotionStats, range, version);
export const useAbilityStats = (range: DateRangeFilterValue, version?: string) =>
  useStats('abilities', fetchAbilityStats, range, version);
export const useCharacterStats = (range: DateRangeFilterValue, version?: string) =>
  useStats('characters', fetchCharacterStats, range, version);
export const useDeathStats = (range: DateRangeFilterValue, version?: string) =>
  useStats('deaths', fetchDeathStats, range, version);
export const useEconomyStats = (range: DateRangeFilterValue, version?: string) =>
  useStats('economy', fetchEconomyStats, range, version);
