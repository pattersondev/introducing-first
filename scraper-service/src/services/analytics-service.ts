import { Pool } from 'pg';

export class FighterAnalytics {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // Calculate fighter's primary style based on their stats
  async calculateFighterStyle(fighterId: string): Promise<{
    primaryStyle: 'striker' | 'wrestler' | 'grappler' | 'hybrid',
    strikePercentage: number,
    wrestlingPercentage: number,
    grapplingPercentage: number
  }> {
    const client = await this.pool.connect();
    try {
      // First try to get detailed stats
      const detailedStats = await client.query(`
        WITH fight_totals AS (
          SELECT 
            fighter_id,
            SUM(tsa) as total_strikes_attempted,
            SUM(tda) as total_takedowns_attempted,
            SUM(sm) as total_submission_attempts
          FROM (
            SELECT 
              fighter_id, 
              tsa, 
              0 as tda, 
              0 as sm 
            FROM striking_stats
            WHERE fighter_id = $1
            UNION ALL
            SELECT 
              fighter_id, 
              0 as tsa, 
              tda, 
              0 as sm
            FROM clinch_stats
            WHERE fighter_id = $1
            UNION ALL
            SELECT 
              fighter_id, 
              0 as tsa, 
              0 as tda, 
              sm
            FROM ground_stats
            WHERE fighter_id = $1
          ) all_stats
          GROUP BY fighter_id
        )
        SELECT * FROM fight_totals
      `, [fighterId]);

      // If we have enough detailed stats, use them
      if (detailedStats.rows.length > 0 && 
          (detailedStats.rows[0].total_strikes_attempted > 0 ||
           detailedStats.rows[0].total_takedowns_attempted > 0 ||
           detailedStats.rows[0].total_submission_attempts > 0)) {
        const row = detailedStats.rows[0];
        const total = row.total_strikes_attempted + row.total_takedowns_attempted + row.total_submission_attempts;
        
        return {
          primaryStyle: this.determineStyleFromStats(
            row.total_strikes_attempted / total,
            row.total_takedowns_attempted / total,
            row.total_submission_attempts / total
          ),
          strikePercentage: row.total_strikes_attempted / total,
          wrestlingPercentage: row.total_takedowns_attempted / total,
          grapplingPercentage: row.total_submission_attempts / total
        };
      }

      // Fallback to fight outcome analysis
      const fightOutcomes = await client.query(`
        SELECT 
          result,
          decision,
          COUNT(*) as count
        FROM fights
        WHERE fighter_id = $1 AND result = 'Win'
        GROUP BY result, decision
      `, [fighterId]);

      let strikeScore = 0;
      let wrestleScore = 0;
      let grappleScore = 0;
      let totalFights = 0;

      fightOutcomes.rows.forEach(outcome => {
        const count = parseInt(outcome.count);
        totalFights += count;
        const decision = outcome.decision.toLowerCase();

        if (decision.includes('ko') || decision.includes('tko')) {
          strikeScore += count * 2; // Weight KO/TKO wins heavily
        } else if (decision.includes('submission')) {
          grappleScore += count * 2; // Weight submission wins heavily
        } else if (decision.includes('decision')) {
          // For decisions, check additional fight stats
          strikeScore += count * 0.5;
          wrestleScore += count * 0.5;
        }
      });

      // Get additional metrics for more context
      const additionalMetrics = await client.query(`
        SELECT 
          SUM(CASE WHEN s.kd > 0 THEN 1 ELSE 0 END) as knockdowns,
          SUM(CASE WHEN c.td > 0 THEN 1 ELSE 0 END) as takedowns,
          SUM(CASE WHEN g.sm > 0 THEN 1 ELSE 0 END) as submission_attempts
        FROM fights f
        LEFT JOIN striking_stats s ON f.fighter_id = s.fighter_id AND f.opponent = s.opponent
        LEFT JOIN clinch_stats c ON f.fighter_id = c.fighter_id AND f.opponent = c.opponent
        LEFT JOIN ground_stats g ON f.fighter_id = g.fighter_id AND f.opponent = g.opponent
        WHERE f.fighter_id = $1
      `, [fighterId]);

      if (additionalMetrics.rows.length > 0) {
        const metrics = additionalMetrics.rows[0];
        strikeScore += (metrics.knockdowns || 0) * 1.5;
        wrestleScore += (metrics.takedowns || 0) * 1.5;
        grappleScore += (metrics.submission_attempts || 0) * 1.5;
      }

      const total = Math.max(1, strikeScore + wrestleScore + grappleScore);
      const strikePercentage = strikeScore / total;
      const wrestlingPercentage = wrestleScore / total;
      const grapplingPercentage = grappleScore / total;

      return {
        primaryStyle: this.determineStyleFromStats(
          strikePercentage,
          wrestlingPercentage,
          grapplingPercentage
        ),
        strikePercentage,
        wrestlingPercentage,
        grapplingPercentage
      };
    } finally {
      client.release();
    }
  }

  private determineStyleFromStats(
    strikePercentage: number,
    wrestlingPercentage: number,
    grapplingPercentage: number
  ): 'striker' | 'wrestler' | 'grappler' | 'hybrid' {
    const threshold = 0.4; // Threshold for considering a style dominant
    const secondaryThreshold = 0.25; // Threshold for considering a style significant

    if (strikePercentage > threshold && wrestlingPercentage < secondaryThreshold && grapplingPercentage < secondaryThreshold) {
      return 'striker';
    }
    if (wrestlingPercentage > threshold && strikePercentage < secondaryThreshold && grapplingPercentage < secondaryThreshold) {
      return 'wrestler';
    }
    if (grapplingPercentage > threshold && strikePercentage < secondaryThreshold && wrestlingPercentage < secondaryThreshold) {
      return 'grappler';
    }

    // Check for hybrid styles with two strong components
    if (strikePercentage >= secondaryThreshold && wrestlingPercentage >= secondaryThreshold) {
      return 'hybrid';
    }
    if (strikePercentage >= secondaryThreshold && grapplingPercentage >= secondaryThreshold) {
      return 'hybrid';
    }
    if (wrestlingPercentage >= secondaryThreshold && grapplingPercentage >= secondaryThreshold) {
      return 'hybrid';
    }

    // Default to hybrid if no clear pattern emerges
    return 'hybrid';
  }

