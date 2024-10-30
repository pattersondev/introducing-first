import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import crypto from 'crypto';
import cors from 'cors';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors({
  methods: ['GET', 'POST'], // Specify allowed methods
}));

app.use(express.json());

function generateId(...data: string[]): string {
  const hash = crypto.createHash('md5');
  data.forEach(d => hash.update(d));
  return hash.digest('hex');
}

app.post('/api/events', async (req: Request, res: Response) => {
  const events = req.body;
  try {
    for (const event of events) {
      await processEvent(event);
    }
    res.json({ message: 'Data processed successfully' });
  } catch (error) {
    console.error('Error processing events:', error);
    res.status(500).json({ error: 'Error processing events' });
  }
});

app.post('/api/fighters', async (req: Request, res: Response) => {
  const fighters = req.body;
  try {
    for (const fighter of fighters) {
      await processFighter(fighter);
    }
    res.json({ message: 'Fighter data processed successfully' });
  } catch (error) {
    console.error('Error processing fighters:', error);
    res.status(500).json({ error: 'Error processing fighters' });
  }
});

async function processEvent(event: any) {
  const client = await pool.connect();
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

async function processFighter(fighter: any) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const fighterId = generateId(fighter.FirstName, fighter.LastName, fighter.Birthdate);
    
    const fighterExists = await client.query('SELECT 1 FROM fighters WHERE fighter_id = $1', [fighterId]);
    if (fighterExists.rowCount === 0) {
      await client.query(
        'INSERT INTO fighters (fighter_id, first_name, last_name, height_and_weight, birthdate, team, nickname, stance, win_loss_record, tko_record, sub_record) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
        [fighterId, fighter.FirstName, fighter.LastName, fighter.HeightAndWeight, fighter.Birthdate, fighter.Team, fighter.Nickname, fighter.Stance, fighter.WinLossRecord, fighter.TKORecord, fighter.SubRecord]
      );
    }

    for (const fight of fighter.Fights) {
      const fightId = generateId(fighterId, fight.Date, fight.Opponent);
      const matchupId = generateId(fight.Event, fight.Date, `${fighter.FirstName} ${fighter.LastName}`, fight.Opponent);

      await client.query(
        'INSERT INTO fights (fight_id, matchup_id, fighter_id, date, opponent, event, result, decision, rnd, time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (fight_id) DO UPDATE SET result = $7, decision = $8, rnd = $9, time = $10',
        [fightId, matchupId, fighterId, fight.Date, fight.Opponent, fight.Event, fight.Result, fight.Decision, fight.Rnd, fight.Time]
      );
    }

    // Process StrikingStats
    for (const stat of fighter.StrikingStats) {
      const statId = generateId(fighterId, stat.Date, stat.Opponent, 'striking');
      await client.query(
        `INSERT INTO striking_stats (stat_id, fighter_id, date, opponent, event, result, sdbl_a, sdhl_a, sdll_a, tsl, tsa, ssl, ssa, tsl_tsa, kd, percent_body, percent_head, percent_leg) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         ON CONFLICT (stat_id) DO UPDATE SET 
         sdbl_a = $7, sdhl_a = $8, sdll_a = $9, tsl = $10, tsa = $11, ssl = $12, ssa = $13, tsl_tsa = $14, kd = $15, percent_body = $16, percent_head = $17, percent_leg = $18`,
        [statId, fighterId, stat.Date, stat.Opponent, stat.Event, stat.Result, stat.SDblA, stat.SDhlA, stat.SDllA, stat.TSL, stat.TSA, stat.SSL, stat.SSA, stat.TSL_TSA, stat.KD, stat.PercentBody, stat.PercentHead, stat.PercentLeg]
      );
    }

    // Process ClinchStats
    for (const stat of fighter.ClinchStats) {
      const statId = generateId(fighterId, stat.Date, stat.Opponent, 'clinch');
      await client.query(
        `INSERT INTO clinch_stats (stat_id, fighter_id, date, opponent, event, result, scbl, scba, schl, scha, scll, scla, rv, sr, tdl, tda, tds, tk_acc) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         ON CONFLICT (stat_id) DO UPDATE SET 
         scbl = $7, scba = $8, schl = $9, scha = $10, scll = $11, scla = $12, rv = $13, sr = $14, tdl = $15, tda = $16, tds = $17, tk_acc = $18`,
        [statId, fighterId, stat.Date, stat.Opponent, stat.Event, stat.Result, stat.SCBL, stat.SCBA, stat.SCHL, stat.SCHA, stat.SCLL, stat.SCLA, stat.RV, stat.SR, stat.TDL, stat.TDA, stat.TDS, stat.TK_ACC]
      );
    }

    // Process GroundStats
    for (const stat of fighter.GroundStats) {
      const statId = generateId(fighterId, stat.Date, stat.Opponent, 'ground');
      await client.query(
        `INSERT INTO ground_stats (stat_id, fighter_id, date, opponent, event, result, sgbl, sgba, sghl, sgha, sgll, sgla, ad, adtb, adhg, adtm, adts, sm) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         ON CONFLICT (stat_id) DO UPDATE SET 
         sgbl = $7, sgba = $8, sghl = $9, sgha = $10, sgll = $11, sgla = $12, ad = $13, adtb = $14, adhg = $15, adtm = $16, adts = $17, sm = $18`,
        [statId, fighterId, stat.Date, stat.Opponent, stat.Event, stat.Result, stat.SGBL, stat.SGBA, stat.SGHL, stat.SGHA, stat.SGLL, stat.SGLA, stat.AD, stat.ADTB, stat.ADHG, stat.ADTM, stat.ADTS, stat.SM]
      );
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
