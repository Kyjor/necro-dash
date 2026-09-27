import { useMutation } from '@tanstack/react-query';
import { runCustomQuery } from '../services/supabaseService';
import type { QueryBuilderRequest } from '../types/analytics';

export function useCustomQuery() {
  return useMutation({
    mutationFn: (request: QueryBuilderRequest) => runCustomQuery(request),
  });
}