  // Analyze style matchup outcomes
  async analyzeStyleMatchups(): Promise<{
    [key: string]: {
      totalFights: number,
      winPercentage: number
    }
  }> {
    const client = await this.pool.connect();
    try {
      const matchups = await client.query(`
        SELECT 
          m.matchup_id,
          m.result,
          m.winner,
          f1.fighter_id as fighter1_id,
          f2.fighter_id as fighter2_id
        FROM matchups m
        JOIN fighters f1 ON m.fighter1_id = f1.fighter_id
        JOIN fighters f2 ON m.fighter2_id = f2.fighter_id
        WHERE m.result IS NOT NULL
      `);

      const styleMatchupStats: {
        [key: string]: {
          wins: number,
          total: number
        }
      } = {};

      for (const matchup of matchups.rows) {
        const fighter1Style = await this.calculateFighterStyle(matchup.fighter1_id);
        const fighter2Style = await this.calculateFighterStyle(matchup.fighter2_id);
        
        const matchupKey = `${fighter1Style.primaryStyle}_vs_${fighter2Style.primaryStyle}`;
        
        if (!styleMatchupStats[matchupKey]) {
          styleMatchupStats[matchupKey] = { wins: 0, total: 0 };
        }
        
        styleMatchupStats[matchupKey].total++;
        if (matchup.winner === matchup.fighter1_id) {
          styleMatchupStats[matchupKey].wins++;
        }
      }

      // Convert to percentages
      return Object.entries(styleMatchupStats).reduce((acc, [key, stats]) => {
        acc[key] = {
          totalFights: stats.total,
          winPercentage: (stats.wins / stats.total) * 100
        };
        return acc;
      }, {} as any);
    } finally {
      client.release();
    }
  }

  // Calculate fighter's finishing tendency
  async calculateFinishingTendency(fighterId: string): Promise<{
    koPercentage: number,
    submissionPercentage: number,
    decisionPercentage: number,
    averageFinishTime: number
  }> {
    const client = await this.pool.connect();
    try {
      const results = await client.query(`
        SELECT 
          result,
          decision,
          rnd,
          time
        FROM fights
        WHERE fighter_id = $1 AND result = 'Win'
      `, [fighterId]);

      const total = results.rows.length;
      if (total === 0) return { koPercentage: 0, submissionPercentage: 0, decisionPercentage: 0, averageFinishTime: 0 };

      let kos = 0, subs = 0, decisions = 0;
      let totalTime = 0;

      results.rows.forEach(fight => {
        if (fight.decision.toLowerCase().includes('ko') || fight.decision.toLowerCase().includes('tko')) {
          kos++;
        } else if (fight.decision.toLowerCase().includes('submission')) {
          subs++;
        } else {
          decisions++;
        }

        // Calculate fight time in seconds
        const [minutes, seconds] = fight.time.split(':').map(Number);
        totalTime += (fight.rnd - 1) * 5 * 60 + minutes * 60 + seconds;
      });

      return {
        koPercentage: (kos / total) * 100,
        submissionPercentage: (subs / total) * 100,
        decisionPercentage: (decisions / total) * 100,
        averageFinishTime: totalTime / total
      };
    } finally {
      client.release();
    }
  }

  // Round-by-round performance analysis
  async analyzeRoundPerformance(fighterId: string): Promise<{
    strikeAccuracyByRound: { [key: number]: number },
    takedownAccuracyByRound: { [key: number]: number },
    averageStrikesPerRound: number,
    lateRoundFinishRate: number
  }> {
    const client = await this.pool.connect();
    try {
      const fights = await client.query(`
        SELECT f.rnd, f.result, f.decision,
          s.tsl, s.tsa,
          c.tdl, c.tda
        FROM fights f
        LEFT JOIN striking_stats s ON f.fighter_id = s.fighter_id AND f.opponent = s.opponent
        LEFT JOIN clinch_stats c ON f.fighter_id = c.fighter_id AND f.opponent = c.opponent
        WHERE f.fighter_id = $1
      `, [fighterId]);

      const roundStats: { [key: number]: { strikes: number[], takedowns: number[] } } = {};
      let lateRoundFinishes = 0;
      let totalFights = fights.rows.length;

      fights.rows.forEach(fight => {
        const round = parseInt(fight.rnd);
        if (!roundStats[round]) {
          roundStats[round] = { strikes: [], takedowns: [] };
        }

        // Calculate strike accuracy for this round
        if (fight.tsl && fight.tsa) {
          roundStats[round].strikes.push(fight.tsl / fight.tsa);
        }

        // Calculate takedown accuracy for this round
        if (fight.tdl && fight.tda) {
          roundStats[round].takedowns.push(fight.tdl / fight.tda);
        }

        // Check for late round finishes (rounds 3, 4, 5)
        if (round >= 3 && fight.decision && !fight.decision.toLowerCase().includes('decision')) {
          lateRoundFinishes++;
        }
      });

      // Calculate averages for each round
      const strikeAccuracyByRound: { [key: number]: number } = {};
      const takedownAccuracyByRound: { [key: number]: number } = {};
      let totalStrikes = 0;
      let totalRounds = 0;

      Object.entries(roundStats).forEach(([round, stats]) => {
        const roundNum = parseInt(round);
        strikeAccuracyByRound[roundNum] = stats.strikes.length > 0 
          ? stats.strikes.reduce((a, b) => a + b) / stats.strikes.length 
          : 0;
        takedownAccuracyByRound[roundNum] = stats.takedowns.length > 0 
          ? stats.takedowns.reduce((a, b) => a + b) / stats.takedowns.length 
          : 0;
        totalStrikes += stats.strikes.reduce((a, b) => a + b, 0);
        totalRounds += stats.strikes.length;
      });

      return {
        strikeAccuracyByRound,
        takedownAccuracyByRound,
        averageStrikesPerRound: totalRounds > 0 ? totalStrikes / totalRounds : 0,
        lateRoundFinishRate: totalFights > 0 ? (lateRoundFinishes / totalFights) * 100 : 0
      };
    } finally {
      client.release();
    }
  }

