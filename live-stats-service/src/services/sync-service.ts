import { Pool } from 'pg';

export class SyncService {
  constructor(
    private liveStatsPool: Pool,
    private scraperPool: Pool
  ) {}

  async syncMatchups() {
    const liveStatsClient = await this.liveStatsPool.connect();
    const mainClient = await this.scraperPool.connect();

    try {
      // Debug database connections
      const { rows: dbCheck1 } = await mainClient.query('SELECT current_database()');
      const { rows: dbCheck2 } = await liveStatsClient.query('SELECT current_database()');
      console.log('Database connections:', {
        scraper: dbCheck1[0].current_database,
        liveStats: dbCheck2[0].current_database
      });

      await liveStatsClient.query('BEGIN');
      
      // Get all matchups from main service
      const { rows: mainMatchups } = await mainClient.query(`
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
          e.location,
          e.main_card_time,
          e.prelims_time,
          e.early_prelims_time
        FROM matchups m
        JOIN events e ON m.event_id = e.event_id
        WHERE 
          e.date >= CURRENT_DATE
          OR e.date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY e.date ASC
      `);

      console.log(`Found ${mainMatchups.length} matchups to sync`);

      console.log('Sample matchup live_ids:', mainMatchups.slice(0, 3).map(m => ({
        matchup_id: m.matchup_id,
        live_id: m.live_id
      })));

      // Process each matchup
      for (const matchup of mainMatchups) {
        // Ensure event exists
        await liveStatsClient.query(`
          INSERT INTO events (
            event_id, 
            name, 
            date, 
            location,
            main_card_time,
            prelims_time,
            early_prelims_time
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (event_id) 
          DO UPDATE SET 
            name = EXCLUDED.name,
            date = EXCLUDED.date,
            location = EXCLUDED.location,
            main_card_time = EXCLUDED.main_card_time,
            prelims_time = EXCLUDED.prelims_time,
            early_prelims_time = EXCLUDED.early_prelims_time
        `, [
          matchup.event_id, 
          matchup.event_name, 
          matchup.event_date, 
          matchup.location,
          matchup.main_card_time,
          matchup.prelims_time,
          matchup.early_prelims_time,
        ]);

        // Update matchup - only include columns that exist in live stats DB
        await liveStatsClient.query(`
          INSERT INTO matchups (
            matchup_id,
            event_id,
            fighter1_name,
            fighter2_name,
            live_id,
            start_time,
            display_order,
            result,
            winner
          ) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (matchup_id) 
          DO UPDATE SET 
            fighter1_name = EXCLUDED.fighter1_name,
            fighter2_name = EXCLUDED.fighter2_name,
            live_id = EXCLUDED.live_id,
            start_time = EXCLUDED.start_time,
            display_order = EXCLUDED.display_order,
            result = EXCLUDED.result,
            winner = EXCLUDED.winner
        `, [
          matchup.matchup_id,
          matchup.event_id,
          matchup.fighter1_name,
          matchup.fighter2_name,
          matchup.live_id,
          matchup.start_time,
          matchup.display_order,
          matchup.result,
          matchup.winner
        ]);
      }

      await liveStatsClient.query('COMMIT');
      console.log(`Successfully synced ${mainMatchups.length} matchups`);
    } catch (error) {
      await liveStatsClient.query('ROLLBACK');
      console.error('Error syncing matchups:', error);
      throw error;
    } finally {
      liveStatsClient.release();
      mainClient.release();
    }
  }

  async syncEvents() {
    const mainClient = await this.scraperPool.connect();
    const liveClient = await this.liveStatsPool.connect();

    try {
      console.log('Starting event sync...');
      
      const { rows: mainEvents } = await mainClient.query(`
        SELECT 
          event_id, 
          name, 
          date, 
          location,
          main_card_time,
          prelims_time,
          early_prelims_time
        FROM events 
        WHERE date >= CURRENT_DATE - INTERVAL '1 day'
        ORDER BY date ASC
      `);

      console.log(`Found ${mainEvents.length} events to sync`);

      // Sync each event only - remove matchup syncing
      for (const event of mainEvents) {
        await liveClient.query(`
          INSERT INTO events (
            event_id, 
            name, 
            date, 
            location,
            main_card_time,
            prelims_time,
            early_prelims_time
          ) 
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (event_id) 
          DO UPDATE SET 
            name = EXCLUDED.name,
            date = EXCLUDED.date,
            location = EXCLUDED.location,
            main_card_time = EXCLUDED.main_card_time,
            prelims_time = EXCLUDED.prelims_time,
            early_prelims_time = EXCLUDED.early_prelims_time
        `, [
          event.event_id,
          event.name,
          event.date,
          event.location,
          event.main_card_time,
          event.prelims_time,
          event.early_prelims_time
        ]);
      }

      console.log('Event sync completed successfully');
    } catch (error) {
      console.error('Error syncing events:', error);
      throw error;
    } finally {
      mainClient.release();
      liveClient.release();
    }
  }

  // Method to force immediate sync
  async forceSyncEvents() {
    console.log('Force syncing events...');
    await this.syncEvents();
    await this.syncMatchups();
  }
} 