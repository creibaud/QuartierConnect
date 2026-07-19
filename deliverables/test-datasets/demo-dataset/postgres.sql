--
-- PostgreSQL database dump
--

\restrict Yq3L8dml5sQ5R0UoySNwUXZVeHKVPbcs52kd18Shlg5EnuGVaEKTgn1ktsLSDvs

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
-- Data for Name: incidents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.incidents (id, title, description, status, created_by, neighborhood_id, deleted_at, created_at, updated_at, lat, lng, category) FROM stdin;
bee4689a-5d1b-40c1-83d9-25290f87250e	Lampadaire éteint rue Lepic	Le lampadaire devant le 42 ne s'allume plus depuis une semaine, le trottoir est totalement noir le soir.	open	9f148a9f-e8b2-4d46-a0f2-40f231f78587	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:32.840424	2026-07-19 12:57:32.840424	48.893757	2.348127	neighborhood
18b98442-bcf1-4407-93c0-ce9c1553e660	Conteneur à verre débordant place des Abbesses	Le conteneur n'a pas été vidé depuis la semaine dernière, les bouteilles s'entassent autour.	open	9b7f94b0-59b2-4955-92c3-aeb94364dad6	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:32.875794	2026-07-19 12:57:32.875794	48.888256	2.339051	neighborhood
6b7595dc-a4bf-4953-9495-e18c041ab9ea	Trottoir effondré rue Damrémont	Un affaissement s'est formé après les fortes pluies, difficile à franchir en poussette.	open	34a9eeac-d838-4199-9e63-ec1152d08548	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:32.888858	2026-07-19 12:57:32.888858	48.897804	2.348438	neighborhood
4b1507ed-baf0-41a3-a548-81b3a917c267	Banc cassé square Louise-Michel	Deux lattes sont arrachées et laissent apparaître des vis, risque de blessure pour les enfants.	open	118f6a6e-5a9b-4a2e-bcd7-6b98fb97b99f	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:32.903513	2026-07-19 12:57:32.903513	48.893383	2.348438	neighborhood
f28fc90f-9a77-4b1b-b599-8f2c0b354663	Éclairage défaillant dans l'escalier de la rue Foyatier	Une marche sur trois est dans l'ombre, la descente est dangereuse par temps de pluie.	open	94a51625-b29b-4eac-aba8-d14e6faced1b	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:32.925145	2026-07-19 12:57:32.925145	48.89591	2.346579	neighborhood
a07837d4-75cc-4851-bb81-5aca1bee76e3	Voiture ventouse rue Burq	Le même véhicule occupe la place depuis six semaines, pneus à plat et pare-brise couvert d'avis.	open	9b131e55-bb65-4d53-8731-e518eae2fd69	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:32.945289	2026-07-19 12:57:32.945289	48.88741	2.339809	neighborhood
ed213a72-b239-4a80-8140-f960fb0b5e65	Nuisances sonores nocturnes rue des Trois-Frères	Musique et cris jusqu'à trois heures du matin plusieurs nuits par semaine depuis un mois.	open	7ffec061-e10e-454f-894a-9ce32f10f62b	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:32.96032	2026-07-19 12:57:32.96032	48.89864	2.352268	neighborhood
70d78402-b6de-45e3-9d12-65dd3257bdad	Branche menaçante square Jehan-Rictus	Une grosse branche est fendue et surplombe l'aire de jeux, il faudrait l'élaguer.	open	c1babc8b-d69c-46c8-8ee7-ad38081ef019	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:32.982601	2026-07-19 12:57:32.982601	48.88799	2.345453	neighborhood
0f9cd182-c74e-4723-97e9-00b40fe72b39	Piste cyclable obstruée par un chantier	Les barrières du chantier empiètent sur toute la largeur de la piste sans déviation balisée.	open	01da4dbf-3ae9-417c-816d-986a8a72c597	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:32.989248	2026-07-19 12:57:32.989248	48.891888	2.346029	neighborhood
4b8b2e48-0527-4bc2-bcea-b54959f9bc81	Bouche d'égout bruyante rue Véron	La plaque claque à chaque passage de voiture, jour et nuit, sous les fenêtres du 12.	open	d9744141-619d-436b-ba2a-4a4692716857	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:32.996414	2026-07-19 12:57:32.996414	48.898052	2.340308	neighborhood
0a9085c1-28dd-49de-97ed-3cd8bbf8ef52	Stationnement gênant devant la crèche	Des véhicules se garent systématiquement sur le bateau, les poussettes doivent passer sur la route.	open	0232dec4-7bb3-4817-9141-79402eeea507	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:33.017955	2026-07-19 12:57:33.017955	48.89788	2.332139	neighborhood
b9602808-c8af-4c82-bee7-70b6c80a60b5	Odeurs persistantes près du local à ordures	Le local n'a pas été lavé depuis longtemps, l'odeur remonte jusqu'au premier étage.	open	64527329-422d-4e8e-81a7-a698095ca063	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:33.033539	2026-07-19 12:57:33.033539	48.899685	2.351992	neighborhood
94c47dea-873e-4eae-93de-25850344d78d	Absence de bac de tri rue Constance	L'immeuble du 7 n'a aucun bac jaune, les cartons finissent dans les ordures ménagères.	open	20c07cb0-abf1-44bc-9c10-4111e876b7d0	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:33.061403	2026-07-19 12:57:33.061403	48.887394	2.337207	neighborhood
4020d65a-29a5-406c-89f7-16e6b5af4591	Nid-de-poule dangereux rue Ordener	Trou d'une vingtaine de centimètres au niveau du passage piéton, plusieurs cyclistes ont chuté.	resolved	20c07cb0-abf1-44bc-9c10-4111e876b7d0	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:32.85777	2026-07-19 12:57:34.22	48.889713	2.330082	neighborhood
73711029-3454-43bd-be7d-ab1039e04513	Tag sur la façade de l'école élémentaire	Graffiti sur toute la longueur du mur côté cour, visible depuis la rue.	resolved	230a605b-3731-42c3-8048-ded936016833	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:32.866685	2026-07-19 12:57:34.24	48.88808	2.346122	neighborhood
49832b9e-12bb-42d8-a9b8-24343b23f412	Fuite d'eau au coin de la rue Marcadet	De l'eau claire coule en continu depuis une bouche d'arrosage et ruisselle sur la chaussée.	resolved	49ace41a-b57d-4488-af9f-a7b9eef68d82	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:32.89669	2026-07-19 12:57:34.261	48.884766	2.344088	neighborhood
85d59a10-7171-4114-b019-aa209674e115	Grille d'arbre descellée rue des Martyrs	La grille bascule quand on marche dessus, elle mériterait d'être refixée rapidement.	resolved	33d63063-8c8e-484f-8f22-8112a5d65048	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:32.910235	2026-07-19 12:57:34.281	48.892868	2.34755	neighborhood
c7fb71f4-c9f5-4853-899b-e83ab7f7b882	Feu tricolore hors service rue Custine	Le feu clignote en orange dans les deux sens depuis hier matin, la traversée est risquée.	in_progress	c3a1977f-e375-4577-91a4-61c8bf2866d2	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:32.917149	2026-07-19 12:57:34.289	48.896854	2.352577	neighborhood
caf26f0b-dc6d-4e8f-9db0-436be71b7ccd	Poubelles non ramassées depuis trois jours	Les bacs jaunes et verts sont restés sur le trottoir, ils débordent et gênent le passage.	resolved	0a34e935-b202-43c7-823d-190fea2fb663	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:32.931639	2026-07-19 12:57:34.309	48.884125	2.328324	neighborhood
867114a3-8e37-45d9-bac9-896aaceb22f0	Rats aperçus près des poubelles du marché	Plusieurs rongeurs sortent des grilles d'arbre en fin de journée, autour du local à ordures.	in_progress	ce910b86-e82f-4ae3-8fde-12fc0895edd1	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:32.938906	2026-07-19 12:57:34.32	48.884235	2.34847	neighborhood
419e5920-2c78-4d2d-a33b-1a8da5eaffd6	Panneau de signalisation arraché rue Lamarck	Le panneau de sens interdit est au sol, les voitures s'engagent à contresens.	resolved	67d77217-1c6a-48f6-99a3-001e1fdc125e	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:32.953016	2026-07-19 12:57:34.342	48.899124	2.330921	neighborhood
33c81775-a3fa-42fa-a531-d337bff9a442	Rambarde descellée escalier rue Chappe	La main courante bouge sur une dizaine de mètres, plusieurs fixations ont sauté.	in_progress	65bf0373-fb51-451f-a9d4-d2112a29c72f	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:32.967788	2026-07-19 12:57:34.351	48.89895	2.330438	neighborhood
27418f6a-bde5-40ea-b010-9cb06dfba6cc	Affichage sauvage sur les vitrines vacantes	Des dizaines d'affiches collées sur les rideaux de fer des commerces fermés.	resolved	7000ab00-3f99-499d-97c7-839e2025b123	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:32.974973	2026-07-19 12:57:34.374	48.89622	2.341966	neighborhood
ff1131ea-901d-4af5-b010-43ec013ca5f9	Vitre brisée à l'abribus rue Championnet	Le panneau latéral est éclaté, des éclats de verre traînent encore sur le trottoir.	in_progress	45c99ad5-0257-4c2f-a9d3-b38057196195	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:33.003411	2026-07-19 12:57:34.385	48.892326	2.329418	neighborhood
ac29f3dd-ce03-4a17-a38d-ee7fd35f8511	Boîte aux lettres vandalisée rue Tholozé	La serrure de la boîte collective a été forcée, le courrier reste accessible à tous.	resolved	dffe220b-c32d-46b2-81e4-822208be8cf7	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:33.011335	2026-07-19 12:57:34.405	48.885483	2.338363	neighborhood
3cf63c4f-cd07-4cb9-8e10-cd2e868395ff	Défaut d'entretien du jardin partagé	Les allées sont envahies, le composteur déborde et personne ne s'en occupe depuis le printemps.	resolved	ba9e298c-cbad-4ef3-9c11-a89ef5624a29	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:33.025225	2026-07-19 12:57:34.427	48.884327	2.343823	neighborhood
2c12db11-6bfc-4e73-982e-4930798ba457	Mobilier urbain tagué rue Yvonne-le-Tac	Les deux bancs et la borne d'information ont été recouverts de peinture pendant le week-end.	in_progress	9f148a9f-e8b2-4d46-a0f2-40f231f78587	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:33.04232	2026-07-19 12:57:34.438	48.900375	2.343237	neighborhood
406c8a03-b3f9-4a41-9355-b2f1c641d813	Chaussée glissante après les travaux rue Berthe	Le revêtement provisoire devient très glissant dès qu'il pleut, deux chutes constatées.	resolved	1df836dd-03fe-4959-91ab-fec29eb08043	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:33.053145	2026-07-19 12:57:34.459	48.899223	2.343319	neighborhood
44cb029e-a340-440a-b671-34e821969622	Panneau d'information illisible place Émile-Goudeau	Le plan du quartier est délavé et rayé, il n'est plus lisible pour les visiteurs.	open	9b7f94b0-59b2-4955-92c3-aeb94364dad6	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:33.081556	2026-07-19 12:57:33.081556	48.89331	2.330929	neighborhood
ad1eb2e7-da73-4ae4-baa7-f6d466116fe9	Encombrants abandonnés rue Paul-Albert	Une armoire démontée bloque la moitié du trottoir devant l'entrée de l'immeuble.	open	49ace41a-b57d-4488-af9f-a7b9eef68d82	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:33.100323	2026-07-19 12:57:33.100323	48.89787	2.351749	neighborhood
2e36d3c0-424b-4ac1-8428-bc732d41c879	Photo de profil manifestement usurpée	La photo du profil est une image de banque d'images utilisée sur plusieurs autres comptes.	open	c3a1977f-e375-4577-91a4-61c8bf2866d2	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:33.136393	2026-07-19 12:57:33.136393	48.891937	2.342135	reporting
2a772be0-ca99-4150-b4ac-7a74d2d4e819	Propos discriminatoires dans une description d'annonce	L'annonce précise des critères d'exclusion sur l'origine des demandeurs.	open	0a34e935-b202-43c7-823d-190fea2fb663	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:33.152852	2026-07-19 12:57:33.152852	48.88732	2.327405	reporting
919ff138-4616-4fe7-9600-56516c686a31	Contenu commercial déguisé en entraide	Une société de nettoyage publie ses prestations tarifées comme s'il s'agissait d'un échange.	open	9b131e55-bb65-4d53-8731-e518eae2fd69	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:33.170166	2026-07-19 12:57:33.170166	48.889107	2.344696	reporting
139b947d-f808-4a15-adad-3b7257d6c0dc	Le filtre par catégorie ne se réinitialise pas	Après un retour arrière, la liste reste filtrée alors que le sélecteur affiche « toutes ».	open	67d77217-1c6a-48f6-99a3-001e1fdc125e	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:33.187077	2026-07-19 12:57:33.187077	48.88943	2.330619	bug
bab3aee6-e24f-499f-be19-d625525f03d7	Impossible de téléverser une photo de plus de 5 Mo	L'envoi échoue sans message d'erreur, le formulaire reste bloqué sur l'indicateur de chargement.	open	65bf0373-fb51-451f-a9d4-d2112a29c72f	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:33.20407	2026-07-19 12:57:33.20407	48.90018	2.332519	bug
d7dcf693-2d58-4825-bba6-dbd27ded0ca3	Pavés descellés rue des Rosiers	Une dizaine de pavés bougent sous les pieds au milieu de la rue piétonne.	open	4a746bc5-1837-421c-8de2-18d706e66844	6a5cc9ad2cf0e1ce2a3c92f7	\N	2026-07-19 12:57:33.222508	2026-07-19 12:57:33.222508	\N	\N	neighborhood
59b71a6a-baa6-4911-a978-462e2eb01f92	Fuite sur la fontaine du square des Batignolles	L'eau coule en continu même robinet fermé, une flaque permanente s'est formée.	open	cfb5a153-3e64-4df2-b67c-4309ed8c5c16	6a5cc9ae2cf0e1ce2a3c92fa	\N	2026-07-19 12:57:33.250227	2026-07-19 12:57:33.250227	\N	\N	neighborhood
6887e36c-2971-48de-95a0-da8d1b689d01	Abribus dégradé rue de la Gaîté	Le panneau d'horaires est arraché et le banc a été démonté.	open	a17bea96-f8e9-4eb1-8a95-2584aa7fb20e	6a5cc9ae2cf0e1ce2a3c9300	\N	2026-07-19 12:57:33.269082	2026-07-19 12:57:33.269082	\N	\N	neighborhood
c3c5848f-f449-401a-b411-325734b93117	Annonce trompeuse sur un service de bricolage	Le tarif affiché ne correspond pas à celui annoncé une fois le contact établi.	open	59049c8c-571e-4995-be88-72cb5212269f	6a5cc9ad2cf0e1ce2a3c92f7	\N	2026-07-19 12:57:33.420215	2026-07-19 12:57:33.420215	\N	\N	reporting
07a0294e-c6df-422b-b9d2-1863e853f4be	Le bouton « Charger plus » ne répond pas	Sur la liste des services, le bouton reste actif mais aucune nouvelle page n'est chargée.	open	96a7e89f-325f-43ea-8bde-96293e3b9a97	6a5cc9ae2cf0e1ce2a3c92f9	\N	2026-07-19 12:57:33.881558	2026-07-19 12:57:33.881558	\N	\N	bug
7e46d3df-7b86-451c-9050-8d603dfdd3fa	La recherche ignore les accents	Une recherche sur « éclairage » ne remonte pas les annonces écrites sans accent.	open	afd4352f-7760-4896-8fa4-2ce173e933f7	6a5cc9ae2cf0e1ce2a3c9300	\N	2026-07-19 12:57:34.188232	2026-07-19 12:57:34.188232	\N	\N	bug
ec0410e6-73d4-4ae5-ad4e-6c57ab6e538e	Dépôt sauvage devant le 24 rue Caulaincourt	Un matelas et deux cartons de gravats sont abandonnés sur le trottoir depuis samedi.	in_progress	1df836dd-03fe-4959-91ab-fec29eb08043	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:32.848313	2026-07-19 12:57:34.199	48.895367	2.333468	neighborhood
51a76ab4-37c5-4161-802a-0346a946f2f8	Sonnette d'immeuble hors service rue Gabrielle	Aucun interphone ne fonctionne au 15, les livreurs sonnent chez les voisins du rez-de-chaussée.	in_progress	34a9eeac-d838-4199-9e63-ec1152d08548	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:33.090397	2026-07-19 12:57:34.488	48.88881	2.334582	neighborhood
35d564f8-5d5e-4d58-a8d2-e44e1ec5e903	Éclairage du terrain de sport en panne	Les projecteurs ne s'allument plus, le terrain est inutilisable après 18h en hiver.	resolved	118f6a6e-5a9b-4a2e-bcd7-6b98fb97b99f	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:33.109587	2026-07-19 12:57:34.507	48.89635	2.335629	neighborhood
fb14a3b4-4061-4624-8e54-7aec54ee4064	Annonce suspecte : paiement demandé hors plateforme	Une annonce de bricolage renvoie vers un virement bancaire avant toute prestation.	in_progress	9f148a9f-e8b2-4d46-a0f2-40f231f78587	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:33.119297	2026-07-19 12:57:34.521	48.89493	2.345589	reporting
98c04409-9b28-42b4-9be7-6060409a8280	Message injurieux reçu en messagerie	Suite à un refus de service, l'utilisateur a envoyé plusieurs messages insultants.	resolved	33d63063-8c8e-484f-8f22-8112a5d65048	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:33.126965	2026-07-19 12:57:34.544	48.88879	2.349806	reporting
868c3a57-704b-4d51-b48e-11a6c3004de5	Annonce de covoiturage manifestement frauduleuse	Trajet proposé à un tarif absurde avec demande d'acompte immédiat par lien externe.	resolved	94a51625-b29b-4eac-aba8-d14e6faced1b	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:33.144584	2026-07-19 12:57:34.568	48.89227	2.33109	reporting
9956c610-fa3b-43e0-9613-fff0a633fc2b	Annonce dupliquée publiée en série	La même offre de jardinage est publiée six fois avec des titres légèrement différents.	in_progress	ce910b86-e82f-4ae3-8fde-12fc0895edd1	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:33.161495	2026-07-19 12:57:34.58	48.891087	2.340681	reporting
3afc4f4d-2474-4cdf-b492-5c8ed26bb7a2	La carte des incidents reste vide au premier chargement	Les marqueurs n'apparaissent qu'après un changement d'onglet et un retour sur la carte.	in_progress	9f148a9f-e8b2-4d46-a0f2-40f231f78587	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:33.178434	2026-07-19 12:57:34.592	48.893898	2.342956	bug
f8feb950-d522-4e6c-8dd9-4969d03f3ec9	Les notifications de messagerie arrivent en double	Chaque nouveau message déclenche deux notifications identiques à quelques secondes d'écart.	resolved	7ffec061-e10e-454f-894a-9ce32f10f62b	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:33.194825	2026-07-19 12:57:34.616	48.89602	2.347748	bug
3b03abd2-ecf1-41b3-bfd0-92e0fbaa74c4	La page de résultats de vote affiche un total erroné	Le total des participations dépasse le nombre de votants sur les scrutins pondérés.	resolved	7000ab00-3f99-499d-97c7-839e2025b123	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:33.212111	2026-07-19 12:57:34.637	48.898335	2.346318	bug
f6d853bf-e0ab-402c-b799-7cd76acdad8f	Éclairage public en panne rue de Belleville	Trois lampadaires consécutifs sont éteints entre le métro et la boulangerie.	in_progress	3a8f6cc3-fa5b-497c-8eea-7feb992cc142	6a5cc9ad2cf0e1ce2a3c92f8	\N	2026-07-19 12:57:33.230942	2026-07-19 12:57:34.647	\N	\N	neighborhood
d99c7da7-438c-48fe-b1fe-dcfef10025bd	Dépôt d'encombrants rue Mouffetard	Cageots et cartons entassés après le marché, non ramassés depuis deux jours.	resolved	f0aee1c4-202e-4c44-9b23-e5d9cb8e8a3c	6a5cc9ae2cf0e1ce2a3c92f9	\N	2026-07-19 12:57:33.240409	2026-07-19 12:57:34.669	\N	\N	neighborhood
7119abbe-613b-4835-b920-8b8a7fa78d0b	Marquage au sol effacé boulevard Richard-Lenoir	Le passage piéton n'est presque plus visible, notamment de nuit.	resolved	46da8efd-9b76-4b67-a4bf-aad5d6c6d6b9	6a5cc9ae2cf0e1ce2a3c92fb	\N	2026-07-19 12:57:33.25996	2026-07-19 12:57:34.69	\N	\N	neighborhood
836840ba-0bfb-44dd-b3c8-940b18cace76	Comportement agressif signalé en messagerie	Relances insistantes et menaces voilées après l'annulation d'une réservation.	resolved	70c8c7e5-d696-4358-a9a6-0b026f6e8e68	6a5cc9ad2cf0e1ce2a3c92f8	\N	2026-07-19 12:57:33.570755	2026-07-19 12:57:34.713	\N	\N	reporting
4509bbdd-7b58-4b3c-a08c-11c07f7a2c48	Faux profil de voisin	Le compte utilise une adresse qui ne correspond à aucun immeuble de la rue indiquée.	in_progress	77177fba-d667-44d1-9904-60f149a24df8	6a5cc9ae2cf0e1ce2a3c92fb	\N	2026-07-19 12:57:33.723331	2026-07-19 12:57:34.727	\N	\N	reporting
12f877e6-5194-4709-8555-1ef85ba95641	L'export PDF du contrat échoue	Le téléchargement démarre puis s'interrompt, le fichier obtenu fait zéro octet.	resolved	a7f0486b-e942-4f86-8b0c-543092daac49	6a5cc9ae2cf0e1ce2a3c92fa	\N	2026-07-19 12:57:34.036711	2026-07-19 12:57:34.754	\N	\N	bug
655f3581-ee66-4a81-9bbf-66450dff2983	Plaque d'égout descellée rue Antoinette	La plaque se soulève au passage des camions de livraison et retombe de travers.	resolved	230a605b-3731-42c3-8048-ded936016833	6a5cc9ad2cf0e1ce2a3c92f6	\N	2026-07-19 12:57:33.071291	2026-07-19 12:57:34.478	48.886047	2.337783	neighborhood
\.