  // Defensive efficiency analysis
  async analyzeDefensiveEfficiency(fighterId: string): Promise<{
    strikeDefenseRate: number,
    takedownDefenseRate: number,
    submissionDefenseRate: number,
    knockdownsReceived: number,
    averageDamageAbsorbed: number
  }> {
    const client = await this.pool.connect();
    try {
      const stats = await client.query(`
        WITH defense_stats AS (
          SELECT 
            s.tsl as strikes_landed,
            s.tsa as strikes_attempted,
            c.tdl as takedowns_landed,
            c.tda as takedowns_attempted,
            f.decision,
            f.result
          FROM fights f
          LEFT JOIN striking_stats s ON f.fighter_id = s.fighter_id AND f.opponent = s.opponent
          LEFT JOIN clinch_stats c ON f.fighter_id = c.fighter_id AND f.opponent = c.opponent
          WHERE f.fighter_id = $1
        )
        SELECT * FROM defense_stats
      `, [fighterId]);

      let totalStrikesDefended = 0;
      let totalStrikesReceived = 0;
      let totalTakedownsDefended = 0;
      let totalTakedownsAttempted = 0;
      let submissionAttemptsSurvived = 0;
      let totalFights = stats.rows.length;

      stats.rows.forEach(fight => {
        if (fight.strikes_attempted && fight.strikes_landed) {
          totalStrikesDefended += fight.strikes_attempted - fight.strikes_landed;
          totalStrikesReceived += fight.strikes_attempted;
        }
        if (fight.takedowns_attempted && fight.takedowns_landed) {
          totalTakedownsDefended += fight.takedowns_attempted - fight.takedowns_landed;
          totalTakedownsAttempted += fight.takedowns_attempted;
        }
        // Count survived submission attempts
        if (fight.decision && fight.decision.toLowerCase().includes('submission') && fight.result !== 'Loss') {
          submissionAttemptsSurvived++;
        }
      });

      return {
        strikeDefenseRate: totalStrikesReceived > 0 
          ? (totalStrikesDefended / totalStrikesReceived) * 100 
          : 0,
        takedownDefenseRate: totalTakedownsAttempted > 0 
          ? (totalTakedownsDefended / totalTakedownsAttempted) * 100 
          : 0,
        submissionDefenseRate: totalFights > 0 
          ? (submissionAttemptsSurvived / totalFights) * 100 
          : 0,
        knockdownsReceived: stats.rows.reduce((acc, fight) => acc + (parseInt(fight.kd) || 0), 0),
        averageDamageAbsorbed: totalStrikesReceived / totalFights
      };
    } finally {
      client.release();
    }
  }

  // Recovery analysis
  async analyzeRecoveryAbility(fighterId: string): Promise<{
    comebackWins: number,
    recoveryRate: number,
    postKnockdownWinRate: number,
    averageRecoveryTime: number
  }> {
    const client = await this.pool.connect();
    try {
      const fights = await client.query(`
        SELECT f.result, f.decision, f.rnd, f.time,
          s.kd
        FROM fights f
        LEFT JOIN striking_stats s ON f.fighter_id = s.fighter_id AND f.opponent = s.opponent
        WHERE f.fighter_id = $1
      `, [fighterId]);

      let knockdownsRecovered = 0;
      let totalKnockdowns = 0;
      let winsAfterKnockdown = 0;
      let fightsWithKnockdowns = 0;
      let totalRecoveryTime = 0;

      fights.rows.forEach(fight => {
        const knockdowns = parseInt(fight.kd) || 0;
        if (knockdowns > 0) {
          fightsWithKnockdowns++;
          totalKnockdowns += knockdowns;
          
          // If they won despite being knocked down
          if (fight.result === 'Win') {
            winsAfterKnockdown++;
            knockdownsRecovered += knockdowns;
          }

          // Calculate recovery time (simplified to remaining round time)
          const [minutes, seconds] = fight.time.split(':').map(Number);
          totalRecoveryTime += minutes * 60 + seconds;
        }
      });

      return {
        comebackWins: winsAfterKnockdown,
        recoveryRate: totalKnockdowns > 0 ? (knockdownsRecovered / totalKnockdowns) * 100 : 0,
        postKnockdownWinRate: fightsWithKnockdowns > 0 ? (winsAfterKnockdown / fightsWithKnockdowns) * 100 : 0,
        averageRecoveryTime: fightsWithKnockdowns > 0 ? totalRecoveryTime / fightsWithKnockdowns : 0
      };
    } finally {
      client.release();
    }
  }

