import { Pool } from 'pg';

interface EloRating {
  rating: number;
  volatility: number;
  lastActivity: Date;
}

export class RankingsService {
  private readonly BASE_RATING = 1500;
  private readonly K_FACTOR_BASE = 32;
  private readonly INACTIVITY_PENALTY = 25;
  
  // Enhanced performance factors with opponent rating multipliers
  private readonly PERFORMANCE_FACTORS = {
    // Wins
    KO_WIN_ROUND1: 2.0,    
    KO_WIN: 1.7,           
    SUB_WIN_ROUND1: 1.8,   
    SUB_WIN: 1.5,          
    DECISION_WIN_DOMINANT: 1.3,
    DECISION_WIN_CLOSE: 1.1,    
    
    // Losses
    KO_LOSS_ROUND1: 0.5,   
    KO_LOSS: 0.6,          
    SUB_LOSS_ROUND1: 0.6,  
    SUB_LOSS: 0.7,         
    DECISION_LOSS_DOMINANT: 0.8,
    DECISION_LOSS_CLOSE: 0.9,    
    
    DRAW: 1.0
  };

  // New opponent quality multipliers
  private readonly OPPONENT_QUALITY = {
    ELITE: 1.5,        // Opponent rating > your rating + 200
    SUPERIOR: 1.3,     // Opponent rating > your rating + 100
    EVEN: 1.0,         // Opponent rating within ±100 of your rating
    INFERIOR: 0.8,     // Opponent rating < your rating - 100
    MUCH_INFERIOR: 0.6 // Opponent rating < your rating - 200
  };

  constructor(private pool: Pool) {}

