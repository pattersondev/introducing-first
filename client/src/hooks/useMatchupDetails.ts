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

    // Check if we already have all the necessary data
    if (
      matchup.fighter1_record &&
      matchup.fighter1_reach &&
      matchup.fighter1_stance &&
      matchup.fighter1_age &&
      matchup.fighter2_record &&
      matchup.fighter2_reach &&
      matchup.fighter2_stance &&
      matchup.fighter2_age
    ) {
      setDetailedMatchup(matchup as DetailedMatchup);
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