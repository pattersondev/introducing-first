import { Pool } from 'pg';

export class SyncService {
  constructor(
    private liveStatsPool: Pool,
    private scraperServicePool: Pool
  ) {}

  async syncMatchups() {
    const liveStatsClient = await this.liveStatsPool.connect();
    const scraperClient = await this.scraperServicePool.connect();

    try {
      await liveStatsClient.query('BEGIN');

      // Get all matchups from scraper service
      const { rows: scraperMatchups } = await scraperClient.query(`
        SELECT 
          m.matchup_id,
          m.event_id,
          m.fighter1_name,
          m.fighter2_name,
          m.live_id,
          m.start_time,
          m.display_order,
          m.result,
          m.winner,
          e.name as event_name,
          e.date as event_date,
          e.location
        FROM matchups m
        JOIN events e ON m.event_id = e.event_id
        WHERE 
          -- Get all future events
          e.date >= CURRENT_DATE
          -- Plus last 30 days of events
          OR e.date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY e.date ASC
      `);

      console.log(`Found ${scraperMatchups.length} matchups to sync`);

      // Process each matchup
      for (const matchup of scraperMatchups) {
        // Ensure event exists
        await liveStatsClient.query(`
          INSERT INTO events (event_id, name, date, location)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (event_id) 
          DO UPDATE SET
            name = EXCLUDED.name,
            date = EXCLUDED.date,
            location = EXCLUDED.location
        `, [matchup.event_id, matchup.event_name, matchup.event_date, matchup.location]);

        // Update matchup
        await liveStatsClient.query(`
          INSERT INTO matchups (
            matchup_id, event_id, fighter1_name, fighter2_name,
            live_id, start_time, weight_class, fight_type,
            display_order, result, winner, last_synced
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
          ON CONFLICT (matchup_id)
          DO UPDATE SET
            fighter1_name = EXCLUDED.fighter1_name,
            fighter2_name = EXCLUDED.fighter2_name,
            live_id = EXCLUDED.live_id,
            start_time = EXCLUDED.start_time,
            display_order = EXCLUDED.display_order,
            result = EXCLUDED.result,
            winner = EXCLUDED.winner,
            last_synced = CURRENT_TIMESTAMP
        `, [
          matchup.matchup_id,
          matchup.event_id,
          matchup.fighter1_name,
          matchup.fighter2_name,
          matchup.live_id,
          matchup.start_time,
          matchup.weight_class,
          matchup.fight_type,
          matchup.display_order,
          matchup.result,
          matchup.winner
        ]);
      }

      await liveStatsClient.query('COMMIT');
      console.log(`Successfully synced ${scraperMatchups.length} matchups`);
    } catch (error) {
      await liveStatsClient.query('ROLLBACK');
      console.error('Error syncing matchups:', error);
      throw error;
    } finally {
      liveStatsClient.release();
      scraperClient.release();
    }
  }
} 