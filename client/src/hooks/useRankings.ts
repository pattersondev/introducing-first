import { useState, useEffect } from 'react';
import { RankingsService, WeightClass, RankedFighter } from '@/services/rankings-service';

export function useRankings(weightClassId: number | null) {
  const [weightClasses, setWeightClasses] = useState<WeightClass[]>([]);
  const [rankings, setRankings] = useState<RankedFighter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch weight classes
  useEffect(() => {
    async function fetchWeightClasses() {
      try {
        const response = await RankingsService.getWeightClasses();
        if (response.error) {
          setError(response.error);
        } else if (response.data) {
          setWeightClasses(response.data);
        }
      } catch (err) {
        setError('Failed to fetch weight classes');
      }
    }

    fetchWeightClasses();
  }, []);

  // Fetch rankings when weight class changes
  useEffect(() => {
    async function fetchRankings() {
      if (!weightClassId) {
        setRankings([]);
        return;
      }

      setLoading(true);
      try {
        const response = await RankingsService.getAnalyticsRankings(weightClassId);
        if (response.error) {
          setError(response.error);
        } else if (response.data) {
          setRankings(response.data);
        }
      } catch (err) {
        setError('Failed to fetch rankings');
      } finally {
        setLoading(false);
      }
    }

    fetchRankings();
  }, [weightClassId]);

  return {
    weightClasses,
    rankings,
    loading,
    error
  };
} 