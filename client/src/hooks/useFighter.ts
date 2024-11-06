import { useState, useEffect } from 'react';
import { Fighter, ApiResponse } from '@/types/api';
import { FighterService } from '@/services/fighter-service';

export function useFighter(fighterId: string) {
  const [fighter, setFighter] = useState<Fighter | null>(null);
//   const [analytics, setAnalytics] = useState<FighterAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFighterData() {
      try {
        const [fighterResponse] = await Promise.all([
          FighterService.getFighter(fighterId),
        ]);

        if (fighterResponse.error) {
          setError(fighterResponse.error);
        } else {
          setFighter(fighterResponse.data || null);
        //   setAnalytics(analyticsResponse.data || null);
        }
      } catch (err) {
        setError('Failed to fetch fighter data');
      } finally {
        setLoading(false);
      }
    }

    if (fighterId) {
      fetchFighterData();
    }
  }, [fighterId]);

  return { fighter, loading, error };
} 