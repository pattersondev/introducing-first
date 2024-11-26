import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { getFighterAnalytics, FighterAnalytics } from '@/services/analytics-service';

export function useFighterAnalytics(
  fighterId: string,
  options?: Omit<UseQueryOptions<FighterAnalytics, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<FighterAnalytics, Error>({
    queryKey: ['fighterAnalytics', fighterId],
    queryFn: () => getFighterAnalytics(fighterId),
    enabled: !!fighterId && options?.enabled,
    ...options,
  });
} 