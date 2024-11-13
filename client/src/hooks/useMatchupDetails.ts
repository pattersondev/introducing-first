import { useState, useEffect } from 'react';
import { DetailedMatchup, Matchup, ApiResponse } from '@/types/api';
import { apiClient } from '@/lib/api-client';

export function useMatchupDetails(matchup: Matchup | null) {
  const [detailedMatchup, setDetailedMatchup] = useState<DetailedMatchup | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchup) {
      setDetailedMatchup(null);
      return;
    }

    const fetchMatchupDetails = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient<DetailedMatchup>(
          `/events/matchups/${matchup.matchup_id}/details`
        );
        
        if (response.error) {
          throw new Error(response.error);
        }
        
        if (response.data) {
          setDetailedMatchup(response.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch matchup details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatchupDetails();
  }, [matchup]);

  return { detailedMatchup, isLoading, error };
} 