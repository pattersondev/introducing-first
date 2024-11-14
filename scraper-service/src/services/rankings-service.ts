import { Pool } from 'pg';

interface EloRating {
  rating: number;
  volatility: number;
  lastActivity: Date;
}

type League = 'UFC' | 'BELLATOR' | 'PFL' | 'OTHER';

export class RankingsService {
  // Cache for prepared statements
  private preparedStatements: { [key: string]: string } = {};
  
  // Cache for fighter data
  private fighterCache: Map<string, any> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes
  private lastCacheClear: number = Date.now();

  private readonly BASE_RATING = 1200;
  private readonly K_FACTOR_BASE = 40;
  private readonly INACTIVITY_PENALTY = 50;

  private readonly PERFORMANCE_FACTORS = {
    // Wins
    KO_WIN_ROUND1: 2.5,    
    KO_WIN: 2.0,           
    SUB_WIN_ROUND1: 2.3,   
    SUB_WIN: 1.8,          
    DECISION_WIN_DOMINANT: 1.5,
    DECISION_WIN_CLOSE: 1.2,    
    
    // Losses
    KO_LOSS_ROUND1: 0.4,   
    KO_LOSS: 0.5,          
    SUB_LOSS_ROUND1: 0.4,  
    SUB_LOSS: 0.5,         
    DECISION_LOSS_DOMINANT: 0.7,
    DECISION_LOSS_CLOSE: 0.8,    
    
    DRAW: 1.0
  };

  private readonly OPPONENT_QUALITY = {
    ELITE: 2.0,        // Opponent rating > your rating + 200
    SUPERIOR: 1.5,     // Opponent rating > your rating + 100
    EVEN: 1.0,         // Opponent rating within ±100 of your rating
    INFERIOR: 0.6,     // Opponent rating < your rating - 100
    MUCH_INFERIOR: 0.4 // Opponent rating < your rating - 200
  };

  private readonly LEAGUE_MULTIPLIERS: Record<League, number> = {
    UFC: 2.5,
    BELLATOR: 1,
    PFL: 0.7,      
    OTHER: 0.5
  };

  constructor(private pool: Pool) {
    this.initializePreparedStatements();
  }

  private async initializePreparedStatements() {
    this.preparedStatements = {
      getFighterRating: `
        SELECT points as rating, volatility, last_updated
        FROM analytics_rankings
        WHERE fighter_id = $1 AND weight_class_id = $2
      `,
      getFighterStats: `
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
      `,
      getCurrentLeague: `
        SELECT event 
        FROM fights 
        WHERE fighter_id = $1 
        ORDER BY date DESC 
        LIMIT 1
      `,
      updateRanking: `
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
      `
    };
  }

  private clearCacheIfNeeded() {
    const now = Date.now();
    if (now - this.lastCacheClear > this.cacheTimeout) {
      this.fighterCache.clear();
      this.lastCacheClear = now;
    }
  }

  private getCacheKey(type: string, id: string, additionalParams?: string): string {
    return `${type}:${id}${additionalParams ? `:${additionalParams}` : ''}`;
  }

  private async getFromCacheOrDatabase<T>(
    cacheKey: string,
    dbFetch: () => Promise<T>
  ): Promise<T> {
    this.clearCacheIfNeeded();
    
    const cached = this.fighterCache.get(cacheKey);
    if (cached) {
      return cached as T;
    }

    const result = await dbFetch();
    this.fighterCache.set(cacheKey, result);
    return result;
  }

