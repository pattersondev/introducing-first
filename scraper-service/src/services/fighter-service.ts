import { Pool } from 'pg';
import { generateId } from '../utils/helpers';

export class FighterService {
  constructor(private pool: Pool) {}

  async processFighter(fighter: any) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      const fighterId = generateId(
        fighter.FirstName || '', 
        fighter.LastName || '', 
        fighter.Birthdate || 'unknown'
      );

      // Parse height and weight
      let heightInInches = 0;
      let weight = 0;

      if (fighter.HeightAndWeight) {
        try {
          const [heightStr, weightStr] = fighter.HeightAndWeight.split(', ');
          if (heightStr && heightStr.includes("'")) {
            const [feet, inches] = heightStr.replace('"', '').split("'").map((str: string) => parseInt(str.trim()));
            heightInInches = (feet * 12) + (inches || 0);
          }
          if (weightStr) {
            weight = parseFloat(weightStr.split(' ')[0]) || 0;
          }
        } catch (e) {
          console.warn('Error parsing height and weight:', e);
        }
      }

      // Parse birthdate and calculate age
      let age = 0;
      let birthdate: Date | null = null;
      
      if (fighter.Birthdate) {
        try {
          // Remove age in parentheses if present
          const birthdateStr = fighter.Birthdate.split('(')[0].trim();
          birthdate = new Date(birthdateStr);
          if (!isNaN(birthdate.getTime())) {
            const today = new Date();
            age = today.getFullYear() - birthdate.getFullYear();
            const monthDiff = today.getMonth() - birthdate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
              age--;
            }
          } else {
            birthdate = null;
          }
        } catch (e) {
          console.warn('Error calculating age:', e);
          birthdate = null;
        }
      }

      const fighterExists = await client.query('SELECT 1 FROM fighters WHERE fighter_id = $1', [fighterId]);
      if (fighterExists.rowCount === 0) {
        await client.query(
          'INSERT INTO fighters (fighter_id, first_name, last_name, height, weight, birthdate, age, team, nickname, stance, win_loss_record, tko_record, sub_record, country, reach) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)',
          [
            fighterId,
            fighter.FirstName,
            fighter.LastName,
            heightInInches,
            weight,
            birthdate,
            age,
            fighter.Team || '',
            fighter.Nickname || '',
            fighter.Stance || '',
            fighter.WinLossRecord || '0-0-0',
            fighter.TKORecord || '0-0',
            fighter.SubRecord || '0-0',
            fighter.Country || '',
            fighter.Reach || ''
          ]
        );
      }

      // Process fights if they exist
      if (fighter.Fights && Array.isArray(fighter.Fights)) {
        for (const fight of fighter.Fights) {
          if (fight.Date && fight.Opponent) {
            const fightId = generateId(fighterId, fight.Date || '', fight.Opponent || '');
            
            // Parse fight date
            let fightDate: Date | null = null;
            try {
              fightDate = new Date(fight.Date);
              if (isNaN(fightDate.getTime())) {
                fightDate = null;
              }
            } catch (e) {
              console.warn('Error parsing fight date:', e);
              fightDate = null;
            }

            // Insert fight without matchup_id reference
            await client.query(
              'INSERT INTO fights (fight_id, fighter_id, date, opponent, event, result, decision, rnd, time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (fight_id) DO UPDATE SET result = $6, decision = $7, rnd = $8, time = $9',
              [
                fightId,
                fighterId,
                fightDate,
                fight.Opponent || '',
                fight.Event || '',
                fight.Result || '',
                fight.Decision || '',
                parseInt(fight.Rnd) || null,
                fight.Time || ''
              ]
            );
          }
        }
      }

      await this.processFighterStats(client, fighter, fighterId);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  private async processFighterStats(client: any, fighter: any, fighterId: string) {
    // Process fights
    if (fighter.Fights && Array.isArray(fighter.Fights)) {
      for (const fight of fighter.Fights) {
        if (fight.Date && fight.Opponent) {
          await this.processFight(client, fight, fighterId);
        }
      }
    }

    // Process striking stats
    if (fighter.StrikingStats && Array.isArray(fighter.StrikingStats)) {
      for (const stat of fighter.StrikingStats) {
        if (stat.Date && stat.Opponent) {
          await this.processStrikingStat(client, stat, fighterId);
        }
      }
    }

    // Process clinch stats
    if (fighter.ClinchStats && Array.isArray(fighter.ClinchStats)) {
      for (const stat of fighter.ClinchStats) {
        if (stat.Date && stat.Opponent) {
          await this.processClinchStat(client, stat, fighterId);
        }
      }
    }

    // Process ground stats
    if (fighter.GroundStats && Array.isArray(fighter.GroundStats)) {
      for (const stat of fighter.GroundStats) {
        if (stat.Date && stat.Opponent) {
          await this.processGroundStat(client, stat, fighterId);
        }
      }
    }
  }

  private async processFight(client: any, fight: any, fighterId: string) {
    const fightId = generateId(fighterId, fight.Date || '', fight.Opponent || '');
    const matchupId = generateId(
      fight.Event || '', 
      fight.Date || '', 
      fight.Opponent || ''
    );

    let fightDate: Date | null = null;
    try {
      fightDate = new Date(fight.Date);
      if (isNaN(fightDate.getTime())) {
        fightDate = null;
      }
    } catch (e) {
      console.warn('Error parsing fight date:', e);
      fightDate = null;
    }

    await client.query(
      'INSERT INTO fights (fight_id, matchup_id, fighter_id, date, opponent, event, result, decision, rnd, time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (fight_id) DO UPDATE SET result = $7, decision = $8, rnd = $9, time = $10',
      [
        fightId,
        matchupId,
        fighterId,
        fightDate,
        fight.Opponent || '',
        fight.Event || '',
        fight.Result || '',
        fight.Decision || '',
        parseInt(fight.Rnd) || null,
        fight.Time || ''
      ]
    );
  }

  private async processStrikingStat(client: any, stat: any, fighterId: string) {
    const statId = generateId(fighterId, stat.Date || '', stat.Opponent || '', 'striking');
    await client.query(
      `INSERT INTO striking_stats (
        striking_stat_id, fighter_id, opponent, event, result,
        sdbl_a, sdhl_a, sdll_a, tsl, tsa, ssl, ssa,
        tsl_tsa_perc, kd, body_perc, head_perc, leg_perc
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (striking_stat_id) DO UPDATE SET
        result = $5, sdbl_a = $6, sdhl_a = $7, sdll_a = $8,
        tsl = $9, tsa = $10, ssl = $11, ssa = $12,
        tsl_tsa_perc = $13, kd = $14, body_perc = $15,
        head_perc = $16, leg_perc = $17`,
      [
        statId,
        fighterId,
        stat.Opponent || '',
        stat.Event || '',
        stat.Result || '',
        stat.SDblA || '0/0',
        stat.SDhlA || '0/0',
        stat.SDllA || '0/0',
        parseInt(stat.TSL) || 0,
        parseInt(stat.TSA) || 0,
        parseInt(stat.SSL) || 0,
        parseInt(stat.SSA) || 0,
        parseFloat((stat.TSL_TSA || '0').replace('%', '')) / 100 || 0,
        parseInt(stat.KD) || 0,
        parseFloat((stat.PercentBody || '0').replace('%', '')) / 100 || 0,
        parseFloat((stat.PercentHead || '0').replace('%', '')) / 100 || 0,
        parseFloat((stat.PercentLeg || '0').replace('%', '')) / 100 || 0
      ]
    );
  }

  private async processClinchStat(client: any, stat: any, fighterId: string) {
    const statId = generateId(fighterId, stat.Date || '', stat.Opponent || '', 'clinch');
    await client.query(
      `INSERT INTO clinch_stats (
        clinch_stat_id, fighter_id, opponent, event, result,
        scbl, scba, schl, scha, scll, scla,
        rv, sr, tdl, tda, tds, tk_acc_perc
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (clinch_stat_id) DO UPDATE SET
        result = $5, scbl = $6, scba = $7, schl = $8, scha = $9,
        scll = $10, scla = $11, rv = $12, sr = $13,
        tdl = $14, tda = $15, tds = $16, tk_acc_perc = $17`,
      [
        statId,
        fighterId,
        stat.Opponent || '',
        stat.Event || '',
        stat.Result || '',
        parseInt(stat.SCBL) || 0,
        parseInt(stat.SCBA) || 0,
        parseInt(stat.SCHL) || 0,
        parseInt(stat.SCHA) || 0,
        parseInt(stat.SCLL) || 0,
        parseInt(stat.SCLA) || 0,
        parseInt(stat.RV) || 0,
        parseFloat(stat.SR) || 0,
        parseInt(stat.TDL) || 0,
        parseInt(stat.TDA) || 0,
        parseInt(stat.TDS) || 0,
        parseFloat((stat.TK_ACC || '0').replace('%', '')) / 100 || 0
      ]
    );
  }

  private async processGroundStat(client: any, stat: any, fighterId: string) {
    const statId = generateId(fighterId, stat.Date || '', stat.Opponent || '', 'ground');
    await client.query(
      `INSERT INTO ground_stats (
        ground_stat_id, fighter_id, opponent, event, result,
        sgbl, sgba, sghl, sgha, sgll, sgla,
        ad, adtb, adhg, adtm, adts, sm
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (ground_stat_id) DO UPDATE SET
        result = $5, sgbl = $6, sgba = $7, sghl = $8, sgha = $9,
        sgll = $10, sgla = $11, ad = $12, adtb = $13,
        adhg = $14, adtm = $15, adts = $16, sm = $17`,
      [
        statId,
        fighterId,
        stat.Opponent || '',
        stat.Event || '',
        stat.Result || '',
        parseInt(stat.SGBL) || 0,
        parseInt(stat.SGBA) || 0,
        parseInt(stat.SGHL) || 0,
        parseInt(stat.SGHA) || 0,
        parseInt(stat.SGLL) || 0,
        parseInt(stat.SGLA) || 0,
        parseInt(stat.AD) || 0,
        parseInt(stat.ADTB) || 0,
        parseInt(stat.ADHG) || 0,
        parseInt(stat.ADTM) || 0,
        parseInt(stat.ADTS) || 0,
        parseInt(stat.SM) || 0
      ]
    );
  }

  async linkFightsToMatchups() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Find fights without matchup_id
      const unlinkedFights = await client.query(`
        SELECT f.fight_id, f.fighter_id, f.opponent, f.event, f.date
        FROM fights f
        WHERE f.matchup_id IS NULL
      `);

      for (const fight of unlinkedFights.rows) {
        // Try to find matching matchup
        const matchup = await client.query(`
          SELECT m.matchup_id
          FROM matchups m
          JOIN events e ON m.event_id = e.event_id
          WHERE 
            (
              (m.fighter1_id = $1 OR m.fighter2_id = $1)
              AND e.name = $2
              AND e.date = $3
            )
        `, [fight.fighter_id, fight.event, fight.date]);

        if (matchup.rows.length > 0) {
          // Link the fight to the matchup
          await client.query(`
            UPDATE fights
            SET matchup_id = $1
            WHERE fight_id = $2
          `, [matchup.rows[0].matchup_id, fight.fight_id]);
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

  async searchFighters(query: string, page: number = 1, limit: number = 10) {
    const client = await this.pool.connect();
    try {
      const offset = (page - 1) * limit;
      
      // Get total count for pagination
      const countResult = await client.query(
        `SELECT COUNT(*) 
         FROM fighters 
         WHERE LOWER(CONCAT(first_name, ' ', last_name)) LIKE LOWER($1)`,
        [`%${query}%`]
      );
      
      const totalCount = parseInt(countResult.rows[0].count);

      // Get paginated results
      const result = await client.query(
        `SELECT 
          fighter_id,
          first_name,
          last_name,
          nickname,
          team,
          win_loss_record,
          weight,
          height
         FROM fighters 
         WHERE LOWER(CONCAT(first_name, ' ', last_name)) LIKE LOWER($1)
         ORDER BY last_name, first_name
         LIMIT $2 OFFSET $3`,
        [`%${query}%`, limit, offset]
      );

      return {
        fighters: result.rows,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        }
      };
    } finally {
      client.release();
    }
  }
} 