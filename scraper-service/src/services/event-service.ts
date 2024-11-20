import { Pool } from 'pg';
import { generateId } from '../utils/helpers';
import { PredictionService } from '../services/prediction-service';

export class EventService {
  constructor(private pool: Pool, private predictionService: PredictionService) {}

  async processEvent(event: any) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Add one day to the event date to correct timezone offset
      const eventDate = new Date(event.Date);
      eventDate.setDate(eventDate.getDate() + 1);
      
      const eventId = generateId(event.Name, event.Date);
      
      // For future events, delete existing event and its matchups first
      if (eventDate > new Date()) {
        await client.query(
          'DELETE FROM matchups WHERE event_id = $1',
          [eventId]
        );
        await client.query(
          'DELETE FROM events WHERE event_id = $1',
          [eventId]
        );
      }
      
      // Update or insert event with corrected date
      await client.query(
        `INSERT INTO events (event_id, name, date, location) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (event_id) 
         DO UPDATE SET 
           name = EXCLUDED.name,
           date = EXCLUDED.date,
           location = EXCLUDED.location`,
        [eventId, event.Name, eventDate.toISOString(), event.Location]
      );

      // For past events, get existing matchups
      let existingMatchupIds = new Set<string>();
      if (eventDate <= new Date()) {
        const existingMatchups = await client.query(
          'SELECT matchup_id FROM matchups WHERE event_id = $1',
          [eventId]
        );
        existingMatchupIds = new Set(existingMatchups.rows.map(row => row.matchup_id));
      }

      // Process new/updated matchups
      const processedMatchupIds = new Set<string>();
      
      for (const matchup of event.Matchups) {
        // Skip matchups with TBA fighters
        if (
          matchup.Fighter1.includes('TBA') || 
          matchup.Fighter2.includes('TBA') ||
          !matchup.Fighter1 || 
          !matchup.Fighter2
        ) {
          console.log(`Skipping matchup with TBA fighter: ${matchup.Fighter1} vs ${matchup.Fighter2}`);
          continue;
        }

        const matchupId = generateId(eventId, matchup.Fighter1, matchup.Fighter2);
        processedMatchupIds.add(matchupId);

        await client.query(
          `INSERT INTO matchups (
            matchup_id, event_id, fighter1_name, fighter2_name, 
            result, winner, display_order
          ) 
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (matchup_id) 
          DO UPDATE SET 
            fighter1_name = EXCLUDED.fighter1_name,
            fighter2_name = EXCLUDED.fighter2_name,
            result = EXCLUDED.result,
            winner = EXCLUDED.winner,
            display_order = EXCLUDED.display_order`,
          [
            matchupId, eventId, matchup.Fighter1, matchup.Fighter2,
            matchup.Result, matchup.Winner, matchup.Order
          ]
        );
      }

      // Remove matchups that no longer exist in the event
      const matchupsToRemove = Array.from(existingMatchupIds)
        .filter(id => !processedMatchupIds.has(id));
      
      if (eventDate <= new Date() && matchupsToRemove.length > 0) {
        await client.query(
          'DELETE FROM matchups WHERE matchup_id = ANY($1)',
          [matchupsToRemove]
        );
      }

      // Link fighters to matchups
      await this.linkFightersToMatchups(client);