--
-- Data for Name: points_balances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.points_balances (id, user_id, balance, updated_at) FROM stdin;
72994fb4-cb00-446a-b867-3504fa4f8976	1df836dd-03fe-4959-91ab-fec29eb08043	20	2026-07-19 12:57:23.216425
474e3603-211b-4ccd-a6ca-f942cc0538be	230a605b-3731-42c3-8048-ded936016833	20	2026-07-19 12:57:23.372295
3acc7d05-9652-43b3-bef8-6fe4da8459f6	c3a1977f-e375-4577-91a4-61c8bf2866d2	20	2026-07-19 12:57:23.819964
35bf9a0d-1312-4478-8b94-0ae2a0adb272	0a34e935-b202-43c7-823d-190fea2fb663	20	2026-07-19 12:57:23.969965
84ac3764-3139-40b8-8e9b-88ae226149b3	67d77217-1c6a-48f6-99a3-001e1fdc125e	20	2026-07-19 12:57:24.195792
80d65d23-a3c3-41da-9af8-3187d0fccd71	7ffec061-e10e-454f-894a-9ce32f10f62b	20	2026-07-19 12:57:24.273081
33941bac-8dc3-4c87-acd3-da6c8550c03a	65bf0373-fb51-451f-a9d4-d2112a29c72f	20	2026-07-19 12:57:24.347087
91a2d3d8-1892-4455-abd5-c6d2e10ab18b	d9744141-619d-436b-ba2a-4a4692716857	20	2026-07-19 12:57:24.657425
1beb60dc-5203-4c0e-827e-d10b3906ce73	ba9e298c-cbad-4ef3-9c11-a89ef5624a29	20	2026-07-19 12:57:24.943155
4a0a8abe-ef17-448b-ba0c-6d49f61c6ed3	64527329-422d-4e8e-81a7-a698095ca063	20	2026-07-19 12:57:25.021473
182ad288-9e08-4278-93c5-2272393a4a03	4a746bc5-1837-421c-8de2-18d706e66844	20	2026-07-19 12:57:25.100027
f6d25bd7-6814-474b-86bc-b702e669434d	59049c8c-571e-4995-be88-72cb5212269f	20	2026-07-19 12:57:25.169626
7dcf82bd-0764-452c-8a51-1148fbe0d04e	3a8f6cc3-fa5b-497c-8eea-7feb992cc142	20	2026-07-19 12:57:25.246404
251fadd7-5467-407c-ab6d-868033205bf4	70c8c7e5-d696-4358-a9a6-0b026f6e8e68	20	2026-07-19 12:57:25.330095
461e9ebc-db7d-4c23-8a0f-d5fce4f599df	f0aee1c4-202e-4c44-9b23-e5d9cb8e8a3c	20	2026-07-19 12:57:25.407539
052d8fa1-8c16-4db4-989b-adc0b7361761	96a7e89f-325f-43ea-8bde-96293e3b9a97	20	2026-07-19 12:57:25.477682
097428cb-d459-4e46-a389-4d8d90926cbe	cfb5a153-3e64-4df2-b67c-4309ed8c5c16	20	2026-07-19 12:57:25.559404
ddd4c123-c193-4105-b1a8-2c614f25aa7d	a7f0486b-e942-4f86-8b0c-543092daac49	20	2026-07-19 12:57:25.627688
360354dd-a6aa-4850-8c25-6a7156aee8f7	46da8efd-9b76-4b67-a4bf-aad5d6c6d6b9	20	2026-07-19 12:57:25.705113
5e76ef2d-d1c3-4fa6-87df-1d23807a1733	77177fba-d667-44d1-9904-60f149a24df8	20	2026-07-19 12:57:25.781496
69dee2b3-4fe2-4127-af60-4f596d63ab97	f9979097-f488-4f03-aae0-6a9305702e8a	20	2026-07-19 12:57:25.857811
7c601651-a5b5-41bb-b048-8c8d52b5f7c3	e730cb0c-7749-4541-84a6-4ee1e2710df4	20	2026-07-19 12:57:25.931551
57c2caa8-9210-408b-b81e-2da5bbedb2e6	9b214ada-784f-4b59-a59b-e39f174a4eda	20	2026-07-19 12:57:26.017628
df464124-7fb6-469d-9594-e38efad87dae	118ee5fa-4b2b-4b83-a2f6-61de397eab87	20	2026-07-19 12:57:26.094159
0b3e97f9-fa37-4751-8562-fdd660a3c222	5e310d5b-61e8-4879-a3be-922b3f574207	20	2026-07-19 12:57:26.157579
7bc35ed5-8ede-4de8-9c5a-02e3411b5ab7	b55231d3-5c4f-41a6-a75a-f0d249f99aca	20	2026-07-19 12:57:26.219327
83a29859-a883-445c-a554-d0686011279a	a17bea96-f8e9-4eb1-8a95-2584aa7fb20e	20	2026-07-19 12:57:26.295154
952b1ab7-3e36-472b-bacd-ed6cacac6e6c	afd4352f-7760-4896-8fa4-2ce173e933f7	20	2026-07-19 12:57:26.382236
19793250-9bc9-4688-bd4a-90ec01b678a5	0f246c69-e7bc-4ce8-9ec4-3fcbd3476116	20	2026-07-19 12:57:26.454084
ac347a42-b7f1-41bb-bf30-2377c42fa5dc	c8e00190-b839-4a54-af8f-11ddfd413a39	20	2026-07-19 12:57:26.534903
cb096331-3c40-421d-b133-de4dad41cd25	cf5c2828-a883-40c2-8878-b898c91e76d8	20	2026-07-19 12:57:26.610537
15a97749-58f1-4d39-ad39-b509c2924749	9466aa9f-347a-4f82-bc6f-0d7a783c2afc	20	2026-07-19 12:57:26.687631
a529d438-ab20-4c4d-923c-54377f0d1312	30ec2a5a-c17a-482b-beea-f1440ef5cf80	20	2026-07-19 12:57:26.765005
c60cf433-a763-4532-a66a-4f02e6b232ee	4fd3a95e-c647-49ab-9d7c-4ff2f9cdc4ef	20	2026-07-19 12:57:26.836807
542e2183-73d1-475a-a40f-887848bf63b2	62f9dfe3-1835-4f8f-a463-2a4045e2206b	20	2026-07-19 12:57:26.911301
8c40f064-da76-4575-829f-9a883e091ab7	e4896259-af6b-476d-9d82-828093d373b2	20	2026-07-19 12:57:26.983247
b2a4d003-0cc4-4c5e-ac24-deaf19e4d04a	c06caee1-bee4-4109-808c-ce7b49ab317c	20	2026-07-19 12:57:27.045711
d66b7923-83b0-4e30-be18-fe198f6fd274	961fcb67-cb56-4d0b-9624-da1f837b57db	20	2026-07-19 12:57:27.109122
c9d9f398-bb92-449d-a6ef-3e4508de2bf9	d5bd14cb-45f0-47ce-b0b3-0353254bdb0a	20	2026-07-19 12:57:27.184867
92181f91-59b7-4931-bb08-72889eb4d322	c4674cc7-e805-41cb-9398-e046c54d6308	20	2026-07-19 12:57:27.256629
34e37c62-28da-475e-9f22-299ce5cae929	ecdac308-175e-4d8f-b40f-ca967877f986	20	2026-07-19 12:57:27.333549
dc7e6148-755b-4148-9688-1d74eb70acda	b1768dac-e781-4b17-9242-125d5d18577a	20	2026-07-19 12:57:27.406116
af5357ed-5a52-4e09-8b6f-4a824e8b1b04	984dea00-71b4-460b-9c7a-d29275bf67a8	20	2026-07-19 12:57:27.468441
16067355-6a60-4faf-be07-ac176ff05d75	69c367b0-15dc-4523-8c82-201b40ef22ec	20	2026-07-19 12:57:27.542353
0976c673-9a55-4f0f-bc93-8350f2796c01	096da412-a035-4d26-afdc-4d246e6c55d7	20	2026-07-19 12:57:27.607841
8b0b93de-bf79-480c-9a80-0f6aa982492d	5511e409-651e-4757-8f40-36628b780805	20	2026-07-19 12:57:27.670842
68f1a8b4-dec2-4b51-8ed6-ed819a7735a3	a5f2b87e-dd86-438a-a298-88c78eb8d322	20	2026-07-19 12:57:27.742048
e30d1ef9-0d82-44a1-bc09-693f154fad3e	0a20ed6c-5332-4d85-9dac-0e8cd3f16415	20	2026-07-19 12:57:27.823907
e2fb2d28-f40b-43a5-9bdc-10b84d7df475	51707c96-a29f-4da8-afea-eaed190fa678	20	2026-07-19 12:57:27.897354
3bb8d3b3-617e-4630-a3b3-7478bd9bfabc	d10b2a6e-86a3-4a64-a2f3-3171b6af9b7c	20	2026-07-19 12:57:27.974701
1047ea95-71aa-4d08-b1d5-39648d9775c2	9b131e55-bb65-4d53-8731-e518eae2fd69	16	2026-07-19 12:57:39.553
2540fdae-8168-4c05-a34c-851f380f0686	49ace41a-b57d-4488-af9f-a7b9eef68d82	18	2026-07-19 12:57:39.652
c2b55307-cdc9-482d-bc4b-83b60364dd49	94a51625-b29b-4eac-aba8-d14e6faced1b	16	2026-07-19 12:57:39.812
b26056f6-171c-4b51-b815-ab6f7ceddfda	9b7f94b0-59b2-4955-92c3-aeb94364dad6	24	2026-07-19 12:57:39.814
568abe0a-9438-4c7b-aca6-ca9294a1273c	ce910b86-e82f-4ae3-8fde-12fc0895edd1	18	2026-07-19 12:58:01.156
ff376bb5-96b0-4e00-b118-ea68e1b3c6c9	20c07cb0-abf1-44bc-9c10-4111e876b7d0	18	2026-07-19 12:58:01.253
0cbf8f40-c4e9-4ed2-b6b6-54df24e8b1f7	7000ab00-3f99-499d-97c7-839e2025b123	22	2026-07-19 12:58:01.255
68c5b33d-09be-49a4-b771-106c73b4c6cc	9f148a9f-e8b2-4d46-a0f2-40f231f78587	18	2026-07-19 12:58:31.032
0b0b3cff-ab3a-4168-904e-9125a1ed558e	45c99ad5-0257-4c2f-a9d3-b38057196195	18	2026-07-19 12:58:31.086
2d7439b4-7893-4e97-9562-d1dde5bd04b3	34a9eeac-d838-4199-9e63-ec1152d08548	26	2026-07-19 12:58:31.091
01b0ae1f-dda5-4549-b183-c91b9fb2fb7c	dffe220b-c32d-46b2-81e4-822208be8cf7	16	2026-07-19 12:58:31.134
f0d32272-2516-4804-822d-e03722910dd9	118f6a6e-5a9b-4a2e-bcd7-6b98fb97b99f	18	2026-07-19 12:58:31.165
68d9b6c2-8834-47eb-b502-6980a4a14e19	0232dec4-7bb3-4817-9141-79402eeea507	16	2026-07-19 12:59:01.051
52ce49cb-7321-4bfb-a710-7ef5057b9ecb	c1babc8b-d69c-46c8-8ee7-ad38081ef019	32	2026-07-19 12:59:01.052
7fdc49e5-10d6-4656-a7ef-e2d72e35862d	33d63063-8c8e-484f-8f22-8112a5d65048	18	2026-07-19 12:59:01.111
0eee1b1b-7090-48a4-9a29-4e9b1c5ecccf	01da4dbf-3ae9-417c-816d-986a8a72c597	26	2026-07-19 12:59:01.113
\.