  // Momentum analysis
  async analyzeMomentum(fighterId: string): Promise<{
    winStreak: number,
    finishRate: number,
    averageWinTime: number,
    dominanceScore: number,
    performanceTrend: 'improving' | 'declining' | 'stable'
  }> {
    const client = await this.pool.connect();
    try {
      const fights = await client.query(`
        SELECT f.result, f.decision, f.rnd, f.time,
          s.tsl_tsa_perc as strike_accuracy,
          c.tk_acc_perc as takedown_accuracy
        FROM fights f
        LEFT JOIN striking_stats s ON f.fighter_id = s.fighter_id AND f.opponent = s.opponent
        LEFT JOIN clinch_stats c ON f.fighter_id = c.fighter_id AND f.opponent = c.opponent
        WHERE f.fighter_id = $1
        ORDER BY f.date DESC
      `, [fighterId]);

      let currentWinStreak = 0;
      let finishes = 0;
      let totalWinTime = 0;
      let wins = 0;
      let recentPerformances: number[] = [];

      for (const fight of fights.rows) {
        if (fight.result === 'Win') {
          currentWinStreak++;
          wins++;
          
          // Calculate finish rate
          if (fight.decision && !fight.decision.toLowerCase().includes('decision')) {
            finishes++;
          }

          // Calculate total win time
          const [minutes, seconds] = fight.time.split(':').map(Number);
          totalWinTime += (parseInt(fight.rnd) - 1) * 5 * 60 + minutes * 60 + seconds;

          // Calculate performance score for trend analysis
          const performanceScore = (
            (fight.strike_accuracy || 0) + 
            (fight.takedown_accuracy || 0)
          ) / 2;
          recentPerformances.push(performanceScore);
        } else {
          break; // Break at first loss for win streak
        }
      }

      // Calculate performance trend
      const trend = recentPerformances.length >= 2 
        ? recentPerformances[0] > recentPerformances[recentPerformances.length - 1]
          ? 'improving'
          : recentPerformances[0] < recentPerformances[recentPerformances.length - 1]
            ? 'declining'
            : 'stable'
        : 'stable';

      // Calculate dominance score based on finish rate and performance metrics
      const dominanceScore = wins > 0 
        ? ((finishes / wins) * 0.6 + (currentWinStreak / fights.rows.length) * 0.4) * 100
        : 0;

      return {
        winStreak: currentWinStreak,
        finishRate: wins > 0 ? (finishes / wins) * 100 : 0,
        averageWinTime: wins > 0 ? totalWinTime / wins : 0,
        dominanceScore,
        performanceTrend: trend
      };
    } finally {
      client.release();
    }
  }

  // Add this new method to the FighterAnalytics class

  async analyzePostKnockoutPerformance(fighterId: string): Promise<{
    totalKnockoutLosses: number,
    postKnockoutStats: {
      totalFights: number,
      wins: number,
      losses: number,
      winPercentage: number,
      subsequentKnockouts: number,
      averageFightDuration: number,
      vulnerabilityScore: number,
      recoveryPattern: 'Strong' | 'Concerning' | 'Vulnerable' | 'Insufficient Data',
      timeBetweenFights: number // Average days between fights after a knockout
    },
    careerComparison: {
      preKnockoutWinRate: number,
      postKnockoutWinRate: number,
      winRateDrop: number
    },
    riskAssessment: {
      chinDurability: number, // 0-100 score
      knockoutSusceptibility: number,
      recommendedRecoveryTime: number // in days
    }
  }> {
    const client = await this.pool.connect();
    try {
      // Get all fights in chronological order
      const fights = await client.query(`
        SELECT 
          f.result,
          f.decision,
          f.date,
          f.rnd,
          f.time,
          s.kd,
          f.opponent
        FROM fights f
        LEFT JOIN striking_stats s ON f.fighter_id = s.fighter_id 
          AND f.opponent = s.opponent
        WHERE f.fighter_id = $1
        ORDER BY f.date ASC
      `, [fighterId]);

      let knockoutLosses: Date[] = [];
      let postKnockoutFights: any[] = [];
      let preKnockoutFights: any[] = [];
      let totalFightTime = 0;
      let subsequentKnockouts = 0;

      // Analyze each fight
      fights.rows.forEach((fight, index) => {
        // Calculate fight duration in seconds
        const [minutes, seconds] = fight.time.split(':').map(Number);
        const fightDuration = (fight.rnd - 1) * 5 * 60 + minutes * 60 + seconds;
        totalFightTime += fightDuration;

        // Check if this fight was a knockout loss
        const isKnockoutLoss = fight.result === 'Loss' && 
          (fight.decision.toLowerCase().includes('ko') || 
           fight.decision.toLowerCase().includes('tko'));

        if (isKnockoutLoss) {
          knockoutLosses.push(new Date(fight.date));
        }

        // Categorize fights as pre or post first knockout
        if (knockoutLosses.length === 0) {
          preKnockoutFights.push(fight);
        } else {
          postKnockoutFights.push(fight);
          // Check if this was another knockout loss after the first one
          if (isKnockoutLoss && knockoutLosses.length > 1) {
            subsequentKnockouts++;
          }
        }
      });

      // Calculate post-knockout statistics
      const postKnockoutWins = postKnockoutFights.filter(f => f.result === 'Win').length;
      const postKnockoutLosses = postKnockoutFights.filter(f => f.result === 'Loss').length;
      const preKnockoutWins = preKnockoutFights.filter(f => f.result === 'Win').length;
      const preKnockoutLosses = preKnockoutFights.filter(f => f.result === 'Loss').length;

      // Calculate average time between fights after knockouts
      let totalTimeBetweenFights = 0;
      let timesBetweenFights = 0;
      
      knockoutLosses.forEach((koDate, index) => {
        const nextFight = fights.rows.find(f => new Date(f.date) > koDate);
        if (nextFight) {
          totalTimeBetweenFights += (new Date(nextFight.date).getTime() - koDate.getTime()) / (1000 * 60 * 60 * 24);
          timesBetweenFights++;
        }
      });

      // Calculate vulnerability score (0-100)
      const vulnerabilityScore = Math.min(100, Math.max(0,
        (subsequentKnockouts * 25) +
        (knockoutLosses.length * 15) +
        (postKnockoutLosses / postKnockoutFights.length * 30) +
        (timesBetweenFights > 0 ? (90 / (totalTimeBetweenFights / timesBetweenFights)) * 30 : 0)
      ));

      // Determine recovery pattern
      let recoveryPattern: 'Strong' | 'Concerning' | 'Vulnerable' | 'Insufficient Data' = 'Insufficient Data';
      if (postKnockoutFights.length >= 2) {
        if (vulnerabilityScore < 30) recoveryPattern = 'Strong';
        else if (vulnerabilityScore < 60) recoveryPattern = 'Concerning';
        else recoveryPattern = 'Vulnerable';
      }

      // Calculate chin durability (inverse of vulnerability)
      const chinDurability = Math.max(0, 100 - vulnerabilityScore);

      // Calculate knockout susceptibility (probability of future knockout)
      const knockoutSusceptibility = Math.min(100, 
        (knockoutLosses.length * 20) + 
        (subsequentKnockouts * 15) + 
        ((postKnockoutLosses / postKnockoutFights.length) * 40)
      );

      return {
        totalKnockoutLosses: knockoutLosses.length,
        postKnockoutStats: {
          totalFights: postKnockoutFights.length,
          wins: postKnockoutWins,
          losses: postKnockoutLosses,
          winPercentage: postKnockoutFights.length > 0 
            ? (postKnockoutWins / postKnockoutFights.length) * 100 
            : 0,
          subsequentKnockouts,
          averageFightDuration: postKnockoutFights.length > 0 
            ? totalFightTime / postKnockoutFights.length 
            : 0,
          vulnerabilityScore,
          recoveryPattern,
          timeBetweenFights: timesBetweenFights > 0 
            ? totalTimeBetweenFights / timesBetweenFights 
            : 0
        },
        careerComparison: {
          preKnockoutWinRate: preKnockoutFights.length > 0 
            ? (preKnockoutWins / preKnockoutFights.length) * 100 
            : 0,
          postKnockoutWinRate: postKnockoutFights.length > 0 
            ? (postKnockoutWins / postKnockoutFights.length) * 100 
            : 0,
          winRateDrop: preKnockoutFights.length > 0 && postKnockoutFights.length > 0
            ? ((preKnockoutWins / preKnockoutFights.length) - 
               (postKnockoutWins / postKnockoutFights.length)) * 100
            : 0
        },
        riskAssessment: {
          chinDurability,
          knockoutSusceptibility,
          recommendedRecoveryTime: Math.max(90, knockoutLosses.length * 30 + subsequentKnockouts * 45)
        }
      };
    } finally {
      client.release();
    }
  }

