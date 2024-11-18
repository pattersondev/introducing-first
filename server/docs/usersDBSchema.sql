-- Table: public.users

-- DROP TABLE IF EXISTS public.users;

CREATE TABLE IF NOT EXISTS public.users
(
    user_id integer NOT NULL DEFAULT nextval('users_user_id_seq'::regclass),
    username character varying(50) COLLATE pg_catalog."default" NOT NULL,
    email character varying(100) COLLATE pg_catalog."default" NOT NULL,
    password_hash text COLLATE pg_catalog."default" NOT NULL,
    role character varying(20) COLLATE pg_catalog."default" DEFAULT 'user'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    phone_number character varying(20) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (user_id),
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_username_key UNIQUE (username)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.users
    OWNER to introducing_first_users_user;

-- Trigger: set_timestamp

-- DROP TRIGGER IF EXISTS set_timestamp ON public.users;

CREATE OR REPLACE TRIGGER set_timestamp
    BEFORE UPDATE 
    ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_timestamp();


-- Table: public.picks

-- DROP TABLE IF EXISTS public.picks;

CREATE TABLE IF NOT EXISTS public.picks
(
    pick_id integer NOT NULL DEFAULT nextval('picks_pick_id_seq'::regclass),
    user_id integer NOT NULL,
    matchup_id character varying(32) COLLATE pg_catalog."default" NOT NULL,
    event_id character varying(32) COLLATE pg_catalog."default" NOT NULL,
    selection_fighter_id character varying(32) COLLATE pg_catalog."default" NOT NULL,
    pick_result character varying(50) COLLATE pg_catalog."default" DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT picks_pkey PRIMARY KEY (pick_id),
    CONSTRAINT fk_user FOREIGN KEY (user_id)
        REFERENCES public.users (user_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.picks
    OWNER to introducing_first_users_user;

-- Trigger: set_updated_at

-- DROP TRIGGER IF EXISTS set_updated_at ON public.picks;

CREATE OR REPLACE TRIGGER set_updated_at
    BEFORE UPDATE 
    ON public.picks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();