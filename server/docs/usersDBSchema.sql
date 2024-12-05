-- Table: public.users

-- DROP TABLE IF EXISTS public.users;

CREATE TABLE IF NOT EXISTS public.users
(
    user_id integer NOT NULL DEFAULT nextval('users_user_id_seq'::regclass),
    username character varying(50) COLLATE pg_catalog."default" NOT NULL,
    email character varying(100) COLLATE pg_catalog."default" NOT NULL,
    password_hash text COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    phone_number character varying(20) COLLATE pg_catalog."default" NOT NULL,
    image_link character varying(255) COLLATE pg_catalog."default",
    total_correct_picks integer,
    total_picks integer,
    role_id integer DEFAULT 4,
    CONSTRAINT users_pkey PRIMARY KEY (user_id),
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_phone_number_key UNIQUE (phone_number),
    CONSTRAINT users_username_key UNIQUE (username),
    CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id)
        REFERENCES public.roles (role_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
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


-- Table: public.roles

-- DROP TABLE IF EXISTS public.roles;

CREATE TABLE IF NOT EXISTS public.roles
(
    role_id integer NOT NULL DEFAULT nextval('roles_role_id_seq'::regclass),
    role_name character varying(20) COLLATE pg_catalog."default" NOT NULL,
    description text COLLATE pg_catalog."default",
    CONSTRAINT roles_pkey PRIMARY KEY (role_id),
    CONSTRAINT roles_role_name_key UNIQUE (role_name)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.roles
    OWNER to introducing_first_users_user;

-- Table: public.password_reset_tokens

-- DROP TABLE IF EXISTS public.password_reset_tokens;

CREATE TABLE IF NOT EXISTS public.password_reset_tokens
(
    token_id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id integer NOT NULL,
    token character varying(255) COLLATE pg_catalog."default" NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    used boolean DEFAULT false,
    CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (token_id),
    CONSTRAINT unique_active_token UNIQUE (user_id, used),
    CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (user_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.password_reset_tokens
    OWNER to introducing_first_users_user;