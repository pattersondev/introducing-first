CREATE TABLE IF NOT EXISTS public.fighter
(
    name character varying(255) COLLATE pg_catalog."default",
    nickname character varying(255) COLLATE pg_catalog."default",
    division_title character varying(255) COLLATE pg_catalog."default",
    status character varying(255) COLLATE pg_catalog."default",
    hometown character varying(255) COLLATE pg_catalog."default",
    octagon_debut character varying(255) COLLATE pg_catalog."default",
    image_link character varying(1000) COLLATE pg_catalog."default",
    girth character varying(255) COLLATE pg_catalog."default",
    stance character varying(255) COLLATE pg_catalog."default",
    fighting_style character varying(255) COLLATE pg_catalog."default",
    gym character varying(255) COLLATE pg_catalog."default",
    age integer,
    height double precision,
    weight double precision,
    reach double precision,
    leg_reach double precision,
    fighter_id bigint NOT NULL DEFAULT nextval('fighter_fighter_id_seq'::regclass),
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
    last_fight_id character varying(255) COLLATE pg_catalog."default" NOT NULL,
    event character varying(255) COLLATE pg_catalog."default",
    date character varying(255) COLLATE pg_catalog."default",
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
    sig_str_defense character varying(255) COLLATE pg_catalog."default",
    takedown_defense character varying(255) COLLATE pg_catalog."default",
    knockdown_avg double precision,
    avg_fight_time character varying(255) COLLATE pg_catalog."default",
    sig_strikes_landed integer,
    sig_strikes_attempted integer,
    takedowns_landed integer,
    takedowns_attempted integer,
    striking_accuracy character varying(255) COLLATE pg_catalog."default",
    takedown_accuracy character varying(255) COLLATE pg_catalog."default",
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
    win_stats_id character varying(255) COLLATE pg_catalog."default" NOT NULL,
    wins_by_knockout integer,
    wins_by_submission integer,
    standing_actions integer,
    standing_actions_pctg character varying(255) COLLATE pg_catalog."default",
    clinch_actions integer,
    clinch_actions_pctg character varying(255) COLLATE pg_catalog."default",
    ground_actions integer,
    ground_actions_pctg character varying(255) COLLATE pg_catalog."default",
    fighter_id integer,
    CONSTRAINT win_stats_pkey PRIMARY KEY (win_stats_id),
    CONSTRAINT fighter_id FOREIGN KEY (fighter_id)
        REFERENCES public.fighter (fighter_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID
)

CREATE TABLE IF NOT EXISTS public.app_users
(
    uuid integer NOT NULL DEFAULT nextval('app_users_uuid_seq'::regclass),
    username character varying(255)[] COLLATE pg_catalog."default",
    password_hash character varying(1000)[] COLLATE pg_catalog."default",
    salt character varying(255)[] COLLATE pg_catalog."default",
    created_at timestamp with time zone[],
    last_login timestamp with time zone[],
    is_active boolean[],
    CONSTRAINT app_users_pkey PRIMARY KEY (uuid),
    CONSTRAINT username UNIQUE (username)
        INCLUDE(username)
)
