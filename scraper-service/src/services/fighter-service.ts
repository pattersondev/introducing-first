import { Pool } from 'pg';
import { generateId } from '../utils/helpers';
import { S3Service } from './s3-service';

interface DBFight {
  date: string;
  opponent: string;
  event: string;
  result: string;
  decision: string;
  rnd: number;
  time: string;
  fight_id: string;
  fighter_id: string;
  matchup_id?: string;
}

interface FightWithOpponentId extends DBFight {
  opponent_id?: string;
}

export class FighterService {
  private s3Service: S3Service;

  constructor(private pool: Pool) {
    this.s3Service = new S3Service();
  }

  private async processAndUploadFighterImage(fighterProfileId: string): Promise<string | null> {
    try {
        const imageUrl = `https://a.espncdn.com/combiner/i?img=/i/headshots/mma/players/full/${fighterProfileId}.png&w=350&h=254`;
        console.log('Attempting to fetch image from:', imageUrl);
        
        // Pass the profileId to the upload function
        const imageS3Url = await this.s3Service.uploadFighterImage(imageUrl, fighterProfileId);
        console.log('S3 upload result:', imageS3Url);
        return imageS3Url;
    } catch (error) {
        console.error('Error processing and uploading fighter image:', error);
        return null;
    }
  }

  private extractFighterProfileId(url: string): string | null {
    try {
        console.log('Extracting profile ID from URL:', url);
        // Look for '/id/' in the URL and get the number that follows
        const match = url.match(/\/id\/(\d+)/);
        const profileId = match ? match[1] : null;
        console.log('Extracted profile ID:', profileId);
        return profileId;
    } catch (error) {
        console.error('Error extracting fighter profile ID:', error);
        return null;
    }
  }

  async processFighter(fighter: any) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      const fighterId = generateId(
        fighter.FirstName || '', 
        fighter.LastName || '', 
        fighter.Birthdate || 'unknown'
      );

      // Extract fighter profile ID from URL using the new method
      const fighterProfileId = fighter.Url ? this.extractFighterProfileId(fighter.Url) : null;
      