  async analyzeStyleEvolution(fighterId: string): Promise<{
    styleTransitions: {
      earlyCareerStyle: string,
      currentStyle: string,
      adaptabilityScore: number
    },
    technicalGrowth: {
      strikeEvolution: {
        earlyStrikeAccuracy: number,
        currentStrikeAccuracy: number,
        preferredTargetsShift: {
          early: { head: number, body: number, leg: number },
          current: { head: number, body: number, leg: number }
        }
      },
      groundEvolution: {
        earlyTakedownAccuracy: number,
        currentTakedownAccuracy: number,
        submissionAttemptFrequency: {
          early: number,
          current: number
        }
      },
      skillsetExpansionRate: number
    }
  }> {
    const client = await this.pool.connect();
    try {
      // Get all fights in chronological order with their stats
      const fights = await client.query(`
        SELECT 
          f.date,
          f.result,
          s.tsl_tsa_perc as strike_accuracy,
          s.head_perc, s.body_perc, s.leg_perc,
          c.tk_acc_perc as takedown_accuracy,
          g.sm as submission_attempts,
          s.tsa as total_strikes_attempted,
          c.tda as total_takedowns_attempted
        FROM fights f
        LEFT JOIN striking_stats s ON f.fighter_id = s.fighter_id AND f.opponent = s.opponent
        LEFT JOIN clinch_stats c ON f.fighter_id = c.fighter_id AND f.opponent = c.opponent
        LEFT JOIN ground_stats g ON f.fighter_id = g.fighter_id AND f.opponent = g.opponent
        WHERE f.fighter_id = $1
        ORDER BY f.date ASC
      `, [fighterId]);

      if (fights.rows.length === 0) {
        throw new Error('No fight data found for fighter');
      }

      // Split career into early and current phases
      const earlyCareerFights = fights.rows.slice(0, Math.ceil(fights.rows.length * 0.3)); // First 30%
      const currentCareerFights = fights.rows.slice(-Math.ceil(fights.rows.length * 0.3)); // Last 30%

      // Calculate early career averages
      const earlyAverages = {
        strikeAccuracy: this.average(earlyCareerFights.map(f => f.strike_accuracy || 0)),
        headStrikes: this.average(earlyCareerFights.map(f => f.head_perc || 0)),
        bodyStrikes: this.average(earlyCareerFights.map(f => f.body_perc || 0)),
        legStrikes: this.average(earlyCareerFights.map(f => f.leg_perc || 0)),
        takedownAccuracy: this.average(earlyCareerFights.map(f => f.takedown_accuracy || 0)),
        submissionAttempts: this.average(earlyCareerFights.map(f => f.submission_attempts || 0))
      };

      // Calculate current career averages
      const currentAverages = {
        strikeAccuracy: this.average(currentCareerFights.map(f => f.strike_accuracy || 0)),
        headStrikes: this.average(currentCareerFights.map(f => f.head_perc || 0)),
        bodyStrikes: this.average(currentCareerFights.map(f => f.body_perc || 0)),
        legStrikes: this.average(currentCareerFights.map(f => f.leg_perc || 0)),
        takedownAccuracy: this.average(currentCareerFights.map(f => f.takedown_accuracy || 0)),
        submissionAttempts: this.average(currentCareerFights.map(f => f.submission_attempts || 0))
      };

      // Determine fighting styles based on stats
      const earlyCareerStyle = this.determineStyle(
        earlyAverages.strikeAccuracy,
        earlyAverages.takedownAccuracy,
        earlyAverages.submissionAttempts
      );

      const currentStyle = this.determineStyle(
        currentAverages.strikeAccuracy,
        currentAverages.takedownAccuracy,
        currentAverages.submissionAttempts
      );

      // Calculate adaptability score based on successful style changes
      const adaptabilityScore = this.calculateAdaptabilityScore(
        earlyAverages,
        currentAverages,
        fights.rows
      );

      // Calculate skillset expansion rate
      const skillsetExpansionRate = this.calculateSkillsetExpansionRate(
        earlyAverages,
        currentAverages,
        fights.rows
      );

      return {
        styleTransitions: {
          earlyCareerStyle,
          currentStyle,
          adaptabilityScore
        },
        technicalGrowth: {
          strikeEvolution: {
            earlyStrikeAccuracy: earlyAverages.strikeAccuracy,
            currentStrikeAccuracy: currentAverages.strikeAccuracy,
            preferredTargetsShift: {
              early: {
                head: earlyAverages.headStrikes,
                body: earlyAverages.bodyStrikes,
                leg: earlyAverages.legStrikes
              },
              current: {
                head: currentAverages.headStrikes,
                body: currentAverages.bodyStrikes,
                leg: currentAverages.legStrikes
              }
            }
          },
          groundEvolution: {
            earlyTakedownAccuracy: earlyAverages.takedownAccuracy,
            currentTakedownAccuracy: currentAverages.takedownAccuracy,
            submissionAttemptFrequency: {
              early: earlyAverages.submissionAttempts,
              current: currentAverages.submissionAttempts
            }
          },
          skillsetExpansionRate
        }
      };
    } finally {
      client.release();
    }
  }

