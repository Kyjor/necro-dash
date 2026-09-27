import { useQuery } from '@tanstack/react-query';
import type { DateRangeFilterValue } from '../types/analytics';
import { fetchSurveyStats } from '../services/supabaseService';

export function useSurveyStats(range: DateRangeFilterValue) {
  return useQuery({
    queryKey: ['analytics', 'surveys', range.key, range.from ?? '', range.to ?? ''],
    queryFn: () => fetchSurveyStats(range),
    staleTime: 60_000,
  });
}
