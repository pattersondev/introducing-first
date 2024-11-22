import { Pool } from 'pg';

export class LiveStatsService {
  constructor(private pool: Pool) {}

  async processLiveStats(matchupId: string, stats: any) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Process ALL period stats (full fight stats)
      const allPeriodStats = stats.statistics.find((s: any) => s.period === 'ALL');
      if (allPeriodStats) {
        const generalGroup = allPeriodStats.groups.find((g: any) => g.groupName === 'General');
        const strikesGroup = allPeriodStats.groups.find((g: any) => g.groupName === 'Strikes');
        const groundGroup = allPeriodStats.groups.find((g: any) => g.groupName === 'Ground');
        const clinchGroup = allPeriodStats.groups.find((g: any) => g.groupName === 'Clinch');

        // Helper function to find stat value
        const findStat = (group: any, key: string) => {
          const stat = group?.statisticsItems.find((s: any) => s.key === key);
          return stat ? { home: stat.homeValue, away: stat.awayValue } : { home: 0, away: 0 };
        };

        // Get current round and time
        const timeInFight = findStat(generalGroup, 'time');
        const round = Math.floor(timeInFight.home / 300) + 1;
        const timeInRound = timeInFight.home % 300;

        // Insert stats
        await client.query(`
          INSERT INTO live_fight_stats (
            matchup_id, round, time_in_round,
            fighter1_total_strikes, fighter2_total_strikes,
            fighter1_significant_strikes, fighter2_significant_strikes,
            fighter1_head_strikes, fighter2_head_strikes,
            fighter1_body_strikes, fighter2_body_strikes,
            fighter1_leg_strikes, fighter2_leg_strikes,
            fighter1_distance_time, fighter2_distance_time,
            fighter1_ground_time, fighter2_ground_time,
            fighter1_clinch_time, fighter2_clinch_time,
            fighter1_knockdowns, fighter2_knockdowns
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
          ON CONFLICT (matchup_id, round, time_in_round)
          DO UPDATE SET
            fighter1_total_strikes = EXCLUDED.fighter1_total_strikes,
            fighter2_total_strikes = EXCLUDED.fighter2_total_strikes,
            fighter1_significant_strikes = EXCLUDED.fighter1_significant_strikes,
            fighter2_significant_strikes = EXCLUDED.fighter2_significant_strikes,
            fighter1_head_strikes = EXCLUDED.fighter1_head_strikes,
            fighter2_head_strikes = EXCLUDED.fighter2_head_strikes,
            fighter1_body_strikes = EXCLUDED.fighter1_body_strikes,
            fighter2_body_strikes = EXCLUDED.fighter2_body_strikes,
            fighter1_leg_strikes = EXCLUDED.fighter1_leg_strikes,
            fighter2_leg_strikes = EXCLUDED.fighter2_leg_strikes,
            fighter1_distance_time = EXCLUDED.fighter1_distance_time,
            fighter2_distance_time = EXCLUDED.fighter2_distance_time,
            fighter1_ground_time = EXCLUDED.fighter1_ground_time,
            fighter2_ground_time = EXCLUDED.fighter2_ground_time,
            fighter1_clinch_time = EXCLUDED.fighter1_clinch_time,
            fighter2_clinch_time = EXCLUDED.fighter2_clinch_time,
            fighter1_knockdowns = EXCLUDED.fighter1_knockdowns,
            fighter2_knockdowns = EXCLUDED.fighter2_knockdowns,
            created_at = CURRENT_TIMESTAMP
        `, [
          matchupId,
          round,
          timeInRound,
          findStat(strikesGroup, 'strikesLanded').home,
          findStat(strikesGroup, 'strikesLanded').away,
          findStat(strikesGroup, 'significantStrikesLanded').home,
          findStat(strikesGroup, 'significantStrikesLanded').away,
          findStat(strikesGroup, 'significantStrikesHeadLanded').home,
          findStat(strikesGroup, 'significantStrikesHeadLanded').away,
          findStat(strikesGroup, 'significantStrikesBodyLanded').home,
          findStat(strikesGroup, 'significantStrikesBodyLanded').away,
          findStat(strikesGroup, 'significantStrikesLegsLanded').home,
          findStat(strikesGroup, 'significantStrikesLegsLanded').away,
          findStat(generalGroup, 'distanceSeconds').home,
          findStat(generalGroup, 'distanceSeconds').away,
          findStat(groundGroup, 'groundSeconds').home,
          findStat(groundGroup, 'groundSeconds').away,
          findStat(clinchGroup, 'clinchSeconds').home,
          findStat(clinchGroup, 'clinchSeconds').away,
          findStat(strikesGroup, 'knockdowns').home,
          findStat(strikesGroup, 'knockdowns').away
        ]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
} 