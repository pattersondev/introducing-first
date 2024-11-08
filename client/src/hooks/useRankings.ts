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
          // If no weight class is selected, select Lightweight by default
          if (!weightClassId) {
            const lightweightClass = response.data.find(
              wc => wc.division === "Men's" && wc.name === "Lightweight"
            );
            if (lightweightClass) {
              // You might need to add a callback prop to handle this
              // onWeightClassSelect(lightweightClass.weight_class_id);
            }
          }
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
        console.log('Fetching rankings for weight class:', weightClassId);
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