  private calculateExpectedScore(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  private calculateKFactor(rating: number, fightCount: number): number {
    // Higher K-factor for newer fighters or those far from average rating
    const experienceFactor = Math.max(1, 2 - (fightCount / 10)); // Decreases with more fights
    const ratingDispersionFactor = Math.abs(rating - this.BASE_RATING) > 200 ? 1.2 : 1;
    return this.K_FACTOR_BASE * experienceFactor * ratingDispersionFactor;
  }

  private calculatePerformanceMultiplier(result: string, decision: string, round: number): number {
    const normalizedResult = result.toLowerCase();
    const normalizedDecision = decision.toLowerCase();

    if (normalizedResult.includes('win')) {
      if (normalizedDecision.includes('ko') || normalizedDecision.includes('tko')) {
        return round === 1 ? this.PERFORMANCE_FACTORS.KO_WIN_ROUND1 : this.PERFORMANCE_FACTORS.KO_WIN;
      }
      if (normalizedDecision.includes('submission')) {
        return round === 1 ? this.PERFORMANCE_FACTORS.SUB_WIN_ROUND1 : this.PERFORMANCE_FACTORS.SUB_WIN;
      }
      if (normalizedDecision.includes('unanimous')) {
        return this.PERFORMANCE_FACTORS.DECISION_WIN_DOMINANT;
      }
      return this.PERFORMANCE_FACTORS.DECISION_WIN_CLOSE;
    }
    
    if (normalizedResult.includes('loss')) {
      if (normalizedDecision.includes('ko') || normalizedDecision.includes('tko')) {
        return round === 1 ? this.PERFORMANCE_FACTORS.KO_LOSS_ROUND1 : this.PERFORMANCE_FACTORS.KO_LOSS;
      }
      if (normalizedDecision.includes('submission')) {
        return round === 1 ? this.PERFORMANCE_FACTORS.SUB_LOSS_ROUND1 : this.PERFORMANCE_FACTORS.SUB_LOSS;
      }
      if (normalizedDecision.includes('unanimous')) {
        return this.PERFORMANCE_FACTORS.DECISION_LOSS_DOMINANT;
      }
      return this.PERFORMANCE_FACTORS.DECISION_LOSS_CLOSE;
    }
    
    return this.PERFORMANCE_FACTORS.DRAW;
  }

  private calculateInactivityPenalty(lastFightDate: Date): number {
    const monthsInactive = (new Date().getTime() - lastFightDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return Math.max(0, Math.floor(monthsInactive) * this.INACTIVITY_PENALTY);
  }

  private async getOrCreateFighterRating(
    client: any, 
    fighterId: string, 
    weightClassId: number
  ): Promise<EloRating> {
    const result = await client.query(`
      SELECT points as rating, volatility, last_updated
      FROM analytics_rankings
      WHERE fighter_id = $1 AND weight_class_id = $2
    `, [fighterId, weightClassId]);

    if (result.rows.length > 0) {
      return {
        rating: result.rows[0].rating,
        volatility: result.rows[0].volatility,
        lastActivity: result.rows[0].last_updated
      };
    }

    return {
      rating: this.BASE_RATING,
      volatility: 100,
      lastActivity: new Date()
    };
  }

  private async getFighterStats(client: any, fighterId: string): Promise<{
    winStreak: number,
    fightCount: number,
    recentPerformance: number
  }> {
    const result = await client.query(`
      WITH recent_fights AS (
        SELECT 
          result,
          decision,
          date,
          ROW_NUMBER() OVER (ORDER BY date DESC) as fight_number
        FROM fights
        WHERE fighter_id = $1
        ORDER BY date DESC
        LIMIT 5
      )
      SELECT 
        COUNT(*) as fight_count,
        SUM(CASE WHEN result = 'Win' THEN 1 ELSE 0 END) as recent_wins,
        MAX(CASE WHEN result = 'Win' AND fight_number = 1 THEN 1 
             WHEN result != 'Win' AND fight_number = 1 THEN 0 END) as last_fight_win
      FROM recent_fights
    `, [fighterId]);

    const stats = result.rows[0];
    const winStreak = stats.last_fight_win === 1 ? 1 : 0;
    const recentPerformance = stats.recent_wins / stats.fight_count;

    return {
      winStreak,
      fightCount: parseInt(stats.fight_count),
      recentPerformance
    };
  }

  private calculateOpponentQualityMultiplier(fighterRating: number, opponentRating: number): number {
    const ratingDiff = opponentRating - fighterRating;
    
    if (ratingDiff > 200) return this.OPPONENT_QUALITY.ELITE;
    if (ratingDiff > 100) return this.OPPONENT_QUALITY.SUPERIOR;
    if (ratingDiff < -200) return this.OPPONENT_QUALITY.MUCH_INFERIOR;
    if (ratingDiff < -100) return this.OPPONENT_QUALITY.INFERIOR;
    return this.OPPONENT_QUALITY.EVEN;
  }

  private calculateWinQuality(
    performanceMultiplier: number,
    opponentRating: number,
    fighterRating: number,
    opponentWinRate: number
  ): number {
    const opponentQuality = this.calculateOpponentQualityMultiplier(fighterRating, opponentRating);
    const opponentStrength = Math.max(0.5, opponentWinRate); // Minimum 0.5 multiplier for win rate

    // Weighted combination of factors
    return (
      performanceMultiplier * 0.3 +  // How you won (30% weight)
      opponentQuality * 0.5 +        // Opponent rating relative to you (50% weight)
      opponentStrength * 0.2         // Opponent's win rate (20% weight)
    );
  }

  private async getOpponentStrength(client: any, fighterId: string): Promise<number> {
    const result = await client.query(`
      WITH fighter_record AS (
        SELECT 
          COUNT(*) as total_fights,
          COUNT(CASE WHEN result = 'Win' THEN 1 END) as wins,
          COUNT(CASE WHEN result = 'Loss' THEN 1 END) as losses,
          COUNT(CASE WHEN result = 'Draw' THEN 1 END) as draws
        FROM fights
        WHERE fighter_id = $1
          AND date >= NOW() - INTERVAL '3 years'
      )
      SELECT 
        CASE 
          WHEN total_fights > 0 
          THEN (wins + draws * 0.5) / total_fights
          ELSE 0.5
        END as win_rate
      FROM fighter_record
    `, [fighterId]);

    return result.rows[0].win_rate;
  }

  async updateRankings(weightClassId: number) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get weight class details
      const weightClassResult = await client.query(`
        SELECT weight_limit, division, name FROM weight_classes WHERE weight_class_id = $1
      `, [weightClassId]);
      
      if (weightClassResult.rows.length === 0) {
        throw new Error(`Weight class with ID ${weightClassId} not found`);
      }
      
      const weightClass = weightClassResult.rows[0];
      console.log(`Starting update for ${weightClass.division} ${weightClass.name}`);

      // Determine weight ranges based on division
      let minWeight, maxWeight;
      const isWomensDivision = [115, 125, 135, 145].includes(weightClass.weight_limit);

      if (isWomensDivision) {
        // Women's divisions have exact weight classes
        minWeight = weightClass.weight_limit;
        maxWeight = weightClass.weight_limit;
      } else {
        // Men's divisions have ranges
        switch (weightClass.weight_limit) {
          case 125: // Flyweight
            minWeight = 0;
            maxWeight = 125;
            break;
          case 135: // Bantamweight
            minWeight = 126;
            maxWeight = 135;
            break;
          case 145: // Featherweight
            minWeight = 136;
            maxWeight = 145;
            break;
          case 155: // Lightweight
            minWeight = 146;
            maxWeight = 155;
            break;
          case 170: // Welterweight
            minWeight = 156;
            maxWeight = 170;
            break;
          case 185: // Middleweight
            minWeight = 171;
            maxWeight = 185;
            break;
          case 205: // Light Heavyweight
            minWeight = 186;
            maxWeight = 205;
            break;
          case 265: // Heavyweight
            minWeight = 206;
            maxWeight = 265;
            break;
          default:
            throw new Error(`Invalid weight limit: ${weightClass.weight_limit}`);
        }
      }

      // Get all fights with round information - OPTIMIZED QUERY
      const fights = await client.query(`
        SELECT DISTINCT ON (f.fighter_id, opp.fighter_id, f.date)
          f.fighter_id,
          f.opponent,
          f.result,
          f.decision,
          f.date,
          f.rnd as round,
          opp.fighter_id as opponent_id,
          fg1.weight as fighter_weight,
          fg2.weight as opponent_weight
        FROM fights f
        JOIN fighters fg1 ON f.fighter_id = fg1.fighter_id
        JOIN fighters opp ON f.opponent = CONCAT(opp.first_name, ' ', opp.last_name)
        JOIN fighters fg2 ON opp.fighter_id = fg2.fighter_id
        WHERE f.date >= NOW() - INTERVAL '3 years'
          AND fg1.weight >= $1 AND fg1.weight <= $2
          AND fg2.weight >= $1 AND fg2.weight <= $2
          ${isWomensDivision ? 
            `AND fg1.weight IN (115, 125, 135, 145)
             AND fg2.weight IN (115, 125, 135, 145)` 
            : 
            `AND fg1.weight NOT IN (115, 125, 135, 145)
             AND fg2.weight NOT IN (115, 125, 135, 145)`
          }
        ORDER BY f.fighter_id, opp.fighter_id, f.date DESC
      `, [minWeight, maxWeight]);

      console.log(`Found ${fights.rows.length} fights to process`);

      // Create a map to store fighter ratings for faster access
      const fighterRatings = new Map<string, EloRating>();
      const fighterStats = new Map<string, {
        winStreak: number,
        fightCount: number,
        recentPerformance: number
      }>();

      // Process fights with progress logging
      let processedFights = 0;
      for (const fight of fights.rows) {
        processedFights++;
        if (processedFights % 10 === 0) {
          console.log(`Processed ${processedFights}/${fights.rows.length} fights`);
        }

        // Get fighter stats (cached)
        let fighter1Stats = fighterStats.get(fight.fighter_id);
        let fighter2Stats = fighterStats.get(fight.opponent_id);

        if (!fighter1Stats) {
          fighter1Stats = await this.getFighterStats(client, fight.fighter_id);
          fighterStats.set(fight.fighter_id, fighter1Stats);
        }
        if (!fighter2Stats) {
          fighter2Stats = await this.getFighterStats(client, fight.opponent_id);
          fighterStats.set(fight.opponent_id, fighter2Stats);
        }

        // Get fighter ratings (cached)
        let fighter1Rating = fighterRatings.get(fight.fighter_id);
        let fighter2Rating = fighterRatings.get(fight.opponent_id);

        if (!fighter1Rating) {
          fighter1Rating = await this.getOrCreateFighterRating(client, fight.fighter_id, weightClassId);
          fighterRatings.set(fight.fighter_id, fighter1Rating);
        }
        if (!fighter2Rating) {
          fighter2Rating = await this.getOrCreateFighterRating(client, fight.opponent_id, weightClassId);
          fighterRatings.set(fight.opponent_id, fighter2Rating);
        }

        // Ensure valid ratings
        fighter1Rating.rating = isNaN(fighter1Rating.rating) ? this.BASE_RATING : fighter1Rating.rating;
        fighter2Rating.rating = isNaN(fighter2Rating.rating) ? this.BASE_RATING : fighter2Rating.rating;

        const k1 = this.calculateKFactor(fighter1Rating.rating, fighter1Stats.fightCount);
        const k2 = this.calculateKFactor(fighter2Rating.rating, fighter2Stats.fightCount);

        const fighter1WinRate = await this.getOpponentStrength(client, fight.fighter_id);
        const fighter2WinRate = await this.getOpponentStrength(client, fight.opponent_id);

        const performanceMultiplier = this.calculatePerformanceMultiplier(
          fight.result, 
          fight.decision, 
          fight.round
        );

        // Calculate win quality for both fighters
        const fighter1WinQuality = this.calculateWinQuality(
          performanceMultiplier,
          fighter2Rating.rating,
          fighter1Rating.rating,
          fighter2WinRate
        );

        const fighter2WinQuality = this.calculateWinQuality(
          performanceMultiplier,
          fighter1Rating.rating,
          fighter2Rating.rating,
          fighter1WinRate
        );

        const expectedScore1 = this.calculateExpectedScore(fighter1Rating.rating, fighter2Rating.rating);
        const actualScore = fight.result.toLowerCase().includes('win') ? 1 : 0;

        // Apply win quality to rating changes
        const ratingChange1 = k1 * fighter1WinQuality * (actualScore - expectedScore1);
        const ratingChange2 = k2 * fighter2WinQuality * ((1 - actualScore) - (1 - expectedScore1));

        // Calculate new ratings with enhanced quality factors
        let newRating1 = fighter1Rating.rating + ratingChange1;
        let newRating2 = fighter2Rating.rating + ratingChange2;

        // Add win streak and performance bonuses scaled by opponent quality
        if (actualScore === 1) {
          const opponentQualityBonus1 = this.calculateOpponentQualityMultiplier(
            fighter1Rating.rating, 
            fighter2Rating.rating
          ) * 50;
          newRating1 += opponentQualityBonus1;
        } else {
          const opponentQualityBonus2 = this.calculateOpponentQualityMultiplier(
            fighter2Rating.rating, 
            fighter1Rating.rating
          ) * 50;
          newRating2 += opponentQualityBonus2;
        }

        // Final bounds check
        newRating1 = Math.max(500, Math.min(2000, isNaN(newRating1) ? this.BASE_RATING : newRating1));
        newRating2 = Math.max(500, Math.min(2000, isNaN(newRating2) ? this.BASE_RATING : newRating2));

        // Update volatility with safeguards
        const volatilityChange1 = Math.min(50, Math.max(-50, Math.abs(ratingChange1) / 100));
        const volatilityChange2 = Math.min(50, Math.max(-50, Math.abs(ratingChange2) / 100));

        // Log any unexpected values
        if (isNaN(newRating1) || isNaN(newRating2)) {
          console.error('Final rating is NaN:', {
            fighter1: {
              originalRating: fighter1Rating.rating,
              ratingChange: ratingChange1,
              streakBonus: 0,
              performanceBonus: 0,
              finalRating: newRating1
            },
            fighter2: {
              originalRating: fighter2Rating.rating,
              ratingChange: ratingChange2,
              streakBonus: 0,
              performanceBonus: 0,
              finalRating: newRating2
            }
          });
          continue;
        }

        // Insert or update ratings
        await client.query(`
          INSERT INTO analytics_rankings 
            (fighter_id, weight_class_id, points, volatility, last_updated, rank)
          VALUES 
            ($1, $2, $3::numeric, $4::numeric, $5, 
              (SELECT COALESCE(MAX(rank), 0) + 1 
               FROM analytics_rankings 
               WHERE weight_class_id = $2)
            )
          ON CONFLICT (fighter_id, weight_class_id) 
          DO UPDATE SET 
            points = $3::numeric,
            volatility = $4::numeric,
            last_updated = $5
        `, [
          fight.fighter_id,
          weightClassId,
          newRating1.toFixed(2),
          Math.min(200, Math.max(50, fighter1Rating.volatility + volatilityChange1)).toFixed(2),
          fight.date
        ]);

        await client.query(`
          INSERT INTO analytics_rankings 
            (fighter_id, weight_class_id, points, volatility, last_updated, rank)
          VALUES 
            ($1, $2, $3::numeric, $4::numeric, $5, 
              (SELECT COALESCE(MAX(rank), 0) + 1 
               FROM analytics_rankings 
               WHERE weight_class_id = $2)
            )
          ON CONFLICT (fighter_id, weight_class_id) 
          DO UPDATE SET 
            points = $3::numeric,
            volatility = $4::numeric,
            last_updated = $5
        `, [
          fight.opponent_id,
          weightClassId,
          newRating2.toFixed(2),
          Math.min(200, Math.max(50, fighter2Rating.volatility + volatilityChange2)).toFixed(2),
          fight.date
        ]);

        // Update the cached ratings
        fighterRatings.set(fight.fighter_id, {
          ...fighter1Rating,
          rating: newRating1,
          volatility: Math.min(200, Math.max(50, fighter1Rating.volatility + volatilityChange1))
        });
        fighterRatings.set(fight.opponent_id, {
          ...fighter2Rating,
          rating: newRating2,
          volatility: Math.min(200, Math.max(50, fighter2Rating.volatility + volatilityChange2))
        });
      }

      console.log('Updating final rankings');
      // Final ranking update
      await client.query(`
        WITH ranked AS (
          SELECT 
            fighter_id,
            weight_class_id,
            points,
            ROW_NUMBER() OVER (
              PARTITION BY weight_class_id 
              ORDER BY points DESC
            ) as new_rank
          FROM analytics_rankings
          WHERE weight_class_id = $1
        )
        UPDATE analytics_rankings ar
        SET 
          previous_rank = ar.rank,
          rank = r.new_rank
        FROM ranked r
        WHERE ar.fighter_id = r.fighter_id
          AND ar.weight_class_id = r.weight_class_id
      `, [weightClassId]);

      await client.query('COMMIT');
      console.log(`Completed update for ${weightClass.division} ${weightClass.name}`);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('Error in updateRankings:', e);
      throw e;
    } finally {
      client.release();
    }
  }

