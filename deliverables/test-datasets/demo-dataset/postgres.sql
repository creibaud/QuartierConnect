--
-- PostgreSQL database dump
--

\restrict ezDtnbrFc9ePMfBlw2l9rfltW4RXVdZNdNiixFdEzg1aNCNv1f6fNK6AV3hOuQ0

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
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: qc
--

CREATE SCHEMA drizzle;


ALTER SCHEMA drizzle OWNER TO qc;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: qc
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


ALTER TABLE drizzle.__drizzle_migrations OWNER TO qc;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: qc
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNER TO qc;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: qc
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: incidents; Type: TABLE; Schema: public; Owner: qc
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


ALTER TABLE public.incidents OWNER TO qc;

--
-- Name: points_balances; Type: TABLE; Schema: public; Owner: qc
--

CREATE TABLE public.points_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT points_balances_min_balance CHECK ((balance >= '-10'::integer))
);


ALTER TABLE public.points_balances OWNER TO qc;

--
-- Name: points_transactions; Type: TABLE; Schema: public; Owner: qc
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


ALTER TABLE public.points_transactions OWNER TO qc;

--
-- Name: revoked_tokens; Type: TABLE; Schema: public; Owner: qc
--

CREATE TABLE public.revoked_tokens (
    jti text NOT NULL,
    expires_at timestamp without time zone NOT NULL
);


ALTER TABLE public.revoked_tokens OWNER TO qc;

--
-- Name: users; Type: TABLE; Schema: public; Owner: qc
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


ALTER TABLE public.users OWNER TO qc;

--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: qc
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: qc
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
-- Data for Name: incidents; Type: TABLE DATA; Schema: public; Owner: qc
--

COPY public.incidents (id, title, description, status, created_by, neighborhood_id, deleted_at, created_at, updated_at, lat, lng, category) FROM stdin;
4de2e8a6-4c8c-4adb-8dcd-6c750afb258f	Lampadaire cassé rue de la Paix	Le lampadaire est tombé et bloque en partie le trottoir.	open	41d91ab9-b9a9-45ed-a5b8-9c2ae4819316	6a42833f5980b9e26ff1a71c	\N	2026-06-30 21:26:06.353566	2026-06-30 21:26:06.353566	48.881763	2.3682313	neighborhood
72d6406c-530d-48a9-b648-7e89ac7d5603	Dépôt sauvage de déchets	Encombrants abandonnés depuis plusieurs jours au coin de la rue.	open	41d91ab9-b9a9-45ed-a5b8-9c2ae4819316	6a42833f5980b9e26ff1a71c	\N	2026-06-30 21:26:06.375739	2026-06-30 21:26:06.375739	48.880764	2.3612313	neighborhood
131337de-654d-49ed-82a6-370126842e6a	Nid-de-poule dangereux	Trou important sur la chaussée, risque pour les cyclistes.	open	41d91ab9-b9a9-45ed-a5b8-9c2ae4819316	6a42833f5980b9e26ff1a71c	\N	2026-06-30 21:26:06.386651	2026-06-30 21:26:06.386651	48.876766	2.3672311	neighborhood
ad276d71-bdb8-4ca9-99d2-ed409a09292c	Tag sur le mur de l'école	Graffiti à nettoyer sur la façade de l'école primaire.	open	41d91ab9-b9a9-45ed-a5b8-9c2ae4819316	6a42833f5980b9e26ff1a71c	\N	2026-06-30 21:26:06.397956	2026-06-30 21:26:06.397956	48.877766	2.3632312	neighborhood
f09cb9c8-dd89-4ca2-9c61-84d8b02b0750	Bug : la page Votes ne charge pas	Signalement technique de l'application (interne modération).	open	41d91ab9-b9a9-45ed-a5b8-9c2ae4819316	6a42833f5980b9e26ff1a71c	\N	2026-06-30 21:26:06.409163	2026-06-30 21:26:06.409163	\N	\N	bug
f20990e9-b2d3-4f0a-935a-49ad21d279f2	Signalement : contenu inapproprié	Un message à modérer dans la messagerie.	in_progress	41d91ab9-b9a9-45ed-a5b8-9c2ae4819316	6a42833f5980b9e26ff1a71c	\N	2026-06-30 21:26:06.418287	2026-07-03 11:29:21.609	\N	\N	reporting
\.


--
-- Data for Name: points_balances; Type: TABLE DATA; Schema: public; Owner: qc
--

COPY public.points_balances (id, user_id, balance, updated_at) FROM stdin;
bcb67c92-91f0-4122-883f-0e31926bf50d	ea7894ed-97f8-45ef-b955-35cd773830e5	25	2026-07-02 23:35:30.217
d80e2763-8b0e-4b44-9647-4f8176995f75	f3dad978-6792-4d0c-b2a5-fe3f3f08253f	13	2026-07-07 07:18:11.357
e14d421d-348e-4b0d-9c9e-fc825c3793fc	41d91ab9-b9a9-45ed-a5b8-9c2ae4819316	22	2026-07-07 07:18:11.361
\.


