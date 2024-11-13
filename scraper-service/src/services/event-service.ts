import { Pool } from 'pg';
import { generateId } from '../utils/helpers';

export class EventService {
  constructor(private pool: Pool) {}

  async processEvent(event: any) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const eventId = generateId(event.Name, event.Date);
      
      const eventExists = await client.query('SELECT 1 FROM events WHERE event_id = $1', [eventId]);
      if (eventExists.rowCount === 0) {
        await client.query(
          'INSERT INTO events (event_id, name, date, location) VALUES ($1, $2, $3, $4)',
          [eventId, event.Name, event.Date, event.Location]
        );
      }

      for (const matchup of event.Matchups) {
        const matchupId = generateId(eventId, matchup.Fighter1, matchup.Fighter2);

        const matchupExists = await client.query('SELECT 1 FROM matchups WHERE matchup_id = $1', [matchupId]);
        if (matchupExists.rowCount === 0) {
          await client.query(
            'INSERT INTO matchups (matchup_id, event_id, fighter1_name, fighter2_name, result, winner, display_order) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [matchupId, eventId, matchup.Fighter1, matchup.Fighter2, matchup.Result, matchup.Winner, matchup.Order]
          );
        }
      }

      // Link fighters to matchups after processing the event
      await this.linkFightersToMatchups(client);

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

  async searchEvents(searchTerm: string = '', promotion: string = 'ALL') {
    const client = await this.pool.connect();
    try {
      let query = `
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
      let paramCount = 1;

      // Add search term filter if provided
      if (searchTerm) {
        query += ` AND LOWER(e.name) LIKE $${paramCount}`;
        params.push(`%${searchTerm.toLowerCase()}%`);
        paramCount++;
      }

      // Add promotion filter if provided
      if (promotion !== 'ALL') {
        query += ` AND LOWER(e.name) LIKE $${paramCount}`;
        params.push(`%${promotion.toLowerCase()}%`);
      }

      query += `
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
        )
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
        FROM (
          SELECT * FROM RecentPastEvents
          UNION ALL
          SELECT * FROM UpcomingEvents
        ) e
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

  async getMatchupDetails(matchupId: string) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          m.*,
          f1.win_loss_record as fighter1_record,
          f1.reach as fighter1_reach,
          f1.stance as fighter1_stance,
          f1.age as fighter1_age,
          f2.win_loss_record as fighter2_record,
          f2.reach as fighter2_reach,
          f2.stance as fighter2_stance,
          f2.age as fighter2_age
        FROM matchups m
        LEFT JOIN fighters f1 ON m.fighter1_id = f1.fighter_id
        LEFT JOIN fighters f2 ON m.fighter2_id = f2.fighter_id
        WHERE m.matchup_id = $1
      `, [matchupId]);

      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }
} 