  private average(numbers: number[]): number {
    return numbers.length > 0 
      ? numbers.reduce((a, b) => a + b) / numbers.length 
      : 0;
  }

  private determineStyle(
    strikeAccuracy: number,
    takedownAccuracy: number,
    submissionAttempts: number
  ): string {
    const styles = [];
    
    if (strikeAccuracy > 0.5) styles.push('Striker');
    if (takedownAccuracy > 0.3) styles.push('Wrestler');
    if (submissionAttempts > 1) styles.push('Grappler');
    
    if (styles.length === 0) return 'Balanced';
    if (styles.length > 1) return 'Hybrid ' + styles.join('-');
    return styles[0];
  }

  private calculateAdaptabilityScore(
    early: any,
    current: any,
    fights: any[]
  ): number {
    let score = 0;
    
    if (current.strikeAccuracy > early.strikeAccuracy) {
      score += 20;
    }
    
    if (current.takedownAccuracy > early.takedownAccuracy) {
      score += 20;
    }
    
    if (current.submissionAttempts > early.submissionAttempts) {
      score += 20;
    }
    
    const targetChange = Math.abs(current.headStrikes - early.headStrikes) +
                        Math.abs(current.bodyStrikes - early.bodyStrikes) +
                        Math.abs(current.legStrikes - early.legStrikes);
    score += Math.min(20, targetChange * 100);

    const earlyWinRate = this.calculateWinRate(fights.slice(0, Math.ceil(fights.length * 0.3)));
    const currentWinRate = this.calculateWinRate(fights.slice(-Math.ceil(fights.length * 0.3)));
    if (currentWinRate > earlyWinRate) {
      score += 20;
    }

    return Math.min(100, score);
  }

  private calculateWinRate(fights: any[]): number {
    const wins = fights.filter(f => f.result === 'Win').length;
    return fights.length > 0 ? wins / fights.length : 0;
  }

  private calculateSkillsetExpansionRate(
    early: any,
    current: any,
    fights: any[]
  ): number {
    let expansionScore = 0;
    
    const strikeImprovement = (current.strikeAccuracy - early.strikeAccuracy) / early.strikeAccuracy;
    expansionScore += Math.max(0, strikeImprovement * 30);
    
    const takedownImprovement = (current.takedownAccuracy - early.takedownAccuracy) / early.takedownAccuracy;
    expansionScore += Math.max(0, takedownImprovement * 30);
    
    const subImprovement = (current.submissionAttempts - early.submissionAttempts) / (early.submissionAttempts || 1);
    expansionScore += Math.max(0, subImprovement * 20);
    
    const targetDiversification = Math.abs(current.headStrikes - early.headStrikes) +
                                Math.abs(current.bodyStrikes - early.bodyStrikes) +
                                Math.abs(current.legStrikes - early.legStrikes);
    expansionScore += Math.min(20, targetDiversification * 100);

    return Math.min(100, expansionScore);
  }