--
-- Data for Name: points_transactions; Type: TABLE DATA; Schema: public; Owner: qc
--

COPY public.points_transactions (id, sender_id, recipient_id, amount, note, created_at, contract_id, type, status, completed_at) FROM stdin;
c1e9f723-a40b-4a2a-8c4b-84083075bb82	f3dad978-6792-4d0c-b2a5-fe3f3f08253f	ea7894ed-97f8-45ef-b955-35cd773830e5	2	Service payment: Coup de main bricolage par Bob	2026-07-02 23:34:24.398845	6a46f580cc59f9b84636dfb9	service_payment	completed	2026-07-02 23:35:30.219
e900a815-0d6d-4498-b83c-6868b9ab9552	f3dad978-6792-4d0c-b2a5-fe3f3f08253f	ea7894ed-97f8-45ef-b955-35cd773830e5	5	Merci pour le jardinage	2026-06-27 14:21:16.983022	\N	bonus	completed	\N
c9243f01-c5b3-4fc1-8173-d3e51dafd4b0	ea7894ed-97f8-45ef-b955-35cd773830e5	f3dad978-6792-4d0c-b2a5-fe3f3f08253f	2	Service payment: Réparation de vélo par Alice	2026-07-02 20:38:00.379836	6a46cc2831b9e8b1eac99713	service_payment	cancelled	\N
ea874eed-faec-4ca0-8ff0-2dfa13e29898	ea7894ed-97f8-45ef-b955-35cd773830e5	f3dad978-6792-4d0c-b2a5-fe3f3f08253f	2	Service payment: Réparation de vélo par Alice	2026-07-02 23:33:53.752964	6a46f561cc59f9b84636dfb0	service_payment	completed	2026-07-02 23:33:53.834
f4ac763d-46c2-4d02-bc58-bd9deb6c514b	f3dad978-6792-4d0c-b2a5-fe3f3f08253f	41d91ab9-b9a9-45ed-a5b8-9c2ae4819316	1	Service payment: Cours de soutien scolaire	2026-07-01 22:30:34.055488	6a459509586efbb7cf0889fb	service_payment	completed	2026-07-01 22:30:34.157
cd3ab959-57c3-45bc-9cbe-64e97818b28b	41d91ab9-b9a9-45ed-a5b8-9c2ae4819316	f3dad978-6792-4d0c-b2a5-fe3f3f08253f	20	Crédit de bienvenue	2026-05-22 15:35:47.59014	\N	bonus	completed	2026-05-22 15:35:47.59014
cc8b9b21-1e71-40f0-ad78-90a032def9e7	41d91ab9-b9a9-45ed-a5b8-9c2ae4819316	ea7894ed-97f8-45ef-b955-35cd773830e5	20	Crédit de bienvenue	2026-05-22 15:35:47.9295	\N	bonus	completed	2026-05-22 15:35:47.9295
decf9183-e0ac-47c6-aeaf-c4e143028149	41d91ab9-b9a9-45ed-a5b8-9c2ae4819316	41d91ab9-b9a9-45ed-a5b8-9c2ae4819316	20	Crédit de bienvenue	2026-05-22 15:35:48.317005	\N	bonus	completed	2026-05-22 15:35:48.317005
cebe86a3-6479-4b4b-8b17-1c2d0bde8f45	f3dad978-6792-4d0c-b2a5-fe3f3f08253f	41d91ab9-b9a9-45ed-a5b8-9c2ae4819316	1	Service payment: Cours de soutien scolaire	2026-07-03 06:28:01.004839	6a475670ef7bb82ab044d3e5	service_payment	completed	2026-07-07 07:18:11.363
\.


--
-- Data for Name: revoked_tokens; Type: TABLE DATA; Schema: public; Owner: qc
--

COPY public.revoked_tokens (jti, expires_at) FROM stdin;
c54731bd-db54-4cd3-ac54-a9e85326950a	2026-07-07 07:34:10
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: qc
--

