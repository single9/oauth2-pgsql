-- Table: public.authorizations

CREATE TABLE IF NOT EXISTS public.roles
(
    level integer NOT NULL,
    title character varying(20) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT roles_pkey PRIMARY KEY (level)
);

CREATE TABLE IF NOT EXISTS public.users
(
    id uuid NOT NULL,
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
);

CREATE INDEX IF NOT EXISTS index_users_username
    ON public.users USING btree(email COLLATE pg_catalog."default" ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS index_users_id
    ON public.users USING btree(id ASC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.clients
(
    client_id character varying(100) COLLATE pg_catalog."default" NOT NULL,
    client_secret text COLLATE pg_catalog."default" NOT NULL,
    user_id uuid NOT NULL,
    grants character varying(50)[] COLLATE pg_catalog."default" NOT NULL,
    redirect_uris text[] COLLATE pg_catalog."default",
    create_time timestamp without time zone DEFAULT now(),
    scope text COLLATE pg_catalog."default",
    client_name character varying(200) COLLATE pg_catalog."default" NOT NULL,
    grants_type character varying(30) COLLATE pg_catalog."default" NOT NULL,
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
    user_id uuid NOT NULL,
    CONSTRAINT authorizations_pkey PRIMARY KEY (authorization_code),
    CONSTRAINT authorizations_client_id_fkey FOREIGN KEY (client_id)
        REFERENCES public.clients (client_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT authorizations_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
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
    user_id uuid NOT NULL,
    CONSTRAINT tokens_pkey PRIMARY KEY (access_token),
    CONSTRAINT tokens_refresh_token_key UNIQUE (refresh_token),
    CONSTRAINT tokens_client_id_fkey FOREIGN KEY (client_id)
        REFERENCES public.clients (client_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
        NOT VALID,
    CONSTRAINT tokens_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
        NOT VALID
);

CREATE INDEX IF NOT EXISTS index_access_token
    ON public.tokens USING btree(access_token COLLATE pg_catalog."default" ASC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.user_details
(
    user_id uuid NOT NULL,
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
);