--
-- Data for Name: points_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.points_transactions (id, sender_id, recipient_id, amount, note, created_at, contract_id, type, status, completed_at) FROM stdin;
e60fa094-5a9e-46d1-a49f-c8f01c5e7c90	51707c96-a29f-4da8-afea-eaed190fa678	9f148a9f-e8b2-4d46-a0f2-40f231f78587	20	Crédit de bienvenue	2026-07-19 12:57:07.687438	\N	bonus	completed	2026-07-19 12:57:07.687438
b3e22d2f-7b2e-4b21-b4be-e48349f22647	51707c96-a29f-4da8-afea-eaed190fa678	1df836dd-03fe-4959-91ab-fec29eb08043	20	Crédit de bienvenue	2026-07-19 12:57:07.844028	\N	bonus	completed	2026-07-19 12:57:07.844028
af1321a9-c5cf-486f-a46c-97249b35ada0	51707c96-a29f-4da8-afea-eaed190fa678	20c07cb0-abf1-44bc-9c10-4111e876b7d0	20	Crédit de bienvenue	2026-07-19 12:57:07.98837	\N	bonus	completed	2026-07-19 12:57:07.98837
2713fdd4-efbd-49ab-91b7-8dd90a83f5d9	51707c96-a29f-4da8-afea-eaed190fa678	230a605b-3731-42c3-8048-ded936016833	20	Crédit de bienvenue	2026-07-19 12:57:08.13635	\N	bonus	completed	2026-07-19 12:57:08.13635
6e1a67ce-17fd-41d8-b38c-ecadedc834d2	51707c96-a29f-4da8-afea-eaed190fa678	9b7f94b0-59b2-4955-92c3-aeb94364dad6	20	Crédit de bienvenue	2026-07-19 12:57:08.281329	\N	bonus	completed	2026-07-19 12:57:08.281329
fcca1ebf-a8e6-4221-9fb6-df93cbb989da	51707c96-a29f-4da8-afea-eaed190fa678	34a9eeac-d838-4199-9e63-ec1152d08548	20	Crédit de bienvenue	2026-07-19 12:57:08.422362	\N	bonus	completed	2026-07-19 12:57:08.422362
82c35ec5-d6e7-4763-845b-78326d56c4e9	51707c96-a29f-4da8-afea-eaed190fa678	49ace41a-b57d-4488-af9f-a7b9eef68d82	20	Crédit de bienvenue	2026-07-19 12:57:08.571221	\N	bonus	completed	2026-07-19 12:57:08.571221
30b1244d-e289-48f6-ac71-73f8e02ecf5d	51707c96-a29f-4da8-afea-eaed190fa678	118f6a6e-5a9b-4a2e-bcd7-6b98fb97b99f	20	Crédit de bienvenue	2026-07-19 12:57:08.716747	\N	bonus	completed	2026-07-19 12:57:08.716747
49263149-b150-4498-b8a9-5acd1455306a	51707c96-a29f-4da8-afea-eaed190fa678	33d63063-8c8e-484f-8f22-8112a5d65048	20	Crédit de bienvenue	2026-07-19 12:57:08.86729	\N	bonus	completed	2026-07-19 12:57:08.86729
5299af1d-d97f-4b14-8273-536483b63191	51707c96-a29f-4da8-afea-eaed190fa678	c3a1977f-e375-4577-91a4-61c8bf2866d2	20	Crédit de bienvenue	2026-07-19 12:57:09.025725	\N	bonus	completed	2026-07-19 12:57:09.025725
664ef823-83c4-41a4-a631-7267a5c06ba0	51707c96-a29f-4da8-afea-eaed190fa678	94a51625-b29b-4eac-aba8-d14e6faced1b	20	Crédit de bienvenue	2026-07-19 12:57:09.166365	\N	bonus	completed	2026-07-19 12:57:09.166365
904db0c4-0c4f-4094-aad3-635435ae4c7d	51707c96-a29f-4da8-afea-eaed190fa678	0a34e935-b202-43c7-823d-190fea2fb663	20	Crédit de bienvenue	2026-07-19 12:57:09.309203	\N	bonus	completed	2026-07-19 12:57:09.309203
c44d0bd0-6a46-4b3d-b38a-1344325b216b	51707c96-a29f-4da8-afea-eaed190fa678	ce910b86-e82f-4ae3-8fde-12fc0895edd1	20	Crédit de bienvenue	2026-07-19 12:57:09.453442	\N	bonus	completed	2026-07-19 12:57:09.453442
0a3b1aed-45b4-4f15-94a2-d27846de17b4	51707c96-a29f-4da8-afea-eaed190fa678	9b131e55-bb65-4d53-8731-e518eae2fd69	20	Crédit de bienvenue	2026-07-19 12:57:09.596885	\N	bonus	completed	2026-07-19 12:57:09.596885
4fd3e49e-389d-45d5-9b6e-57751983ebd8	51707c96-a29f-4da8-afea-eaed190fa678	67d77217-1c6a-48f6-99a3-001e1fdc125e	20	Crédit de bienvenue	2026-07-19 12:57:09.739239	\N	bonus	completed	2026-07-19 12:57:09.739239
3690158d-769b-4896-9cda-95edb26993b3	51707c96-a29f-4da8-afea-eaed190fa678	7ffec061-e10e-454f-894a-9ce32f10f62b	20	Crédit de bienvenue	2026-07-19 12:57:09.886075	\N	bonus	completed	2026-07-19 12:57:09.886075
29710011-0fe2-4da8-be43-d2fa9333be42	51707c96-a29f-4da8-afea-eaed190fa678	65bf0373-fb51-451f-a9d4-d2112a29c72f	20	Crédit de bienvenue	2026-07-19 12:57:10.021563	\N	bonus	completed	2026-07-19 12:57:10.021563
66071296-0157-4fd9-8fdb-657ba9586a45	51707c96-a29f-4da8-afea-eaed190fa678	7000ab00-3f99-499d-97c7-839e2025b123	20	Crédit de bienvenue	2026-07-19 12:57:10.157817	\N	bonus	completed	2026-07-19 12:57:10.157817
7fc79daf-f59a-4a8a-a157-bc7eca375b08	51707c96-a29f-4da8-afea-eaed190fa678	c1babc8b-d69c-46c8-8ee7-ad38081ef019	20	Crédit de bienvenue	2026-07-19 12:57:10.300199	\N	bonus	completed	2026-07-19 12:57:10.300199
628cc519-2167-4187-9dab-5ae7b8dbf553	51707c96-a29f-4da8-afea-eaed190fa678	01da4dbf-3ae9-417c-816d-986a8a72c597	20	Crédit de bienvenue	2026-07-19 12:57:10.4404	\N	bonus	completed	2026-07-19 12:57:10.4404
d5e234d4-a010-4580-ae89-7a2a0608fb55	51707c96-a29f-4da8-afea-eaed190fa678	d9744141-619d-436b-ba2a-4a4692716857	20	Crédit de bienvenue	2026-07-19 12:57:10.576973	\N	bonus	completed	2026-07-19 12:57:10.576973
f366ac8d-33f8-4d0e-855f-64ce4962023f	51707c96-a29f-4da8-afea-eaed190fa678	45c99ad5-0257-4c2f-a9d3-b38057196195	20	Crédit de bienvenue	2026-07-19 12:57:10.726074	\N	bonus	completed	2026-07-19 12:57:10.726074
33192633-e06f-4a92-8db7-21c1e57d08c1	51707c96-a29f-4da8-afea-eaed190fa678	dffe220b-c32d-46b2-81e4-822208be8cf7	20	Crédit de bienvenue	2026-07-19 12:57:10.87238	\N	bonus	completed	2026-07-19 12:57:10.87238
f076ca71-019b-4358-8cc9-a6ea02478363	51707c96-a29f-4da8-afea-eaed190fa678	0232dec4-7bb3-4817-9141-79402eeea507	20	Crédit de bienvenue	2026-07-19 12:57:11.020026	\N	bonus	completed	2026-07-19 12:57:11.020026
ea89c832-1ac5-4073-8dc2-1b5aeb50edad	51707c96-a29f-4da8-afea-eaed190fa678	ba9e298c-cbad-4ef3-9c11-a89ef5624a29	20	Crédit de bienvenue	2026-07-19 12:57:11.164753	\N	bonus	completed	2026-07-19 12:57:11.164753
dcd09567-28bf-4106-95e2-30c2a949a35b	51707c96-a29f-4da8-afea-eaed190fa678	64527329-422d-4e8e-81a7-a698095ca063	20	Crédit de bienvenue	2026-07-19 12:57:11.301415	\N	bonus	completed	2026-07-19 12:57:11.301415
a3214a3d-416d-4cce-b512-8bf244f53191	51707c96-a29f-4da8-afea-eaed190fa678	4a746bc5-1837-421c-8de2-18d706e66844	20	Crédit de bienvenue	2026-07-19 12:57:11.446175	\N	bonus	completed	2026-07-19 12:57:11.446175
e3372901-56c4-4d86-a078-075f40890782	51707c96-a29f-4da8-afea-eaed190fa678	59049c8c-571e-4995-be88-72cb5212269f	20	Crédit de bienvenue	2026-07-19 12:57:11.586757	\N	bonus	completed	2026-07-19 12:57:11.586757
e317b2f8-2c1a-4456-a18f-2033e15cfdec	51707c96-a29f-4da8-afea-eaed190fa678	3a8f6cc3-fa5b-497c-8eea-7feb992cc142	20	Crédit de bienvenue	2026-07-19 12:57:11.704377	\N	bonus	completed	2026-07-19 12:57:11.704377
d5668005-50c8-41b5-b5e5-4090f237d308	51707c96-a29f-4da8-afea-eaed190fa678	70c8c7e5-d696-4358-a9a6-0b026f6e8e68	20	Crédit de bienvenue	2026-07-19 12:57:11.832366	\N	bonus	completed	2026-07-19 12:57:11.832366
86ad7646-29d4-425f-a720-7475b0d73a2c	51707c96-a29f-4da8-afea-eaed190fa678	f0aee1c4-202e-4c44-9b23-e5d9cb8e8a3c	20	Crédit de bienvenue	2026-07-19 12:57:11.982625	\N	bonus	completed	2026-07-19 12:57:11.982625
0c3e8dd1-3dfb-41a5-98fe-0aef211c9c09	51707c96-a29f-4da8-afea-eaed190fa678	96a7e89f-325f-43ea-8bde-96293e3b9a97	20	Crédit de bienvenue	2026-07-19 12:57:12.130525	\N	bonus	completed	2026-07-19 12:57:12.130525
cfbf35b0-858d-4e02-8bfd-d0fc16fd9048	51707c96-a29f-4da8-afea-eaed190fa678	cfb5a153-3e64-4df2-b67c-4309ed8c5c16	20	Crédit de bienvenue	2026-07-19 12:57:12.276627	\N	bonus	completed	2026-07-19 12:57:12.276627
e9bfcdaa-3051-4f5a-8495-82e7b4ab7b25	51707c96-a29f-4da8-afea-eaed190fa678	a7f0486b-e942-4f86-8b0c-543092daac49	20	Crédit de bienvenue	2026-07-19 12:57:12.408478	\N	bonus	completed	2026-07-19 12:57:12.408478
22b448e7-dbf8-45be-be44-8d053d9a824a	51707c96-a29f-4da8-afea-eaed190fa678	46da8efd-9b76-4b67-a4bf-aad5d6c6d6b9	20	Crédit de bienvenue	2026-07-19 12:57:12.556637	\N	bonus	completed	2026-07-19 12:57:12.556637
d36b1aa0-5ceb-4ee7-bf69-9385450c0a65	51707c96-a29f-4da8-afea-eaed190fa678	77177fba-d667-44d1-9904-60f149a24df8	20	Crédit de bienvenue	2026-07-19 12:57:12.702881	\N	bonus	completed	2026-07-19 12:57:12.702881
eff22f87-0649-4c05-8600-8b2044d6c6c6	51707c96-a29f-4da8-afea-eaed190fa678	f9979097-f488-4f03-aae0-6a9305702e8a	20	Crédit de bienvenue	2026-07-19 12:57:12.846587	\N	bonus	completed	2026-07-19 12:57:12.846587
8d43f445-18ae-4ab3-a909-c4df2e51ec34	51707c96-a29f-4da8-afea-eaed190fa678	e730cb0c-7749-4541-84a6-4ee1e2710df4	20	Crédit de bienvenue	2026-07-19 12:57:12.983208	\N	bonus	completed	2026-07-19 12:57:12.983208
f818e7ec-5a53-424e-9f63-bc3e05eef8d5	51707c96-a29f-4da8-afea-eaed190fa678	9b214ada-784f-4b59-a59b-e39f174a4eda	20	Crédit de bienvenue	2026-07-19 12:57:13.127507	\N	bonus	completed	2026-07-19 12:57:13.127507
22891b0b-9daf-4221-9763-b90d1ef8692e	51707c96-a29f-4da8-afea-eaed190fa678	118ee5fa-4b2b-4b83-a2f6-61de397eab87	20	Crédit de bienvenue	2026-07-19 12:57:13.268279	\N	bonus	completed	2026-07-19 12:57:13.268279
8266f32d-e595-42ee-8bc9-4d4bbec89bae	51707c96-a29f-4da8-afea-eaed190fa678	5e310d5b-61e8-4879-a3be-922b3f574207	20	Crédit de bienvenue	2026-07-19 12:57:13.406294	\N	bonus	completed	2026-07-19 12:57:13.406294
538ce193-a0b2-4fad-a785-7643f99516c5	51707c96-a29f-4da8-afea-eaed190fa678	b55231d3-5c4f-41a6-a75a-f0d249f99aca	20	Crédit de bienvenue	2026-07-19 12:57:13.537854	\N	bonus	completed	2026-07-19 12:57:13.537854
2e2d8edf-a802-4b2a-a736-9c34b42961de	51707c96-a29f-4da8-afea-eaed190fa678	a17bea96-f8e9-4eb1-8a95-2584aa7fb20e	20	Crédit de bienvenue	2026-07-19 12:57:13.678014	\N	bonus	completed	2026-07-19 12:57:13.678014
dd5b2de2-f5ff-459c-b639-4482c7e07ece	51707c96-a29f-4da8-afea-eaed190fa678	afd4352f-7760-4896-8fa4-2ce173e933f7	20	Crédit de bienvenue	2026-07-19 12:57:13.816523	\N	bonus	completed	2026-07-19 12:57:13.816523
681bcf70-a603-4031-a181-5f1dda91a782	51707c96-a29f-4da8-afea-eaed190fa678	0f246c69-e7bc-4ce8-9ec4-3fcbd3476116	20	Crédit de bienvenue	2026-07-19 12:57:13.95517	\N	bonus	completed	2026-07-19 12:57:13.95517
35270cc8-90b8-43c9-bcde-75f2cb8b2406	51707c96-a29f-4da8-afea-eaed190fa678	c8e00190-b839-4a54-af8f-11ddfd413a39	20	Crédit de bienvenue	2026-07-19 12:57:14.100945	\N	bonus	completed	2026-07-19 12:57:14.100945
9297e1be-4d55-458c-8620-fa23218c49f1	51707c96-a29f-4da8-afea-eaed190fa678	cf5c2828-a883-40c2-8878-b898c91e76d8	20	Crédit de bienvenue	2026-07-19 12:57:14.240287	\N	bonus	completed	2026-07-19 12:57:14.240287
3a4ace92-601a-48d7-97dc-67e3a3b953ed	51707c96-a29f-4da8-afea-eaed190fa678	9466aa9f-347a-4f82-bc6f-0d7a783c2afc	20	Crédit de bienvenue	2026-07-19 12:57:14.381938	\N	bonus	completed	2026-07-19 12:57:14.381938
203fa7c7-18c0-49d5-9250-03e13ba42ea9	51707c96-a29f-4da8-afea-eaed190fa678	30ec2a5a-c17a-482b-beea-f1440ef5cf80	20	Crédit de bienvenue	2026-07-19 12:57:14.521555	\N	bonus	completed	2026-07-19 12:57:14.521555
3ed1e276-a291-48dd-80a2-0ecd24f1789c	51707c96-a29f-4da8-afea-eaed190fa678	4fd3a95e-c647-49ab-9d7c-4ff2f9cdc4ef	20	Crédit de bienvenue	2026-07-19 12:57:14.660309	\N	bonus	completed	2026-07-19 12:57:14.660309
e559d52a-cb76-4fa7-b300-be18542cd474	51707c96-a29f-4da8-afea-eaed190fa678	62f9dfe3-1835-4f8f-a463-2a4045e2206b	20	Crédit de bienvenue	2026-07-19 12:57:14.808657	\N	bonus	completed	2026-07-19 12:57:14.808657
87a88de8-e432-454b-9cdb-faabd45ffd46	51707c96-a29f-4da8-afea-eaed190fa678	e4896259-af6b-476d-9d82-828093d373b2	20	Crédit de bienvenue	2026-07-19 12:57:14.954727	\N	bonus	completed	2026-07-19 12:57:14.954727
600155e3-51c3-4a3d-a24c-f9ecbebc5c3e	51707c96-a29f-4da8-afea-eaed190fa678	c06caee1-bee4-4109-808c-ce7b49ab317c	20	Crédit de bienvenue	2026-07-19 12:57:15.099704	\N	bonus	completed	2026-07-19 12:57:15.099704
53f06f71-8252-419c-90ff-d500522aaf7e	51707c96-a29f-4da8-afea-eaed190fa678	961fcb67-cb56-4d0b-9624-da1f837b57db	20	Crédit de bienvenue	2026-07-19 12:57:15.248362	\N	bonus	completed	2026-07-19 12:57:15.248362
daf65c6f-63ac-44b3-b8d9-b38ef28a3ceb	51707c96-a29f-4da8-afea-eaed190fa678	d5bd14cb-45f0-47ce-b0b3-0353254bdb0a	20	Crédit de bienvenue	2026-07-19 12:57:15.397623	\N	bonus	completed	2026-07-19 12:57:15.397623
c891e907-86c3-44b5-bb50-2fa3b3afb56c	51707c96-a29f-4da8-afea-eaed190fa678	c4674cc7-e805-41cb-9398-e046c54d6308	20	Crédit de bienvenue	2026-07-19 12:57:15.544422	\N	bonus	completed	2026-07-19 12:57:15.544422
09f7770e-7526-4817-995b-bd3214177f94	51707c96-a29f-4da8-afea-eaed190fa678	ecdac308-175e-4d8f-b40f-ca967877f986	20	Crédit de bienvenue	2026-07-19 12:57:15.691422	\N	bonus	completed	2026-07-19 12:57:15.691422
13f10109-2da5-492f-aad0-cce339004128	51707c96-a29f-4da8-afea-eaed190fa678	b1768dac-e781-4b17-9242-125d5d18577a	20	Crédit de bienvenue	2026-07-19 12:57:15.845534	\N	bonus	completed	2026-07-19 12:57:15.845534
56745789-f929-48fd-ac13-edb4625a3dcb	51707c96-a29f-4da8-afea-eaed190fa678	984dea00-71b4-460b-9c7a-d29275bf67a8	20	Crédit de bienvenue	2026-07-19 12:57:15.997923	\N	bonus	completed	2026-07-19 12:57:15.997923
060bb389-a476-46be-bd4d-a8baa161e197	51707c96-a29f-4da8-afea-eaed190fa678	69c367b0-15dc-4523-8c82-201b40ef22ec	20	Crédit de bienvenue	2026-07-19 12:57:16.131114	\N	bonus	completed	2026-07-19 12:57:16.131114
2b4c8c2e-75aa-4056-9bd9-b1628a37c628	51707c96-a29f-4da8-afea-eaed190fa678	096da412-a035-4d26-afdc-4d246e6c55d7	20	Crédit de bienvenue	2026-07-19 12:57:16.246951	\N	bonus	completed	2026-07-19 12:57:16.246951
39323cf6-be50-4022-83e0-4848897b5900	51707c96-a29f-4da8-afea-eaed190fa678	5511e409-651e-4757-8f40-36628b780805	20	Crédit de bienvenue	2026-07-19 12:57:16.385603	\N	bonus	completed	2026-07-19 12:57:16.385603
e673c5f3-756d-4bb8-b756-336fd7bbd119	51707c96-a29f-4da8-afea-eaed190fa678	a5f2b87e-dd86-438a-a298-88c78eb8d322	20	Crédit de bienvenue	2026-07-19 12:57:16.517332	\N	bonus	completed	2026-07-19 12:57:16.517332
9d790e2e-f696-4e86-bf88-53fbbd8b5678	51707c96-a29f-4da8-afea-eaed190fa678	0a20ed6c-5332-4d85-9dac-0e8cd3f16415	20	Crédit de bienvenue	2026-07-19 12:57:16.656399	\N	bonus	completed	2026-07-19 12:57:16.656399
56ffac61-1d75-436b-8a0b-d0b5c8c04a26	51707c96-a29f-4da8-afea-eaed190fa678	51707c96-a29f-4da8-afea-eaed190fa678	20	Crédit de bienvenue	2026-07-19 12:57:17.590421	\N	bonus	completed	2026-07-19 12:57:17.590421
1ee51b86-5794-4813-a49a-c398aeaf43a8	51707c96-a29f-4da8-afea-eaed190fa678	d10b2a6e-86a3-4a64-a2f3-3171b6af9b7c	20	Crédit de bienvenue	2026-07-19 12:57:17.729769	\N	bonus	completed	2026-07-19 12:57:17.729769
dc690a63-290d-4fe7-92f3-a88454a47d7e	33d63063-8c8e-484f-8f22-8112a5d65048	9f148a9f-e8b2-4d46-a0f2-40f231f78587	3	Service payment: Initiation à la photo numérique	2026-07-19 12:57:38.891171	6a5cc9c22cf0e1ce2a3c9d47	service_payment	pending	\N
a86a6f6c-57fc-4945-81ab-ea2fa022c73c	67d77217-1c6a-48f6-99a3-001e1fdc125e	9f148a9f-e8b2-4d46-a0f2-40f231f78587	3	Service payment: Cours de jardinage sur balcon	2026-07-19 12:57:38.974571	6a5cc9c22cf0e1ce2a3c9d4d	service_payment	pending	\N
c347f40f-a184-4e11-a41c-d90529e80f36	9f148a9f-e8b2-4d46-a0f2-40f231f78587	c3a1977f-e375-4577-91a4-61c8bf2866d2	6	Service payment: Aide au déménagement de petit volume	2026-07-19 12:57:39.006377	6a5cc9c22cf0e1ce2a3c9d50	service_payment	pending	\N
ffb28409-980f-46e3-99aa-e838d4681faa	7ffec061-e10e-454f-894a-9ce32f10f62b	1df836dd-03fe-4959-91ab-fec29eb08043	3	Service payment: Montage de meubles en kit	2026-07-19 12:57:39.329613	6a5cc9c32cf0e1ce2a3c9d77	service_payment	pending	\N
6174ee63-c752-4704-879e-fcccf90c9b84	65bf0373-fb51-451f-a9d4-d2112a29c72f	67d77217-1c6a-48f6-99a3-001e1fdc125e	8	Service payment: Recherche baby-sitter pour une soirée	2026-07-19 12:57:39.362316	6a5cc9c32cf0e1ce2a3c9d7a	service_payment	pending	\N
4caa61c3-e7cd-41b9-a4df-51734ec008a4	9f148a9f-e8b2-4d46-a0f2-40f231f78587	3a8f6cc3-fa5b-497c-8eea-7feb992cc142	3	Service payment: Cours de cuisine végétarienne	2026-07-19 12:57:39.0384	6a5cc9c32cf0e1ce2a3c9d53	service_payment	cancelled	\N
7e1185f7-50e6-4803-a7da-f92b13770ff0	9b131e55-bb65-4d53-8731-e518eae2fd69	9f148a9f-e8b2-4d46-a0f2-40f231f78587	4	Service payment: Préparation de repas maison pour la semaine	2026-07-19 12:57:38.945168	6a5cc9c22cf0e1ce2a3c9d4a	service_payment	completed	2026-07-19 12:57:39.554
96734a48-1d14-4c1d-b95f-fb29e716690a	49ace41a-b57d-4488-af9f-a7b9eef68d82	34a9eeac-d838-4199-9e63-ec1152d08548	2	Service payment: Dépannage informatique à domicile	2026-07-19 12:57:39.0955	6a5cc9c32cf0e1ce2a3c9d5c	service_payment	completed	2026-07-19 12:57:39.655
5f4b90ad-7ff3-47dd-aff7-8cb8a6ee4e28	94a51625-b29b-4eac-aba8-d14e6faced1b	9b7f94b0-59b2-4955-92c3-aeb94364dad6	4	Service payment: Garde d'enfants après l'école	2026-07-19 12:57:39.281281	6a5cc9c32cf0e1ce2a3c9d71	service_payment	completed	2026-07-19 12:57:39.816
d4dcec3d-cabc-461c-997d-ea51dcaf8eaf	9f148a9f-e8b2-4d46-a0f2-40f231f78587	c1babc8b-d69c-46c8-8ee7-ad38081ef019	4	Service payment: Peinture de petites surfaces	2026-07-19 12:57:39.057725	6a5cc9c32cf0e1ce2a3c9d56	service_payment	completed	2026-07-19 12:58:01.081
5c67b5a1-8bd2-48dd-96d9-d1502d3ea6de	ce910b86-e82f-4ae3-8fde-12fc0895edd1	34a9eeac-d838-4199-9e63-ec1152d08548	2	Service payment: Dépannage informatique à domicile	2026-07-19 12:57:39.122702	6a5cc9c32cf0e1ce2a3c9d5f	service_payment	completed	2026-07-19 12:58:01.157
e3e44671-c1ae-4d7f-b90d-66c641cbe43d	20c07cb0-abf1-44bc-9c10-4111e876b7d0	7000ab00-3f99-499d-97c7-839e2025b123	2	Service payment: Conversation en anglais autour d'un café	2026-07-19 12:57:39.303908	6a5cc9c32cf0e1ce2a3c9d74	service_payment	completed	2026-07-19 12:58:01.255
ae3879ce-5819-414e-8e6d-feb8bb3870f8	9f148a9f-e8b2-4d46-a0f2-40f231f78587	01da4dbf-3ae9-417c-816d-986a8a72c597	2	Service payment: Transport de courses lourdes jusqu'à l'étage	2026-07-19 12:57:39.077363	6a5cc9c32cf0e1ce2a3c9d59	service_payment	completed	2026-07-19 12:58:31.034
af03b8d0-c7fc-405c-b5eb-9a95080c726b	45c99ad5-0257-4c2f-a9d3-b38057196195	34a9eeac-d838-4199-9e63-ec1152d08548	2	Service payment: Dépannage informatique à domicile	2026-07-19 12:57:39.148367	6a5cc9c32cf0e1ce2a3c9d62	service_payment	completed	2026-07-19 12:58:31.092
e80ffae1-80cd-40af-981b-aa5c9933e2ba	dffe220b-c32d-46b2-81e4-822208be8cf7	c1babc8b-d69c-46c8-8ee7-ad38081ef019	4	Service payment: Peinture de petites surfaces	2026-07-19 12:57:39.175995	6a5cc9c32cf0e1ce2a3c9d65	service_payment	completed	2026-07-19 12:58:31.135
298846aa-a038-40d4-964e-bde029ef8805	118f6a6e-5a9b-4a2e-bcd7-6b98fb97b99f	01da4dbf-3ae9-417c-816d-986a8a72c597	2	Service payment: Transport de courses lourdes jusqu'à l'étage	2026-07-19 12:57:39.234001	6a5cc9c32cf0e1ce2a3c9d6b	service_payment	completed	2026-07-19 12:58:31.167
75ffb33a-c35c-4b87-b08f-de59138442ff	0232dec4-7bb3-4817-9141-79402eeea507	c1babc8b-d69c-46c8-8ee7-ad38081ef019	4	Service payment: Peinture de petites surfaces	2026-07-19 12:57:39.204321	6a5cc9c32cf0e1ce2a3c9d68	service_payment	completed	2026-07-19 12:59:01.053
e84ce462-c980-42fd-8672-cf18992ee84e	33d63063-8c8e-484f-8f22-8112a5d65048	01da4dbf-3ae9-417c-816d-986a8a72c597	2	Service payment: Transport de courses lourdes jusqu'à l'étage	2026-07-19 12:57:39.26019	6a5cc9c32cf0e1ce2a3c9d6e	service_payment	completed	2026-07-19 12:59:01.114
\.


