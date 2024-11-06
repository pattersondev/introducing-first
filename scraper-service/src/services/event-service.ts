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
        const fighter1Id = generateId(matchup.Fighter1);
        const fighter2Id = generateId(matchup.Fighter2);

        const matchupExists = await client.query('SELECT 1 FROM matchups WHERE matchup_id = $1', [matchupId]);
        if (matchupExists.rowCount === 0) {
          await client.query(
            'INSERT INTO matchups (matchup_id, event_id, fighter1_id, fighter2_id, result, winner) VALUES ($1, $2, $3, $4, $5, $6)',
            [matchupId, eventId, fighter1Id, fighter2Id, matchup.Result, matchup.Winner]
          );
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

  async getAllEvents() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          e.event_id, e.name, e.date, e.location,
          json_agg(json_build_object(
            'matchup_id', m.matchup_id,
            'fighter1_id', m.fighter1_id,
            'fighter2_id', m.fighter2_id,
            'result', m.result,
            'winner', m.winner
          )) AS matchups
        FROM events e
        LEFT JOIN matchups m ON e.event_id = m.event_id
        GROUP BY e.event_id
      `);
      return result.rows;
    } finally {
      client.release();
    }
  }
} 