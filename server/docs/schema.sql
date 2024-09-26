CREATE TABLE IF NOT EXISTS public.fighter
(
    name "char",
    nickname "char",
    division_title "char",
    status "char",
    hometown "char",
    octagon_debut "char",
    image_link "char",
    girth "char",
    stance "char",
    fighter_id integer NOT NULL,
    fighting_style "char",
    gym "char",
    age integer,
    height double precision,
    weight double precision,
    reach double precision,
    leg_reach double precision,
    CONSTRAINT fighter_pkey PRIMARY KEY (fighter_id)
)

CREATE TABLE IF NOT EXISTS public.history
(
    history_id integer NOT NULL,
    ufc_history_array json[],
    fighter_id integer,
    CONSTRAINT history_pkey PRIMARY KEY (history_id),
    CONSTRAINT fighter_id FOREIGN KEY (fighter_id)
        REFERENCES public.fighter (fighter_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID
)

CREATE TABLE IF NOT EXISTS public.last_fight
(
    last_fight_id "char" NOT NULL,
    event "char",
    date "char",
    fighter_id integer,
    CONSTRAINT last_fight_pkey PRIMARY KEY (last_fight_id),
    CONSTRAINT fighter_id FOREIGN KEY (fighter_id)
        REFERENCES public.fighter (fighter_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID
)

CREATE TABLE IF NOT EXISTS public.stat_collection
(
    stats_id integer NOT NULL,
    sig_str_landed double precision,
    sig_str_absorbed double precision,
    takedown_avg double precision,
    submission_avg double precision,
    sig_str_defense "char",
    takedown_defense "char",
    knockdown_avg double precision,
    avg_fight_time "char",
    sig_strikes_landed integer,
    sig_strikes_attempted integer,
    takedowns_landed integer,
    takedowns_attempted integer,
    striking_accuracy "char",
    takedown_accuracy "char",
    fighter_id integer,
    wins integer,
    losses integer,
    draws integer,
    CONSTRAINT stats_pkey PRIMARY KEY (stats_id),
    CONSTRAINT fighter_id FOREIGN KEY (fighter_id)
        REFERENCES public.fighter (fighter_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID
)

CREATE TABLE IF NOT EXISTS public.win_stat_collection
(
    win_stats_id "char" NOT NULL,
    wins_by_knockout integer,
    wins_by_submission integer,
    standing_actions integer,
    standing_actions_pctg "char",
    clinch_actions integer,
    clinch_actions_pctg "char",
    ground_actions integer,
    ground_actions_pctg "char",
    fighter_id integer,
    CONSTRAINT win_stats_pkey PRIMARY KEY (win_stats_id),
    CONSTRAINT fighter_id FOREIGN KEY (fighter_id)
        REFERENCES public.fighter (fighter_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID
)