--
-- Data for Name: revoked_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.revoked_tokens (jti, expires_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password_hash, totp_secret, role, refresh_token_hash, created_at, updated_at, first_name, last_name, avatar_url, neighborhood_id, address, address_lat, address_lng, phone, previous_role) FROM stdin;
20c07cb0-abf1-44bc-9c10-4111e876b7d0	camille.bernard@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$Ansuj1ZDCASGaR+I4pFGLw$Npu91qbQtnjWL2SIwYeI07e7Sn868QBHQPz6IMWrVNI	VQ7EBK6B5VFBL7CNZ5ZNVAM7GHH35YSM	resident	$argon2id$v=19$m=65536,t=3,p=4$wsP/QYC6j0MD5vuGrAcefw$+TUYnQGxL6me89Tx6EtnYFuPYMqx++//rfM2d9l5SRE	2026-07-19 12:57:07.98837	2026-07-19 12:57:07.98837	Camille	Bernard	\N	6a5cc9ad2cf0e1ce2a3c92f6	28 Rue Ganneron 75018 Paris	48.88716	2.32863	+33612333033	\N
34a9eeac-d838-4199-9e63-ec1152d08548	thomas.girard@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$dpx7Ldz/d/8k3PSY8TFMvg$cYPCn9C7N+6o4ilCZGkSS8ZjPCpGxX/YVi/A6VVA5sY	WTKOWYEKZKDPRXWAFT66DR6WZZNQRIBZ	resident	$argon2id$v=19$m=65536,t=3,p=4$MSErdyS1hzVr8NY11IVOSw$niT5V1n/AaTFQa8kK84673FXfB+YRPLI6rCGkr+smcs	2026-07-19 12:57:08.422362	2026-07-19 12:57:08.422362	Thomas	Girard	\N	6a5cc9ad2cf0e1ce2a3c92f6	6 Rue Steinlen 75018 Paris	48.888855	2.332706	+33612666066	\N
49ace41a-b57d-4488-af9f-a7b9eef68d82	lea.rousseau@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$VYWfrCfQiQLWM4hG3txTGw$GlIrnx+0Jv0w4++yP7IEk0CWtB0kACaVnMaxcAY3gPU	4NBWQYAKI33FFYPOEBDP56Y5ZH27W54W	resident	$argon2id$v=19$m=65536,t=3,p=4$6cMbsrRKHB4aSbp3cfcnLQ$Tmzid8dUPNODLLY/QPp51rlRG2VHKH86jn5BNc20AuI	2026-07-19 12:57:08.571221	2026-07-19 12:57:08.571221	Léa	Rousseau	\N	6a5cc9ad2cf0e1ce2a3c92f6	31 Rue Simart 75018 Paris	48.891342	2.347124	+33612777077	\N
118f6a6e-5a9b-4a2e-bcd7-6b98fb97b99f	nicolas.fontaine@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$NEo40K1UUSrtLFPvleabwQ$Dune/7HTWkHrGgquPW+mXGhWYjWdi+aPBN2Jhe3JVzo	JYESGLPA7MUJXL6FYK6IN2ZDT4G7DTBH	resident	$argon2id$v=19$m=65536,t=3,p=4$gcw7MUDfGW18Gbg8SZUe2Q$2lgpxNNfnLuxE8BSnMIvO9QUmYgQcJVCzDcz5Xa/4K0	2026-07-19 12:57:08.716747	2026-07-19 12:57:08.716747	Nicolas	Fontaine	\N	6a5cc9ad2cf0e1ce2a3c92f6	180 Boulevard Ney 75018 Paris	48.897842	2.330422	\N	\N
33d63063-8c8e-484f-8f22-8112a5d65048	emilie.chevalier@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$oLxtxBElhKuHN+K6BR4JEg$w/ngCb0WSkc21l9SNaRS/cpm5h2I5zzm5W1H69RoCN8	4V4SYV2MOV3URFIVG7KTTXA2HFSLEHRD	resident	$argon2id$v=19$m=65536,t=3,p=4$vdC020E1ttrGqZXDeHu2KQ$+bFp4YADn9M5+u7OQSJw3y+IQsZEIoko1v62Lp5KtLE	2026-07-19 12:57:08.86729	2026-07-19 12:57:08.86729	Émilie	Chevalier	\N	6a5cc9ad2cf0e1ce2a3c92f6	6 Impasse Massonnet 75018 Paris	48.895756	2.351727	\N	\N
0a34e935-b202-43c7-823d-190fea2fb663	hugo.marchand@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$bfa4jHMlUVIkIt39uMkiqA$RQgpNonrdqTBtg41/2Ohiiie1A6c9K3ABEpquWlJ5gk	2B4OXDZM5FJFZQV4BBWKN5HZSWORYJRP	resident	$argon2id$v=19$m=65536,t=3,p=4$+XqEBRKTppugfzevyVheuQ$4CQQd1X9qOpF+AW9ttMfAzleklDpZ46/s+yJVyFr0TY	2026-07-19 12:57:09.309203	2026-07-19 12:57:09.309203	Hugo	Marchand	\N	6a5cc9ad2cf0e1ce2a3c92f6	143B Rue Ordener 75018 Paris	48.89312	2.339341	+33612999099	\N
ce910b86-e82f-4ae3-8fde-12fc0895edd1	chloe.barbier@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$kHfuQS3W9oUmXU3evqgCXg$h1TQEUhHyGnXSoqt2xjwdckdCJpCmlSiOEC9qD88ehA	7SWT4PMNQ5QY67DP4OL5RJOOQVSUEYN2	resident	$argon2id$v=19$m=65536,t=3,p=4$deB1BUAgOrTy582CONCg5A$gOWcSorOvfYaxzoVqJZ7LzwapsQ7I5KBlPoeIMdZLgo	2026-07-19 12:57:09.453442	2026-07-19 12:57:09.453442	Chloé	Barbier	\N	6a5cc9ad2cf0e1ce2a3c92f6	128B Boulevard de Clichy 75018 Paris	48.884632	2.329114	\N	\N
9b131e55-bb65-4d53-8731-e518eae2fd69	maxime.renaud@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$BUpw2gL7AtPEBexiQsHHuw$BCErOhL4ovOrgQiFrK2rQO3G+Afy6lhXKTDnZil2tWk	VADESTO4DIB2WPKIC3WV6JYKQZKT5OFS	resident	$argon2id$v=19$m=65536,t=3,p=4$h0ZMpyzs2sXGsKY1gcfCSQ$ZqbMiQqVc9oUiZwZ2WTFK9M16MoHeEBRKolT/dMJEpI	2026-07-19 12:57:09.596885	2026-07-19 12:57:09.596885	Maxime	Renaud	\N	6a5cc9ad2cf0e1ce2a3c92f6	4 Villa Dancourt 75018 Paris	48.883045	2.341077	\N	\N
65bf0373-fb51-451f-a9d4-d2112a29c72f	claire.fabre@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$pl1cimeyFiesi37fW+Wceg$8B0Wckq5CPS7TO3criS1trxyj1iL3O4pKliVSb1pWWc	6F6D3CCMAUD53WEVMNKO4B44FYM3UQMH	resident	$argon2id$v=19$m=65536,t=3,p=4$6y84BH2d/MdRD5cU3KWNYQ$NB40Jkk8xi1FTd17C9jMk7Ey1leuIz9SxIknZ1XxU7w	2026-07-19 12:57:10.021563	2026-07-19 12:57:10.021563	Claire	Fabre	\N	6a5cc9ad2cf0e1ce2a3c92f6	5 Rue Puget 75018 Paris	48.88412	2.333571	\N	\N
7000ab00-3f99-499d-97c7-839e2025b123	romain.guerin@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$UNhLoYNt6wr+0nknH7K17A$lT+sXZVlEs1EVJ1LbKEKtZHd3jlQXYEfg0PDhAwmRmA	Q3FEQ7C73MIH2ZONYBSO62QDEXPUZUSX	resident	$argon2id$v=19$m=65536,t=3,p=4$hyIWMl+H02eNFhD9TzfIAg$beI2mtLRH1hhIEGuAimSqCty3r90pACN6rStOq+kTck	2026-07-19 12:57:10.157817	2026-07-19 12:57:10.157817	Romain	Guérin	\N	6a5cc9ad2cf0e1ce2a3c92f6	4 Rue Carpeaux 75018 Paris	48.890396	2.330252	\N	\N
c1babc8b-d69c-46c8-8ee7-ad38081ef019	pauline.colin@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$SwEi3MA4lgyDt7UFpWryUQ$yOvf++r6O03+mqIImxtJOhFjUeRCGqrEaL+wugbTyuo	APS7W6C4UTJ2HLBCSHWXLFFPBGDBIDIA	resident	$argon2id$v=19$m=65536,t=3,p=4$Ec6Vovq30ft6TXGDnCfNgg$SWX6EbJJImfryPKwLpwDLIwVIK6orzIw30RnTqvOGzk	2026-07-19 12:57:10.300199	2026-07-19 12:57:10.300199	Pauline	Colin	\N	6a5cc9ad2cf0e1ce2a3c92f6	40 Rue du Poteau 75018 Paris	48.89452	2.341271	\N	\N
45c99ad5-0257-4c2f-a9d3-b38057196195	guillaume.masson@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$uoyICtj1BycLoHhD9T3+Bw$fS7YMINf3xmiugFUY33MiyPcB1yMEAAgSfdfiXniBQ8	JRZFE6EVKLVCUKUBDDPVGYIBQ3AK6Y6M	resident	$argon2id$v=19$m=65536,t=3,p=4$cwlttPBoSwqLYvLg8hUO2g$uL/OHyJ9xcvF3ePRXGgdKtUR/7tZf1E+twSqKwO1JBE	2026-07-19 12:57:10.726074	2026-07-19 12:57:10.726074	Guillaume	Masson	\N	6a5cc9ad2cf0e1ce2a3c92f6	146 Avenue de Saint-Ouen 75018 Paris	48.896885	2.328919	\N	\N
dffe220b-c32d-46b2-81e4-822208be8cf7	amandine.poirier@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$Jl0OssusWlkQcwO1RfLURA$6aTFE8HnzxOYZDgTN8Vrreo4RgeXW8PoD7Kj5YgFem0	B42BIE2I7YCOZ2WNUPSKXT65JSQVNCBN	resident	$argon2id$v=19$m=65536,t=3,p=4$AwbwSI743W5RbAHGjRuc/g$xVGgfXAYdWVQMakttF5iEbVGATXWcl/94hHx5RrjZO8	2026-07-19 12:57:10.87238	2026-07-19 12:57:10.87238	Amandine	Poirier	\N	6a5cc9ad2cf0e1ce2a3c92f6	36B Avenue Junot 75018 Paris	48.889156	2.33666	\N	\N
0232dec4-7bb3-4817-9141-79402eeea507	kevin.charpentier@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$vfOU0+6wcCyJ7hJa2H/TYw$TQeVn/SdQ7gYfggNOHpWZ7/lstfr5rpO1kOMJqD7Nu4	6BPHR6PKHUTGKQT66TZEEF55FGJDEZHV	resident	$argon2id$v=19$m=65536,t=3,p=4$EpZBLGIq58xKDnlvCBb2TQ$rDln08IlGo0Ez9AX0eTHLMzGAPlfwt+FnvW38o17nOU	2026-07-19 12:57:11.020026	2026-07-19 12:57:11.020026	Kévin	Charpentier	\N	6a5cc9ad2cf0e1ce2a3c92f6	100 Rue de Clignancourt 75018 Paris	48.891544	2.348809	\N	\N
64527329-422d-4e8e-81a7-a698095ca063	olivier.deschamps@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$JB6aXchhRYYi8mEP0Z/xlQ$5sjAiH99YWMd0GP/JCB7sm99KLLdluG4AnCN3e/Ts+o	7ETE373XXPDHJGJRYUT3CANI4WQ67MOL	resident	$argon2id$v=19$m=65536,t=3,p=4$1gp0TZriLBd/VPN9ZO7eQQ$VdvvIpei8pcz2zrLT6Y+olBnCLsjG4bhsUBBYkwcMVc	2026-07-19 12:57:11.301415	2026-07-19 12:57:11.301415	Olivier	Deschamps	\N	6a5cc9ad2cf0e1ce2a3c92f6	17 Rue Cauchois 75018 Paris	48.885414	2.333008	\N	\N
3a8f6cc3-fa5b-497c-8eea-7feb992cc142	ines.bouvier@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$Ef7z6mLaSvM3I6AYhsJtKw$/s0frCTuxChJY8RXoXRMHlGBRtThow2+YB+FHLYPw1g	GEG3Z5LZDHIFKVTVS3ZTJAITIGDIP6OR	moderator	$argon2id$v=19$m=65536,t=3,p=4$xRNlrqrCet3qTI+8OTO5lA$vsfpbLiQPIgbM7D9/MKdmkGpyL6Z6CzcyvAE0d8eM48	2026-07-19 12:57:11.704377	2026-07-19 12:57:11.704377	Inès	Bouvier	\N	6a5cc9ad2cf0e1ce2a3c92f8	38 Rue des Maronites 75020 Paris	48.868484	2.384715	+33613332132	\N
59049c8c-571e-4995-be88-72cb5212269f	pierre.lacroix@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$wmcHUmIHsUThWl9LfOOyJQ$ZDFWE5OvE1DLyPsqUmuTC34I8PWLSj2t8FPbmiNjb50	WMYQ2IZ6N7HAHNILUVJBT5MHL5WECBRJ	resident	$argon2id$v=19$m=65536,t=3,p=4$Fb74RTvT8prAODmqMfYw7w$scJp+HVn+2HaXIvJJeiK/idxJDFW+nSp1sLFYmeY+8M	2026-07-19 12:57:11.586757	2026-07-19 12:57:11.586757	Pierre	Lacroix	\N	6a5cc9ad2cf0e1ce2a3c92f7	21 Rue des Minimes 75003 Paris	48.857346	2.364825	+33613221121	\N
1df836dd-03fe-4959-91ab-fec29eb08043	bob@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$ZizVhKMNviDp2Rcs6ABfHA$p79MnXVeHfP2H4AQoAboOLV6WU07H9r3cLlJWRK1V7c	K7QM4TZBX2VNHR5CJWYD6LPS3AF4EGU2	moderator	$argon2id$v=19$m=65536,t=3,p=4$hNA1PaE7rmPrQjVMbUp+rw$iWd9I96QLDpxylugtbWrg+5jhcfVR5mrLsJUGxPK6RE	2026-07-19 12:57:07.844028	2026-07-19 12:57:07.844028	Bob	Dupont	\N	6a5cc9ad2cf0e1ce2a3c92f6	44 Rue Custine 75018 Paris	48.889168	2.345603	+33612111011	\N
69c367b0-15dc-4523-8c82-201b40ef22ec	benoit.carpentier@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$/uZMwrq4bzpMpB7R4ZlzmQ$iKDvV130YH6neW2TVqpEC6r0iiHKafsRxK7WsgY8QxA	VKAL2LC3VR62BGTT26RL67H3J6JCMA3B	resident	\N	2026-07-19 12:57:16.131114	2026-07-19 12:57:16.131114	Benoît	Carpentier	\N	\N	16 Rue Auguste Gillot 93200 Saint-Denis	48.94022	2.353436	\N	\N
a5f2b87e-dd86-438a-a298-88c78eb8d322	nathalie.ferreira@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$aDI065n6tm41ahbf6GemjQ$fOpRqTSA4aQPsR5/RJAX+JQPa2bXGXEuM1lhnpEoIrg	PRB4F3MDXE7OYXPNN5CFWDS5ZIQ37U3A	resident	\N	2026-07-19 12:57:16.517332	2026-07-19 12:57:16.517332	Nathalie	Ferreira	\N	\N	26 Rue de Valmy 93120 La Courneuve	48.921844	2.379704	\N	\N
a687568f-1d35-4f0c-9ace-0282f0598256	sonia.klein@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$fpY4k6v3GLpL1S5XSOTUDg$W1k/F6GcUG0HERBwfFfdxiHetmxYjBLK2jeqdON8chc	HVFF2APGHTHPJB7Q3LVPKS5AVKLOXL7H	deleted	\N	2026-07-19 12:57:16.919356	2026-07-19 12:57:16.919356	Sonia	Klein	\N	6a5cc9ad2cf0e1ce2a3c92f6	7 Rue des Saules 75018 Paris	48.887535	2.339652	\N	\N
e79f4b83-750f-450f-a567-5d4445460fae	loic.perrot@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$C6e+FNgc9+RNbdh3FInANg$jczju0PHyrfkgBdt4JtZGBH2p8AcSYKzpOxgLT80NL0	QBJ7FLOAC4QJ3M2DB5XMVDKGRUYJGMNL	banned	\N	2026-07-19 12:57:17.307124	2026-07-19 12:57:17.307124	Loïc	Perrot	\N	6a5cc9ae2cf0e1ce2a3c9300	18 Rue d'Odessa 75014 Paris	48.841923	2.324533	\N	resident
9f148a9f-e8b2-4d46-a0f2-40f231f78587	alice@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$Ffc+KdHxX4m6ZSw2A7tTqA$YZZjW0VunNAMv7PXaKu8JoVhHoNZVjwtBEEZCcZwXPo	4PX635D55YS6JJV3NYIXKZPREIO6YIIV	resident	$argon2id$v=19$m=65536,t=3,p=4$Gj+OtssoM33X04nmRqzelw$SQ1lTZdqsFGvEqxWupU6Bweg8P7LEjOEgtQw8+VTTUg	2026-07-19 12:57:07.687438	2026-07-19 12:57:07.687438	Alice	Martin	\N	6a5cc9ad2cf0e1ce2a3c92f6	8 Rue du Nord 75018 Paris	48.892796	2.351738	+33612000000	\N
230a605b-3731-42c3-8048-ded936016833	julien.moreau@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$XTUNVoH1KzU9mQj1GxTQog$LWv5F+tHkhwUrpoQJQBIGhq8+Wkr41JhlZXDgdy7NvU	AUFVE5AM2PXHZA3YTP4GTOUT56Y6FGFA	resident	$argon2id$v=19$m=65536,t=3,p=4$2ZAfeCUfdt2z8B8LOZWDUQ$ncDY2W66S+ovm8qVUA0gMuMpzYMBYPf8T7v/FkIsloo	2026-07-19 12:57:08.13635	2026-07-19 12:57:08.13635	Julien	Moreau	\N	6a5cc9ad2cf0e1ce2a3c92f6	14 Rue Forest 75018 Paris	48.885735	2.329087	+33612444044	\N
7ffec061-e10e-454f-894a-9ce32f10f62b	vincent.dumas@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$lOIt+jJ1IlZeoMx21TeRzA$Gd4NnWMFC/gVJfP9F2tChmpsn7pCbYWb2WsSKUQT5qg	GGFLEW35CZSHGQVULJIPQKMY53VQY64Y	resident	$argon2id$v=19$m=65536,t=3,p=4$/CKah9f+KMTpbC0yamtF0g$3VuTMVNBtyYmKPVjljUzmv6X15nhBzpcf8YDGtNXOdU	2026-07-19 12:57:09.886075	2026-07-19 12:57:09.886075	Vincent	Dumas	\N	6a5cc9ad2cf0e1ce2a3c92f6	51 Rue d'Orsel 75018 Paris	48.883465	2.340585	\N	\N
4a746bc5-1837-421c-8de2-18d706e66844	mathilde.aubert@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$FE0atBynxkIPDtO+VY+0fQ$oNsIPJC7SPd6Kv6+bEiQ05G61wExlRjYeLtUvW/RKmU	TTVLFHFDRBEN35BNCPKK6H3IDECF4RK3	moderator	$argon2id$v=19$m=65536,t=3,p=4$9k3rQP/YKSqoqE1Y13iYPw$ykw3M4q3k7uaxojKm8WueZM1dkPQoMOwABwHYojavUc	2026-07-19 12:57:11.446175	2026-07-19 12:57:11.446175	Mathilde	Aubert	\N	6a5cc9ad2cf0e1ce2a3c92f7	41 Rue de Turenne 75003 Paris	48.85736	2.364332	+33613110110	\N
cfb5a153-3e64-4df2-b67c-4309ed8c5c16	sabrina.costa@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$pPhK3Gsq/jQ8XD/JDhS8EQ$j7jKLWAo9XYBSpARDestKq5DkREGhYABO9+o/g3IDPc	763ELUMZCSC6NUN6KULE3XEGTUVBV25O	moderator	$argon2id$v=19$m=65536,t=3,p=4$uM/JpRDesTF+H6UeyUyk8Q$PnQDh8cLbxuJYdtngU1x7CcsZtU16XRD7A3tCgB1JLA	2026-07-19 12:57:12.276627	2026-07-19 12:57:12.276627	Sabrina	Costa	\N	6a5cc9ae2cf0e1ce2a3c92fa	36 Avenue de la Porte d'Asnières 75017 Paris	48.892586	2.300954	+33613554154	\N
70c8c7e5-d696-4358-a9a6-0b026f6e8e68	yanis.traore@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$8A6opHnhBjbw6lZc8vBtAQ$OaPDV8H789KSA401aY++LSWDDtGioEoBisg2Swz69bw	2OSKTRMM4ATGME3L6XPNZNAXO5C4YWB4	resident	$argon2id$v=19$m=65536,t=3,p=4$mzKM3fJfDaUaxeE5Odp8vw$ocOZ0oyK8cOPHQRdc4tKiWLnp0j/jUSM9XpdhGYo4bE	2026-07-19 12:57:11.832366	2026-07-19 12:57:11.832366	Yanis	Traoré	\N	6a5cc9ad2cf0e1ce2a3c92f8	26 Rue Henri Chevreau 75020 Paris	48.869953	2.389378	\N	\N
77177fba-d667-44d1-9904-60f149a24df8	remi.delaunay@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$ud4hOKLgPCR2PSucrZeVVA$WvANohJYIbTm+nK0mVqb6KNCOwydEDFvpYVdsK9pdcU	IMNPMZ7B3BHWAUJZQ4XU57IJSSIN2ZL4	resident	$argon2id$v=19$m=65536,t=3,p=4$pLtHTHccR6kqV0Y7JypGmA$PP2J5UkbMOfC/uYs7bKg0K1Eei8WLTR2nlASUG6X+qo	2026-07-19 12:57:12.702881	2026-07-19 12:57:12.702881	Rémi	Delaunay	\N	6a5cc9ae2cf0e1ce2a3c92fb	167 Rue de Bercy 75012 Paris	48.842606	2.375239	\N	\N
d10b2a6e-86a3-4a64-a2f3-3171b6af9b7c	valerie.dubois@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$96dTmXy+wMvNcEsjjB+7mg$6DcH270Zwe0OieBkKDTHaQUBMyYNMcplOCepT5F0o6w	Q3NUNOLNUPRYPE2JLLXJKEJSCMGXC6EQ	admin	\N	2026-07-19 12:57:17.729769	2026-07-19 12:57:17.729769	Valérie	Dubois	\N	\N	\N	\N	\N	+33614109209	\N
9b214ada-784f-4b59-a59b-e39f174a4eda	helene.vasseur@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$HdCp+FNHqkAnkPiwQFhz2Q$rg13YMDAa+ayz3zy6nUZavT8riC6gtugqko640/OOiM	54GKIYZI6LNHAYQ3O67DZYRF777D4OAC	resident	\N	2026-07-19 12:57:13.127507	2026-07-19 12:57:13.127507	Hélène	Vasseur	\N	6a5cc9ae2cf0e1ce2a3c92fd	21 Rue du Terrage 75010 Paris	48.87736	2.362756	\N	\N
b55231d3-5c4f-41a6-a75a-f0d249f99aca	samuel.ferrand@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$CJiwxAhFIaYlVmARV4UicQ$ik/ilNIGObyHUW0go42nT4ZNN63vf4NxbM6g2MTGs7w	WNGAOLYDWM3BZCHC5ZWVCIQNBBC24FEN	resident	\N	2026-07-19 12:57:13.537854	2026-07-19 12:57:13.537854	Samuel	Ferrand	\N	6a5cc9ae2cf0e1ce2a3c92ff	2P Impasse des Anglais 75019 Paris	48.889088	2.375756	\N	\N
0f246c69-e7bc-4ce8-9ec4-3fcbd3476116	anais.leclerc@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$w98SSb7lEskI/apDJa6ZgA$7a2St5vSwrBY5njTnHQtB30c1AJWmX0W76UkcLQJWec	GK2CZGYIISCN2OQADCIIHFSIBUV63KDZ	resident	\N	2026-07-19 12:57:13.95517	2026-07-19 12:57:13.95517	Anaïs	Leclerc	\N	6a5cc9ae2cf0e1ce2a3c92fe	71 Quai de Grenelle 75015 Paris	48.84933	2.282294	\N	\N
9466aa9f-347a-4f82-bc6f-0d7a783c2afc	cedric.hamon@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$qx9iS+MGwVKbhIaIIc4j2A$n+hjoaNX/OPCP1/FNX0AE4mA8xRWSJzuZVET2ef5WVA	3EO74BRPRLTL4UU37UXRHEJ32UTNG2RB	resident	\N	2026-07-19 12:57:14.381938	2026-07-19 12:57:14.381938	Cédric	Hamon	\N	6a5cc9ae2cf0e1ce2a3c9303	73B Rue Villiers de l'Isle Adam 75020 Paris	48.868046	2.397438	\N	\N
62f9dfe3-1835-4f8f-a463-2a4045e2206b	justine.prevost@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$O7dJTugBF4s46MLGgdQK5Q$JKE1GZnrzg+ZBH6En4umj2g+EVGkfinc5jqsvQPna8g	XSKLFPJCVHHMKCGCAWJ7UUX2QP55TNYE	resident	\N	2026-07-19 12:57:14.808657	2026-07-19 12:57:14.808657	Justine	Prévost	\N	\N	18 Rue du Pré Saint Gervais 93500 Pantin	48.89031	2.402991	+33613887187	\N
961fcb67-cb56-4d0b-9624-da1f837b57db	ludovic.weber@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$29YDip36mh3HrmCwissKPg$4xg1Tw7WJdoo0ZbSR6ncnhlhlT7yWPaTobw9ftDcpP0	B7SX3KJEWMZEE233LTH3RDIZWEKYZKSF	resident	\N	2026-07-19 12:57:15.248362	2026-07-19 12:57:15.248362	Ludovic	Weber	\N	\N	189 Rue du Vieux Pont de Sèvres 92100 Boulogne-Billancourt	48.82954	2.23718	\N	\N
ecdac308-175e-4d8f-b40f-ca967877f986	solene.maillard@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$3BTBw1XLj2h4QDqsyvF7wg$Pp7xWOo0XRiVcMym1/pwTH9wVp02/U6PHC5wBA5Uh/I	F3EOUC7AHYPGBLFCY4H3KFNJ3GRVQGR2	resident	\N	2026-07-19 12:57:15.691422	2026-07-19 12:57:15.691422	Solène	Maillard	\N	\N	6 Square Nungesser 94160 Saint-Mandé	48.840492	2.416588	\N	\N
1f207f2f-8630-40f9-af80-03a8ae841339	nina.weiss@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$TFBlEpu4kk22OCGK/gu5og$lrOlyKBAZAnvaTS8By4xCcxmhWR6ZfQ9yYzz5yYRU5Q	XAXKEZKV5QVFTGNMBTC54TWLYAIUERGP	deleted	\N	2026-07-19 12:57:17.455536	2026-07-19 12:57:17.455536	Nina	Weiss	\N	6a5cc9ad2cf0e1ce2a3c92f7	21A Place des Vosges 75003 Paris	48.856705	2.365098	\N	\N
94a51625-b29b-4eac-aba8-d14e6faced1b	manon.leroy@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$kCniGXEa83voKBrSFd12Vw$3NKn/5S/fNZZPFVSVaHJT2IvBcWixicPGEXNmOsvS+E	FLC2O7KDQVL5JLUHF4V66GEKYYIRCKIQ	resident	$argon2id$v=19$m=65536,t=3,p=4$IS+EBS2hYgr9hSpqjH5D4w$vIwgUHplmlvrU8lz6UAGOrWTbCMLJc+XglEiHnNY3co	2026-07-19 12:57:09.166365	2026-07-19 12:57:09.166365	Manon	Leroy	\N	6a5cc9ad2cf0e1ce2a3c92f6	4 Place Marcel Aymé 75018 Paris	48.887703	2.337753	+33612888088	\N
f0aee1c4-202e-4c44-9b23-e5d9cb8e8a3c	laura.millet@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$gXX637JU8jHjujmh8R97KQ$vXMqAhBmAJ26vqBHENgGbF8RlNZInFElUtDB/AyhEFg	SPWTUXKDLBYD73VJ5R2X2PXURABM3ZQM	resident	$argon2id$v=19$m=65536,t=3,p=4$RFBtJazzGM3LaU80S8kf3w$RnSLiq1A0VyFq2kLYYIh0/HRKitV0mFrPc7V6VOI22M	2026-07-19 12:57:11.982625	2026-07-19 12:57:11.982625	Laura	Millet	\N	6a5cc9ae2cf0e1ce2a3c92f9	23 Rue Valette 75005 Paris	48.846848	2.346575	+33613443143	\N
a17bea96-f8e9-4eb1-8a95-2584aa7fb20e	lucie.gaillard@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$7SJbjA9Y1Q1e4rJFdMkuRA$xUUqY+4tBO6N+nXtAmbEmRRiQv+9Gp6NSF4ElvRcU9w	WFSEQ5PKH3S7XUUZOVPZZX2RHL4VT2JM	resident	$argon2id$v=19$m=65536,t=3,p=4$j/V1rwHBJWnexNt6E3Bs+w$nMxTTX9D8H8kSXKLSLE1uaMYXErNbybuPiQ0AUuqTA8	2026-07-19 12:57:13.678014	2026-07-19 12:57:13.678014	Lucie	Gaillard	\N	6a5cc9ae2cf0e1ce2a3c9300	283 Boulevard Raspail 75014 Paris	48.836117	2.332072	\N	\N
a7f0486b-e942-4f86-8b0c-543092daac49	damien.faure@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$iyLhZjTawZyP7B6GYDnCtw$Pc6RuUmYMVvKdLh4YTX3liUnAa1lvyDJK+WEzDKRQDE	WNLPZPFTRW2ALEQJ6NITGHSGUL2CJ2Z4	resident	$argon2id$v=19$m=65536,t=3,p=4$IrOkMT290GZwyZrXgvR5FA$w6TJ6nkran4po9jv4DTJxoDEChIbk2jPOP0sh43fsMY	2026-07-19 12:57:12.408478	2026-07-19 12:57:12.408478	Damien	Faure	\N	6a5cc9ae2cf0e1ce2a3c92fa	82 Place du Docteur Félix Lobligeois 75017 Paris	48.88706	2.317876	\N	\N
f9979097-f488-4f03-aae0-6a9305702e8a	alix.marty@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$Lt6r/ntbD6oZWyPihHCGbQ$voha1Ybr77vgkQaP+YslMd3z/ZRvnYCBqxpkt8K/sgE	677WVWC4V3NND2GSC3J4ILLTCT2V4TZG	resident	\N	2026-07-19 12:57:12.846587	2026-07-19 12:57:12.846587	Alix	Marty	\N	6a5cc9ae2cf0e1ce2a3c92fc	25 Rue Gandon 75013 Paris	48.820766	2.361182	\N	\N
118ee5fa-4b2b-4b83-a2f6-61de397eab87	bastien.noel@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$0TAGnXU/I0eu/A9Pd3PJlw$zJGnrCar+fr2w5qfYUm4+gPTvn5j/QKgwdLSzZ2j9w4	AWA6THMN7BYZBUGHYJYQT4CZK2L2MQ4M	resident	\N	2026-07-19 12:57:13.268279	2026-07-19 12:57:13.268279	Bastien	Noël	\N	6a5cc9ae2cf0e1ce2a3c9302	18 Rue Chalgrin 75116 Paris	48.874817	2.288958	\N	\N
c8e00190-b839-4a54-af8f-11ddfd413a39	fabien.michaud@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$a+oQguBZN1wyUgBh0m8G2A$rQcOX0rTqaWkQ1MVXoOvB6FCPN5OKuJzqg5m6vYmeNs	3USHFHJXUNTOGJHF6QZGCSHH5OAKHTEN	resident	\N	2026-07-19 12:57:14.100945	2026-07-19 12:57:14.100945	Fabien	Michaud	\N	6a5cc9ae2cf0e1ce2a3c9302	27 Rue de Longchamp 75116 Paris	48.86491	2.290318	\N	\N
30ec2a5a-c17a-482b-beea-f1440ef5cf80	nolwenn.legall@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$7uhUguUOiqT+ajbsCeJfMw$CWHFYFEziGHpgT65Q3oopMfVS0/JJUHqDXM/d627A9M	QTCMCNJVVEKPL23T5UU2QCSKJ5KX5ZW6	resident	\N	2026-07-19 12:57:14.521555	2026-07-19 12:57:14.521555	Nolwenn	Le Gall	\N	6a5cc9ae2cf0e1ce2a3c9304	13 Rue de l'Abbaye 75006 Paris	48.854263	2.334369	\N	\N
e4896259-af6b-476d-9d82-828093d373b2	marc.delorme@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$J+2LWuRbSSjDFKl9jMga5w$AEdztniUDCqSi0aVkJHEcrOvUV7QZA/hC8vLHI25qNU	R5O2JJ33YFAW7TNAO3ZRTWWSGINKCFWK	resident	\N	2026-07-19 12:57:14.954727	2026-07-19 12:57:14.954727	Marc	Delorme	\N	\N	Square Pierre de Geyter 93200 Saint-Denis	48.931473	2.351752	+33613998198	\N
d5bd14cb-45f0-47ce-b0b3-0353254bdb0a	fatou.diallo@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$+drl8VKwmdVg4l+DaEROTw$hMIKl0a1O6MHkTh4HUdCsDhyfriqmgkqP5efYHTqwt0	SK27QT7VE4ZEQ43CWG57T73AYOBI5PDZ	resident	\N	2026-07-19 12:57:15.397623	2026-07-19 12:57:15.397623	Fatou	Diallo	\N	\N	4 Rue du Chemin Vert 93300 Aubervilliers	48.918804	2.377537	\N	\N
b1768dac-e781-4b17-9242-125d5d18577a	xavier.brunel@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$jJY+w45bnE6P9aIK2ykslQ$uYHF2hDXtafdrfMUk2vyDiM1C2823ZvXB3zIbP2tilA	2Q5VPQHKMDBURPXWTOYOKUR5IIN6HO4S	resident	\N	2026-07-19 12:57:15.845534	2026-07-19 12:57:15.845534	Xavier	Brunel	\N	\N	59 Avenue de la Résistance 93100 Montreuil	48.861076	2.43676	\N	\N
096da412-a035-4d26-afdc-4d246e6c55d7	delphine.arnaud@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$SvsSadQ/tpUCIPubI3KQyw$YNHr4cfDZgeapgjaH2dZigJjk7YFNXgpdwC59xRgwbw	LDG3Q7MVTKT5LDHVOMYFOHWY2VD5XWBG	resident	\N	2026-07-19 12:57:16.246951	2026-07-19 12:57:16.246951	Delphine	Arnaud	\N	\N	35 Quai Marcel Boyer 94200 Ivry-sur-Seine	48.821	2.394243	\N	\N
0a20ed6c-5332-4d85-9dac-0e8cd3f16415	quentin.morvan@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$HOm74QsGBVZOKufWbxJ5cg$6oyWlDiEUsCzLVAFarvusTAFMWMQWVV8nFTuXeHg5SQ	ETM4NW7ZK4F6CXISJUZC2L3NG2B3M23W	resident	\N	2026-07-19 12:57:16.656399	2026-07-19 12:57:16.656399	Quentin	Morvan	\N	\N	95 Rue de Chézy 92200 Neuilly-sur-Seine	48.890938	2.274747	\N	\N
a77e52ef-ef10-4a89-9c75-2ecf2e1c2ddc	franck.aubry@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$RZHkxg8yhshi/2omIh+NOw$Hgx/9VxT63ZA4NoRS0K7ryRgWnWXxKS8s6F6Cf4gJYU	XTLBQK52CCLDGKOROAYRZLKQZ4SGS234	banned	\N	2026-07-19 12:57:17.050423	2026-07-19 12:57:17.050423	Franck	Aubry	\N	6a5cc9ad2cf0e1ce2a3c92f8	18 Rue Julien Lacroix 75020 Paris	48.86959	2.385506	\N	resident
c06caee1-bee4-4109-808c-ce7b49ab317c	aurelie.blanc@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$Te0iiYcA65ktIspUx0ypEA$4KDbr0qGgYp1C1Po2YSeuMIkFoXeU6t+CRwD3T7p29E	4YK5NXN4VRZAS67KP5T3NJNTSSAAOFJ6	resident	\N	2026-07-19 12:57:15.099704	2026-07-19 12:57:15.099704	Aurélie	Blanc	\N	\N	43 Rue Gabriel Péri 94200 Ivry-sur-Seine	48.813824	2.382626	\N	\N
c4674cc7-e805-41cb-9398-e046c54d6308	gregoire.tanguy@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$JCb4qf3cfnbv4orTVbYCJQ$9cXqtBb6faskzSrRl/LPNlAyfgRZzJVTXIiLWiw9B7Q	4XTYYBJSPNDOCPF4XVOZOC3HMHPEX5SB	resident	\N	2026-07-19 12:57:15.544422	2026-07-19 12:57:15.544422	Grégoire	Tanguy	\N	\N	37 Rue Edouard Nortier 92200 Neuilly-sur-Seine	48.889595	2.268798	\N	\N
984dea00-71b4-460b-9c7a-d29275bf67a8	myriam.sassi@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$mPAiNhBUfwBoRwUTWea+uw$SCNhSOxAK7uWRRjqOgVePj4c0RmGZlYwfNJguWvcYbM	7JWGLUIV2YR2PP7UEAXDK23IY4BNMHOJ	resident	\N	2026-07-19 12:57:15.997923	2026-07-19 12:57:15.997923	Myriam	Sassi	\N	\N	30 Avenue Jean Lolive 93500 Pantin	48.890324	2.399599	\N	\N
5511e409-651e-4757-8f40-36628b780805	sylvain.lacombe@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$Y313SKqrUQLlvQL/FuI+FQ$jbzDrWPUqTSJ51Jox6+cA26ZTNbRI7R40Fd/bXgXnVE	VEO5WTAHOZCM5MGW4ZTGIBRQYC3K45DF	resident	\N	2026-07-19 12:57:16.385603	2026-07-19 12:57:16.385603	Sylvain	Lacombe	\N	\N	159 Rue du Vieux Pont de Sèvres 92100 Boulogne-Billancourt	48.831318	2.241804	\N	\N
6bcca28f-4bf6-48f0-9432-717f1a4b5b21	bruno.vidal@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$oEG5ebWeVS20UOZDLQvtfg$D21T7McWLqj9E9G3pTkIU+nVJjcdSGlmyBlzldJ2ui4	3CZOVKZKKPUPOBASXUXIXLJCZXVOAVHL	banned	\N	2026-07-19 12:57:16.791151	2026-07-19 12:57:16.791151	Bruno	Vidal	\N	6a5cc9ad2cf0e1ce2a3c92f6	1 Place Jacques Froment 75018 Paris	48.8909	2.330896	\N	resident
4760d794-dbe0-4ede-8177-60cd3e6efe89	ingrid.bertin@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$WYn4vefEYcWVEc/wM9J33w$8c3K+8RWCQYfZD92Us+MZOAhZKSqVXpB4S9hAse8+Vk	PH2QBBFIE74LKFZGB4PEXWMXEGWBYDNC	banned	\N	2026-07-19 12:57:17.166775	2026-07-19 12:57:17.166775	Ingrid	Bertin	\N	6a5cc9ae2cf0e1ce2a3c92fb	59 Avenue Daumesnil 75012 Paris	48.847023	2.376313	\N	resident
9b7f94b0-59b2-4955-92c3-aeb94364dad6	sophie.lefevre@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$d0CWaIaBfiH915iSzlV/Ig$oas2e+v0jxK93Y4M4rpgJvVstTn3EEHqnjewKvwa3Nw	CHUMEDYFMQ7F6YRR6RFVMWUTK45NK5PR	resident	$argon2id$v=19$m=65536,t=3,p=4$7C+8efu/+qku1H+g1OpCXw$5+K9NsI4NxgE6BJ5SC0OYXIDvU3ny6yHi2mJinCcof0	2026-07-19 12:57:08.281329	2026-07-19 12:57:08.281329	Sophie	Lefèvre	\N	6a5cc9ad2cf0e1ce2a3c92f6	3 Rue Dejean 75018 Paris	48.887196	2.350656	+33612555055	\N
c3a1977f-e375-4577-91a4-61c8bf2866d2	antoine.perrin@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$FCMi78+ioN/yoo3VaS010g$AoEq4OLZmssiBCt5Cy73vLcWAzonLF9eb6wW9FRo1ZU	7OVRYJEFLUYE4WUQ3MZRBT45CGZ6QHNG	resident	$argon2id$v=19$m=65536,t=3,p=4$WSlb2jiZG3MMVgqNLCsCfA$HNftuUmsJ9Dl8NPbTqlLQkn4mJoonzogP2gP61BQK+A	2026-07-19 12:57:09.025725	2026-07-19 12:57:09.025725	Antoine	Perrin	\N	6a5cc9ad2cf0e1ce2a3c92f6	10 Rue de Trétaigne 75018 Paris	48.89184	2.342293	\N	\N
67d77217-1c6a-48f6-99a3-001e1fdc125e	sarah.lemoine@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$cYVOojg1/mjJxWKDGAY1UQ$iXbP/Azl3ZubCOtH5lB5OTnjpGMX2AGgFjdeQ5dB0xY	5UCSZF3BAWOZQOSYFJI76TCGMOAI3SZZ	resident	$argon2id$v=19$m=65536,t=3,p=4$gMj5ttUgRB4ugqAWaG8k6Q$v/VTvERsHz0kCxKJaZ9tAw/ZIdYNlO8zWlbGu0rHRgM	2026-07-19 12:57:09.739239	2026-07-19 12:57:09.739239	Sarah	Lemoine	\N	6a5cc9ad2cf0e1ce2a3c92f6	4 Rue Henri Brisson 75018 Paris	48.898335	2.335014	\N	\N
01da4dbf-3ae9-417c-816d-986a8a72c597	adrien.roussel@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$RPwCKoxwISC6KAkxsCZ4jw$oz/yGPWG0VphYFG6/3NzVJ+l7nfGOAbcdj/MYqwfEco	EXWF5EGL7O4HG2MKJ7LRCBS3IEDD2JYO	resident	$argon2id$v=19$m=65536,t=3,p=4$uHINTa+UE47SaPiM75xlJw$X3tf1dyC9DqdCMAlqUzQ5asAET3vRyiNvqlJgdPrWl4	2026-07-19 12:57:10.4404	2026-07-19 12:57:10.4404	Adrien	Roussel	\N	6a5cc9ad2cf0e1ce2a3c92f6	48 Rue Vauvenargues 75018 Paris	48.89526	2.331692	\N	\N
d9744141-619d-436b-ba2a-4a4692716857	elodie.blanchard@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$fEJ8e9/ual+pUl/J06IBfA$co1tx2JAL8rHnv/MLmCo1UPNBz9kn3zG3Cm1PsYBvVc	ABW4HV2PND3XVQGCTW3RUNJP6TJTSUQQ	resident	$argon2id$v=19$m=65536,t=3,p=4$Rzh7+wtHQ5fqOQCN1ruQPw$r5u7KvXTZK4ZobZTyd66Yra2QyhHIC4mxzrq35t/j4k	2026-07-19 12:57:10.576973	2026-07-19 12:57:10.576973	Élodie	Blanchard	\N	6a5cc9ad2cf0e1ce2a3c92f6	18 Rue Camille Flammarion 75018 Paris	48.89897	2.340179	\N	\N
ba9e298c-cbad-4ef3-9c11-a89ef5624a29	nadia.benali@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$PQFnMa9y/4td+NOdIGJUUw$64wvHMruyz7YfUrIOSwfS5vPAsyjJTnCehvkuxF+K3U	JCSEJEOJ4HNE3M4JMPATXCV26NNSSVVE	resident	$argon2id$v=19$m=65536,t=3,p=4$amqQoRd+NWk/0ETJj55bEw$PkALEXMvMQ6xPH8Fa+itkdVEes2PWLyiuGBi1Z5cHIQ	2026-07-19 12:57:11.164753	2026-07-19 12:57:11.164753	Nadia	Benali	\N	6a5cc9ad2cf0e1ce2a3c92f6	39 Rue Labat 75018 Paris	48.88911	2.348559	\N	\N
46da8efd-9b76-4b67-a4bf-aad5d6c6d6b9	oceane.roy@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$fSbC2yShVpAjJScz/q7QEw$eyIK1cCz1zRu9+3IAQRTs2e7egkGAjlgO1HxDQKDHBc	L5SDZAE22EUIXLRA567ITBT4EY6QUXLQ	resident	$argon2id$v=19$m=65536,t=3,p=4$7wqPjnZ2S1mlkT0430B1ng$vCWJ1FoAq9CrRJKyNyKLTomV3oEPdFbwTfHLSRL6Eys	2026-07-19 12:57:12.556637	2026-07-19 12:57:12.556637	Océane	Roy	\N	6a5cc9ae2cf0e1ce2a3c92fb	9B Rue Michel Chasles 75012 Paris	48.847153	2.37371	+33613665165	\N
51707c96-a29f-4da8-afea-eaed190fa678	admin@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$1QzIcd/rIWUSEKeo8JVWmQ$VNc9D2CdW9I6YPBVhNpuJjmumPgr4BoNstMHjvh7/1M	P4WDGNQ7RJ25XKTCVBM3ZLHY6SFA4EDN	admin	$argon2id$v=19$m=65536,t=3,p=4$lAYv4n7ngTAetwFJe+ZdMQ$CfwnRScLsJJ1ASP8xjb7PhgzJ2vHYwHt7XYPufYiauw	2026-07-19 12:57:17.590421	2026-07-19 12:57:17.590421	Admin	QuartierConnect	\N	\N	\N	\N	\N	+33612222022	\N
afd4352f-7760-4896-8fa4-2ce173e933f7	theo.bourgeois@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$i7Jzp6SUPjmnqulj0LruvA$8Nr6+pGo6Xjrnp0iRcI0Ok4qf792F1feJeVUimnHPG0	2BOHJAYHV3JVM4VPJATBYRJ4AIB6JQVO	resident	$argon2id$v=19$m=65536,t=3,p=4$tbFHEOC2WKCwzz61/tJolg$uaLJ4+y8VC0PomnDXv7g+qmHTaEASCSuMSRbDStM0Po	2026-07-19 12:57:13.816523	2026-07-19 12:57:13.816523	Théo	Bourgeois	\N	6a5cc9ae2cf0e1ce2a3c9300	271 Boulevard Raspail 75014 Paris	48.836884	2.331786	\N	\N
96a7e89f-325f-43ea-8bde-96293e3b9a97	etienne.berger@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$dhLkRKH2UMFNQYXgS1pywQ$xBT5NSYF8myvfMbbvztfIjVcnlmbfsdgVnwKSdOWRlo	FYYKJPNLL3NOKLSI4G565XOLENDVIQ5R	resident	$argon2id$v=19$m=65536,t=3,p=4$1Z4pVTsLzsdbywjQrPI+Og$62a4o0wtSCljwu9GxSjXapFBt70gq9/HmWEf8/XSoxg	2026-07-19 12:57:12.130525	2026-07-19 12:57:12.130525	Étienne	Berger	\N	6a5cc9ae2cf0e1ce2a3c92f9	12 Rue Laplace 75005 Paris	48.84737	2.347419	\N	\N
5e310d5b-61e8-4879-a3be-922b3f574207	charlotte.pichon@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$I+e/JnQ72W0ZrvURnY2rgw$iRpXfXeZoUpZs1IRNrlo7KGm6UrWS44VRvaqTLwxB24	5XPWAVBHHVUBMPDO3I4UZUNPRZXXWVHO	resident	\N	2026-07-19 12:57:13.406294	2026-07-19 12:57:13.406294	Charlotte	Pichon	\N	6a5cc9ae2cf0e1ce2a3c9301	11 Rue Auguste Barbier 75011 Paris	48.86895	2.371318	\N	\N
cf5c2828-a883-40c2-8878-b898c91e76d8	margaux.rey@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$mH09UzBhf+fwLRdbr4S4ag$yyXa7unCWa422zxRTyNfLZ1hVCUUJpht9zdtuRYEYA8	UX3X43FHDHJAYDA7JOSEVFOYKXJQWUCU	resident	$argon2id$v=19$m=65536,t=3,p=4$ll5+q2x2ZXHFUhhI5GShsQ$O0k3HryGzbHN2M+4so4Dwt+MQHsB1/O0fT7VCaFe1wE	2026-07-19 12:57:14.240287	2026-07-19 12:57:14.240287	Margaux	Rey	\N	6a5cc9ae2cf0e1ce2a3c9303	31 Villa Godin 75020 Paris	48.859447	2.400277	\N	\N
e730cb0c-7749-4541-84a6-4ee1e2710df4	farid.amrani@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$qsBmJVWhlB4RuVdZbU/VLQ$P4XckD2cWqHYgy+PiALlrRzL5eWGgVTVCV6RNj6bzJ0	HTPXNHUW4V2GK2HXBMBWKBTA5WODK5JG	resident	$argon2id$v=19$m=65536,t=3,p=4$aSWlqYK7G8rktoqrGDKEVg$FgYayG6Db1EJ3gFdLCa/ZZwADjmx8jOqgfIklVouPtU	2026-07-19 12:57:12.983208	2026-07-19 12:57:12.983208	Farid	Amrani	\N	6a5cc9ae2cf0e1ce2a3c92fd	16 Rue Eugène Varlin 75010 Paris	48.878784	2.363987	\N	\N
4fd3a95e-c647-49ab-9d7c-4ff2f9cdc4ef	karim.benhamou@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$pgLKh2k3Sztzh9KRH3xOIg$+32WIRXV6M6lxNrhimYV9yztntdvkQFqbvacAT6VigI	WLNCKFKZOBPAQQD7AEZI62VFCOSL5X5B	resident	\N	2026-07-19 12:57:14.660309	2026-07-19 12:57:14.660309	Karim	Benhamou	\N	\N	42 Avenue Gabriel Péri 93100 Montreuil	48.85688	2.442272	+33613776176	\N
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: -
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 10, true);


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

\unrestrict Yq3L8dml5sQ5R0UoySNwUXZVeHKVPbcs52kd18Shlg5EnuGVaEKTgn1ktsLSDvs

