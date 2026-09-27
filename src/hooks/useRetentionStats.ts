import { useQuery } from '@tanstack/react-query';
import type { DateRangeFilterValue } from '../types/analytics';
import { fetchRetentionStats } from '../services/supabaseService';

export function useRetentionStats(range: DateRangeFilterValue) {
  return useQuery({
    queryKey: ['analytics', 'retention', range.key, range.from ?? '', range.to ?? ''],
    queryFn: () => fetchRetentionStats(range),
    staleTime: 60_000,
  });
}