COPY public.users (id, email, password_hash, totp_secret, role, refresh_token_hash, created_at, updated_at, first_name, last_name, avatar_url, neighborhood_id, address, address_lat, address_lng, phone, previous_role) FROM stdin;
92805dbc-9df0-4ecb-b6a2-59ffd4536f7c	c.reibaud@myskolae.fr	$argon2id$v=19$m=65536,t=3,p=4$dqXmsnfFwNJaD+XjwUifHw$Rwa6z9q8o3suRxj+fAFKz/PhM55aW4V5bLw6ERnmioc	GZ2EGV2CMMSUETKEMI5WYP3QFFZFW3KNHRTTWR3BM5HXUUR2HRZQ	resident	\N	2026-07-06 11:24:58.81348	2026-07-06 11:25:38.584	Claudio	Reibaud	\N	6a4283405980b9e26ff1a729	12, Rue de Reuilly, Quartier de Picpus, Paris 12e Arrondissement, Paris, Île-de-France, France métropolitaine, 75012, France	48.84956	2.3848362	\N	\N
ea7894ed-97f8-45ef-b955-35cd773830e5	bob@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$AWwFNog4NMy8ii54EEugmQ$vautpOr7zJOB9vyPFtz61KU4OvhYHkTFuXnQyu4oevI	YRN6BJ3SA57U6MZSTTBBUWQJR2XR52IL	moderator	$argon2id$v=19$m=65536,t=3,p=4$9h9GU204rmbGN0wromqATg$UghWoTPeTXa5iJNrf+01jL+PP/G+zE+posVIKL66xPQ	2026-05-22 15:35:47.9295	2026-06-29 21:09:44.708	Bob	Dupont	\N	6a42833f5980b9e26ff1a71c	Centre du quartier, Paris	48.879765	2.3652313	\N	\N
41d91ab9-b9a9-45ed-a5b8-9c2ae4819316	admin@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$BFXOyzgbmSXLGRprbK5oRQ$BDHsltx61zxlZrzH5r43Stat0ct+GPYHeS3ZDWlUof8	YRN6BJ3SA57U6MZSTTBBUWQJR2XR52IL	admin	$argon2id$v=19$m=65536,t=3,p=4$YeaIbJcxqdBnc7XcZ3d7ag$qVZK2I+JBcEq7/ku9ANZIDYvgmdRUr/p3Tnrg5rJXwI	2026-05-22 15:35:48.317005	2026-07-02 18:47:19.08	Admin	QuartierConnect	\N	6a4283405980b9e26ff1a729	21, Rue Érard, Quartier de Picpus, Paris 12e Arrondissement, Paris, Île-de-France, France métropolitaine, 75012, France	48.84614	2.385631	\N	\N
f3dad978-6792-4d0c-b2a5-fe3f3f08253f	alice@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$gBmQ3GoMSKPpxKcTzH8Kqw$hFPgPSWfv21n47M1BJgcOlFxd5IQHkVGkOd9MJZ/toA	YRN6BJ3SA57U6MZSTTBBUWQJR2XR52IL	resident	$argon2id$v=19$m=65536,t=3,p=4$v3pr+CCiTGaZ4q8ypRQZKQ$zJ4O7NECsVptGAWVJl5H/B/s0SU9lh4UUjKtZaKeGOA	2026-05-22 15:35:47.59014	2026-05-22 17:10:34.152	Alice	Martin	\N	6a42833f5980b9e26ff1a71c	Centre du quartier, Paris	48.879765	2.3652313	\N	\N
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: qc
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 10, true);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: qc
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: incidents incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: qc
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_pkey PRIMARY KEY (id);


--
-- Name: points_balances points_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: qc
--

ALTER TABLE ONLY public.points_balances
    ADD CONSTRAINT points_balances_pkey PRIMARY KEY (id);


--
-- Name: points_balances points_balances_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: qc
--

ALTER TABLE ONLY public.points_balances
    ADD CONSTRAINT points_balances_user_id_unique UNIQUE (user_id);


--
-- Name: points_transactions points_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: qc
--

ALTER TABLE ONLY public.points_transactions
    ADD CONSTRAINT points_transactions_pkey PRIMARY KEY (id);


--
-- Name: revoked_tokens revoked_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: qc
--

ALTER TABLE ONLY public.revoked_tokens
    ADD CONSTRAINT revoked_tokens_pkey PRIMARY KEY (jti);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: qc
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: qc
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: incidents_deleted_at_idx; Type: INDEX; Schema: public; Owner: qc
--

CREATE INDEX incidents_deleted_at_idx ON public.incidents USING btree (deleted_at);


--
-- Name: incidents_status_idx; Type: INDEX; Schema: public; Owner: qc
--

CREATE INDEX incidents_status_idx ON public.incidents USING btree (status);


--
-- Name: points_tx_contract_idx; Type: INDEX; Schema: public; Owner: qc
--

CREATE INDEX points_tx_contract_idx ON public.points_transactions USING btree (contract_id);


--
-- Name: points_tx_sender_idx; Type: INDEX; Schema: public; Owner: qc
--

CREATE INDEX points_tx_sender_idx ON public.points_transactions USING btree (sender_id);


--
-- Name: revoked_tokens_expires_at_idx; Type: INDEX; Schema: public; Owner: qc
--

CREATE INDEX revoked_tokens_expires_at_idx ON public.revoked_tokens USING btree (expires_at);


--
-- Name: incidents incidents_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: qc
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: points_balances points_balances_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: qc
--

ALTER TABLE ONLY public.points_balances
    ADD CONSTRAINT points_balances_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: points_transactions points_transactions_recipient_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: qc
--

ALTER TABLE ONLY public.points_transactions
    ADD CONSTRAINT points_transactions_recipient_id_users_id_fk FOREIGN KEY (recipient_id) REFERENCES public.users(id);


--
-- Name: points_transactions points_transactions_sender_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: qc
--

ALTER TABLE ONLY public.points_transactions
    ADD CONSTRAINT points_transactions_sender_id_users_id_fk FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict ezDtnbrFc9ePMfBlw2l9rfltW4RXVdZNdNiixFdEzg1aNCNv1f6fNK6AV3hOuQ0

