import { Pool } from 'pg';

export class SyncService {
  constructor(
    private mainPool: Pool,
    private liveStatsPool: Pool
  ) {}

  async syncMatchups() {
    const liveStatsClient = await this.liveStatsPool.connect();
    const mainClient = await this.mainPool.connect();

    try {
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

      console.log(`Found ${mainMatchups.length} matchups to sync`);

      // Process each matchup
      for (const matchup of mainMatchups) {
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
    const mainClient = await this.mainPool.connect();
    const liveClient = await this.liveStatsPool.connect();

    try {
      console.log('Starting event sync...');
      
      // Get all current events from main DB
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

      // Sync each event and its matchups
      for (const event of mainEvents) {
        // Upsert event
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

        // Get and sync matchups for this event
        const { rows: matchups } = await mainClient.query(`
          SELECT 
            matchup_id,
            event_id,
            fighter1_id,
            fighter2_id,
            fighter1_name,
            fighter2_name,
            fighter1_record,
            fighter2_record,
            live_id,
            start_time,
            weight_class,
            fight_type,
            display_order,
            result,
            winner,
            card_type
          FROM matchups 
          WHERE event_id = $1
        `, [event.event_id]);

        for (const matchup of matchups) {
          await liveClient.query(`
            INSERT INTO matchups (
              matchup_id,
              event_id,
              fighter1_id,
              fighter2_id,
              fighter1_name,
              fighter2_name,
              fighter1_record,
              fighter2_record,
              live_id,
              start_time,
              weight_class,
              fight_type,
              display_order,
              result,
              winner,
              card_type,
              last_synced
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP)
            ON CONFLICT (matchup_id) 
            DO UPDATE SET 
              fighter1_id = EXCLUDED.fighter1_id,
              fighter2_id = EXCLUDED.fighter2_id,
              fighter1_name = EXCLUDED.fighter1_name,
              fighter2_name = EXCLUDED.fighter2_name,
              fighter1_record = EXCLUDED.fighter1_record,
              fighter2_record = EXCLUDED.fighter2_record,
              live_id = EXCLUDED.live_id,
              start_time = EXCLUDED.start_time,
              weight_class = EXCLUDED.weight_class,
              fight_type = EXCLUDED.fight_type,
              display_order = EXCLUDED.display_order,
              result = EXCLUDED.result,
              winner = EXCLUDED.winner,
              card_type = EXCLUDED.card_type,
              last_synced = CURRENT_TIMESTAMP
          `, [
            matchup.matchup_id,
            matchup.event_id,
            matchup.fighter1_id,
            matchup.fighter2_id,
            matchup.fighter1_name,
            matchup.fighter2_name,
            matchup.fighter1_record,
            matchup.fighter2_record,
            matchup.live_id,
            matchup.start_time,
            matchup.weight_class,
            matchup.fight_type,
            matchup.display_order,
            matchup.result,
            matchup.winner,
            matchup.card_type
          ]);
        }

        console.log(`Synced event ${event.name} with ${matchups.length} matchups`);
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