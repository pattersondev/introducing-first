import { API_BASE_URL } from "@/config/api";

export interface FighterAnalytics {
  styleAnalysis: {
    primaryStyle: string;
    strikePercentage: number;
    wrestlingPercentage: number;
    grapplingPercentage: number;
  };
  careerPhases: {
    peakPerformance: {
      optimalAgeRange: string;
      peakDuration: number;
      currentPhase: 'Rising' | 'Peak' | 'Declining' | 'Veteran';
      timeInCurrentPhase: number;
    };
    careerTrajectory: {
      totalFights: number;
      yearlyFightAverage: number;
      winRateProgression: {
        early: number;
        middle: number;
        recent: number;
      };
      performanceMetrics: {
        strikeAccuracyTrend: number;
        takedownAccuracyTrend: number;
        finishRate: number;
        averageFightTime: number;
      };
      activityLevel: 'High' | 'Moderate' | 'Low';
    };
    sustainabilityScore: number;
  };
  styleEvolution: {
    styleTransitions: {
      earlyCareerStyle: string;
      currentStyle: string;
      adaptabilityScore: number;
    };
    technicalGrowth: {
      strikeEvolution: {
        earlyStrikeAccuracy: number;
        currentStrikeAccuracy: number;
        preferredTargetsShift: {
          early: { head: number; body: number; leg: number };
          current: { head: number; body: number; leg: number };
        };
      };
      groundEvolution: {
        earlyTakedownAccuracy: number;
        currentTakedownAccuracy: number;
        submissionAttemptFrequency: {
          early: number;
          current: number;
        };
      };
      skillsetExpansionRate: number;
    };
  };
}

export async function getFighterAnalytics(fighterId: string): Promise<FighterAnalytics> {
  const [styleResponse, careerResponse, evolutionResponse] = await Promise.all([
    fetch(`${API_BASE_URL}/analytics/fighter/${fighterId}/style`),
    fetch(`${API_BASE_URL}/analytics/fighter/${fighterId}/career-phases`),
    fetch(`${API_BASE_URL}/analytics/fighter/${fighterId}/style-evolution`)
  ]);

  if (!styleResponse.ok || !careerResponse.ok || !evolutionResponse.ok) {
    throw new Error('Failed to fetch fighter analytics');
  }

  const [styleAnalysis, careerPhases, styleEvolution] = await Promise.all([
    styleResponse.json(),
    careerResponse.json(),
    evolutionResponse.json()
  ]);

  return {
    styleAnalysis,
    careerPhases,
    styleEvolution
  };
} 