      // Generate predictions for future events
      if (eventDate > new Date()) {
        // Get all matchups that have both fighters linked
        const matchupsForPrediction = await client.query(`
          SELECT matchup_id 
          FROM matchups 
          WHERE event_id = $1 
          AND fighter1_id IS NOT NULL 
          AND fighter2_id IS NOT NULL`,
          [eventId]
        );

        // Generate predictions for each matchup
        for (const row of matchupsForPrediction.rows) {
          try {
            await this.predictionService.predictFight(row.matchup_id);
          } catch (error) {
            console.error(`Error generating prediction for matchup ${row.matchup_id}:`, error);
            // Continue with other matchups even if one fails
          }
        }
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async linkFightersToMatchups(client?: any) {
    const shouldReleaseClient = !client;
    client = client || await this.pool.connect();
    
    try {
      if (shouldReleaseClient) await client.query('BEGIN');

      // Update fighter1_id
      await client.query(`
        UPDATE matchups m
        SET fighter1_id = f.fighter_id
        FROM fighters f
        WHERE 
          CONCAT(f.first_name, ' ', f.last_name) = m.fighter1_name
          AND m.fighter1_id IS NULL
      `);

      // Update fighter2_id
      await client.query(`
        UPDATE matchups m
        SET fighter2_id = f.fighter_id
        FROM fighters f
        WHERE 
          CONCAT(f.first_name, ' ', f.last_name) = m.fighter2_name
          AND m.fighter2_id IS NULL
      `);

      if (shouldReleaseClient) await client.query('COMMIT');
    } catch (e) {
      if (shouldReleaseClient) await client.query('ROLLBACK');
      throw e;
    } finally {
      if (shouldReleaseClient) client.release();
    }
  }

  async getAllEvents() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          e.event_id, 
          e.name, 
          e.date, 
          e.location,
          json_agg(
            json_build_object(
              'matchup_id', m.matchup_id,
              'fighter1_id', m.fighter1_id,
              'fighter2_id', m.fighter2_id,
              'fighter1_name', m.fighter1_name,
              'fighter2_name', m.fighter2_name,
              'fighter1_image', f1.image_url,
              'fighter2_image', f2.image_url,
              'result', m.result,
              'winner', m.winner,
              'display_order', m.display_order
            ) ORDER BY m.display_order
          ) AS matchups
        FROM events e
        LEFT JOIN matchups m ON e.event_id = m.event_id
        LEFT JOIN fighters f1 ON m.fighter1_id = f1.fighter_id
        LEFT JOIN fighters f2 ON m.fighter2_id = f2.fighter_id
        WHERE m.matchup_id IS NOT NULL
        GROUP BY e.event_id, e.name, e.date, e.location
        ORDER BY e.date DESC
      `);
      return result.rows;
    } finally {
      client.release();
    }
  }

  private getPromotionFilter(promotion: string): { query: string; params: any[] } {
    if (promotion === 'ALL') {
      return { query: '', params: [] };
    }

    if (promotion === 'DWCS') {
      return {
        query: ` AND (
          LOWER(e.name) LIKE '%dwcs%' 
          OR LOWER(e.name) LIKE '%dwc%'
          OR (
            LOWER(e.name) LIKE '%dana%' 
            AND LOWER(e.name) LIKE '%white%' 
            AND LOWER(e.name) LIKE '%contender%'
          )
        )`,
        params: []
      };
    }

    return {
      query: ` AND LOWER(e.name) LIKE $1`,
      params: [`%${promotion.toLowerCase()}%`]
    };
  }

  async searchEvents(searchTerm: string = '', promotion: string = 'ALL') {
    const client = await this.pool.connect();
    try {
      const baseQuery = `
        SELECT 
          e.event_id, 
          e.name, 
          e.date, 
          e.location,
          json_agg(
            json_build_object(
              'matchup_id', m.matchup_id,
              'fighter1_id', m.fighter1_id,
              'fighter2_id', m.fighter2_id,
              'fighter1_name', m.fighter1_name,
              'fighter2_name', m.fighter2_name,
              'result', m.result,
              'winner', m.winner,
              'display_order', m.display_order
            ) ORDER BY m.display_order
          ) AS matchups
        FROM events e
        LEFT JOIN matchups m ON e.event_id = m.event_id
        WHERE m.matchup_id IS NOT NULL
      `;

      const params: any[] = [];
      let conditions = '';

      // Add search term filter if provided
      if (searchTerm) {
        conditions += ` AND LOWER(e.name) LIKE $${params.length + 1}`;
        params.push(`%${searchTerm.toLowerCase()}%`);
      }

      // Add promotion filter
      const promotionFilter = this.getPromotionFilter(promotion);
      conditions += promotionFilter.query;
      params.push(...promotionFilter.params);

      const query = `
        ${baseQuery}
        ${conditions}
        GROUP BY e.event_id, e.name, e.date, e.location
        ORDER BY e.date DESC
      `;

      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getEvent(eventId: string) {
    const client = await this.pool.connect();
    try {
      const cleanEventId = eventId.split('?')[0];
      
      const result = await client.query(`
        SELECT 
          e.event_id, 
          e.name, 
          e.date, 
          e.location,
          COALESCE(
            json_agg(
              CASE WHEN m.matchup_id IS NOT NULL THEN
                json_build_object(
                  'matchup_id', m.matchup_id,
                  'fighter1_id', m.fighter1_id,
                  'fighter2_id', m.fighter2_id,
                  'fighter1_name', m.fighter1_name,
                  'fighter2_name', m.fighter2_name,
                  'fighter1_image', f1.image_url,
                  'fighter2_image', f2.image_url,
                  'fighter1_record', f1.win_loss_record,
                  'fighter1_age', f1.age,
                  'fighter1_stance', f1.stance,
                  'fighter1_reach', f1.reach,
                  'fighter2_record', f2.win_loss_record,
                  'fighter2_age', f2.age,
                  'fighter2_stance', f2.stance,
                  'fighter2_reach', f2.reach,
                  'result', m.result,
                  'winner', m.winner,
                  'display_order', m.display_order
                )
              END
              ORDER BY m.display_order
            ) FILTER (WHERE m.matchup_id IS NOT NULL),
            '[]'
          ) AS matchups
        FROM events e
        LEFT JOIN matchups m ON e.event_id = m.event_id
        LEFT JOIN fighters f1 ON m.fighter1_id = f1.fighter_id
        LEFT JOIN fighters f2 ON m.fighter2_id = f2.fighter_id
        WHERE e.event_id = $1
        GROUP BY e.event_id, e.name, e.date, e.location
      `, [cleanEventId]);

      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async getUpcomingEvents(limit: number = 7) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          e.event_id, 
          e.name, 
          e.date, 
          e.location,
          COALESCE(
            json_agg(
              CASE WHEN m.matchup_id IS NOT NULL THEN
                json_build_object(
                  'matchup_id', m.matchup_id,
                  'fighter1_id', m.fighter1_id,
                  'fighter2_id', m.fighter2_id,
                  'fighter1_name', m.fighter1_name,
                  'fighter2_name', m.fighter2_name,
                  'fighter1_image', f1.image_url,
                  'fighter2_image', f2.image_url,
                  'result', m.result,
                  'winner', m.winner,
                  'display_order', m.display_order
                )
              END
              ORDER BY m.display_order
            ) FILTER (WHERE m.matchup_id IS NOT NULL),
            '[]'
          ) AS matchups
        FROM events e
        LEFT JOIN matchups m ON e.event_id = m.event_id
        LEFT JOIN fighters f1 ON m.fighter1_id = f1.fighter_id
        LEFT JOIN fighters f2 ON m.fighter2_id = f2.fighter_id
        WHERE e.date >= CURRENT_DATE
        GROUP BY e.event_id, e.name, e.date, e.location
        ORDER BY e.date ASC
        LIMIT $1
      `, [limit]);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getRecentAndUpcomingEvents() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        WITH RecentPastEvents AS (
          SELECT 
            e.event_id, 
            e.name, 
            e.date, 
            e.location
          FROM events e
          WHERE e.date < CURRENT_DATE
          ORDER BY e.date DESC
          LIMIT 10
        ),
        UpcomingEvents AS (
          SELECT 
            e.event_id, 
            e.name, 
            e.date, 
            e.location
          FROM events e
          WHERE e.date >= CURRENT_DATE
          ORDER BY e.date ASC
        ),
        LatestPredictions AS (
          SELECT DISTINCT ON (matchup_id)
            matchup_id,
            fighter1_win_probability,
            fighter2_win_probability,
            fighter1_ko_tko_probability,
            fighter1_submission_probability,
            fighter1_decision_probability,
            fighter2_ko_tko_probability,
            fighter2_submission_probability,
            fighter2_decision_probability,
            confidence_score
          FROM fight_predictions
          ORDER BY matchup_id, created_at DESC
        )
        SELECT 
          e.event_id, 
          e.name, 
          e.date, 
          e.location,
          COALESCE(
            json_agg(
              json_build_object(
                'matchup_id', m.matchup_id,
                'fighter1_id', m.fighter1_id,
                'fighter2_id', m.fighter2_id,
                'fighter1_name', m.fighter1_name,
                'fighter2_name', m.fighter2_name,
                'fighter1_image', f1.image_url,
                'fighter2_image', f2.image_url,
                'fighter1_record', f1.win_loss_record,
                'fighter1_age', f1.age,
                'fighter1_stance', f1.stance,
                'fighter1_reach', f1.reach,
                'fighter2_record', f2.win_loss_record,
                'fighter2_age', f2.age,
                'fighter2_stance', f2.stance,
                'fighter2_reach', f2.reach,
                'fighter1_rank', f1.current_promotion_rank,
                'fighter2_rank', f2.current_promotion_rank,
                'result', m.result,
                'winner', m.winner,
                'display_order', m.display_order,
                'prediction', (
                  SELECT row_to_json(p.*)
                  FROM LatestPredictions p
                  WHERE p.matchup_id = m.matchup_id
                )
              ) ORDER BY m.display_order
            ) FILTER (WHERE m.matchup_id IS NOT NULL),
            '[]'
          ) AS matchups
        FROM (
          SELECT * FROM RecentPastEvents
          UNION ALL
          SELECT * FROM UpcomingEvents
        ) e
        LEFT JOIN matchups m ON e.event_id = m.event_id
        LEFT JOIN fighters f1 ON m.fighter1_id = f1.fighter_id
        LEFT JOIN fighters f2 ON m.fighter2_id = f2.fighter_id
        GROUP BY e.event_id, e.name, e.date, e.location
        ORDER BY e.date DESC
      `);

      return result.rows;
    } finally {
      client.release();
    }
  }

  async getMatchupDetails(matchupId: string) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        WITH RankedFights AS (
          SELECT 
            f.*,
            ROW_NUMBER() OVER (PARTITION BY f.fighter_id ORDER BY f.date DESC) as fight_rank,
            opp.fighter_id as opponent_id
          FROM fights f
          LEFT JOIN fighters opp ON 
            TRIM(LOWER(CONCAT(opp.first_name, ' ', opp.last_name))) = TRIM(LOWER(f.opponent))
          WHERE f.fighter_id IN (
            SELECT COALESCE(fighter1_id, '') FROM matchups WHERE matchup_id = $1
            UNION
            SELECT COALESCE(fighter2_id, '') FROM matchups WHERE matchup_id = $1
          )
          AND f.fighter_id IS NOT NULL
          AND f.date IS NOT NULL
        ),
        RecentFights AS (
          SELECT 
            fighter_id,
            COALESCE(
              json_agg(
                json_build_object(
                  'date', date,
                  'opponent', opponent,
                  'opponent_id', opponent_id,
                  'result', result,
                  'decision', decision,
                  'round', rnd,
                  'is_title_fight', is_title_fight
                ) ORDER BY date DESC
              ) FILTER (WHERE date IS NOT NULL),
              '[]'
            ) as recent_fights
          FROM RankedFights
          WHERE fight_rank <= 3
          GROUP BY fighter_id
        )
        SELECT 
          m.*,
          f1.win_loss_record as fighter1_record,
          f1.reach as fighter1_reach,
          f1.stance as fighter1_stance,
          f1.age as fighter1_age,
          f1.country as fighter1_country,
          COALESCE(rf1.recent_fights, '[]'::json) as fighter1_recent_fights,
          f2.win_loss_record as fighter2_record,
          f2.reach as fighter2_reach,
          f2.stance as fighter2_stance,
          f2.age as fighter2_age,
          f2.country as fighter2_country,
          COALESCE(rf2.recent_fights, '[]'::json) as fighter2_recent_fights
        FROM matchups m
        LEFT JOIN fighters f1 ON m.fighter1_id = f1.fighter_id
        LEFT JOIN fighters f2 ON m.fighter2_id = f2.fighter_id
        LEFT JOIN RecentFights rf1 ON f1.fighter_id = rf1.fighter_id
        LEFT JOIN RecentFights rf2 ON f2.fighter_id = rf2.fighter_id
        WHERE m.matchup_id = $1
      `, [matchupId]);

      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }
} 