  private async batchDatabaseOperations<T>(
    operations: (() => Promise<T>)[],
    batchSize: number = 10
  ): Promise<T[]> {
    const results: T[] = [];
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(op => op()));
      results.push(...batchResults);
    }
    return results;
  }

  private async getOrCreateFighterRating(
    client: any,
    fighterId: string,
    weightClassId: number
  ): Promise<EloRating> {
    const cacheKey = this.getCacheKey('rating', fighterId, weightClassId.toString());
    
    return this.getFromCacheOrDatabase(cacheKey, async () => {
      const result = await client.query(this.preparedStatements.getFighterRating, [fighterId, weightClassId]);

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
    });
  }

  private async getFighterStats(client: any, fighterId: string): Promise<{
    winStreak: number,
    fightCount: number,
    recentPerformance: number
  }> {
    const cacheKey = this.getCacheKey('stats', fighterId);
    
    return this.getFromCacheOrDatabase(cacheKey, async () => {
      const result = await client.query(this.preparedStatements.getFighterStats, [fighterId]);
      const stats = result.rows[0];
      
      return {
        winStreak: stats.last_fight_win === 1 ? 1 : 0,
        fightCount: parseInt(stats.fight_count),
        recentPerformance: stats.recent_wins / stats.fight_count
      };
    });
  }

  private async determineCurrentLeague(client: any, fighterId: string): Promise<League> {
    const cacheKey = this.getCacheKey('league', fighterId);
    
    return this.getFromCacheOrDatabase(cacheKey, async () => {
      const result = await client.query(this.preparedStatements.getCurrentLeague, [fighterId]);
      
      if (result.rows.length === 0) return 'OTHER';
      
      const eventName = result.rows[0].event.toLowerCase();
      if (eventName.includes('ufc')) return 'UFC';
      if (eventName.includes('bellator')) return 'BELLATOR';
      if (eventName.includes('pfl')) return 'PFL';
      return 'OTHER';
    });
  }

  async updateRankings(weightClassId: number) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get weight class details with optimized query
      const weightClassResult = await client.query(`
        SELECT weight_limit, division, name 
        FROM weight_classes 
        WHERE weight_class_id = $1
      `, [weightClassId]);
      
      if (weightClassResult.rows.length === 0) {
        throw new Error(`Weight class with ID ${weightClassId} not found`);
      }
      
      const weightClass = weightClassResult.rows[0];
      console.log(`Starting update for ${weightClass.division} ${weightClass.name}`);

      // Determine weight ranges
      const { minWeight, maxWeight } = this.getWeightRange(weightClass);
      const isWomensDivision = [115, 125, 135, 145].includes(weightClass.weight_limit);

      // Optimized fight query with materialized results
      const fights = await client.query(`
        WITH fight_data AS MATERIALIZED (
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
            AND fg1.weight BETWEEN $1 AND $2
            AND fg2.weight BETWEEN $1 AND $2
            ${isWomensDivision ? 
              `AND fg1.weight = ANY($3::int[])
               AND fg2.weight = ANY($3::int[])` 
              : 
              `AND NOT (fg1.weight = ANY($3::int[]))
               AND NOT (fg2.weight = ANY($3::int[]))`
            }
        )
        SELECT * FROM fight_data
        ORDER BY fighter_id, opponent_id, date DESC
      `, [minWeight, maxWeight, [115, 125, 135, 145]]);

      // Process fights in batches
      const batchSize = 50;
      const fightsArray = fights.rows;
      const batches = Math.ceil(fightsArray.length / batchSize);

      for (let i = 0; i < batches; i++) {
        const batchFights = fightsArray.slice(i * batchSize, (i + 1) * batchSize);
        await this.processFightBatch(client, batchFights, weightClassId);
        console.log(`Processed batch ${i + 1}/${batches}`);
      }

      // Final ranking update with optimized query
      await this.updateFinalRankings(client, weightClassId);

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

  private async processFightBatch(client: any, fights: any[], weightClassId: number) {
    const operations = fights.map(fight => async () => {
      const [fighter1Stats, fighter2Stats] = await Promise.all([
        this.getFighterStats(client, fight.fighter_id),
        this.getFighterStats(client, fight.opponent_id)
      ]);

      const [fighter1Rating, fighter2Rating] = await Promise.all([
        this.getOrCreateFighterRating(client, fight.fighter_id, weightClassId),
        this.getOrCreateFighterRating(client, fight.opponent_id, weightClassId)
      ]);

      const [fighter1WinRate, fighter2WinRate] = await Promise.all([
        this.getOpponentStrength(client, fight.fighter_id),
        this.getOpponentStrength(client, fight.opponent_id)
      ]);

      const performanceMultiplier = this.calculatePerformanceMultiplier(
        fight.result,
        fight.decision,
        fight.round
      );

      const [fighter1WinQuality, fighter2WinQuality] = await Promise.all([
        this.calculateWinQuality(
          client,
          performanceMultiplier,
          fighter2Rating.rating,
          fighter1Rating.rating,
          fighter2WinRate,
          fight.fighter_id,
          fight.opponent_id
        ),
        this.calculateWinQuality(
          client,
          performanceMultiplier,
          fighter1Rating.rating,
          fighter2Rating.rating,
          fighter1WinRate,
          fight.opponent_id,
          fight.fighter_id
        )
      ]);

      // Calculate rating changes
      const { newRating1, newRating2, volatility1, volatility2 } = 
        this.calculateNewRatings(
          fight,
          fighter1Rating,
          fighter2Rating,
          fighter1Stats,
          fighter2Stats,
          fighter1WinQuality,
          fighter2WinQuality
        );

      // Update both fighters' ratings
      await Promise.all([
        client.query(this.preparedStatements.updateRanking, [
          fight.fighter_id,
          weightClassId,
          newRating1.toFixed(2),
          volatility1.toFixed(2),
          fight.date
        ]),
        client.query(this.preparedStatements.updateRanking, [
          fight.opponent_id,
          weightClassId,
          newRating2.toFixed(2),
          volatility2.toFixed(2),
          fight.date
        ])
      ]);

      // Update cache
      this.updateRatingCache(fight.fighter_id, weightClassId, newRating1, volatility1);
      this.updateRatingCache(fight.opponent_id, weightClassId, newRating2, volatility2);
    });

    await this.batchDatabaseOperations(operations);
  }

  private updateRatingCache(
    fighterId: string,
    weightClassId: number,
    rating: number,
    volatility: number
  ) {
    const cacheKey = this.getCacheKey('rating', fighterId, weightClassId.toString());
    this.fighterCache.set(cacheKey, {
      rating,
      volatility,
      lastActivity: new Date()
    });
  }

  private async updateFinalRankings(client: any, weightClassId: number) {
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
  }

  private getWeightRange(weightClass: any): { minWeight: number, maxWeight: number } {
    const isWomensDivision = [115, 125, 135, 145].includes(weightClass.weight_limit);
    
    if (isWomensDivision) {
      return {
        minWeight: weightClass.weight_limit,
        maxWeight: weightClass.weight_limit
      };
    }

    const weightRanges: { [key: number]: [number, number] } = {
      125: [0, 125],
      135: [126, 135],
      145: [136, 145],
      155: [146, 155],
      170: [156, 170],
      185: [171, 185],
      205: [186, 205],
      265: [206, 265]
    };

    const [minWeight, maxWeight] = weightRanges[weightClass.weight_limit] || [0, 0];
    return { minWeight, maxWeight };
  }

  private calculateExpectedScore(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  private calculateKFactor(rating: number, fightCount: number): number {
    const ratingDispersionFactor = Math.abs(rating - this.BASE_RATING) > 200 ? 1.5 : 1;
    return this.K_FACTOR_BASE * ratingDispersionFactor;
  }

  private calculatePerformanceMultiplier(result: string, decision: string, round: number): number {
    const normalizedResult = result.toLowerCase();
    const normalizedDecision = decision.toLowerCase();

    if (normalizedResult === 'w') {
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
    
    if (normalizedResult === 'l') {
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

  private calculateOpponentQualityMultiplier(fighterRating: number, opponentRating: number): number {
    const ratingDiff = opponentRating - fighterRating;
    
    if (ratingDiff > 200) return this.OPPONENT_QUALITY.ELITE;
    if (ratingDiff > 100) return this.OPPONENT_QUALITY.SUPERIOR;
    if (ratingDiff < -200) return this.OPPONENT_QUALITY.MUCH_INFERIOR;
    if (ratingDiff < -100) return this.OPPONENT_QUALITY.INFERIOR;
    return this.OPPONENT_QUALITY.EVEN;
  }

  private async calculateWinQuality(
    client: any,
    performanceMultiplier: number,
    opponentRating: number,
    fighterRating: number,
    opponentWinRate: number,
    fighterId: string,
    opponentId: string
  ): Promise<number> {
    const opponentQuality = this.calculateOpponentQualityMultiplier(fighterRating, opponentRating);
    const opponentStrength = Math.max(0.6, opponentWinRate);

    const fighterLeague = await this.determineCurrentLeague(client, fighterId);
    const opponentLeague = await this.determineCurrentLeague(client, opponentId);
    
    let leagueMultiplier = this.LEAGUE_MULTIPLIERS[fighterLeague];
    
    if (this.LEAGUE_MULTIPLIERS[opponentLeague] > this.LEAGUE_MULTIPLIERS[fighterLeague]) {
      leagueMultiplier *= 1.5;
    }

    return (
      performanceMultiplier * 0.35 +
      opponentQuality * 0.35 +
      opponentStrength * 0.25 +
      leagueMultiplier * 0.45
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
          AND date >= NOW() - INTERVAL '2 years'
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

  private calculateNewRatings(
    fight: any,
    fighter1Rating: EloRating,
    fighter2Rating: EloRating,
    fighter1Stats: any,
    fighter2Stats: any,
    fighter1WinQuality: number,
    fighter2WinQuality: number
  ): {
    newRating1: number;
    newRating2: number;
    volatility1: number;
    volatility2: number;
  } {
    const k1 = this.calculateKFactor(fighter1Rating.rating, fighter1Stats.fightCount);
    const k2 = this.calculateKFactor(fighter2Rating.rating, fighter2Stats.fightCount);

    const expectedScore1 = this.calculateExpectedScore(fighter1Rating.rating, fighter2Rating.rating);
    const actualScore = fight.result.toLowerCase().includes('win') ? 1 : 0;

    const ratingChange1 = k1 * fighter1WinQuality * (actualScore - expectedScore1);
    const ratingChange2 = k2 * fighter2WinQuality * ((1 - actualScore) - (1 - expectedScore1));

    let newRating1 = fighter1Rating.rating + ratingChange1;
    let newRating2 = fighter2Rating.rating + ratingChange2;

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

    newRating1 = Math.max(500, Math.min(2000, isNaN(newRating1) ? this.BASE_RATING : newRating1));
    newRating2 = Math.max(500, Math.min(2000, isNaN(newRating2) ? this.BASE_RATING : newRating2));

    const volatilityChange1 = Math.min(50, Math.max(-50, Math.abs(ratingChange1) / 100));
    const volatilityChange2 = Math.min(50, Math.max(-50, Math.abs(ratingChange2) / 100));

    return {
      newRating1,
      newRating2,
      volatility1: Math.min(200, Math.max(50, fighter1Rating.volatility + volatilityChange1)),
      volatility2: Math.min(200, Math.max(50, fighter2Rating.volatility + volatilityChange2))
    };
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
        WITH fighter_fights AS (
          SELECT 
            fighter_id,
            COUNT(*) as fight_count,
            MAX(date) as last_fight_date
          FROM fights
          WHERE date >= NOW() - INTERVAL '3 years'
          GROUP BY fighter_id
        )
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
          wc.division,
          COALESCE(ff.fight_count, 0) as recent_fights,
          ff.last_fight_date
        FROM analytics_rankings ar
        JOIN fighters f ON ar.fighter_id = f.fighter_id
        JOIN weight_classes wc ON ar.weight_class_id = wc.weight_class_id
        LEFT JOIN fighter_fights ff ON f.fighter_id = ff.fighter_id
        WHERE ar.weight_class_id = $1
          AND ar.rank <= 25
          AND COALESCE(ff.fight_count, 0) > 0
          AND ff.last_fight_date >= NOW() - INTERVAL '18 months'
        ORDER BY ar.rank
        LIMIT 25
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
} 