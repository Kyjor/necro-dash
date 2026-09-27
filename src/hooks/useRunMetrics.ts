import { useQuery } from '@tanstack/react-query';
import type { DateRangeFilterValue } from '../types/analytics';
import { fetchRunStats } from '../services/supabaseService';

export function useRunMetrics(range: DateRangeFilterValue) {
  return useQuery({
    queryKey: ['analytics', 'Runs', range.key, range.from ?? '', range.to ?? ''],
    queryFn: () => fetchRunStats(range),
    staleTime: 60_000,
  });
}
