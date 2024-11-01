import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import crypto from 'crypto';
import cors from 'cors';

dotenv.config();

const app = express();
const port = process.env.PORT || 5555;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors({
  methods: ['GET', 'POST'], // Specify allowed methods
}));

app.use(express.json());

function generateId(...data: (string | object)[]): string {
  console.log('Generating ID for:', data);
  const hash = crypto.createHash('md5');
  data.forEach(d => {
    if (typeof d === 'object') {
      hash.update(JSON.stringify(d));
    } else {
      hash.update(d);
    }
  });
  return hash.digest('hex');
}

// SQL queries to create tables
const createTablesQuery = `
CREATE TABLE IF NOT EXISTS events (
    event_id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(255),
    date DATE,
    location VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS matchups (
    matchup_id VARCHAR(32) PRIMARY KEY,
    event_id VARCHAR(32) REFERENCES events(event_id),
    fighter1_id VARCHAR(32),
    fighter2_id VARCHAR(32),
    result TEXT,
    winner VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS fighters (
    fighter_id VARCHAR(32) PRIMARY KEY,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    height DOUBLE PRECISION,
    weight DOUBLE PRECISION,
    birthdate DATE,
    age INT,
    team VARCHAR(255),
    nickname VARCHAR(255),
    stance VARCHAR(255),
    win_loss_record VARCHAR(255),
    tko_record VARCHAR(255),
    sub_record VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS fights (
    fight_id VARCHAR(32) PRIMARY KEY,
    matchup_id VARCHAR(32) REFERENCES matchups(matchup_id),
    fighter_id VARCHAR(32) REFERENCES fighters(fighter_id),
    date DATE,
    opponent VARCHAR(255),
    event VARCHAR(255),
    result TEXT,
    decision VARCHAR(255),
    rnd INT,
    time VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS striking_stats (
    striking_stat_id VARCHAR(32) PRIMARY KEY,
    fighter_id VARCHAR(32) REFERENCES fighters(fighter_id),
    opponent VARCHAR(255),
    event VARCHAR(255),
    result TEXT,
    sdbl_a VARCHAR(255),
    sdhl_a VARCHAR(255),
    sdll_a VARCHAR(255),
    tsl INT,
    tsa INT,
    ssl INT,
    ssa INT,
    tsl_tsa_perc DOUBLE PRECISION,
    kd INT,
    body_perc DOUBLE PRECISION,
    head_perc DOUBLE PRECISION,
    leg_perc DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS clinch_stats (
    clinch_stat_id VARCHAR(32) PRIMARY KEY,
    fighter_id VARCHAR(32) REFERENCES fighters(fighter_id),
    opponent VARCHAR(255),
    event VARCHAR(255),
    result TEXT,
    scbl INT,
    scba INT,
    schl INT,
    scha INT,
    scll INT,
    scla INT,
    rv INT,
    sr DOUBLE PRECISION,
    tdl INT,
    tda INT,
    tds INT,
    tk_acc_perc DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS ground_stats (
    ground_stat_id VARCHAR(32) PRIMARY KEY,
    fighter_id VARCHAR(32) REFERENCES fighters(fighter_id),
    opponent VARCHAR(255),
    event VARCHAR(255),
    result TEXT,
    sgbl INT,
    sgba INT,
    sghl INT,
    sgha INT,
    sgll INT,
    sgla INT,
    ad INT,
    adtb INT,
    adhg INT,
    adtm INT,
    adts INT,
    sm INT
);
`;

// Run the SQL queries to create tables
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(createTablesQuery);
    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating database tables:', error);
  } finally {
    client.release();
  }
}

initializeDatabase();

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

app.get('/api/events', async (req: Request, res: Response) => {
  const client = await pool.connect();
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
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Error fetching events' });
  } finally {
    client.release();
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
        'INSERT INTO fighters (fighter_id, first_name, last_name, height, weight, birthdate, age, team, nickname, stance, win_loss_record, tko_record, sub_record) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
        [fighterId, fighter.FirstName, fighter.LastName, fighter.Height, fighter.Weight, fighter.Birthdate, fighter.Age, fighter.Team, fighter.Nickname, fighter.Stance, fighter.WinLossRecord, fighter.TKORecord, fighter.SubRecord]
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
        `INSERT INTO striking_stats (striking_stat_id, fighter_id, opponent, event, result, sdbl_a, sdhl_a, sdll_a, tsl, tsa, ssl, ssa, tsl_tsa_perc, kd, body_perc, head_perc, leg_perc) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         ON CONFLICT (striking_stat_id) DO UPDATE SET 
         sdbl_a = $6, sdhl_a = $7, sdll_a = $8, tsl = $9, tsa = $10, ssl = $11, ssa = $12, tsl_tsa_perc = $13, kd = $14, body_perc = $15, head_perc = $16, leg_perc = $17`,
        [statId, fighterId, stat.Opponent, stat.Event, stat.Result, stat.SDblA, stat.SDhlA, stat.SDllA, stat.TSL, stat.TSA, stat.SSL, stat.SSA, stat.TSL_TSA_Perc, stat.KD, stat.BodyPerc, stat.HeadPerc, stat.LegPerc]
      );
    }

    // Process ClinchStats
    for (const stat of fighter.ClinchStats) {
      const statId = generateId(fighterId, stat.Date, stat.Opponent, 'clinch');
      await client.query(
        `INSERT INTO clinch_stats (clinch_stat_id, fighter_id, opponent, event, result, scbl, scba, schl, scha, scll, scla, rv, sr, tdl, tda, tds, tk_acc_perc) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (clinch_stat_id) DO UPDATE SET 
         scbl = $6, scba = $7, schl = $8, scha = $9, scll = $10, scla = $11, rv = $12, sr = $13, tdl = $14, tda = $15, tds = $16, tk_acc_perc = $17`,
        [statId, fighterId, stat.Opponent, stat.Event, stat.Result, stat.SCBL, stat.SCBA, stat.SCHL, stat.SCHA, stat.SCLL, stat.SCLA, stat.RV, stat.SR, stat.TDL, stat.TDA, stat.TDS, stat.TK_ACC_Perc]
      );
    }

    // Process GroundStats
    for (const stat of fighter.GroundStats) {
      const statId = generateId(fighterId, stat.Date, stat.Opponent, 'ground');
      await client.query(
        `INSERT INTO ground_stats (ground_stat_id, fighter_id, opponent, event, result, sgbl, sgba, sghl, sgha, sgll, sgla, ad, adtb, adhg, adtm, adts, sm) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (ground_stat_id) DO UPDATE SET 
         sgbl = $6, sgba = $7, sghl = $8, sgha = $9, sgll = $10, sgla = $11, ad = $12, adtb = $13, adhg = $14, adtm = $15, adts = $16, sm = $17`,
        [statId, fighterId, stat.Opponent, stat.Event, stat.Result, stat.SGBL, stat.SGBA, stat.SGHL, stat.SGHA, stat.SGLL, stat.SGLA, stat.AD, stat.ADTB, stat.ADHG, stat.ADTM, stat.ADTS, stat.SM]
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