  async analyzeCareerPhases(fighterId: string): Promise<{
    peakPerformance: {
      optimalAgeRange: string,
      peakDuration: number,
      currentPhase: 'Rising' | 'Peak' | 'Declining' | 'Veteran',
      timeInCurrentPhase: number
    },
    careerTrajectory: {
      totalFights: number,
      yearlyFightAverage: number,
      winRateProgression: {
        early: number,
        middle: number,
        recent: number
      },
      performanceMetrics: {
        strikeAccuracyTrend: number,
        takedownAccuracyTrend: number,
        finishRate: number,
        averageFightTime: number
      },
      activityLevel: 'High' | 'Moderate' | 'Low'
    },
    sustainabilityScore: number,
    careerProjection: {
      estimatedPeakRemaining: number,
      activityLevel: string,
      riskFactors: string[]
    }
  }> {
    const client = await this.pool.connect();
    try {
      // Get fighter's basic info and all fights with stats
      const fighterInfo = await client.query(`
        SELECT 
          f.birthdate,
          f.age,
          f.win_loss_record
        FROM fighters f
        WHERE f.fighter_id = $1
      `, [fighterId]);

      const fights = await client.query(`
        SELECT 
          f.date,
          f.result,
          f.decision,
          f.rnd,
          f.time,
          s.tsl_tsa_perc as strike_accuracy,
          c.tk_acc_perc as takedown_accuracy,
          g.sm as submission_attempts
        FROM fights f
        LEFT JOIN striking_stats s ON f.fighter_id = s.fighter_id AND f.opponent = s.opponent
        LEFT JOIN clinch_stats c ON f.fighter_id = c.fighter_id AND f.opponent = c.opponent
        LEFT JOIN ground_stats g ON f.fighter_id = g.fighter_id AND f.opponent = g.opponent
        WHERE f.fighter_id = $1
        ORDER BY f.date ASC
      `, [fighterId]);

      if (fights.rows.length === 0) {
        throw new Error('No fight data found for fighter');
      }

      const fighterData = fighterInfo.rows[0];
      const currentAge = fighterData.age;
      const allFights = fights.rows;

      // Divide career into phases
      const careerDuration = new Date(allFights[allFights.length - 1].date).getTime() - 
                            new Date(allFights[0].date).getTime();
      const careerThirds = Math.floor(allFights.length / 3);
      
      const earlyCareer = allFights.slice(0, careerThirds);
      const middleCareer = allFights.slice(careerThirds, careerThirds * 2);
      const recentCareer = allFights.slice(careerThirds * 2);

      // Calculate win rates for each phase
      const winRateProgression = {
        early: this.calculateWinRate(earlyCareer),
        middle: this.calculateWinRate(middleCareer),
        recent: this.calculateWinRate(recentCareer)
      };

      // Determine current phase
      const currentPhase = this.determineCareerPhase(
        currentAge,
        winRateProgression,
        recentCareer
      );

      // Calculate performance metrics
      const performanceMetrics = {
        strikeAccuracyTrend: this.calculatePerformanceTrend(allFights, 'strike_accuracy'),
        takedownAccuracyTrend: this.calculatePerformanceTrend(allFights, 'takedown_accuracy'),
        finishRate: this.calculateFinishRate(allFights),
        averageFightTime: this.calculateAverageFightTime(allFights)
      };

      // Calculate activity level
      const yearlyFightAverage = this.calculateYearlyFightAverage(allFights);
      const activityLevel = yearlyFightAverage >= 3 ? 'High' : 
                           yearlyFightAverage >= 2 ? 'Moderate' : 'Low';

      // Calculate sustainability score
      const sustainabilityScore = this.calculateSustainabilityScore(
        currentAge,
        performanceMetrics,
        winRateProgression,
        activityLevel
      );

      // Generate career projection
      const projection = this.generateCareerProjection(
        currentAge,
        currentPhase,
        sustainabilityScore,
        performanceMetrics
      );

      // Find optimal age range based on performance
      const optimalAgeRange = this.findOptimalAgeRange(allFights, fighterData.birthdate);

      return {
        peakPerformance: {
          optimalAgeRange,
          peakDuration: this.calculatePeakDuration(allFights, optimalAgeRange),
          currentPhase,
          timeInCurrentPhase: this.calculateTimeInPhase(allFights, currentPhase)
        },
        careerTrajectory: {
          totalFights: allFights.length,
          yearlyFightAverage,
          winRateProgression,
          performanceMetrics,
          activityLevel
        },
        sustainabilityScore,
        careerProjection: projection
      };
    } finally {
      client.release();
    }
  }

  private determineCareerPhase(
    age: number,
    winRates: { early: number, middle: number, recent: number },
    recentFights: any[]
  ): 'Rising' | 'Peak' | 'Declining' | 'Veteran' {
    if (age < 27) return 'Rising';
    
    const recentTrend = winRates.recent - winRates.middle;
    const overallTrend = winRates.recent - winRates.early;

    if (age < 32 && recentTrend >= 0) return 'Peak';
    if (age >= 32 && recentTrend > 0) return 'Peak';
    if (age >= 35 || (recentTrend < 0 && overallTrend < 0)) return 'Veteran';
    
    return 'Declining';
  }

  private calculatePerformanceTrend(fights: any[], metric: string): number {
    const values = fights.map(f => f[metric] || 0);
    if (values.length < 2) return 0;

    const recentAvg = this.average(values.slice(-3));
    const historicalAvg = this.average(values.slice(0, -3));
    
    return ((recentAvg - historicalAvg) / historicalAvg) * 100;
  }

  private calculateFinishRate(fights: any[]): number {
    const finishes = fights.filter(f => 
      f.result === 'Win' && 
      f.decision && 
      !f.decision.toLowerCase().includes('decision')
    ).length;
    
    return fights.length > 0 ? (finishes / fights.length) * 100 : 0;
  }

  private calculateAverageFightTime(fights: any[]): number {
    return fights.reduce((acc, fight) => {
      const [minutes, seconds] = fight.time.split(':').map(Number);
      return acc + ((fight.rnd - 1) * 5 * 60 + minutes * 60 + seconds);
    }, 0) / fights.length;
  }