  async getWeightClasses() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM weight_classes 
        ORDER BY display_order
      `);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getAnalyticsRankings(weightClassId: number) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          ar.rank,
          ar.previous_rank,
          CAST(ar.points AS FLOAT) as points,
          f.fighter_id,
          f.first_name,
          f.last_name,
          f.nickname,
          f.win_loss_record,
          f.image_url,
          wc.name as weight_class,
          wc.division
        FROM analytics_rankings ar
        JOIN fighters f ON ar.fighter_id = f.fighter_id
        JOIN weight_classes wc ON ar.weight_class_id = wc.weight_class_id
        WHERE ar.weight_class_id = $1
          AND ar.rank <= 25  -- Only get top 25
        ORDER BY ar.rank
      `, [weightClassId]);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getCommunityRankings(weightClassId: number) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          cr.rank,
          cr.previous_rank,
          cr.points,
          f.fighter_id,
          f.first_name,
          f.last_name,
          f.nickname,
          f.win_loss_record,
          wc.name as weight_class,
          wc.division
        FROM community_rankings cr
        JOIN fighters f ON cr.fighter_id = f.fighter_id
        JOIN weight_classes wc ON cr.weight_class_id = wc.weight_class_id
        WHERE cr.weight_class_id = $1
        ORDER BY cr.rank
      `, [weightClassId]);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  // This would be called by your analytics system
  async updateAnalyticsRanking(
    fighterId: string,
    weightClassId: number,
    points: number
  ) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get current rank if exists
      const currentRank = await client.query(
        'SELECT rank FROM analytics_rankings WHERE fighter_id = $1 AND weight_class_id = $2',
        [fighterId, weightClassId]
      );

      // Insert or update the ranking
      await client.query(`
        INSERT INTO analytics_rankings (fighter_id, weight_class_id, rank, previous_rank, points)
        VALUES ($1, $2, 
          (SELECT COALESCE(MAX(rank), 0) + 1 FROM analytics_rankings WHERE weight_class_id = $2),
          NULL,
          $3
        )
        ON CONFLICT (fighter_id, weight_class_id) 
        DO UPDATE SET
          previous_rank = analytics_rankings.rank,
          points = $3,
          last_updated = CURRENT_TIMESTAMP
      `, [fighterId, weightClassId, points]);

      // Recalculate ranks based on points
      await client.query(`
        WITH ranked AS (
          SELECT 
            fighter_id,
            weight_class_id,
            ROW_NUMBER() OVER (PARTITION BY weight_class_id ORDER BY points DESC) as new_rank
          FROM analytics_rankings
          WHERE weight_class_id = $1
        )
        UPDATE analytics_rankings ar
        SET rank = r.new_rank
        FROM ranked r
        WHERE ar.fighter_id = r.fighter_id
        AND ar.weight_class_id = r.weight_class_id
      `, [weightClassId]);

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // This would be called when users vote/rate fighters
  async updateCommunityRanking(
    fighterId: string,
    weightClassId: number,
    points: number
  ) {
    // Similar to updateAnalyticsRanking but for community_rankings table
    // Implementation would depend on how you want to calculate community points
  }
} 