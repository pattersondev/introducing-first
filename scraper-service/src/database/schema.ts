export const createTablesQuery = `
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
    sub_record VARCHAR(255),
    country VARCHAR(255),
    reach VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS fights (
    fight_id VARCHAR(32) PRIMARY KEY,
    matchup_id VARCHAR(32) REFERENCES matchups(matchup_id) NULL,
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