      // Process fighter image if profile ID exists
      let imageUrl = null;
      if (fighterProfileId) {
        imageUrl = await this.processAndUploadFighterImage(fighterProfileId);
      }

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
          'INSERT INTO fighters (fighter_id, first_name, last_name, height, weight, birthdate, age, team, nickname, stance, win_loss_record, tko_record, sub_record, country, reach, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) ON CONFLICT (fighter_id) DO UPDATE SET image_url = $16',
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
            fighter.Reach || '',
            imageUrl
          ]
        );
      } else {
        // Build dynamic UPDATE query based on non-empty values
        const updates: string[] = [];
        const values: any[] = [fighterId]; // Start with fighterId
        let paramIndex = 2; // Start from $2 since $1 is fighterId

        // Helper function to add update if value exists
        const addUpdate = (field: string, value: any) => {
          if (value !== null && value !== '') {
            updates.push(`${field} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
          }
        };

        // Only add fields that have valid values
        if (heightInInches > 0) addUpdate('height', heightInInches);
        if (weight > 0) addUpdate('weight', weight);
        if (birthdate) addUpdate('birthdate', birthdate);
        if (age > 0) addUpdate('age', age);
        if (fighter.Team) addUpdate('team', fighter.Team);
        if (fighter.Nickname) addUpdate('nickname', fighter.Nickname);
        if (fighter.Stance) addUpdate('stance', fighter.Stance);
        if (fighter.WinLossRecord) addUpdate('win_loss_record', fighter.WinLossRecord);
        if (fighter.TKORecord) addUpdate('tko_record', fighter.TKORecord);
        if (fighter.SubRecord) addUpdate('sub_record', fighter.SubRecord);
        if (fighter.Country) addUpdate('country', fighter.Country);
        if (fighter.Reach) addUpdate('reach', fighter.Reach);
        if (imageUrl) addUpdate('image_url', imageUrl);

        // Only proceed with update if there are fields to update
        if (updates.length > 0) {
          const updateQuery = `
            UPDATE fighters 
            SET ${updates.join(', ')}
            WHERE fighter_id = $1
          `;
          await client.query(updateQuery, values);
        }
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
              'INSERT INTO fights (fight_id, fighter_id, date, opponent, event, result, decision, rnd, time, is_title_fight) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (fight_id) DO UPDATE SET result = $6, decision = $7, rnd = $8, time = $9, is_title_fight = $10',
              [
                fightId,
                fighterId,
                fightDate,
                fight.Opponent || '',
                fight.Event || '',
                fight.Result || '',
                fight.Decision || '',
                parseInt(fight.Rnd) || null,
                fight.Time || '',
                fight.isTitleFight || false
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
    // Process striking stats
    if (fighter.StrikingStats && Array.isArray(fighter.StrikingStats)) {
        for (const stat of fighter.StrikingStats) {
            const statId = generateId(fighterId, stat.date || '', stat.opponent || '', 'striking');
            
            // Parse numeric values
            const tsl = parseInt(stat.tsl) || 0;
            const tsa = parseInt(stat.tsa) || 0;
            const ssl = parseInt(stat.ssl) || 0;
            const ssa = parseInt(stat.ssa) || 0;
            const kd = parseInt(stat.kd) || 0;
            const bodyPerc = parseFloat((stat.percent_body || '0').replace('%', '')) / 100;
            const headPerc = parseFloat((stat.percent_head || '0').replace('%', '')) / 100;
            const legPerc = parseFloat((stat.percent_leg || '0').replace('%', '')) / 100;
            const tslTsaPerc = parseFloat((stat.tsl_tsa || '0').replace('%', '')) / 100;

            await client.query(
                `INSERT INTO striking_stats (
                    striking_stat_id, fighter_id, opponent, event, result,
                    sdbl_a, sdhl_a, sdll_a, tsl, tsa, ssl, ssa,
                    tsl_tsa_perc, kd, body_perc, head_perc, leg_perc
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                ON CONFLICT (striking_stat_id) DO UPDATE SET
                    sdbl_a = $6, sdhl_a = $7, sdll_a = $8,
                    tsl = $9, tsa = $10, ssl = $11, ssa = $12,
                    tsl_tsa_perc = $13, kd = $14, body_perc = $15,
                    head_perc = $16, leg_perc = $17`,
                [
                    statId,
                    fighterId,
                    stat.opponent || '',
                    stat.event || '',
                    stat.result || '',
                    stat.sdbl_a || '0/0',
                    stat.sdhl_a || '0/0',
                    stat.sdll_a || '0/0',
                    tsl,
                    tsa,
                    ssl,
                    ssa,
                    tslTsaPerc,
                    kd,
                    bodyPerc,
                    headPerc,
                    legPerc
                ]
            );
        }
    }

    // Process clinch stats
    if (fighter.ClinchStats && Array.isArray(fighter.ClinchStats)) {
        for (const stat of fighter.ClinchStats) {
            const statId = generateId(fighterId, stat.date || '', stat.opponent || '', 'clinch');
            
            // Parse numeric values
            const scbl = parseInt(stat.scbl) || 0;
            const scba = parseInt(stat.scba) || 0;
            const schl = parseInt(stat.schl) || 0;
            const scha = parseInt(stat.scha) || 0;
            const scll = parseInt(stat.scll) || 0;
            const scla = parseInt(stat.scla) || 0;
            const rv = parseInt(stat.rv) || 0;
            const sr = parseFloat(stat.sr) || 0;
            const tdl = parseInt(stat.tdl) || 0;
            const tda = parseInt(stat.tda) || 0;
            const tds = parseInt(stat.tds) || 0;
            const tkAcc = parseFloat((stat.tk_acc || '0').replace('%', '')) / 100;

            await client.query(
                `INSERT INTO clinch_stats (
                    clinch_stat_id, fighter_id, opponent, event, result,
                    scbl, scba, schl, scha, scll, scla,
                    rv, sr, tdl, tda, tds, tk_acc_perc
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                ON CONFLICT (clinch_stat_id) DO UPDATE SET
                    scbl = $6, scba = $7, schl = $8, scha = $9,
                    scll = $10, scla = $11, rv = $12, sr = $13,
                    tdl = $14, tda = $15, tds = $16, tk_acc_perc = $17`,
                [
                    statId,
                    fighterId,
                    stat.opponent || '',
                    stat.event || '',
                    stat.result || '',
                    scbl,
                    scba,
                    schl,
                    scha,
                    scll,
                    scla,
                    rv,
                    sr,
                    tdl,
                    tda,
                    tds,
                    tkAcc
                ]
            );
        }
    }

    // Process ground stats
    if (fighter.GroundStats && Array.isArray(fighter.GroundStats)) {
        for (const stat of fighter.GroundStats) {
            const statId = generateId(fighterId, stat.date || '', stat.opponent || '', 'ground');
            
            // Parse numeric values
            const sgbl = parseInt(stat.sgbl) || 0;
            const sgba = parseInt(stat.sgba) || 0;
            const sghl = parseInt(stat.sghl) || 0;
            const sgha = parseInt(stat.sgha) || 0;
            const sgll = parseInt(stat.sgll) || 0;
            const sgla = parseInt(stat.sgla) || 0;
            const ad = parseInt(stat.ad) || 0;
            const adtb = parseInt(stat.adtb) || 0;
            const adhg = parseInt(stat.adhg) || 0;
            const adtm = parseInt(stat.adtm) || 0;
            const adts = parseInt(stat.adts) || 0;
            const sm = parseInt(stat.sm) || 0;

            await client.query(
                `INSERT INTO ground_stats (
                    ground_stat_id, fighter_id, opponent, event, result,
                    sgbl, sgba, sghl, sgha, sgll, sgla,
                    ad, adtb, adhg, adtm, adts, sm
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                ON CONFLICT (ground_stat_id) DO UPDATE SET
                    sgbl = $6, sgba = $7, sghl = $8, sgha = $9,
                    sgll = $10, sgla = $11, ad = $12, adtb = $13,
                    adhg = $14, adtm = $15, adts = $16, sm = $17`,
                [
                    statId,
                    fighterId,
                    stat.opponent || '',
                    stat.event || '',
                    stat.result || '',
                    sgbl,
                    sgba,
                    sghl,
                    sgha,
                    sgll,
                    sgla,
                    ad,
                    adtb,
                    adhg,
                    adtm,
                    adts,
                    sm
                ]
            );
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

  async getFighterById(fighterId: string) {
    const client = await this.pool.connect();
    try {
      // Get fighter basic info
      const fighterResult = await client.query(
        `SELECT * FROM fighters WHERE fighter_id = $1`,
        [fighterId]
      );

      if (fighterResult.rowCount === 0) {
        return null;
      }

      const fighter = fighterResult.rows[0];

      // Get fighter's fights with opponent IDs and event IDs
      const fightsResult = await client.query(
        `WITH fight_data AS (
          SELECT f.*
          FROM fights f
          WHERE f.fighter_id = $1
          ORDER BY f.date DESC
        )
        SELECT 
          fd.*,
          opp.fighter_id as opponent_id,
          e.event_id
        FROM fight_data fd
        LEFT JOIN fighters opp ON 
          CONCAT(opp.first_name, ' ', opp.last_name) = fd.opponent
        LEFT JOIN events e ON
          e.name = fd.event`,
        [fighterId]
      );

      return {
        ...fighter,
        fights: fightsResult.rows,
      };
    } finally {
      client.release();
    }
  }

  async trackSearch(fighterId: string) {
    const client = await this.pool.connect();
    try {
      await client.query(`
        INSERT INTO fighter_searches (fighter_id, search_count, last_searched)
        VALUES ($1, 1, CURRENT_TIMESTAMP)
        ON CONFLICT (fighter_id) 
        DO UPDATE SET 
          search_count = fighter_searches.search_count + 1,
          last_searched = CURRENT_TIMESTAMP
      `, [fighterId]);
    } finally {
      client.release();
    }
  }

  async getPopularFighters(limit: number = 10) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          f.fighter_id,
          f.first_name,
          f.last_name,
          f.nickname,
          f.team,
          f.win_loss_record,
          f.weight,
          f.height,
          fs.search_count
        FROM fighters f
        JOIN fighter_searches fs ON f.fighter_id = fs.fighter_id
        ORDER BY fs.search_count DESC, fs.last_searched DESC
        LIMIT $1
      `, [limit]);

      return result.rows;
    } finally {
      client.release();
    }
  }

  async cleanupSearches() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Delete old searches that haven't been searched in the last 30 days
      await client.query(`
        DELETE FROM fighter_searches
        WHERE last_searched < NOW() - INTERVAL '30 days'
        AND search_count < 5
      `);

      // Keep only top 1000 most searched fighters
      await client.query(`
        DELETE FROM fighter_searches
        WHERE fighter_id IN (
          SELECT fighter_id
          FROM fighter_searches
          ORDER BY search_count DESC, last_searched DESC
          OFFSET 50
        )
      `);

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
} 