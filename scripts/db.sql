-- Table: public.authorizations

CREATE TABLE IF NOT EXISTS public.roles
(
    level integer NOT NULL,
    title character varying(20) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT roles_pkey PRIMARY KEY (level)
);

CREATE SEQUENCE IF NOT EXISTS public.users_id_seq
    INCREMENT 1
    START 3
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;

CREATE TABLE IF NOT EXISTS public.users
(
    id bigint NOT NULL DEFAULT nextval('users_id_seq'::regclass),
    email character varying(150) COLLATE pg_catalog."default" NOT NULL,
    password character varying(100) COLLATE pg_catalog."default" NOT NULL,
    provider character varying(10) COLLATE pg_catalog."default" DEFAULT 'local'::character varying,
    create_time timestamp without time zone DEFAULT now(),
    register_ip character varying(60) COLLATE pg_catalog."default",
    last_login_ip character varying(60) COLLATE pg_catalog."default",
    provider_id text COLLATE pg_catalog."default",
    role integer DEFAULT 9,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_username_key UNIQUE (email),
    CONSTRAINT users_role_fkey FOREIGN KEY (role)
        REFERENCES public.roles (level) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID
);

CREATE INDEX IF NOT EXISTS index_username
    ON public.users USING btree(email COLLATE pg_catalog."default" ASC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.clients
(
    client_id character varying(100) COLLATE pg_catalog."default" NOT NULL,
    client_secret text COLLATE pg_catalog."default" NOT NULL,
    user_id bigint NOT NULL,
    grants character varying(50)[] COLLATE pg_catalog."default" NOT NULL,
    redirect_uris text[] COLLATE pg_catalog."default",
    create_time timestamp without time zone DEFAULT now(),
    scope text COLLATE pg_catalog."default",
    CONSTRAINT clients_pkey PRIMARY KEY (client_id),
    CONSTRAINT clients_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.authorizations
(
    authorization_code text COLLATE pg_catalog."default" NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    client_id character varying(100) COLLATE pg_catalog."default" NOT NULL,
    revoked boolean DEFAULT false,
    CONSTRAINT authorizations_pkey PRIMARY KEY (authorization_code),
    CONSTRAINT authorizations_client_id_fkey FOREIGN KEY (client_id)
        REFERENCES public.clients (client_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID
);

CREATE INDEX IF NOT EXISTS index_authorization_code
    ON public.authorizations USING btree(authorization_code COLLATE pg_catalog."default" ASC NULLS LAST);


CREATE TABLE IF NOT EXISTS public.tokens
(
    access_token text COLLATE pg_catalog."default" NOT NULL,
    access_token_expires_at timestamp without time zone NOT NULL,
    refresh_token text COLLATE pg_catalog."default",
    refresh_token_expires_at timestamp without time zone,
    client_id character varying(100) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT tokens_pkey PRIMARY KEY (access_token),
    CONSTRAINT tokens_refresh_token_key UNIQUE (refresh_token)
);

CREATE INDEX IF NOT EXISTS index_access_token
    ON public.tokens USING btree(access_token COLLATE pg_catalog."default" ASC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.user_details
(
    user_id bigint NOT NULL,
    name character varying(50) COLLATE pg_catalog."default",
    gender "char",
    birth timestamp without time zone,
    phone character varying(20) COLLATE pg_catalog."default",
    role character varying(10) COLLATE pg_catalog."default",
    avatar_url text COLLATE pg_catalog."default",
    CONSTRAINT user_details_pkey PRIMARY KEY (user_id),
    CONSTRAINT user_details_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
        NOT VALID
);
