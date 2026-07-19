--
-- PostgreSQL database dump
--

\restrict LqxnP7osleeADDV6uTdVmRLBnD3ufbU7YIcO3tF50MDSMTqlnyJr3Arz5EITFr7

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA drizzle;


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: -
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: -
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: -
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: incidents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incidents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    status character varying(50) DEFAULT 'open'::character varying NOT NULL,
    created_by uuid NOT NULL,
    neighborhood_id character varying(255),
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    lat real,
    lng real,
    category character varying(50) DEFAULT 'neighborhood'::character varying NOT NULL
);


--
-- Name: points_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.points_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT points_balances_min_balance CHECK ((balance >= '-10'::integer))
);


--
-- Name: points_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.points_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    amount integer NOT NULL,
    note text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    contract_id text,
    type text DEFAULT 'bonus'::text NOT NULL,
    status text DEFAULT 'completed'::text NOT NULL,
    completed_at timestamp without time zone,
    CONSTRAINT points_tx_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT points_tx_type_check CHECK ((type = ANY (ARRAY['service_payment'::text, 'bonus'::text, 'correction'::text])))
);


--
-- Name: revoked_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.revoked_tokens (
    jti text NOT NULL,
    expires_at timestamp without time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    totp_secret character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'resident'::character varying NOT NULL,
    refresh_token_hash text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    avatar_url text,
    neighborhood_id character varying(255),
    address text,
    address_lat real,
    address_lng real,
    phone text,
    previous_role character varying(50)
);


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: incidents incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_pkey PRIMARY KEY (id);


--
-- Name: points_balances points_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_balances
    ADD CONSTRAINT points_balances_pkey PRIMARY KEY (id);


--
-- Name: points_balances points_balances_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_balances
    ADD CONSTRAINT points_balances_user_id_unique UNIQUE (user_id);


--
-- Name: points_transactions points_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_transactions
    ADD CONSTRAINT points_transactions_pkey PRIMARY KEY (id);


--
-- Name: revoked_tokens revoked_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revoked_tokens
    ADD CONSTRAINT revoked_tokens_pkey PRIMARY KEY (jti);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: incidents_deleted_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX incidents_deleted_at_idx ON public.incidents USING btree (deleted_at);


--
-- Name: incidents_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX incidents_status_idx ON public.incidents USING btree (status);


--
-- Name: points_tx_contract_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX points_tx_contract_idx ON public.points_transactions USING btree (contract_id);


--
-- Name: points_tx_sender_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX points_tx_sender_idx ON public.points_transactions USING btree (sender_id);


--
-- Name: revoked_tokens_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX revoked_tokens_expires_at_idx ON public.revoked_tokens USING btree (expires_at);


--
-- Name: incidents incidents_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: points_balances points_balances_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_balances
    ADD CONSTRAINT points_balances_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: points_transactions points_transactions_recipient_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_transactions
    ADD CONSTRAINT points_transactions_recipient_id_users_id_fk FOREIGN KEY (recipient_id) REFERENCES public.users(id);


--
-- Name: points_transactions points_transactions_sender_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_transactions
    ADD CONSTRAINT points_transactions_sender_id_users_id_fk FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict LqxnP7osleeADDV6uTdVmRLBnD3ufbU7YIcO3tF50MDSMTqlnyJr3Arz5EITFr7

--
-- PostgreSQL database dump
--

\restrict nupvtNaY41Y9alhng82UKrzEmSj6XiQmyhf5LsOEa5dMAsEiLLT7hTDGxvSCDZ1

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: -
--

COPY drizzle.__drizzle_migrations (id, hash, created_at) FROM stdin;
1	eb9b66457a3da519154c7bc33d8261f899e20416083b2939a0b846622f19fcad	1775482929347
2	91b5cfcb3ad97a6c6cdfc37831faef9bd35d8a9826c545515695fab3d95d5ff8	1775500000000
3	d1042b3023c5e5c04b5b0d70ffcf114eeddf6e864712b870fc38b06e2d22dbaf	1780059443209
4	337c82f11feb2d27c6ae420ac559713210992d4d03b7a880058524975eb4cc96	1782660428413
5	2cf7795b57c7572f2604a648c2417c2781f2d53b329ebe33023b1f3b9fcec382	1782666085480
6	5a389ee66669dff07dac35172487c1585557fca6a63dab12ade620acf8b0bf46	1782739563723
7	8c24a2ea3690fd1dd0fe52bdd8c7f5f57175eab5b3f1d8ff9ae75e65caecf438	1782850509311
8	7fb43b0c5dcccb6ca12a8af5ed68448ba7af339f61882afe9069d448fd50a2d9	1782892469509
9	8c1ec4d742f43eceda56be64741f0c0ae74609dd320792490f4395d7a1dff924	1783039734774
10	f37f19f7e3e8ea68a05cd21a7fee493785061332540e2798d46d1f38232a25f7	1783071388437
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: -
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 10, true);


--
-- PostgreSQL database dump complete
--

\unrestrict nupvtNaY41Y9alhng82UKrzEmSj6XiQmyhf5LsOEa5dMAsEiLLT7hTDGxvSCDZ1

