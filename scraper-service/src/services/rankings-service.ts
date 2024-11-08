import { Pool } from 'pg';

interface FightScore {
  points: number;
  recencyMultiplier: number;
  opponentRating: number;
}

export class RankingsService {
  constructor(private pool: Pool) {}

  private calculateRecencyMultiplier(fightDate: Date): number {
    const now = new Date();
    const monthsAgo = (now.getTime() - fightDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    // Exponential decay for inactivity
    if (monthsAgo > 12) {
      return Math.exp(-0.1 * (monthsAgo - 12)); // Significant penalty after 1 year
    }
    return 1; // Full value for fights within last year
  }

  private calculateMethodPoints(result: string, decision: string): number {
    // Base points for different victory types
    if (result.toLowerCase().includes('win')) {
      if (result.toLowerCase().includes('ko') || result.toLowerCase().includes('tko')) {
        return 100; // KO/TKO victory
      }
      if (result.toLowerCase().includes('sub')) {
        return 90; // Submission victory
      }
      if (decision.toLowerCase().includes('unanimous')) {
        return 75; // Clear decision victory
      }
      if (decision.toLowerCase().includes('split')) {
        return 60; // Close decision victory
      }
      return 70; // Other victory types
    }
    
    if (result.toLowerCase().includes('loss')) {
      if (result.toLowerCase().includes('ko') || result.toLowerCase().includes('tko')) {
        return -80; // KO/TKO loss
      }
      if (result.toLowerCase().includes('sub')) {
        return -70; // Submission loss
      }
      if (decision.toLowerCase().includes('unanimous')) {
        return -50; // Clear decision loss
      }
      if (decision.toLowerCase().includes('split')) {
        return -40; // Close decision loss
      }
      return -60; // Other loss types
    }
    
    return 0; // Draw or No Contest
  }

  async calculateFighterRating(fighterId: string, weightClassId: number): Promise<number> {
    const client = await this.pool.connect();
    try {
      // Get fighter's last 5 fights
      const fights = await client.query(`
        SELECT 
          f.*,
          opp.fighter_id as opponent_id,
          COALESCE(ar.points, 1000) as opponent_rating
        FROM fights f
        LEFT JOIN fighters opp ON f.opponent = CONCAT(opp.first_name, ' ', opp.last_name)
        LEFT JOIN analytics_rankings ar ON opp.fighter_id = ar.fighter_id 
          AND ar.weight_class_id = $2
        WHERE f.fighter_id = $1
        ORDER BY f.date DESC
        LIMIT 5
      `, [fighterId, weightClassId]);

      if (fights.rowCount === 0) {
        return 1000; // Base rating for new fighters
      }

      let totalPoints = 1000; // Base rating
      let totalMultiplier = 0;

      for (const fight of fights.rows) {
        const recencyMultiplier = this.calculateRecencyMultiplier(new Date(fight.date));
        const methodPoints = this.calculateMethodPoints(fight.result, fight.decision);
        const opponentRating = fight.opponent_rating;
        
        // Adjust points based on opponent's rating
        const ratingDiff = (opponentRating - 1000) / 1000; // Normalize rating difference
        const adjustedPoints = methodPoints * (1 + ratingDiff * 0.2); // 20% impact from opponent rating

        totalPoints += adjustedPoints * recencyMultiplier;
        totalMultiplier += recencyMultiplier;
      }

      // Normalize the rating
      const finalRating = totalPoints / (totalMultiplier || 1);

      // Ensure rating stays within reasonable bounds
      return Math.max(Math.min(finalRating, 2000), 500);
    } finally {
      client.release();
    }
  }

  async updateRankings(weightClassId: number) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get all fighters in the weight class
      const fighters = await client.query(`
        SELECT DISTINCT f.fighter_id
        FROM fighters f
        JOIN fights ft ON f.fighter_id = ft.fighter_id
        WHERE f.weight BETWEEN 
          (SELECT weight_limit - 10 FROM weight_classes WHERE weight_class_id = $1)
          AND
          (SELECT weight_limit FROM weight_classes WHERE weight_class_id = $1)
      `, [weightClassId]);

      // Calculate ratings for each fighter
      for (const fighter of fighters.rows) {
        const rating = await this.calculateFighterRating(fighter.fighter_id, weightClassId);
        
        // Update or insert the ranking
        await client.query(`
          INSERT INTO analytics_rankings 
            (fighter_id, weight_class_id, points, rank, previous_rank)
          VALUES ($1, $2, $3, 0, NULL)
          ON CONFLICT (fighter_id, weight_class_id) DO UPDATE SET
            previous_rank = analytics_rankings.rank,
            points = $3
        `, [fighter.fighter_id, weightClassId, rating]);
      }

      // Update ranks based on points
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