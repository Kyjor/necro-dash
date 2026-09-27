import { useQuery } from '@tanstack/react-query';
import type { DateRangeFilterValue } from '../types/analytics';
import { fetchFeatureGateStats } from '../services/supabaseService';

export function useFeatureGateStats(range: DateRangeFilterValue) {
  return useQuery({
    queryKey: ['analytics', 'feature-gates', range.key, range.from ?? '', range.to ?? ''],
    queryFn: () => fetchFeatureGateStats(range),
    staleTime: 60_000,
  });
}
