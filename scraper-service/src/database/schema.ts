export const createTablesQuery = `
-- Enable pg_trgm extension for text similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS events (
    event_id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(255),
    date DATE,
    location VARCHAR(255),
    main_card_time VARCHAR(20),
    prelims_time VARCHAR(20),
    early_prelims_time VARCHAR(20)
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
    reach VARCHAR(255),
    image_url VARCHAR(255),
    current_promotion_rank INT,
    weight_class VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS matchups (
    matchup_id VARCHAR(32) PRIMARY KEY,
    event_id VARCHAR(32) REFERENCES events(event_id),
    fighter1_id VARCHAR(32) NULL REFERENCES fighters(fighter_id),
    fighter2_id VARCHAR(32) NULL REFERENCES fighters(fighter_id),
    fighter1_name VARCHAR(255) NOT NULL,
    fighter2_name VARCHAR(255) NOT NULL,
    fighter1_record VARCHAR(20),
    fighter2_record VARCHAR(20),
    result TEXT,
    winner VARCHAR(255),
    display_order INT NOT NULL,
    live_id BIGINT,
    start_time TIME,
    card_type VARCHAR(50)
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
    time VARCHAR(255),
    is_title_fight BOOLEAN DEFAULT FALSE
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

CREATE TABLE IF NOT EXISTS fighter_searches (
    search_id SERIAL PRIMARY KEY,
    fighter_id VARCHAR(32) REFERENCES fighters(fighter_id),
    search_count INT DEFAULT 1,
    last_searched TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fighter_id)
);

-- Add these tables to your schema

CREATE TABLE IF NOT EXISTS weight_classes (
    weight_class_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    division VARCHAR(50) NOT NULL, -- 'Men's' or 'Women's'
    weight_limit INT NOT NULL,
    display_order INT NOT NULL,
    UNIQUE(name, division)
);

CREATE TABLE IF NOT EXISTS analytics_rankings (
    ranking_id SERIAL PRIMARY KEY,
    fighter_id VARCHAR(32) REFERENCES fighters(fighter_id),
    weight_class_id INT REFERENCES weight_classes(weight_class_id),
    rank INT NOT NULL,
    previous_rank INT,
    points DECIMAL(10,2) NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fighter_id, weight_class_id)
);

CREATE TABLE IF NOT EXISTS community_rankings (
    ranking_id SERIAL PRIMARY KEY,
    fighter_id VARCHAR(32) REFERENCES fighters(fighter_id),
    weight_class_id INT REFERENCES weight_classes(weight_class_id),
    rank INT NOT NULL,
    previous_rank INT,
    points INT NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fighter_id, weight_class_id)
);

CREATE TABLE IF NOT EXISTS fight_predictions (
    matchup_id VARCHAR(32) PRIMARY KEY,
    fighter1_id VARCHAR(32) REFERENCES fighters(fighter_id),
    fighter2_id VARCHAR(32) REFERENCES fighters(fighter_id),
    fighter1_win_probability DECIMAL(6,4),
    fighter2_win_probability DECIMAL(6,4),
    fighter1_ko_tko_probability DECIMAL(6,4),
    fighter1_submission_probability DECIMAL(6,4),
    fighter1_decision_probability DECIMAL(6,4),
    fighter2_ko_tko_probability DECIMAL(6,4),
    fighter2_submission_probability DECIMAL(6,4),
    fighter2_decision_probability DECIMAL(6,4),
    simulation_count INTEGER,
    confidence_score DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(matchup_id)
);

CREATE TABLE IF NOT EXISTS fighter_attributes (
    attribute_id VARCHAR(36) PRIMARY KEY,
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

-- Insert default weight classes
INSERT INTO weight_classes (name, division, weight_limit, display_order) 
VALUES 
    ('Heavyweight', 'Men''s', 265, 1),
    ('Light Heavyweight', 'Men''s', 205, 2),
    ('Middleweight', 'Men''s', 185, 3),
    ('Welterweight', 'Men''s', 170, 4),
    ('Lightweight', 'Men''s', 155, 5),
    ('Featherweight', 'Men''s', 145, 6),
    ('Bantamweight', 'Men''s', 135, 7),
    ('Flyweight', 'Men''s', 125, 8),
    ('Featherweight', 'Women''s', 145, 9),
    ('Bantamweight', 'Women''s', 135, 10),
    ('Flyweight', 'Women''s', 125, 11),
    ('Strawweight', 'Women''s', 115, 12)
ON CONFLICT (name, division) DO NOTHING;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_fighters_first_name ON fighters(first_name);
CREATE INDEX IF NOT EXISTS idx_fighters_last_name ON fighters(last_name);
CREATE INDEX IF NOT EXISTS idx_matchups_fighter1_name ON matchups(fighter1_name);
CREATE INDEX IF NOT EXISTS idx_matchups_fighter2_name ON matchups(fighter2_name);
CREATE INDEX IF NOT EXISTS idx_matchups_fighter_ids ON matchups(fighter1_id, fighter2_id);
CREATE INDEX IF NOT EXISTS idx_analytics_rankings_weight_class ON analytics_rankings(weight_class_id);
CREATE INDEX IF NOT EXISTS idx_community_rankings_weight_class ON community_rankings(weight_class_id);
CREATE INDEX IF NOT EXISTS idx_fight_predictions_matchup ON fight_predictions(matchup_id);
CREATE INDEX IF NOT EXISTS idx_fight_predictions_created_at ON fight_predictions(created_at);
CREATE INDEX IF NOT EXISTS idx_fighter_attributes_fighter ON fighter_attributes(fighter_id);

-- Add this new table after the existing tables
CREATE TABLE IF NOT EXISTS promotion_weight_classes (
    weight_class_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    display_order INT NOT NULL
);

CREATE TABLE IF NOT EXISTS promotion_rankings (
    ranking_id SERIAL PRIMARY KEY,
    fighter_id VARCHAR(32) REFERENCES fighters(fighter_id),
    weight_class_id INT REFERENCES promotion_weight_classes(weight_class_id),
    rank INT NOT NULL,
    previous_rank INT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fighter_id, weight_class_id, last_updated)
);

-- Insert UFC weight classes
INSERT INTO promotion_weight_classes (name, display_order) 
VALUES 
    ('UFC Heavyweight', 1),
    ('UFC Light Heavyweight', 2),
    ('UFC Middleweight', 3),
    ('UFC Welterweight', 4),
    ('UFC Lightweight', 5),
    ('UFC Featherweight', 6),
    ('UFC Bantamweight', 7),
    ('UFC Flyweight', 8),
    ('UFC Women''s Bantamweight', 9),
    ('UFC Women''s Flyweight', 10),
    ('UFC Women''s Strawweight', 11)
ON CONFLICT (name) DO NOTHING;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_promotion_rankings_weight_class ON promotion_rankings(weight_class_id);
CREATE INDEX IF NOT EXISTS idx_promotion_rankings_fighter ON promotion_rankings(fighter_id);

CREATE TABLE IF NOT EXISTS news_articles (
    id VARCHAR(32) PRIMARY KEY,
    tweet_id VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    url TEXT NOT NULL,
    published_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS news_article_fighters (
    id SERIAL PRIMARY KEY,
    article_id VARCHAR(32) REFERENCES news_articles(id) ON DELETE CASCADE,
    fighter_id VARCHAR(32) REFERENCES fighters(fighter_id) ON DELETE CASCADE,
    confidence_score FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(article_id, fighter_id)
);

CREATE TABLE IF NOT EXISTS news_article_events (
    id SERIAL PRIMARY KEY,
    article_id VARCHAR(32) REFERENCES news_articles(id) ON DELETE CASCADE,
    event_id VARCHAR(32) REFERENCES events(event_id) ON DELETE CASCADE,
    confidence_score FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(article_id, event_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles(published_at);
CREATE INDEX IF NOT EXISTS idx_news_article_fighters_article ON news_article_fighters(article_id);
CREATE INDEX IF NOT EXISTS idx_news_article_fighters_fighter ON news_article_fighters(fighter_id);
CREATE INDEX IF NOT EXISTS idx_news_article_events_article ON news_article_events(article_id);
CREATE INDEX IF NOT EXISTS idx_news_article_events_event ON news_article_events(event_id);
`; 