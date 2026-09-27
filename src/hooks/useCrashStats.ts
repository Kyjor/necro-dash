import { useQuery } from '@tanstack/react-query';
import type { DateRangeFilterValue } from '../types/analytics';
import { fetchCrashStats } from '../services/supabaseService';

export function useCrashStats(range: DateRangeFilterValue) {
  return useQuery({
    queryKey: ['analytics', 'crashes', range.key, range.from ?? '', range.to ?? ''],
    queryFn: () => fetchCrashStats(range),
    staleTime: 60_000,
  });
}
