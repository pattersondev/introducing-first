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
    height_and_weight VARCHAR(255),
    birthdate VARCHAR(255),
    team VARCHAR(255),
    nickname VARCHAR(255),
    stance VARCHAR(255),
    win_loss_record VARCHAR(255),
    tko_record VARCHAR(255),
    sub_record VARCHAR(255),
    image_url VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS fights (
    fight_id VARCHAR(32) PRIMARY KEY,
    matchup_id VARCHAR(32) REFERENCES matchups(matchup_id),
    fighter_id VARCHAR(32) REFERENCES fighters(fighter_id),
    date VARCHAR(255),
    opponent VARCHAR(255),
    event VARCHAR(255),
    result VARCHAR(255),
    decision VARCHAR(255),
    rnd VARCHAR(255),
    time VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS striking_stats (
    stat_id VARCHAR(32) PRIMARY KEY,
    fighter_id VARCHAR(32) REFERENCES fighters(fighter_id),
    date VARCHAR(255),
    opponent VARCHAR(255),
    event VARCHAR(255),
    result VARCHAR(255),
    sdbl_a VARCHAR(255),
    sdhl_a VARCHAR(255),
    sdll_a VARCHAR(255),
    tsl VARCHAR(255),
    tsa VARCHAR(255),
    ssl VARCHAR(255),
    ssa VARCHAR(255),
    tsl_tsa VARCHAR(255),
    kd VARCHAR(255),
    percent_body VARCHAR(255),
    percent_head VARCHAR(255),
    percent_leg VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS clinch_stats (
    stat_id VARCHAR(32) PRIMARY KEY,
    fighter_id VARCHAR(32) REFERENCES fighters(fighter_id),
    date VARCHAR(255),
    opponent VARCHAR(255),
    event VARCHAR(255),
    result VARCHAR(255),
    scbl VARCHAR(255),
    scba VARCHAR(255),
    schl VARCHAR(255),
    scha VARCHAR(255),
    scll VARCHAR(255),
    scla VARCHAR(255),
    rv VARCHAR(255),
    sr VARCHAR(255),
    tdl VARCHAR(255),
    tda VARCHAR(255),
    tds VARCHAR(255),
    tk_acc VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS ground_stats (
    stat_id VARCHAR(32) PRIMARY KEY,
    fighter_id VARCHAR(32) REFERENCES fighters(fighter_id),
    date VARCHAR(255),
    opponent VARCHAR(255),
    event VARCHAR(255),
    result VARCHAR(255),
    sgbl VARCHAR(255),
    sgba VARCHAR(255),
    sghl VARCHAR(255),
    sgha VARCHAR(255),
    sgll VARCHAR(255),
    sgla VARCHAR(255),
    ad VARCHAR(255),
    adtb VARCHAR(255),
    adhg VARCHAR(255),
    adtm VARCHAR(255),
    adts VARCHAR(255),
    sm VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS fight_predictions (
    prediction_id VARCHAR(32) PRIMARY KEY,
    matchup_id VARCHAR(32) REFERENCES matchups(matchup_id),
    fighter1_id VARCHAR(32) REFERENCES fighters(fighter_id),
    fighter2_id VARCHAR(32) REFERENCES fighters(fighter_id),
    fighter1_win_probability DECIMAL(5,2),
    fighter2_win_probability DECIMAL(5,2),
    fighter1_ko_tko_probability DECIMAL(5,2),
    fighter1_submission_probability DECIMAL(5,2),
    fighter1_decision_probability DECIMAL(5,2),
    fighter2_ko_tko_probability DECIMAL(5,2),
    fighter2_submission_probability DECIMAL(5,2),
    fighter2_decision_probability DECIMAL(5,2),
    simulation_count INTEGER,
    confidence_score DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fighter_attributes (
    attribute_id VARCHAR(32) PRIMARY KEY,
    fighter_id VARCHAR(32) REFERENCES fighters(fighter_id),
    striking_offense_rating DECIMAL(5,2),
    striking_defense_rating DECIMAL(5,2),
    takedown_offense_rating DECIMAL(5,2),
    takedown_defense_rating DECIMAL(5,2),
    submission_offense_rating DECIMAL(5,2),
    submission_defense_rating DECIMAL(5,2),
    cardio_rating DECIMAL(5,2),
    chin_rating DECIMAL(5,2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
