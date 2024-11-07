import { useState, useEffect } from 'react';
import { DetailedFighter } from '@/types/api';
import { FighterService } from '@/services/fighter-service';

export function useFighter(fighterId: string) {
  const [fighter, setFighter] = useState<DetailedFighter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFighterData() {
      try {
        const response = await FighterService.getFighter(fighterId);
        if (response.error) {
          setError(response.error);
        } else {
          setFighter(response.data || null);
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