  private calculateYearlyFightAverage(fights: any[]): number {
    const firstFight = new Date(fights[0].date);
    const lastFight = new Date(fights[fights.length - 1].date);
    const yearsDiff = (lastFight.getTime() - firstFight.getTime()) / (1000 * 60 * 60 * 24 * 365);
    
    return fights.length / yearsDiff;
  }

  private calculateSustainabilityScore(
    age: number,
    metrics: any,
    winRates: any,
    activityLevel: string
  ): number {
    let score = 100;

    // Age impact
    if (age > 35) score -= (age - 35) * 3;
    
    // Performance trends impact
    if (metrics.strikeAccuracyTrend < 0) score -= Math.abs(metrics.strikeAccuracyTrend) * 0.5;
    if (metrics.takedownAccuracyTrend < 0) score -= Math.abs(metrics.takedownAccuracyTrend) * 0.5;
    
    // Win rate impact
    if (winRates.recent < winRates.middle) score -= (winRates.middle - winRates.recent) * 2;
    
    // Activity level impact
    if (activityLevel === 'Low') score -= 10;
    if (activityLevel === 'High') score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  private generateCareerProjection(
    age: number,
    currentPhase: string,
    sustainabilityScore: number,
    metrics: any
  ): {
    estimatedPeakRemaining: number,
    activityLevel: string,
    riskFactors: string[]
  } {
    const riskFactors: string[] = [];

    // Calculate estimated peak remaining
    let peakRemaining = 0;
    if (currentPhase === 'Rising') {
      peakRemaining = (32 - age) * 12;
    } else if (currentPhase === 'Peak') {
      peakRemaining = Math.max(0, (35 - age) * 12);
    } else {
      peakRemaining = Math.max(0, (38 - age) * 6);
    }

    // Adjust based on sustainability score
    peakRemaining = peakRemaining * (sustainabilityScore / 100);

    // Determine activity level based on data
    let activityLevel = 'Moderate';
    if (sustainabilityScore < 50) {
      activityLevel = 'Low';
      riskFactors.push('Declining Performance Metrics');
    } else if (sustainabilityScore > 80) {
      activityLevel = 'High';
    }

    // Add age-based risk factors
    if (age > 35) {
      riskFactors.push('Old');
    }

    // Add performance-based risk factors
    if (metrics.strikeAccuracyTrend < 0) {
      riskFactors.push('Declining Strike Accuracy');
    }
    if (metrics.takedownAccuracyTrend < 0) {
      riskFactors.push('Declining Takedown Success');
    }

    return {
      estimatedPeakRemaining: Math.round(peakRemaining),
      activityLevel,
      riskFactors
    };
  }

  private findOptimalAgeRange(fights: any[], birthdate: Date): string {
    const performanceByAge = new Map<number, number>();
    
    fights.forEach(fight => {
      const fightDate = new Date(fight.date);
      const ageAtFight = Math.floor(
        (fightDate.getTime() - new Date(birthdate).getTime()) / 
        (1000 * 60 * 60 * 24 * 365)
      );
      
      const performanceScore = (
        (fight.strike_accuracy || 0) + 
        (fight.takedown_accuracy || 0) + 
        (fight.result === 'Win' ? 1 : 0)
      ) / 3;
      
      performanceByAge.set(
        ageAtFight,
        (performanceByAge.get(ageAtFight) || 0) + performanceScore
      );
    });

    let bestAge = 0;
    let bestScore = 0;
    
    performanceByAge.forEach((score, age) => {
      if (score > bestScore) {
        bestScore = score;
        bestAge = age;
      }
    });

    return `${bestAge - 1}-${bestAge + 1}`;
  }

  private calculatePeakDuration(fights: any[], optimalAgeRange: string): number {
    const [startAge, endAge] = optimalAgeRange.split('-').map(Number);
    const peakFights = fights.filter(fight => {
      const fightAge = new Date(fight.date).getFullYear() - 
                      new Date(fights[0].date).getFullYear() + 
                      parseInt(optimalAgeRange.split('-')[0]);
      return fightAge >= startAge && fightAge <= endAge;
    });

    if (peakFights.length < 2) return 0;

    return (
      new Date(peakFights[peakFights.length - 1].date).getTime() - 
      new Date(peakFights[0].date).getTime()
    ) / (1000 * 60 * 60 * 24);
  }

  private calculateTimeInPhase(fights: any[], currentPhase: string): number {
    const phaseStartDate = this.findPhaseStartDate(fights, currentPhase);
    if (!phaseStartDate) return 0;

    return (
      new Date().getTime() - 
      new Date(phaseStartDate).getTime()
    ) / (1000 * 60 * 60 * 24);
  }

  private findPhaseStartDate(fights: any[], currentPhase: string): Date | null {
    // This is a simplified version - you might want to make this more sophisticated
    if (currentPhase === 'Rising') return new Date(fights[0].date);
    if (currentPhase === 'Veteran') return new Date(fights[fights.length - 3].date);
    
    // For Peak and Declining, look for significant performance changes
    for (let i = fights.length - 1; i >= 0; i--) {
      const recentPerformance = this.calculatePerformanceScore(fights.slice(i));
      const previousPerformance = this.calculatePerformanceScore(fights.slice(0, i));
      
      if (Math.abs(recentPerformance - previousPerformance) > 0.2) {
        return new Date(fights[i].date);
      }
    }

    return null;
  }

  private calculatePerformanceScore(fights: any[]): number {
    if (fights.length === 0) return 0;
    
    return fights.reduce((acc, fight) => {
      return acc + (
        (fight.strike_accuracy || 0) +
        (fight.takedown_accuracy || 0) +
        (fight.result === 'Win' ? 1 : 0)
      ) / 3;
    }, 0) / fights.length;
  }
} 