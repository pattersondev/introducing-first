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
              'result', m.result,
              'winner', m.winner,
              'display_order', m.display_order
            ) ORDER BY m.display_order
          ) AS matchups
        FROM events e
        LEFT JOIN matchups m ON e.event_id = m.event_id
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
              'result', m.result,
              'winner', m.winner,
              'display_order', m.display_order
            ) ORDER BY m.display_order
          ) AS matchups
        FROM events e
        LEFT JOIN matchups m ON e.event_id = m.event_id
        WHERE e.event_id = $1
        GROUP BY e.event_id, e.name, e.date, e.location
      `, [eventId]);

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
        AND e.date >= CURRENT_DATE
        GROUP BY e.event_id, e.name, e.date, e.location
        ORDER BY ABS(EXTRACT(EPOCH FROM (e.date - CURRENT_DATE)))
        LIMIT $1
      `, [limit]);
      return result.rows;
    } finally {
      client.release();
    }
  }
} 