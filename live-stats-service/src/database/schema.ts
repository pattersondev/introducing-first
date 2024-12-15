export const createTablesQuery = `
CREATE TABLE IF NOT EXISTS events (
    event_id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(255),
    date DATE,
    location VARCHAR(255),
    main_card_time VARCHAR(20),
    prelims_time VARCHAR(20),
    early_prelims_time VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS matchups (
    matchup_id VARCHAR(32) PRIMARY KEY,
    event_id VARCHAR(32) REFERENCES events(event_id),
    fighter1_id VARCHAR(32),
    fighter2_id VARCHAR(32),
    fighter1_name VARCHAR(255) NOT NULL,
    fighter2_name VARCHAR(255) NOT NULL,
    fighter1_record VARCHAR(20),
    fighter2_record VARCHAR(20),
    live_id BIGINT,
    start_time TIME,
    weight_class VARCHAR(50),
    fight_type VARCHAR(50),
    display_order INT NOT NULL,
    result TEXT,
    winner VARCHAR(255),
    card_type VARCHAR(50),
    last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS live_fight_stats (
    stat_id SERIAL PRIMARY KEY,
    matchup_id VARCHAR(32) REFERENCES matchups(matchup_id),
    round INT NOT NULL,
    time_in_round INT NOT NULL,
    
    -- Control stats
    fighter1_distance_time INT,
    fighter2_distance_time INT,
    fighter1_ground_time INT,
    fighter2_ground_time INT,
    fighter1_clinch_time INT,
    fighter2_clinch_time INT,
    fighter1_ground_control_time INT,
    fighter2_ground_control_time INT,
    fighter1_clinch_control_time INT,
    fighter2_clinch_control_time INT,
    
    -- Strike stats
    fighter1_total_strikes INT,
    fighter2_total_strikes INT,
    fighter1_significant_strikes INT,
    fighter2_significant_strikes INT,
    fighter1_distance_strikes INT,
    fighter2_distance_strikes INT,
    fighter1_ground_strikes INT,
    fighter2_ground_strikes INT,
    fighter1_clinch_strikes INT,
    fighter2_clinch_strikes INT,
    
    -- Significant strike locations
    fighter1_head_strikes INT,
    fighter2_head_strikes INT,
    fighter1_body_strikes INT,
    fighter2_body_strikes INT,
    fighter1_leg_strikes INT,
    fighter2_leg_strikes INT,
    
    -- Takedown stats
    fighter1_takedowns_attempted INT,
    fighter2_takedowns_attempted INT,
    fighter1_takedowns_succeeded INT,
    fighter2_takedowns_succeeded INT,
    
    -- Submission stats
    fighter1_submissions_attempted INT,
    fighter2_submissions_attempted INT,
    
    -- Knockdowns
    fighter1_knockdowns INT,
    fighter2_knockdowns INT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(matchup_id, round, time_in_round)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_live_fight_stats_matchup ON live_fight_stats(matchup_id);
CREATE INDEX IF NOT EXISTS idx_live_fight_stats_time ON live_fight_stats(created_at);
`;
