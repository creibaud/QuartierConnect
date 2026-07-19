--
-- PostgreSQL database dump
--

\restrict tSsIK4KZXPI7JOz6WnP1omeeTOhQoiToJBNizi29F4d7y8Mn7zlIDhSfrMq1IXu

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
be71c3e5-1379-4ffd-9e2b-16b0fb407c5d	Lampadaire éteint rue Lepic	Le lampadaire devant le 42 ne s'allume plus depuis une semaine, le trottoir est totalement noir le soir.	open	0b653a65-ed00-4bff-8363-87db61282945	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.735594	2026-07-19 09:59:35.735594	48.8831	2.3381	neighborhood
baf4cdb9-b05f-4993-82ee-18384887f7bc	Conteneur à verre débordant place des Abbesses	Le conteneur n'a pas été vidé depuis la semaine dernière, les bouteilles s'entassent autour.	open	93445062-fc71-4130-be5c-bd7ad9661bf2	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.773029	2026-07-19 09:59:35.773029	48.8831	2.3421	neighborhood
45eeca16-1692-49e7-9be4-dc597c4c9a10	Trottoir effondré rue Damrémont	Un affaissement s'est formé après les fortes pluies, difficile à franchir en poussette.	open	4b0f4b82-9992-4280-acd4-2eb871f90c15	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.782487	2026-07-19 09:59:35.782487	48.8831	2.3431	neighborhood
db552c57-06cb-4c80-904f-89708f7a2f9e	Banc cassé square Louise-Michel	Deux lattes sont arrachées et laissent apparaître des vis, risque de blessure pour les enfants.	open	8f1be472-8d4c-40ec-bb31-6464b435975a	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.802978	2026-07-19 09:59:35.802978	48.8831	2.3451	neighborhood
a56f78b9-1732-49df-af65-5fe2483fb693	Éclairage défaillant dans l'escalier de la rue Foyatier	Une marche sur trois est dans l'ombre, la descente est dangereuse par temps de pluie.	open	f7025b74-7036-4140-890d-85eecf174883	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.83133	2026-07-19 09:59:35.83133	48.8841	2.3401	neighborhood
14f23584-70d8-449b-a958-46572dfe1761	Voiture ventouse rue Burq	Le même véhicule occupe la place depuis six semaines, pneus à plat et pare-brise couvert d'avis.	open	faa4f168-5dfe-4683-b0dc-34cad4ab4928	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.864088	2026-07-19 09:59:35.864088	48.8841	2.3431	neighborhood
beeb74cb-2e1c-4c41-ae30-7acb5f4a0358	Nuisances sonores nocturnes rue des Trois-Frères	Musique et cris jusqu'à trois heures du matin plusieurs nuits par semaine depuis un mois.	open	1287ce2e-8951-4d5f-ac5f-9c8bcbc4b1e0	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.883652	2026-07-19 09:59:35.883652	48.8841	2.3451	neighborhood
730d7341-0570-44e6-a7a6-3e4ef00a7e05	Branche menaçante square Jehan-Rictus	Une grosse branche est fendue et surplombe l'aire de jeux, il faudrait l'élaguer.	open	f1f39ac2-ded1-4435-8d9c-1323c17b7764	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.911739	2026-07-19 09:59:35.911739	48.8851	2.3401	neighborhood
b7ae0adb-bce2-4b26-9d3d-7461ba02d2c4	Piste cyclable obstruée par un chantier	Les barrières du chantier empiètent sur toute la largeur de la piste sans déviation balisée.	open	98b72c78-8549-4aac-874c-c19391150b07	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.920675	2026-07-19 09:59:35.920675	48.8851	2.3411	neighborhood
0ae59d99-b016-4d11-8aad-23ec0219066e	Bouche d'égout bruyante rue Véron	La plaque claque à chaque passage de voiture, jour et nuit, sous les fenêtres du 12.	open	1399ce7a-1294-4dfb-bfe7-0387c9b89431	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.928666	2026-07-19 09:59:35.928666	48.8851	2.3421	neighborhood
3e1dbc86-a716-4afd-832f-b000d195bd93	Stationnement gênant devant la crèche	Des véhicules se garent systématiquement sur le bateau, les poussettes doivent passer sur la route.	open	58b3df0d-2a0b-4f08-96f3-e0924d250b89	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.956885	2026-07-19 09:59:35.956885	48.8851	2.3451	neighborhood
423c6764-28db-4135-a81d-70522feabf5c	Odeurs persistantes près du local à ordures	Le local n'a pas été lavé depuis longtemps, l'odeur remonte jusqu'au premier étage.	open	f7b74913-40ac-495c-981e-e46bce8b4d2b	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.975372	2026-07-19 09:59:35.975372	48.8861	2.3391	neighborhood
decd0139-e487-4e8e-9210-2f0f3d2f1229	Absence de bac de tri rue Constance	L'immeuble du 7 n'a aucun bac jaune, les cartons finissent dans les ordures ménagères.	open	4de869de-be0a-47b9-9f6a-772041cdc24f	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:36.000884	2026-07-19 09:59:36.000884	48.8861	2.3421	neighborhood
fe18abd9-470d-444d-a384-166032c87812	Nid-de-poule dangereux rue Ordener	Trou d'une vingtaine de centimètres au niveau du passage piéton, plusieurs cyclistes ont chuté.	resolved	4de869de-be0a-47b9-9f6a-772041cdc24f	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.752857	2026-07-19 09:59:37.168	48.8831	2.3401	neighborhood
21894da1-e3d1-448c-b982-1dee159e124a	Tag sur la façade de l'école élémentaire	Graffiti sur toute la longueur du mur côté cour, visible depuis la rue.	resolved	84ec11af-7898-463a-8cca-525ac60cbf59	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.762432	2026-07-19 09:59:37.191	48.8831	2.3411	neighborhood
9dc419f6-7aec-47e8-ab7e-61d8883b944b	Fuite d'eau au coin de la rue Marcadet	De l'eau claire coule en continu depuis une bouche d'arrosage et ruisselle sur la chaussée.	resolved	9d9d446c-f58d-4237-ba5a-163cbf3eddd6	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.792403	2026-07-19 09:59:37.212	48.8831	2.3441	neighborhood
55dd36c6-e967-418a-8956-4297e306dec1	Grille d'arbre descellée rue des Martyrs	La grille bascule quand on marche dessus, elle mériterait d'être refixée rapidement.	resolved	fac2acc3-190b-43cd-baed-122358be1259	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.812978	2026-07-19 09:59:37.237	48.8841	2.3381	neighborhood
8dc76bde-257e-45d9-a141-dae14b3dc5b0	Feu tricolore hors service rue Custine	Le feu clignote en orange dans les deux sens depuis hier matin, la traversée est risquée.	in_progress	0c05a6eb-4191-4b8f-8a4e-e9489251eaee	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.822467	2026-07-19 09:59:37.249	48.8841	2.3391	neighborhood
6d036aa3-25a6-4ee5-8ffa-b1886b2d7f08	Poubelles non ramassées depuis trois jours	Les bacs jaunes et verts sont restés sur le trottoir, ils débordent et gênent le passage.	resolved	f8f4a6d7-5239-40a9-b1cd-f5b98e347e18	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.842295	2026-07-19 09:59:37.274	48.8841	2.3411	neighborhood
0542377b-11be-4922-ac03-f883ea9a1e64	Rats aperçus près des poubelles du marché	Plusieurs rongeurs sortent des grilles d'arbre en fin de journée, autour du local à ordures.	in_progress	a1476d02-7f97-4d44-8546-4debcf9ca26c	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.852255	2026-07-19 09:59:37.286	48.8841	2.3421	neighborhood
825b2d30-14f1-4d1d-87f6-d006efbffe0d	Panneau de signalisation arraché rue Lamarck	Le panneau de sens interdit est au sol, les voitures s'engagent à contresens.	resolved	42a660bf-233e-45c9-81c3-947a509a44c1	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.8737	2026-07-19 09:59:37.31	48.8841	2.3441	neighborhood
98354659-1384-4bcc-8378-d49dcdb8d513	Rambarde descellée escalier rue Chappe	La main courante bouge sur une dizaine de mètres, plusieurs fixations ont sauté.	in_progress	542f9288-29cc-4675-8ed7-bb39c1f5929a	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.893032	2026-07-19 09:59:37.326	48.8851	2.3381	neighborhood
70fb104e-6093-4244-8f72-4b49639a37f2	Affichage sauvage sur les vitrines vacantes	Des dizaines d'affiches collées sur les rideaux de fer des commerces fermés.	resolved	51b9e03e-0681-453b-b96d-a0a71b6cf2d8	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.903093	2026-07-19 09:59:37.349	48.8851	2.3391	neighborhood
e1b50929-1ec4-4651-baa1-a8593ee362b8	Vitre brisée à l'abribus rue Championnet	Le panneau latéral est éclaté, des éclats de verre traînent encore sur le trottoir.	in_progress	b8b1125d-d27b-47dc-98ae-7150ffcb0fe3	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.936877	2026-07-19 09:59:37.36	48.8851	2.3431	neighborhood
05db1aa6-0250-44d1-b361-ae9bb5283787	Boîte aux lettres vandalisée rue Tholozé	La serrure de la boîte collective a été forcée, le courrier reste accessible à tous.	resolved	a7febe13-1bc7-427d-8a44-e3b3a2e62c8d	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.946148	2026-07-19 09:59:37.382	48.8851	2.3441	neighborhood
735c7b84-905c-4e1e-8911-644f627e7314	Défaut d'entretien du jardin partagé	Les allées sont envahies, le composteur déborde et personne ne s'en occupe depuis le printemps.	resolved	16850636-c1fa-4cf3-84c7-ad7664d6cad0	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.965513	2026-07-19 09:59:37.405	48.8861	2.3381	neighborhood
89adbba7-488f-43cf-8fd2-f1d50b1097aa	Mobilier urbain tagué rue Yvonne-le-Tac	Les deux bancs et la borne d'information ont été recouverts de peinture pendant le week-end.	in_progress	0b653a65-ed00-4bff-8363-87db61282945	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.984288	2026-07-19 09:59:37.416	48.8861	2.3401	neighborhood
39008b4d-8274-4567-902e-d89d28897558	Chaussée glissante après les travaux rue Berthe	Le revêtement provisoire devient très glissant dès qu'il pleut, deux chutes constatées.	resolved	e9b6a3de-1139-47c6-b834-fa08f43850cb	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.992745	2026-07-19 09:59:37.438	48.8861	2.3411	neighborhood
5ac9c594-955d-4ed9-b6e9-fa6b7848b957	Fuite sur la fontaine du square des Batignolles	L'eau coule en continu même robinet fermé, une flaque permanente s'est formée.	open	9d33a952-846f-4e64-90c1-95b8693cba19	6a5c9fdda6f783f8fe6b09da	\N	2026-07-19 09:59:36.199871	2026-07-19 09:59:36.199871	\N	\N	neighborhood
7178f800-ffd2-4c30-84b8-1cbec75e7309	Abribus dégradé rue de la Gaîté	Le panneau d'horaires est arraché et le banc a été démonté.	open	9f590f91-ff38-4388-9e5c-c30bf1b8d63a	6a5c9fdea6f783f8fe6b09de	\N	2026-07-19 09:59:36.220271	2026-07-19 09:59:36.220271	\N	\N	neighborhood
6e7aefdc-b710-4be5-8178-d675fe86d6d1	Le bouton « Charger plus » ne répond pas	Sur la liste des services, le bouton reste actif mais aucune nouvelle page n'est chargée.	open	a4f76676-2a58-4081-809c-7c52f7035f52	6a5c9fdda6f783f8fe6b09d9	\N	2026-07-19 09:59:36.828649	2026-07-19 09:59:36.828649	\N	\N	bug
35f72048-debe-4a37-9edb-ec433c77fb4f	La recherche ignore les accents	Une recherche sur « éclairage » ne remonte pas les annonces écrites sans accent.	open	d0f005ee-d44a-4445-a518-aa8118e9e663	6a5c9fdea6f783f8fe6b09de	\N	2026-07-19 09:59:37.126838	2026-07-19 09:59:37.126838	\N	\N	bug
06723aa8-6cd1-48c1-afeb-eb58fb00230d	Dépôt sauvage devant le 24 rue Caulaincourt	Un matelas et deux cartons de gravats sont abandonnés sur le trottoir depuis samedi.	in_progress	e9b6a3de-1139-47c6-b834-fa08f43850cb	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:35.743234	2026-07-19 09:59:37.139	48.8831	2.3391	neighborhood
f35b70f2-5cda-47af-850c-dfe464e19461	Plaque d'égout descellée rue Antoinette	La plaque se soulève au passage des camions de livraison et retombe de travers.	resolved	84ec11af-7898-463a-8cca-525ac60cbf59	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:36.009881	2026-07-19 09:59:37.459	48.8861	2.3431	neighborhood
cfd1ed68-2ce7-44d3-8072-a111126014b9	Sonnette d'immeuble hors service rue Gabrielle	Aucun interphone ne fonctionne au 15, les livreurs sonnent chez les voisins du rez-de-chaussée.	in_progress	4b0f4b82-9992-4280-acd4-2eb871f90c15	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:36.028134	2026-07-19 09:59:37.467	48.8861	2.3451	neighborhood
e9c1c94b-52c3-4a00-9355-47467b021b86	Éclairage du terrain de sport en panne	Les projecteurs ne s'allument plus, le terrain est inutilisable après 18h en hiver.	resolved	8f1be472-8d4c-40ec-bb31-6464b435975a	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:36.046065	2026-07-19 09:59:37.489	48.8871	2.3391	neighborhood
e10d731d-5752-41d6-adf3-779e1e3fbfe7	Message injurieux reçu en messagerie	Suite à un refus de service, l'utilisateur a envoyé plusieurs messages insultants.	resolved	fac2acc3-190b-43cd-baed-122358be1259	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:36.066842	2026-07-19 09:59:37.519	48.8871	2.3411	reporting
06d2ecd1-5860-4368-8575-8236224716bf	Annonce de covoiturage manifestement frauduleuse	Trajet proposé à un tarif absurde avec demande d'acompte immédiat par lien externe.	resolved	f7025b74-7036-4140-890d-85eecf174883	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:36.087256	2026-07-19 09:59:37.541	48.8871	2.3431	reporting
104eeb91-1ed5-4dc5-b5d5-7b5942e9a2d0	Annonce dupliquée publiée en série	La même offre de jardinage est publiée six fois avec des titres légèrement différents.	in_progress	a1476d02-7f97-4d44-8546-4debcf9ca26c	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:36.107452	2026-07-19 09:59:37.552	48.8871	2.3451	reporting
f86b0037-8754-4e94-be9f-69923c2a3857	La carte des incidents reste vide au premier chargement	Les marqueurs n'apparaissent qu'après un changement d'onglet et un retour sur la carte.	in_progress	0b653a65-ed00-4bff-8363-87db61282945	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:36.125874	2026-07-19 09:59:37.563	48.8881	2.3391	bug
fac7c3bf-ab87-4c82-9855-7714fda9589d	Les notifications de messagerie arrivent en double	Chaque nouveau message déclenche deux notifications identiques à quelques secondes d'écart.	resolved	1287ce2e-8951-4d5f-ac5f-9c8bcbc4b1e0	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:36.143936	2026-07-19 09:59:37.584	48.8881	2.3411	bug
09c6583c-d5e3-40bd-99b1-88b206639d7f	La page de résultats de vote affiche un total erroné	Le total des participations dépasse le nombre de votants sur les scrutins pondérés.	resolved	51b9e03e-0681-453b-b96d-a0a71b6cf2d8	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:36.161429	2026-07-19 09:59:37.603	48.8881	2.3431	bug
334bdab9-81e6-4768-ac1a-056ac48a0b4d	Éclairage public en panne rue de Belleville	Trois lampadaires consécutifs sont éteints entre le métro et la boulangerie.	in_progress	3c3a4d55-de41-4aab-92c5-ed692bba4c9b	6a5c9fdda6f783f8fe6b09d8	\N	2026-07-19 09:59:36.180569	2026-07-19 09:59:37.611	\N	\N	neighborhood
62cdb981-68e9-41d5-9129-ac6182313eab	Comportement agressif signalé en messagerie	Relances insistantes et menaces voilées après l'annulation d'une réservation.	resolved	31c286fe-e810-4610-994b-16bf85f4b896	6a5c9fdda6f783f8fe6b09d8	\N	2026-07-19 09:59:36.530735	2026-07-19 09:59:37.665	\N	\N	reporting
1f6f48a4-6bd7-4457-9326-fb1307d8dff7	Panneau d'information illisible place Émile-Goudeau	Le plan du quartier est délavé et rayé, il n'est plus lisible pour les visiteurs.	open	93445062-fc71-4130-be5c-bd7ad9661bf2	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:36.017992	2026-07-19 09:59:36.017992	48.8861	2.3441	neighborhood
927c9419-b837-428e-9474-79c707453769	Encombrants abandonnés rue Paul-Albert	Une armoire démontée bloque la moitié du trottoir devant l'entrée de l'immeuble.	open	9d9d446c-f58d-4237-ba5a-163cbf3eddd6	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:36.036198	2026-07-19 09:59:36.036198	48.8871	2.3381	neighborhood
e42b410d-8354-428c-8ab9-30908443f14a	Photo de profil manifestement usurpée	La photo du profil est une image de banque d'images utilisée sur plusieurs autres comptes.	open	0c05a6eb-4191-4b8f-8a4e-e9489251eaee	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:36.075683	2026-07-19 09:59:36.075683	48.8871	2.3421	reporting
5a50b0d1-313d-4346-a56a-6b8518375e39	Propos discriminatoires dans une description d'annonce	L'annonce précise des critères d'exclusion sur l'origine des demandeurs.	open	f8f4a6d7-5239-40a9-b1cd-f5b98e347e18	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:36.09722	2026-07-19 09:59:36.09722	48.8871	2.3441	reporting
8a10c44d-1f70-4ffc-a34a-3ed5685ffd58	Contenu commercial déguisé en entraide	Une société de nettoyage publie ses prestations tarifées comme s'il s'agissait d'un échange.	open	faa4f168-5dfe-4683-b0dc-34cad4ab4928	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:36.116181	2026-07-19 09:59:36.116181	48.8881	2.3381	reporting
ba78def9-28a3-424b-85ed-a01eef603585	Le filtre par catégorie ne se réinitialise pas	Après un retour arrière, la liste reste filtrée alors que le sélecteur affiche « toutes ».	open	42a660bf-233e-45c9-81c3-947a509a44c1	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:36.134927	2026-07-19 09:59:36.134927	48.8881	2.3401	bug
a5a27ba1-c761-4801-9e2b-fec882039727	Impossible de téléverser une photo de plus de 5 Mo	L'envoi échoue sans message d'erreur, le formulaire reste bloqué sur l'indicateur de chargement.	open	542f9288-29cc-4675-8ed7-bb39c1f5929a	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:36.151973	2026-07-19 09:59:36.151973	48.8881	2.3421	bug
fb4038fb-d71d-42b5-bd9b-0bb18a288f6b	Pavés descellés rue des Rosiers	Une dizaine de pavés bougent sous les pieds au milieu de la rue piétonne.	open	c2df091d-67c9-4913-9a62-b0dc93d91089	6a5c9fdda6f783f8fe6b09d7	\N	2026-07-19 09:59:36.169714	2026-07-19 09:59:36.169714	\N	\N	neighborhood
edca7d56-9424-41ca-9521-ea7486a422ce	Annonce trompeuse sur un service de bricolage	Le tarif affiché ne correspond pas à celui annoncé une fois le contact établi.	open	7fcb5d30-9dd4-4b1a-8a6f-6b8c1f685e5e	6a5c9fdda6f783f8fe6b09d7	\N	2026-07-19 09:59:36.376642	2026-07-19 09:59:36.376642	\N	\N	reporting
377b5e94-0c42-46f1-8ccc-71090c3f96ce	Annonce suspecte : paiement demandé hors plateforme	Une annonce de bricolage renvoie vers un virement bancaire avant toute prestation.	in_progress	0b653a65-ed00-4bff-8363-87db61282945	6a5c9fdda6f783f8fe6b09d6	\N	2026-07-19 09:59:36.056893	2026-07-19 09:59:37.499	48.8871	2.3401	reporting
f37d008d-488c-4e3f-b6ec-c6aaf60b7a5c	Dépôt d'encombrants rue Mouffetard	Cageots et cartons entassés après le marché, non ramassés depuis deux jours.	resolved	3d383b6c-6a03-43e9-92ac-34fda017e104	6a5c9fdda6f783f8fe6b09d9	\N	2026-07-19 09:59:36.191005	2026-07-19 09:59:37.627	\N	\N	neighborhood
7f65cc61-e921-45f5-b201-1d5f9776767f	Marquage au sol effacé boulevard Richard-Lenoir	Le passage piéton n'est presque plus visible, notamment de nuit.	resolved	205eea65-1170-4b3b-a376-68931d39e971	6a5c9fdda6f783f8fe6b09db	\N	2026-07-19 09:59:36.20909	2026-07-19 09:59:37.642	\N	\N	neighborhood
de9bfca8-f584-4aa6-af48-c88a5f460f71	Faux profil de voisin	Le compte utilise une adresse qui ne correspond à aucun immeuble de la rue indiquée.	in_progress	c09230c8-c6b0-4e6f-8ebc-7f3249c6c5ec	6a5c9fdda6f783f8fe6b09db	\N	2026-07-19 09:59:36.681551	2026-07-19 09:59:37.675	\N	\N	reporting
9959a017-bfee-49de-8e01-0fcedebc725c	L'export PDF du contrat échoue	Le téléchargement démarre puis s'interrompt, le fichier obtenu fait zéro octet.	resolved	33feda5e-d072-44ab-9793-3d95a8ea87d5	6a5c9fdda6f783f8fe6b09da	\N	2026-07-19 09:59:36.978411	2026-07-19 09:59:37.694	\N	\N	bug
\.


--
-- Data for Name: points_balances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.points_balances (id, user_id, balance, updated_at) FROM stdin;
36a34c36-80fe-4b10-a190-94a77cd6d9cb	e9b6a3de-1139-47c6-b834-fa08f43850cb	20	2026-07-19 09:58:59.386294
db634ee7-3c94-4d57-8184-1e289128212b	84ec11af-7898-463a-8cca-525ac60cbf59	20	2026-07-19 09:58:59.526985
bf1f4ded-b4c0-40e9-aa14-95cccbd0c991	0c05a6eb-4191-4b8f-8a4e-e9489251eaee	20	2026-07-19 09:59:00.077168
1e49fbed-2d5b-4a18-bad2-b29e0a96cec0	f8f4a6d7-5239-40a9-b1cd-f5b98e347e18	20	2026-07-19 09:59:00.302727
2b74412a-2b1d-42a7-97e0-7e61503d5c51	42a660bf-233e-45c9-81c3-947a509a44c1	20	2026-07-19 09:59:00.538545
b954762d-5e63-461f-9c05-8238878c48b4	1287ce2e-8951-4d5f-ac5f-9c8bcbc4b1e0	20	2026-07-19 09:59:00.606966
614679dd-9066-4943-ad0e-5a891ca334b9	542f9288-29cc-4675-8ed7-bb39c1f5929a	20	2026-07-19 09:59:00.688734
8ac7ab29-d122-412d-a4ea-b11f29455b2e	1399ce7a-1294-4dfb-bfe7-0387c9b89431	20	2026-07-19 09:59:01.001289
cdea07e7-4b56-42d1-86f7-97500378080c	16850636-c1fa-4cf3-84c7-ad7664d6cad0	20	2026-07-19 09:59:01.293324
65e543f2-8359-447b-9a26-576831caecdf	f7b74913-40ac-495c-981e-e46bce8b4d2b	20	2026-07-19 09:59:01.370998
88bbd7c3-9052-4024-b096-77d41a496238	c2df091d-67c9-4913-9a62-b0dc93d91089	20	2026-07-19 09:59:01.446613
4e4ec909-a7f9-4b62-9dd7-7230a45f7f9a	7fcb5d30-9dd4-4b1a-8a6f-6b8c1f685e5e	20	2026-07-19 09:59:01.524407
0e167967-6e8d-4a41-9aa8-3f0877920c24	3c3a4d55-de41-4aab-92c5-ed692bba4c9b	20	2026-07-19 09:59:01.603188
69a85d71-a0b3-46c8-97a7-fbf6cffed957	31c286fe-e810-4610-994b-16bf85f4b896	20	2026-07-19 09:59:01.678261
4c1a326d-7836-42ba-838f-d2baf722ca56	3d383b6c-6a03-43e9-92ac-34fda017e104	20	2026-07-19 09:59:01.744404
d12f8676-30d3-41c2-9db5-826a659bf409	a4f76676-2a58-4081-809c-7c52f7035f52	20	2026-07-19 09:59:01.821526
99f808c1-473a-4a8a-b524-b3dd8092f22d	9d33a952-846f-4e64-90c1-95b8693cba19	20	2026-07-19 09:59:01.894958
47f11dac-ee71-4a40-bef0-82ccddb88247	33feda5e-d072-44ab-9793-3d95a8ea87d5	20	2026-07-19 09:59:01.974243
c9328559-91b9-4e65-903b-0bdb578f43b0	205eea65-1170-4b3b-a376-68931d39e971	20	2026-07-19 09:59:02.042703
64bd00cf-d400-49b1-babf-8636e250e4ed	c09230c8-c6b0-4e6f-8ebc-7f3249c6c5ec	20	2026-07-19 09:59:02.116803
49a32fe1-e408-4596-8d47-79648af21b6c	b1a43198-1fa6-4045-9731-b6a02dc1e1aa	20	2026-07-19 09:59:02.194723
6226b923-1f74-4d2f-9e85-ed2d9e18d98e	28d0c40a-0f51-4754-8ca9-a9ea9c0c7799	20	2026-07-19 09:59:02.277698
ef39187e-908d-4d77-920b-1fe9beea7e79	21b7538b-ed2b-446d-b042-03ab835595e6	20	2026-07-19 09:59:02.341202
d3a83e7f-5c35-4429-a166-db118fb7b65c	66ec6d9d-19df-470b-8a2f-c14dcf32c9a2	20	2026-07-19 09:59:02.425829
998a18eb-f3ba-416f-8cc5-494e11e173df	bfdee603-ddfa-4297-b6e4-d00fe76abc43	20	2026-07-19 09:59:02.505067
57b1833e-4da0-46d3-bc2a-ad173b88d774	748db717-7aa9-4aae-b444-c1ca530f29b4	20	2026-07-19 09:59:02.584661
9a1609fd-e9c0-4f7e-9b92-e3031df214e3	9f590f91-ff38-4388-9e5c-c30bf1b8d63a	20	2026-07-19 09:59:02.657615
a5ceb25d-2dae-43c6-a52d-d752f3d816bd	d0f005ee-d44a-4445-a518-aa8118e9e663	20	2026-07-19 09:59:02.742017
62c3c729-4d7b-4957-867e-8ca5382d7544	5d9f0169-e33f-4fe7-8154-d085cda50715	20	2026-07-19 09:59:02.821211
e1a966c0-c40d-4f3f-87ce-823b2ad84f9b	57dd4f53-c362-46ef-9938-16bc07c7473a	20	2026-07-19 09:59:02.899139
6abf61b0-28b2-4624-b207-e37f6e881f4a	f35b7a44-db30-431a-88f1-30439aa401f7	20	2026-07-19 09:59:02.978532
8f301822-9a03-45d7-85d7-8567154982f7	a782092a-7430-42b3-b001-601e4f564898	20	2026-07-19 09:59:03.06031
54f09fab-47e5-4ce6-8fae-e60cd063620e	2486a27c-916b-4892-9ed9-bc4787cb695a	20	2026-07-19 09:59:03.137424
ce5b1aa2-e45f-4936-bca6-aa1a1b5cd355	f3d8ad6f-e1e8-4fe5-bbfa-2d2177efc1e8	20	2026-07-19 09:59:03.219471
a6649dd9-93a2-4ae2-9c82-07ac464b36b9	f86965ae-3b42-467d-8f48-aecf8fce871a	20	2026-07-19 09:59:03.303467
076c06fb-4db3-4dd7-b476-491eb6fb5a81	70fcb658-b518-48a5-ae8a-4ccbab74eb7b	20	2026-07-19 09:59:03.378317
da3f3566-3011-49b1-b0ef-6a69210229d8	744483cd-223b-4f68-9dda-6b70abc651fe	20	2026-07-19 09:59:03.445121
615458ec-2289-44b5-9282-6e0bca01f1a5	82461612-354a-4abe-8cd5-d420d1391317	20	2026-07-19 09:59:03.529047
af7ecd3e-caff-4f33-af59-f71ae5399063	e6de4f49-8147-4dfd-afed-86ba3ef09d04	20	2026-07-19 09:59:03.581423
c6d01016-bf82-4442-b8d1-bb9d321cc4c9	62082a58-9ce1-40f5-b385-aa4fea5626d7	20	2026-07-19 09:59:03.650411
9d973a5b-7c58-4606-b18b-ea5e824a4eab	69bd7ba6-c2a1-4879-bc4d-dc11ff000840	20	2026-07-19 09:59:03.717157
6708f506-5785-411a-b51f-16ff21d00232	b1b6f3ac-3443-43b4-ae30-2c8efcc53342	20	2026-07-19 09:59:03.785374
5801ee0d-46e8-4a51-89c0-da4667b432c4	1382facf-b506-4f8d-be57-77e87c4dcc34	20	2026-07-19 09:59:03.851286
393ee4fd-3695-4627-b94a-1c0c5881c565	7ad9509e-7707-469e-b4d6-7730d759b6f1	20	2026-07-19 09:59:03.923403
d87f7c6f-b502-468b-9bc8-49c81a00c22d	9cf9caf9-2a1f-41eb-bc93-cabb8aa03ff0	20	2026-07-19 09:59:03.996035
393895d7-0359-47ca-9c71-2fb19b104939	16ec1c31-bab5-43fc-8630-d48d60a04a00	20	2026-07-19 09:59:04.068546
1e5aa017-a22b-4610-ae68-c0ad39f114ea	cf7d045f-2bd3-4ea4-bff2-ea1952fbe942	20	2026-07-19 09:59:04.134133
c8d9d087-abb6-4877-a4c0-b7f29ef9a6b6	ee6ef32e-e03d-4c0a-9c8b-33cf0d043792	20	2026-07-19 09:59:04.216955
ba946d45-0b53-4011-bb25-d3b5ec976053	5799641d-4f77-4b46-83e2-a66347a96d8d	20	2026-07-19 09:59:04.290619
e4e8786f-91da-441a-94a6-25c0acc7f19e	81ae1a8b-7506-4c09-9424-9d19656cd160	20	2026-07-19 09:59:04.364861
deae825b-bc4a-48b6-9030-c4af28567d0d	9d9d446c-f58d-4237-ba5a-163cbf3eddd6	18	2026-07-19 10:16:31.595
fd37a8d0-2044-4703-82dd-02942628e3f1	f7025b74-7036-4140-890d-85eecf174883	16	2026-07-19 10:16:31.8
a0f36924-45bb-499d-b049-8f7c4bd9c7bd	93445062-fc71-4130-be5c-bd7ad9661bf2	24	2026-07-19 10:16:31.801
578b81c0-6f1d-4b79-ac5a-9ca79b267dac	4de869de-be0a-47b9-9f6a-772041cdc24f	18	2026-07-19 10:16:31.871
ae598357-419b-4df6-84b8-4064796b1650	51b9e03e-0681-453b-b96d-a0a71b6cf2d8	22	2026-07-19 10:16:31.872
a86f0cef-60c3-4d18-8a03-b713202bb14f	faa4f168-5dfe-4683-b0dc-34cad4ab4928	16	2026-07-19 10:17:01.053
921e35d0-75ab-481d-bc68-f6acc9ce2523	a1476d02-7f97-4d44-8546-4debcf9ca26c	18	2026-07-19 10:17:01.114
edd410d7-ef11-4ead-a52f-e1748430ce85	a7febe13-1bc7-427d-8a44-e3b3a2e62c8d	16	2026-07-19 10:17:01.159
85b7f564-7c8c-4802-9357-4c3cb4bed277	8f1be472-8d4c-40ec-bb31-6464b435975a	18	2026-07-19 10:17:01.2
af7e6ee7-436e-4e9b-94d5-c99c40939c30	b8b1125d-d27b-47dc-98ae-7150ffcb0fe3	18	2026-07-19 10:17:31.104
07882a4f-0afc-4a3b-8adc-5f71f238449f	4b0f4b82-9992-4280-acd4-2eb871f90c15	26	2026-07-19 10:17:31.105
ede0dc37-c23c-421d-ae50-ef753a7d6356	58b3df0d-2a0b-4f08-96f3-e0924d250b89	16	2026-07-19 10:17:31.134
8a3324f0-746b-4de0-94b1-ad8abeddf3af	f1f39ac2-ded1-4435-8d9c-1323c17b7764	32	2026-07-19 10:17:31.135
a7689c74-2766-42f8-882b-b3e9aa66fa37	fac2acc3-190b-43cd-baed-122358be1259	18	2026-07-19 10:17:31.177
bf4ad217-ef4a-4f4c-99eb-6c0da9b54c80	0b653a65-ed00-4bff-8363-87db61282945	18	2026-07-19 10:18:01.029
b15aa0c9-e81f-4b87-9a25-3697d7e8d733	98b72c78-8549-4aac-874c-c19391150b07	26	2026-07-19 10:18:01.031
\.


--
-- Data for Name: points_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.points_transactions (id, sender_id, recipient_id, amount, note, created_at, contract_id, type, status, completed_at) FROM stdin;
e135bff8-eb3b-4538-9d42-bf210ed02ea3	5799641d-4f77-4b46-83e2-a66347a96d8d	0b653a65-ed00-4bff-8363-87db61282945	20	Crédit de bienvenue	2026-07-19 09:58:43.430039	\N	bonus	completed	2026-07-19 09:58:43.430039
e9628c5e-bc2b-42d0-b5b8-61263b7060d4	5799641d-4f77-4b46-83e2-a66347a96d8d	e9b6a3de-1139-47c6-b834-fa08f43850cb	20	Crédit de bienvenue	2026-07-19 09:58:43.601589	\N	bonus	completed	2026-07-19 09:58:43.601589
34bf34d1-827f-4f2e-bc7e-7ab70e7d6935	5799641d-4f77-4b46-83e2-a66347a96d8d	4de869de-be0a-47b9-9f6a-772041cdc24f	20	Crédit de bienvenue	2026-07-19 09:58:43.764083	\N	bonus	completed	2026-07-19 09:58:43.764083
8805091c-488d-456c-8835-0ce5567dd7bf	5799641d-4f77-4b46-83e2-a66347a96d8d	84ec11af-7898-463a-8cca-525ac60cbf59	20	Crédit de bienvenue	2026-07-19 09:58:43.919599	\N	bonus	completed	2026-07-19 09:58:43.919599
6ed4f458-9ed0-4e7a-be79-cdf624204f9a	5799641d-4f77-4b46-83e2-a66347a96d8d	93445062-fc71-4130-be5c-bd7ad9661bf2	20	Crédit de bienvenue	2026-07-19 09:58:44.083146	\N	bonus	completed	2026-07-19 09:58:44.083146
1a403bd7-cf51-4ceb-b98b-d2e1f7a6b05e	5799641d-4f77-4b46-83e2-a66347a96d8d	4b0f4b82-9992-4280-acd4-2eb871f90c15	20	Crédit de bienvenue	2026-07-19 09:58:44.22352	\N	bonus	completed	2026-07-19 09:58:44.22352
ca54c571-d6d6-4397-912b-9ee4bacbec49	5799641d-4f77-4b46-83e2-a66347a96d8d	9d9d446c-f58d-4237-ba5a-163cbf3eddd6	20	Crédit de bienvenue	2026-07-19 09:58:44.369675	\N	bonus	completed	2026-07-19 09:58:44.369675
f4595090-1114-4b53-a33d-e149efa9c55f	5799641d-4f77-4b46-83e2-a66347a96d8d	8f1be472-8d4c-40ec-bb31-6464b435975a	20	Crédit de bienvenue	2026-07-19 09:58:44.517871	\N	bonus	completed	2026-07-19 09:58:44.517871
5edd2511-fb76-447d-9d6d-ffb057e5925b	5799641d-4f77-4b46-83e2-a66347a96d8d	fac2acc3-190b-43cd-baed-122358be1259	20	Crédit de bienvenue	2026-07-19 09:58:44.663511	\N	bonus	completed	2026-07-19 09:58:44.663511
49fed790-a5a3-4baf-994e-3515cce5c5a8	5799641d-4f77-4b46-83e2-a66347a96d8d	0c05a6eb-4191-4b8f-8a4e-e9489251eaee	20	Crédit de bienvenue	2026-07-19 09:58:44.801724	\N	bonus	completed	2026-07-19 09:58:44.801724
f472e097-c2d1-4a13-b514-e241ff07276d	5799641d-4f77-4b46-83e2-a66347a96d8d	f7025b74-7036-4140-890d-85eecf174883	20	Crédit de bienvenue	2026-07-19 09:58:44.957462	\N	bonus	completed	2026-07-19 09:58:44.957462
09f10028-8aa9-4003-8f79-2016bc037de2	5799641d-4f77-4b46-83e2-a66347a96d8d	f8f4a6d7-5239-40a9-b1cd-f5b98e347e18	20	Crédit de bienvenue	2026-07-19 09:58:45.10992	\N	bonus	completed	2026-07-19 09:58:45.10992
2e5505eb-fb77-4a62-8769-b6a05df2f360	5799641d-4f77-4b46-83e2-a66347a96d8d	a1476d02-7f97-4d44-8546-4debcf9ca26c	20	Crédit de bienvenue	2026-07-19 09:58:45.248009	\N	bonus	completed	2026-07-19 09:58:45.248009
25d7fcba-edf0-40aa-8240-29c0980f0eed	5799641d-4f77-4b46-83e2-a66347a96d8d	faa4f168-5dfe-4683-b0dc-34cad4ab4928	20	Crédit de bienvenue	2026-07-19 09:58:45.407592	\N	bonus	completed	2026-07-19 09:58:45.407592
bfe833d0-a930-40ac-97e3-d3c3eda60f70	5799641d-4f77-4b46-83e2-a66347a96d8d	42a660bf-233e-45c9-81c3-947a509a44c1	20	Crédit de bienvenue	2026-07-19 09:58:45.541419	\N	bonus	completed	2026-07-19 09:58:45.541419
edf23fec-8641-4824-9a92-596ca2ff682f	5799641d-4f77-4b46-83e2-a66347a96d8d	1287ce2e-8951-4d5f-ac5f-9c8bcbc4b1e0	20	Crédit de bienvenue	2026-07-19 09:58:45.66325	\N	bonus	completed	2026-07-19 09:58:45.66325
0978cf36-d712-459f-b079-c45a34ef42d1	5799641d-4f77-4b46-83e2-a66347a96d8d	542f9288-29cc-4675-8ed7-bb39c1f5929a	20	Crédit de bienvenue	2026-07-19 09:58:45.794679	\N	bonus	completed	2026-07-19 09:58:45.794679
5803c7a9-9f0c-46e5-8e70-6550be3b535e	5799641d-4f77-4b46-83e2-a66347a96d8d	51b9e03e-0681-453b-b96d-a0a71b6cf2d8	20	Crédit de bienvenue	2026-07-19 09:58:45.917891	\N	bonus	completed	2026-07-19 09:58:45.917891
497e1cef-f3a2-4ef6-817f-86bdbb81e16b	5799641d-4f77-4b46-83e2-a66347a96d8d	f1f39ac2-ded1-4435-8d9c-1323c17b7764	20	Crédit de bienvenue	2026-07-19 09:58:46.055765	\N	bonus	completed	2026-07-19 09:58:46.055765
f9099b37-bc08-4b20-8aab-6e168e01e922	5799641d-4f77-4b46-83e2-a66347a96d8d	98b72c78-8549-4aac-874c-c19391150b07	20	Crédit de bienvenue	2026-07-19 09:58:46.184361	\N	bonus	completed	2026-07-19 09:58:46.184361
f4b1b8c7-a548-47a2-b8eb-3dc33b195128	5799641d-4f77-4b46-83e2-a66347a96d8d	1399ce7a-1294-4dfb-bfe7-0387c9b89431	20	Crédit de bienvenue	2026-07-19 09:58:46.326406	\N	bonus	completed	2026-07-19 09:58:46.326406
79d61e7b-d4ab-4a77-9c90-de96d1de5e7a	5799641d-4f77-4b46-83e2-a66347a96d8d	b8b1125d-d27b-47dc-98ae-7150ffcb0fe3	20	Crédit de bienvenue	2026-07-19 09:58:46.489229	\N	bonus	completed	2026-07-19 09:58:46.489229
0e541068-1d0e-4ea5-bb79-476211deaa26	5799641d-4f77-4b46-83e2-a66347a96d8d	a7febe13-1bc7-427d-8a44-e3b3a2e62c8d	20	Crédit de bienvenue	2026-07-19 09:58:46.621222	\N	bonus	completed	2026-07-19 09:58:46.621222
790daccb-2ff5-4fa7-a939-f022380300b6	5799641d-4f77-4b46-83e2-a66347a96d8d	58b3df0d-2a0b-4f08-96f3-e0924d250b89	20	Crédit de bienvenue	2026-07-19 09:58:46.755078	\N	bonus	completed	2026-07-19 09:58:46.755078
4f745871-adf9-400c-943b-7c2863d5ab2b	5799641d-4f77-4b46-83e2-a66347a96d8d	16850636-c1fa-4cf3-84c7-ad7664d6cad0	20	Crédit de bienvenue	2026-07-19 09:58:46.899987	\N	bonus	completed	2026-07-19 09:58:46.899987
6cc76911-edae-4bde-a9e8-058aac4b8401	5799641d-4f77-4b46-83e2-a66347a96d8d	f7b74913-40ac-495c-981e-e46bce8b4d2b	20	Crédit de bienvenue	2026-07-19 09:58:47.048148	\N	bonus	completed	2026-07-19 09:58:47.048148
d0cbaf2d-b7d3-4cc1-9945-e6e58554e7e8	5799641d-4f77-4b46-83e2-a66347a96d8d	c2df091d-67c9-4913-9a62-b0dc93d91089	20	Crédit de bienvenue	2026-07-19 09:58:47.198803	\N	bonus	completed	2026-07-19 09:58:47.198803
38bd5b2b-1bac-498d-aa54-1d392744fae7	5799641d-4f77-4b46-83e2-a66347a96d8d	7fcb5d30-9dd4-4b1a-8a6f-6b8c1f685e5e	20	Crédit de bienvenue	2026-07-19 09:58:47.362876	\N	bonus	completed	2026-07-19 09:58:47.362876
16143a0c-6209-4823-9024-60c1c014eb3f	5799641d-4f77-4b46-83e2-a66347a96d8d	3c3a4d55-de41-4aab-92c5-ed692bba4c9b	20	Crédit de bienvenue	2026-07-19 09:58:47.517633	\N	bonus	completed	2026-07-19 09:58:47.517633
cbe95b7f-a166-426b-82c2-3aff4c69c948	5799641d-4f77-4b46-83e2-a66347a96d8d	31c286fe-e810-4610-994b-16bf85f4b896	20	Crédit de bienvenue	2026-07-19 09:58:47.658777	\N	bonus	completed	2026-07-19 09:58:47.658777
8b3bdd27-e568-4753-b7f8-232c7f2a7590	5799641d-4f77-4b46-83e2-a66347a96d8d	3d383b6c-6a03-43e9-92ac-34fda017e104	20	Crédit de bienvenue	2026-07-19 09:58:47.798319	\N	bonus	completed	2026-07-19 09:58:47.798319
c1d45c9f-485a-4ab9-8747-79f2cef9a32c	5799641d-4f77-4b46-83e2-a66347a96d8d	a4f76676-2a58-4081-809c-7c52f7035f52	20	Crédit de bienvenue	2026-07-19 09:58:47.92435	\N	bonus	completed	2026-07-19 09:58:47.92435
8e6ecf9c-aec8-431b-9550-de4960a2a82c	5799641d-4f77-4b46-83e2-a66347a96d8d	9d33a952-846f-4e64-90c1-95b8693cba19	20	Crédit de bienvenue	2026-07-19 09:58:48.084462	\N	bonus	completed	2026-07-19 09:58:48.084462
ac8efef1-2ebf-4885-ba56-c916733baaf4	5799641d-4f77-4b46-83e2-a66347a96d8d	33feda5e-d072-44ab-9793-3d95a8ea87d5	20	Crédit de bienvenue	2026-07-19 09:58:48.226997	\N	bonus	completed	2026-07-19 09:58:48.226997
447aa81d-035c-4fb4-ab81-74e011a53dd6	5799641d-4f77-4b46-83e2-a66347a96d8d	205eea65-1170-4b3b-a376-68931d39e971	20	Crédit de bienvenue	2026-07-19 09:58:48.376345	\N	bonus	completed	2026-07-19 09:58:48.376345
30f79c45-55e8-4a9c-badb-f788b015a46a	5799641d-4f77-4b46-83e2-a66347a96d8d	c09230c8-c6b0-4e6f-8ebc-7f3249c6c5ec	20	Crédit de bienvenue	2026-07-19 09:58:48.526216	\N	bonus	completed	2026-07-19 09:58:48.526216
4fd51747-006f-45b4-9e16-af876bf649d5	5799641d-4f77-4b46-83e2-a66347a96d8d	b1a43198-1fa6-4045-9731-b6a02dc1e1aa	20	Crédit de bienvenue	2026-07-19 09:58:48.674856	\N	bonus	completed	2026-07-19 09:58:48.674856
2f8e19b3-1fae-48d9-8adc-2e9f09f6ae36	5799641d-4f77-4b46-83e2-a66347a96d8d	28d0c40a-0f51-4754-8ca9-a9ea9c0c7799	20	Crédit de bienvenue	2026-07-19 09:58:48.808228	\N	bonus	completed	2026-07-19 09:58:48.808228
6e0dbe22-bad0-470b-bede-2fda0e585c69	5799641d-4f77-4b46-83e2-a66347a96d8d	21b7538b-ed2b-446d-b042-03ab835595e6	20	Crédit de bienvenue	2026-07-19 09:58:48.957914	\N	bonus	completed	2026-07-19 09:58:48.957914
d4caa757-a853-4cd9-b09c-9b0c8a2a7a04	5799641d-4f77-4b46-83e2-a66347a96d8d	66ec6d9d-19df-470b-8a2f-c14dcf32c9a2	20	Crédit de bienvenue	2026-07-19 09:58:49.109562	\N	bonus	completed	2026-07-19 09:58:49.109562
8b8a076b-2dd6-4d2a-bace-8118a50f0648	5799641d-4f77-4b46-83e2-a66347a96d8d	bfdee603-ddfa-4297-b6e4-d00fe76abc43	20	Crédit de bienvenue	2026-07-19 09:58:49.254063	\N	bonus	completed	2026-07-19 09:58:49.254063
c0699ca4-b7c7-4c9c-8e4d-9647d2e17018	5799641d-4f77-4b46-83e2-a66347a96d8d	748db717-7aa9-4aae-b444-c1ca530f29b4	20	Crédit de bienvenue	2026-07-19 09:58:49.407642	\N	bonus	completed	2026-07-19 09:58:49.407642
6fd31e7d-a3a5-4675-b1a3-3704b766cd2e	5799641d-4f77-4b46-83e2-a66347a96d8d	9f590f91-ff38-4388-9e5c-c30bf1b8d63a	20	Crédit de bienvenue	2026-07-19 09:58:49.548439	\N	bonus	completed	2026-07-19 09:58:49.548439
2266f247-a383-4d94-9e68-1e2a69ece3b1	5799641d-4f77-4b46-83e2-a66347a96d8d	d0f005ee-d44a-4445-a518-aa8118e9e663	20	Crédit de bienvenue	2026-07-19 09:58:49.696174	\N	bonus	completed	2026-07-19 09:58:49.696174
1e07acb0-7581-4814-8cea-fb3d476e403b	5799641d-4f77-4b46-83e2-a66347a96d8d	5d9f0169-e33f-4fe7-8154-d085cda50715	20	Crédit de bienvenue	2026-07-19 09:58:49.829221	\N	bonus	completed	2026-07-19 09:58:49.829221
110344e2-bce2-4737-9829-499950e3705f	5799641d-4f77-4b46-83e2-a66347a96d8d	57dd4f53-c362-46ef-9938-16bc07c7473a	20	Crédit de bienvenue	2026-07-19 09:58:49.974664	\N	bonus	completed	2026-07-19 09:58:49.974664
6018099e-99a9-4674-808a-f53508d73191	5799641d-4f77-4b46-83e2-a66347a96d8d	f35b7a44-db30-431a-88f1-30439aa401f7	20	Crédit de bienvenue	2026-07-19 09:58:50.118732	\N	bonus	completed	2026-07-19 09:58:50.118732
d70a7a0e-cf2e-48b4-bb91-96f9beb8813e	5799641d-4f77-4b46-83e2-a66347a96d8d	a782092a-7430-42b3-b001-601e4f564898	20	Crédit de bienvenue	2026-07-19 09:58:50.240605	\N	bonus	completed	2026-07-19 09:58:50.240605
45d5b6e9-7944-4a71-ac92-b5393ab48abd	5799641d-4f77-4b46-83e2-a66347a96d8d	2486a27c-916b-4892-9ed9-bc4787cb695a	20	Crédit de bienvenue	2026-07-19 09:58:50.380284	\N	bonus	completed	2026-07-19 09:58:50.380284
07b8d481-d5cc-4633-90f6-d03c53e43e3a	5799641d-4f77-4b46-83e2-a66347a96d8d	f3d8ad6f-e1e8-4fe5-bbfa-2d2177efc1e8	20	Crédit de bienvenue	2026-07-19 09:58:50.519405	\N	bonus	completed	2026-07-19 09:58:50.519405
0a81a258-20d2-45d7-9dfc-de387b4a2ab0	5799641d-4f77-4b46-83e2-a66347a96d8d	f86965ae-3b42-467d-8f48-aecf8fce871a	20	Crédit de bienvenue	2026-07-19 09:58:50.655326	\N	bonus	completed	2026-07-19 09:58:50.655326
c8dc624d-2775-4061-8edf-f8a1c66eb128	5799641d-4f77-4b46-83e2-a66347a96d8d	70fcb658-b518-48a5-ae8a-4ccbab74eb7b	20	Crédit de bienvenue	2026-07-19 09:58:50.796812	\N	bonus	completed	2026-07-19 09:58:50.796812
48ea76cf-45bb-4a79-b50a-354bc6aa76e9	5799641d-4f77-4b46-83e2-a66347a96d8d	744483cd-223b-4f68-9dda-6b70abc651fe	20	Crédit de bienvenue	2026-07-19 09:58:50.948542	\N	bonus	completed	2026-07-19 09:58:50.948542
aad54470-322c-4cd7-810e-012f466930cf	5799641d-4f77-4b46-83e2-a66347a96d8d	82461612-354a-4abe-8cd5-d420d1391317	20	Crédit de bienvenue	2026-07-19 09:58:51.098277	\N	bonus	completed	2026-07-19 09:58:51.098277
e14e1fd9-61f7-42bd-a085-c6461afbce2c	5799641d-4f77-4b46-83e2-a66347a96d8d	e6de4f49-8147-4dfd-afed-86ba3ef09d04	20	Crédit de bienvenue	2026-07-19 09:58:51.255171	\N	bonus	completed	2026-07-19 09:58:51.255171
53a570bd-218e-4826-854b-2234066e31aa	5799641d-4f77-4b46-83e2-a66347a96d8d	62082a58-9ce1-40f5-b385-aa4fea5626d7	20	Crédit de bienvenue	2026-07-19 09:58:51.399012	\N	bonus	completed	2026-07-19 09:58:51.399012
994f8424-5af8-4f77-83d7-564a2fe4b7f1	5799641d-4f77-4b46-83e2-a66347a96d8d	69bd7ba6-c2a1-4879-bc4d-dc11ff000840	20	Crédit de bienvenue	2026-07-19 09:58:51.553624	\N	bonus	completed	2026-07-19 09:58:51.553624
33b5655f-7611-4f83-a52c-90253892ce42	5799641d-4f77-4b46-83e2-a66347a96d8d	b1b6f3ac-3443-43b4-ae30-2c8efcc53342	20	Crédit de bienvenue	2026-07-19 09:58:51.696099	\N	bonus	completed	2026-07-19 09:58:51.696099
00a8b5cd-a7d6-426b-b37b-b31fc29c7a9e	5799641d-4f77-4b46-83e2-a66347a96d8d	1382facf-b506-4f8d-be57-77e87c4dcc34	20	Crédit de bienvenue	2026-07-19 09:58:51.837769	\N	bonus	completed	2026-07-19 09:58:51.837769
1e35a956-f105-4c04-afdd-6ef3150796e0	5799641d-4f77-4b46-83e2-a66347a96d8d	7ad9509e-7707-469e-b4d6-7730d759b6f1	20	Crédit de bienvenue	2026-07-19 09:58:51.968799	\N	bonus	completed	2026-07-19 09:58:51.968799
709063da-3e6a-4293-ba0d-9a4ab2840c1b	5799641d-4f77-4b46-83e2-a66347a96d8d	9cf9caf9-2a1f-41eb-bc93-cabb8aa03ff0	20	Crédit de bienvenue	2026-07-19 09:58:52.102098	\N	bonus	completed	2026-07-19 09:58:52.102098
d0288145-0693-4a00-96ab-d0d7ddeac65d	5799641d-4f77-4b46-83e2-a66347a96d8d	16ec1c31-bab5-43fc-8630-d48d60a04a00	20	Crédit de bienvenue	2026-07-19 09:58:52.252265	\N	bonus	completed	2026-07-19 09:58:52.252265
83a16d7a-faf9-46d7-b1c3-2938e0f34f6e	5799641d-4f77-4b46-83e2-a66347a96d8d	cf7d045f-2bd3-4ea4-bff2-ea1952fbe942	20	Crédit de bienvenue	2026-07-19 09:58:52.39033	\N	bonus	completed	2026-07-19 09:58:52.39033
6384f787-96dc-4e50-8e92-68b3bc7980a1	5799641d-4f77-4b46-83e2-a66347a96d8d	ee6ef32e-e03d-4c0a-9c8b-33cf0d043792	20	Crédit de bienvenue	2026-07-19 09:58:52.528497	\N	bonus	completed	2026-07-19 09:58:52.528497
146cfcb5-b55a-46ef-9c0f-220870caf7b4	5799641d-4f77-4b46-83e2-a66347a96d8d	5799641d-4f77-4b46-83e2-a66347a96d8d	20	Crédit de bienvenue	2026-07-19 09:58:53.514388	\N	bonus	completed	2026-07-19 09:58:53.514388
d589d04e-ce66-4f70-b7e1-6aca2811162a	5799641d-4f77-4b46-83e2-a66347a96d8d	81ae1a8b-7506-4c09-9424-9d19656cd160	20	Crédit de bienvenue	2026-07-19 09:58:53.656714	\N	bonus	completed	2026-07-19 09:58:53.656714
c5c2b6b3-5cfe-4708-9daa-f13d3e055bcd	fac2acc3-190b-43cd-baed-122358be1259	0b653a65-ed00-4bff-8363-87db61282945	3	Service payment: Initiation à la photo numérique	2026-07-19 10:16:10.794607	6a5ca3ea76d969f391133134	service_payment	pending	\N
2d8ab8c5-2adc-4bf4-874e-19aee16a90bc	42a660bf-233e-45c9-81c3-947a509a44c1	0b653a65-ed00-4bff-8363-87db61282945	3	Service payment: Cours de jardinage sur balcon	2026-07-19 10:16:10.882282	6a5ca3ea76d969f39113313a	service_payment	pending	\N
7e9f1676-536b-4106-b6c1-24c154e0dc8b	0b653a65-ed00-4bff-8363-87db61282945	0c05a6eb-4191-4b8f-8a4e-e9489251eaee	6	Service payment: Aide au déménagement de petit volume	2026-07-19 10:16:11.062483	6a5ca3eb76d969f39113313d	service_payment	pending	\N
fd014af9-091e-4aff-bbd0-88a6ab684530	1287ce2e-8951-4d5f-ac5f-9c8bcbc4b1e0	e9b6a3de-1139-47c6-b834-fa08f43850cb	3	Service payment: Montage de meubles en kit	2026-07-19 10:16:31.202819	6a5ca3ff76d969f391133164	service_payment	pending	\N
92e1d34a-0ebd-4c7a-8811-be5cafcde17b	542f9288-29cc-4675-8ed7-bb39c1f5929a	42a660bf-233e-45c9-81c3-947a509a44c1	8	Service payment: Recherche baby-sitter pour une soirée	2026-07-19 10:16:31.238464	6a5ca3ff76d969f391133167	service_payment	pending	\N
474a470d-dec4-47b0-b009-faba61de509e	0b653a65-ed00-4bff-8363-87db61282945	3c3a4d55-de41-4aab-92c5-ed692bba4c9b	3	Service payment: Cours de cuisine végétarienne	2026-07-19 10:16:11.37109	6a5ca3eb76d969f391133140	service_payment	cancelled	\N
0b1f437a-30bf-4766-bb37-21ce057d6895	9d9d446c-f58d-4237-ba5a-163cbf3eddd6	4b0f4b82-9992-4280-acd4-2eb871f90c15	2	Service payment: Dépannage informatique à domicile	2026-07-19 10:16:11.857377	6a5ca3eb76d969f391133149	service_payment	completed	2026-07-19 10:16:31.598
50f09287-6d6f-4c98-b705-bc3b9da9dfda	f7025b74-7036-4140-890d-85eecf174883	93445062-fc71-4130-be5c-bd7ad9661bf2	4	Service payment: Garde d'enfants après l'école	2026-07-19 10:16:12.201101	6a5ca3ec76d969f39113315e	service_payment	completed	2026-07-19 10:16:31.801
22999fab-16d4-488a-bf72-149e4f4a2a20	4de869de-be0a-47b9-9f6a-772041cdc24f	51b9e03e-0681-453b-b96d-a0a71b6cf2d8	2	Service payment: Conversation en anglais autour d'un café	2026-07-19 10:16:12.235303	6a5ca3ec76d969f391133161	service_payment	completed	2026-07-19 10:16:31.873
810f5dd4-dc60-49e8-b79f-8807558496f2	faa4f168-5dfe-4683-b0dc-34cad4ab4928	0b653a65-ed00-4bff-8363-87db61282945	4	Service payment: Préparation de repas maison pour la semaine	2026-07-19 10:16:10.850826	6a5ca3ea76d969f391133137	service_payment	completed	2026-07-19 10:17:01.055
f8f32fdb-8252-4fb6-aecf-c15afe896069	a1476d02-7f97-4d44-8546-4debcf9ca26c	4b0f4b82-9992-4280-acd4-2eb871f90c15	2	Service payment: Dépannage informatique à domicile	2026-07-19 10:16:11.889745	6a5ca3eb76d969f39113314c	service_payment	completed	2026-07-19 10:17:01.117
88e350f4-10a3-4d05-bd38-d7d36ff97a09	a7febe13-1bc7-427d-8a44-e3b3a2e62c8d	f1f39ac2-ded1-4435-8d9c-1323c17b7764	4	Service payment: Peinture de petites surfaces	2026-07-19 10:16:11.950326	6a5ca3eb76d969f391133152	service_payment	completed	2026-07-19 10:17:01.162
a1b19498-beed-486b-82f2-429594d69d16	8f1be472-8d4c-40ec-bb31-6464b435975a	98b72c78-8549-4aac-874c-c19391150b07	2	Service payment: Transport de courses lourdes jusqu'à l'étage	2026-07-19 10:16:12.019238	6a5ca3ec76d969f391133158	service_payment	completed	2026-07-19 10:17:01.203
56b845b8-7087-4ed9-94a1-0d51e91d9e7e	0b653a65-ed00-4bff-8363-87db61282945	f1f39ac2-ded1-4435-8d9c-1323c17b7764	4	Service payment: Peinture de petites surfaces	2026-07-19 10:16:11.539428	6a5ca3eb76d969f391133143	service_payment	completed	2026-07-19 10:17:31.054
948f9016-b40a-4358-926b-445ce52c46f6	b8b1125d-d27b-47dc-98ae-7150ffcb0fe3	4b0f4b82-9992-4280-acd4-2eb871f90c15	2	Service payment: Dépannage informatique à domicile	2026-07-19 10:16:11.919717	6a5ca3eb76d969f39113314f	service_payment	completed	2026-07-19 10:17:31.106
7bb80efe-c00d-453b-b290-f0903fa27e55	58b3df0d-2a0b-4f08-96f3-e0924d250b89	f1f39ac2-ded1-4435-8d9c-1323c17b7764	4	Service payment: Peinture de petites surfaces	2026-07-19 10:16:11.98467	6a5ca3eb76d969f391133155	service_payment	completed	2026-07-19 10:17:31.137
a61989df-89a2-490b-a75c-7d11505242f1	fac2acc3-190b-43cd-baed-122358be1259	98b72c78-8549-4aac-874c-c19391150b07	2	Service payment: Transport de courses lourdes jusqu'à l'étage	2026-07-19 10:16:12.051242	6a5ca3ec76d969f39113315b	service_payment	completed	2026-07-19 10:17:31.181
d15f47fd-8b71-4831-a76a-ba25c6422328	0b653a65-ed00-4bff-8363-87db61282945	98b72c78-8549-4aac-874c-c19391150b07	2	Service payment: Transport de courses lourdes jusqu'à l'étage	2026-07-19 10:16:11.696395	6a5ca3eb76d969f391133146	service_payment	completed	2026-07-19 10:18:01.033
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
1399ce7a-1294-4dfb-bfe7-0387c9b89431	elodie.blanchard@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$hGPhcyBFiDMh4Yvn/Fe74g$D6WoTyOaMMTgbFsqdeIid7GrI6lci87MDv6eC8XAKws	ABW4HV2PND3XVQGCTW3RUNJP6TJTSUQQ	resident	$argon2id$v=19$m=65536,t=3,p=4$Hr7t54s2AdnE1UMY0uAgtw$OJy6U9fY/axX4GsVLpjlJRjxCbKkT6jirE5G+541MYQ	2026-07-19 09:58:46.326406	2026-07-19 09:58:46.326406	Élodie	Blanchard	\N	6a5c9fdda6f783f8fe6b09d6	88 rue Doudeauville, 75018 Paris	48.889	2.3418	\N	\N
8f1be472-8d4c-40ec-bb31-6464b435975a	nicolas.fontaine@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$lsrY2KNacQp/vC+i1de8IA$DzUlIxN2GhARkStRp2N/qEGHk9fQvC/GGupCjBspjNA	JYESGLPA7MUJXL6FYK6IN2ZDT4G7DTBH	resident	$argon2id$v=19$m=65536,t=3,p=4$cuyR6Ri/bU1BDZqRFsj/1g$qLV5e2aCKVhNyDbPVBtdqSNAbztXlGDgue0PpY5TAEs	2026-07-19 09:58:44.517871	2026-07-19 09:58:44.517871	Nicolas	Fontaine	\N	6a5c9fdda6f783f8fe6b09d6	31 rue Custine, 75018 Paris	48.886	2.3404	\N	\N
a7febe13-1bc7-427d-8a44-e3b3a2e62c8d	amandine.poirier@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$/OFiuGPqZICAI3JskE5Bdw$cnxTaf7+xIyuBrQm8FJ8EnHhNpDAp08FW+MFrz7jxe0	B42BIE2I7YCOZ2WNUPSKXT65JSQVNCBN	resident	$argon2id$v=19$m=65536,t=3,p=4$6G5H0YY9o+VtQS3P1CQsxg$6toQHrdPUgnk7/Q4Zo6okJS/48pG1bAtzuSVCPIUIog	2026-07-19 09:58:46.621222	2026-07-19 09:58:46.621222	Amandine	Poirier	\N	6a5c9fdda6f783f8fe6b09d6	16 rue Léon, 75018 Paris	48.889	2.3446	\N	\N
e9b6a3de-1139-47c6-b834-fa08f43850cb	bob@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$hvQ48rCxLEDV7fdWyJXQlQ$4TuBCSs4A42bOngYlIobruISv4RD8L5+sHhjhkWavpw	4PX635D55YS6JJV3NYIXKZPREIO6YIIV	moderator	$argon2id$v=19$m=65536,t=3,p=4$15+CajAykaaC36/agBcZRw$N2MpKcS+Abt5uZVMHxVWNqPgBDwpJacpfrH21NmviXk	2026-07-19 09:58:43.601589	2026-07-19 09:58:43.601589	Bob	Dupont	\N	6a5c9fdda6f783f8fe6b09d6	8 rue des Abbesses, 75018 Paris	48.8845	2.3404	+33612111011	\N
9d9d446c-f58d-4237-ba5a-163cbf3eddd6	lea.rousseau@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$e4qg55fkMU5Zt2NfTnfOBg$fAl+ud3EiX+gDaIQ5KqLxk7HrT9uEJ58fqCDfIIDhBw	4NBWQYAKI33FFYPOEBDP56Y5ZH27W54W	resident	$argon2id$v=19$m=65536,t=3,p=4$xUYejBPKCp3y2V8vuZ01bA$t0S1rNl0jC7m0NNHmlyeoe1sRzTAeI6QH2zmwOTL6lI	2026-07-19 09:58:44.369675	2026-07-19 09:58:44.369675	Léa	Rousseau	\N	6a5c9fdda6f783f8fe6b09d6	19 rue des Martyrs, 75018 Paris	48.886	2.339	+33612777077	\N
c2df091d-67c9-4913-9a62-b0dc93d91089	mathilde.aubert@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$qiJepALCuVMfCKGI6JutFg$jnA5hlZgin1wg93fjfXpW+DaPznt5HuwqeegqwCt0rU	TTVLFHFDRBEN35BNCPKK6H3IDECF4RK3	moderator	$argon2id$v=19$m=65536,t=3,p=4$YgrGoBe2strwma7pYpipYw$F8OWwQGvM4WVrinqR55HPiNw/LEon20ePhl+xBYRiFk	2026-07-19 09:58:47.198803	2026-07-19 09:58:47.198803	Mathilde	Aubert	\N	6a5c9fdda6f783f8fe6b09d7	18 rue des Rosiers, 75004 Paris	48.855	2.358	+33613110110	\N
b8b1125d-d27b-47dc-98ae-7150ffcb0fe3	guillaume.masson@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$cxb+hSTBjBuLPCU5ObB2ZQ$kPm13v0slqSj4U4lW9jqhMV9pAwzyvq0rvAcF3CjEBg	JRZFE6EVKLVCUKUBDDPVGYIBQ3AK6Y6M	resident	$argon2id$v=19$m=65536,t=3,p=4$Wlwa4UKZWq7BoEm/GcatfQ$dHHPqk5w65buFROB7tyxxnrFUjEIc1eDL/XweaJASOE	2026-07-19 09:58:46.489229	2026-07-19 09:58:46.489229	Guillaume	Masson	\N	6a5c9fdda6f783f8fe6b09d6	40 rue Myrha, 75018 Paris	48.889	2.3432	\N	\N
7fcb5d30-9dd4-4b1a-8a6f-6b8c1f685e5e	pierre.lacroix@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$5Go1729D253lb7ECWvpg5g$k6iD1fgD8AyKg6zJERykHqop1WEGK728ldWFnPJHntU	WMYQ2IZ6N7HAHNILUVJBT5MHL5WECBRJ	resident	$argon2id$v=19$m=65536,t=3,p=4$tGIHht9o3L/4cdJhUH95lQ$tEckOlT3kIVV2144gaBHtegrlfiR6jlY1vTqBaY0Xi8	2026-07-19 09:58:47.362876	2026-07-19 09:58:47.362876	Pierre	Lacroix	\N	6a5c9fdda6f783f8fe6b09d7	42 rue Vieille du Temple, 75004 Paris	48.855	2.3594	+33613221121	\N
a1476d02-7f97-4d44-8546-4debcf9ca26c	chloe.barbier@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$q2mACjkMyAVeuT+ZjYNuKw$bK9YqssAAXXaqtoESeApBvCy6fNN//J/I/rk7LiZar4	7SWT4PMNQ5QY67DP4OL5RJOOQVSUEYN2	resident	$argon2id$v=19$m=65536,t=3,p=4$H0dwnsbn6EAw/Xbbzn4IvQ$UeJjsw4/3F6d32/wkurLKSjrIC2qI+VkS7KWTvBhNB8	2026-07-19 09:58:45.248009	2026-07-19 09:58:45.248009	Chloé	Barbier	\N	6a5c9fdda6f783f8fe6b09d6	9 rue du Mont-Cenis, 75018 Paris	48.8875	2.339	\N	\N
51b9e03e-0681-453b-b96d-a0a71b6cf2d8	romain.guerin@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$DrbKLgX9u5gWUPamXLGBmg$FG5ooasJnOLj4/cqoHeo/brtV5he8WAgdIqBeCa1pHc	Q3FEQ7C73MIH2ZONYBSO62QDEXPUZUSX	resident	$argon2id$v=19$m=65536,t=3,p=4$yHT7Swfn2uytZwbNyyrxHQ$RRWcaZQFf6ZY7s5myhSOH6VWdnK3x0SGF5BIETaQK/4	2026-07-19 09:58:45.917891	2026-07-19 09:58:45.917891	Romain	Guérin	\N	6a5c9fdda6f783f8fe6b09d6	35 rue Durantin, 75018 Paris	48.8875	2.346	\N	\N
1287ce2e-8951-4d5f-ac5f-9c8bcbc4b1e0	vincent.dumas@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$mmu6+U0+d++qpmuefTbxCg$rCnS/iGShPYCG2NOEFV2iM/kcTTXHrGFtrjAvYdUW9Y	GGFLEW35CZSHGQVULJIPQKMY53VQY64Y	resident	$argon2id$v=19$m=65536,t=3,p=4$2N3qwziKa4tt1sdukmQbXQ$dRae6j2B+oiU0ACLNZPRlB20xb+zfY48ELd/ehPiK8A	2026-07-19 09:58:45.66325	2026-07-19 09:58:45.66325	Vincent	Dumas	\N	6a5c9fdda6f783f8fe6b09d6	4 rue Tholozé, 75018 Paris	48.8875	2.3432	\N	\N
f8f4a6d7-5239-40a9-b1cd-f5b98e347e18	hugo.marchand@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$uUNz/F/ACmqN+51okkTLyA$vOCwPPgSWVKS4OiO9xjcrSk+gMgUVeRfH6qCw7NOu5A	2B4OXDZM5FJFZQV4BBWKN5HZSWORYJRP	resident	$argon2id$v=19$m=65536,t=3,p=4$3O4b6I29DMvdyUt2C0z6TA$q88ztfZerBNZXGhu/iL6BntH6uo85ee/B5DmF79z61g	2026-07-19 09:58:45.10992	2026-07-19 09:58:45.10992	Hugo	Marchand	\N	6a5c9fdda6f783f8fe6b09d6	50 rue Lamarck, 75018 Paris	48.886	2.346	+33612999099	\N
93445062-fc71-4130-be5c-bd7ad9661bf2	sophie.lefevre@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$jYnakIZRTZQib9u0nti6wg$5XIqrCsmXtDKmvmnglnv+Yu5/l52vA0zAnqW9iyJ/sI	CHUMEDYFMQ7F6YRR6RFVMWUTK45NK5PR	resident	$argon2id$v=19$m=65536,t=3,p=4$nSKcJRfrLwmFlL5DMxQofQ$Nxg0VNuk18yHbqZQ7IfBPpiUHWKU5y5NI3BuzsdjF8k	2026-07-19 09:58:44.083146	2026-07-19 09:58:44.083146	Sophie	Lefèvre	\N	6a5c9fdda6f783f8fe6b09d6	3 rue Damrémont, 75018 Paris	48.8845	2.3446	+33612555055	\N
542f9288-29cc-4675-8ed7-bb39c1f5929a	claire.fabre@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$TY3Mh1buaZ6ACh+UoPMknA$frjDAx0ArHjvygWA/G54VomkIKhJ44ntvUC3teVPn2o	6F6D3CCMAUD53WEVMNKO4B44FYM3UQMH	resident	$argon2id$v=19$m=65536,t=3,p=4$TMD8KC4M/wJChbGysdgHuw$276JrPXRxjvWREgZbc7lSWH3olnSR35AvrBB7tEGGzM	2026-07-19 09:58:45.794679	2026-07-19 09:58:45.794679	Claire	Fabre	\N	6a5c9fdda6f783f8fe6b09d6	21 rue Véron, 75018 Paris	48.8875	2.3446	\N	\N
f7b74913-40ac-495c-981e-e46bce8b4d2b	olivier.deschamps@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$pwfRTKKs9ATLMITrqVN7TQ$GIMedDrjFOVY1px/3uZa3ycv1Q80VRdLPOlt29FF/sA	7ETE373XXPDHJGJRYUT3CANI4WQ67MOL	resident	$argon2id$v=19$m=65536,t=3,p=4$9C1iAWBOV5hlhn+QpJSqHQ$TC/28PEaPRgZk1bfVCu1jx1WP/rL5+65QqhrfxFJrMc	2026-07-19 09:58:47.048148	2026-07-19 09:58:47.048148	Olivier	Deschamps	\N	6a5c9fdda6f783f8fe6b09d6	5 rue André Antoine, 75018 Paris	48.8905	2.3404	\N	\N
42a660bf-233e-45c9-81c3-947a509a44c1	sarah.lemoine@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$cXHNWNkCBnBaWG6N2uU5BA$kAS8SbHUVt7dBLz3PD2YjB6kz2W+r7YqwhAu4twWrkY	5UCSZF3BAWOZQOSYFJI76TCGMOAI3SZZ	resident	$argon2id$v=19$m=65536,t=3,p=4$KGqpFoQ3oZjMyF9oUuy51A$nz6z5jWCPrJ55cP37sKgNcFQc+YYPoKLnq5g0VyeDBQ	2026-07-19 09:58:45.541419	2026-07-19 09:58:45.541419	Sarah	Lemoine	\N	6a5c9fdda6f783f8fe6b09d6	17 rue Berthe, 75018 Paris	48.8875	2.3418	\N	\N
4b0f4b82-9992-4280-acd4-2eb871f90c15	thomas.girard@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$e5Qcd2gcbKDUyQUB8Rcpjw$gtkRYGdFcGmDWYHwkPcsZUNvChQrKJgY9GWooQN9ItU	WTKOWYEKZKDPRXWAFT66DR6WZZNQRIBZ	resident	$argon2id$v=19$m=65536,t=3,p=4$DIkf8XdLvDgLVhD4i+lRVw$Hhq9fRmrRN3gZmyJTDRAinra2KTeGbCX2aNoPXNDs9s	2026-07-19 09:58:44.22352	2026-07-19 09:58:44.22352	Thomas	Girard	\N	6a5c9fdda6f783f8fe6b09d6	77 rue Marcadet, 75018 Paris	48.8845	2.346	+33612666066	\N
62082a58-9ce1-40f5-b385-aa4fea5626d7	gregoire.tanguy@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$qmhcossIwj+Sf8wHLb8ezw$gC3KKpmicftSwInNMzazu01r2vVrPgNxuFY7mQkaeTI	4XTYYBJSPNDOCPF4XVOZOC3HMHPEX5SB	resident	\N	2026-07-19 09:58:51.399012	2026-07-19 09:58:51.399012	Grégoire	Tanguy	\N	\N	9 rue de Fontenay, 94300 Vincennes	48.848	2.437	\N	\N
b1b6f3ac-3443-43b4-ae30-2c8efcc53342	xavier.brunel@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$fDdMnngF8tJ01D3OrJSlnA$duYtj30pVcYY2Jk4d+x46CrsQr21HMiQFO+kRG+0VbA	2Q5VPQHKMDBURPXWTOYOKUR5IIN6HO4S	resident	\N	2026-07-19 09:58:51.696099	2026-07-19 09:58:51.696099	Xavier	Brunel	\N	\N	20 rue Béranger, 92240 Malakoff	48.818	2.299	\N	\N
7ad9509e-7707-469e-b4d6-7730d759b6f1	benoit.carpentier@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$jC5uTVF3DSIa+XMb175XIA$SONzY1gd8uNVgAhNZGScNnNcuCclesfKiZ4LhdGXBJE	VKAL2LC3VR62BGTT26RL67H3J6JCMA3B	resident	\N	2026-07-19 09:58:51.968799	2026-07-19 09:58:51.968799	Benoît	Carpentier	\N	\N	28 rue du Général Leclerc, 92130 Issy-les-Moulineaux	48.824	2.274	\N	\N
16ec1c31-bab5-43fc-8630-d48d60a04a00	sylvain.lacombe@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$2tZlRKG/+3wB0dVTQyg4ug$Px9m90ro3EvQ24+cXN5cjWXHALCdX8mYgeF4vLWuovQ	VEO5WTAHOZCM5MGW4ZTGIBRQYC3K45DF	resident	\N	2026-07-19 09:58:52.252265	2026-07-19 09:58:52.252265	Sylvain	Lacombe	\N	\N	7 rue Sadi Carnot, 93170 Bagnolet	48.868	2.418	\N	\N
ee6ef32e-e03d-4c0a-9c8b-33cf0d043792	quentin.morvan@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$obcNCrgY7ywZi5t0Yq1LXQ$dTfjF+mW53NZXyXP9iblosbUy4NLifPZOvPewC/Kkas	ETM4NW7ZK4F6CXISJUZC2L3NG2B3M23W	resident	\N	2026-07-19 09:58:52.528497	2026-07-19 09:58:52.528497	Quentin	Morvan	\N	\N	11 rue Élisée Reclus, 94270 Le Kremlin-Bicêtre	48.811	2.36	\N	\N
58997b83-b834-4be4-a00a-062a1fdd9d8e	sonia.klein@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$YiWIHPTfUHTAgX/WbFULOg$JdOOzDyVWTT1omxwsMknNoWx5eu0t8wpBPujPGHcH4E	HVFF2APGHTHPJB7Q3LVPKS5AVKLOXL7H	deleted	\N	2026-07-19 09:58:52.816128	2026-07-19 09:58:52.816128	Sonia	Klein	\N	6a5c9fdda6f783f8fe6b09d6	2 rue Burq, 75018 Paris	48.8905	2.3432	\N	\N
2e48b8ba-efbf-4086-b0c0-35517f861a5d	ingrid.bertin@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$UiY0mLXsfk2Xu57z/URXbw$3sHRm4ayqkEVLkEMntNMY0bTpqJmqTMRyXohfuX3A1Q	PH2QBBFIE74LKFZGB4PEXWMXEGWBYDNC	banned	\N	2026-07-19 09:58:53.105946	2026-07-19 09:58:53.105946	Ingrid	Bertin	\N	6a5c9fdda6f783f8fe6b09db	25 rue Keller, 75011 Paris	48.85	2.3738	\N	resident
d8afbc7a-63de-4f86-a696-e607b7673c53	nina.weiss@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$44R/CL2O/7FenlbMNJ3YWQ$h3xcFLPE2N3vPdXlpf2K3SPyIh0VIBQOGinEyxORTag	XAXKEZKV5QVFTGNMBTC54TWLYAIUERGP	deleted	\N	2026-07-19 09:58:53.374744	2026-07-19 09:58:53.374744	Nina	Weiss	\N	6a5c9fdda6f783f8fe6b09d7	6 rue Charlot, 75004 Paris	48.855	2.3608	\N	\N
81ae1a8b-7506-4c09-9424-9d19656cd160	valerie.dubois@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$HhjH1j6a4aIy/tLW4rhgfw$+7Hu6K2qo4unFiNwXiubn0bfWa/Y6z0movzuvZYZHDE	Q3NUNOLNUPRYPE2JLLXJKEJSCMGXC6EQ	admin	\N	2026-07-19 09:58:53.656714	2026-07-19 09:58:53.656714	Valérie	Dubois	\N	\N	\N	\N	\N	+33614109209	\N
70fcb658-b518-48a5-ae8a-4ccbab74eb7b	marc.delorme@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$alrEvR33TOa90ipWDOgVpg$q1036/Hi6JtoqVsUL0YvsjFBYZ+fbuLKFsYmFUkvPoQ	R5O2JJ33YFAW7TNAO3ZRTWWSGINKCFWK	resident	\N	2026-07-19 09:58:50.796812	2026-07-19 09:58:50.796812	Marc	Delorme	\N	\N	31 rue Gabriel Péri, 93200 Saint-Denis	48.936	2.356	+33613998198	\N
82461612-354a-4abe-8cd5-d420d1391317	ludovic.weber@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$4yEWNjS7emANWug+WHG4yA$kZ/MOhqK5EDvQuq1YLSChOTXG0tVNzNyIwonj3Gce2E	B7SX3KJEWMZEE233LTH3RDIZWEKYZKSF	resident	\N	2026-07-19 09:58:51.098277	2026-07-19 09:58:51.098277	Ludovic	Weber	\N	\N	47 rue de Billancourt, 92100 Boulogne-Billancourt	48.833	2.24	\N	\N
25ac9c81-50ca-4247-a239-c0ea28915858	bruno.vidal@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$JK6kGSYOrQSdrZXMSox+hw$YmKYrUs7DDtQgG/e+eYr6WYM85v/WL7VmLvnebif/us	3CZOVKZKKPUPOBASXUXIXLJCZXVOAVHL	banned	\N	2026-07-19 09:58:52.670828	2026-07-19 09:58:52.670828	Bruno	Vidal	\N	6a5c9fdda6f783f8fe6b09d6	66 rue Marcadet, 75018 Paris	48.8905	2.3418	\N	resident
84ec11af-7898-463a-8cca-525ac60cbf59	julien.moreau@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$RoqZbRFuI72ebYFBX8xp3w$TArK9WPSLmWgNGdhTkae4o+gUZL5lWCLqkMMAJIca7o	AUFVE5AM2PXHZA3YTP4GTOUT56Y6FGFA	resident	$argon2id$v=19$m=65536,t=3,p=4$4pN1MlcLPCaHo1mLXsD3Og$MHI9STc4YyWpB4ADfTf4TgIY7vdJ+p6DfsLsrV/Og6E	2026-07-19 09:58:43.919599	2026-07-19 09:58:43.919599	Julien	Moreau	\N	6a5c9fdda6f783f8fe6b09d6	23 rue Ordener, 75018 Paris	48.8845	2.3432	+33612444044	\N
0b653a65-ed00-4bff-8363-87db61282945	alice@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$s4ThhYAkRg0FXrUDDRweUw$NF08tucLiRbfNCioVGSx6gDpWvRMjW3zHYs0qiLGNlU	4PX635D55YS6JJV3NYIXKZPREIO6YIIV	resident	$argon2id$v=19$m=65536,t=3,p=4$4bUk2nQfDF9gr9GSaQukag$lRvUS66j6ZQ5PBbnIsBTDMIpWMQgjXB4wvNvq9K41J4	2026-07-19 09:58:43.430039	2026-07-19 09:58:43.430039	Alice	Martin	\N	6a5c9fdda6f783f8fe6b09d6	12 rue Lepic, 75018 Paris	48.8845	2.339	+33612000000	\N
f35b7a44-db30-431a-88f1-30439aa401f7	margaux.rey@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$iGRTsWpNIHfPFH0VxUXo7A$WvFU2VeuapvnLdYQ0NOfnzB7JZ9XqFzdtbhTgoCqye4	UX3X43FHDHJAYDA7JOSEVFOYKXJQWUCU	resident	$argon2id$v=19$m=65536,t=3,p=4$yafZNOKkVvQONpYi7TtUUA$9Y2LcWqTr3mMkx4V2SKEd5VQOl6itqCDAyHiJ1rxVSo	2026-07-19 09:58:50.118732	2026-07-19 09:58:50.118732	Margaux	Rey	\N	6a5c9fdea6f783f8fe6b09dd	19 rue de la Chine, 75020 Paris	48.858	2.3895	\N	\N
2486a27c-916b-4892-9ed9-bc4787cb695a	nolwenn.legall@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$E4kY4lNPs9vJmEE2i6I50A$TQ24FpaXzMyPd4f492J3YHm+H4KlCU2fDZFjKtvvZ0w	QTCMCNJVVEKPL23T5UU2QCSKJ5KX5ZW6	resident	\N	2026-07-19 09:58:50.380284	2026-07-19 09:58:50.380284	Nolwenn	Le Gall	\N	6a5c9fdea6f783f8fe6b09e3	24 rue de Buci, 75006 Paris	48.85	2.325	\N	\N
f86965ae-3b42-467d-8f48-aecf8fce871a	justine.prevost@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$EDWIaRi9gVuw8eq7RKqC6g$/dmWXBxoGS7dhnhNfPWlEiPXoKiEkO+2W2QZJI2kl64	XSKLFPJCVHHMKCGCAWJ7UUX2QP55TNYE	resident	\N	2026-07-19 09:58:50.655326	2026-07-19 09:58:50.655326	Justine	Prévost	\N	\N	8 rue Hoche, 93500 Pantin	48.894	2.402	+33613887187	\N
744483cd-223b-4f68-9dda-6b70abc651fe	aurelie.blanc@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$gvGpfnZeEdVNIJ7Qr30AvA$UTh3xM5/Gmrh54fRl11bK8N82G8UyAOBDyVSSHTYOas	4YK5NXN4VRZAS67KP5T3NJNTSSAAOFJ6	resident	\N	2026-07-19 09:58:50.948542	2026-07-19 09:58:50.948542	Aurélie	Blanc	\N	\N	5 rue Raspail, 94200 Ivry-sur-Seine	48.813	2.388	\N	\N
69bd7ba6-c2a1-4879-bc4d-dc11ff000840	solene.maillard@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$4GbjCzvvR3rz4I+YsSg5hw$skUgGH3NUoxsr7sYbdwEY5XO/Pf5MTB9zf14/uwvsWc	F3EOUC7AHYPGBLFCY4H3KFNJ3GRVQGR2	resident	\N	2026-07-19 09:58:51.553624	2026-07-19 09:58:51.553624	Solène	Maillard	\N	\N	63 rue Rivay, 92300 Levallois-Perret	48.894	2.289	\N	\N
1382facf-b506-4f8d-be57-77e87c4dcc34	myriam.sassi@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$i71y425n5TiMQSukSwP7Kw$lmZxHgyQHEwqUgescBrI+MiJkVvCFM3z9v9EGH9Kohs	7JWGLUIV2YR2PP7UEAXDK23IY4BNMHOJ	resident	\N	2026-07-19 09:58:51.837769	2026-07-19 09:58:51.837769	Myriam	Sassi	\N	\N	4 rue du Docteur Bauer, 93400 Saint-Ouen	48.911	2.333	\N	\N
9cf9caf9-2a1f-41eb-bc93-cabb8aa03ff0	delphine.arnaud@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$iftBTz77rdi21xEoNtY9NQ$ZCgVIn0UiKfaYaKS4b3qh9u7xxfm00JqqcZOpx0r3g8	LDG3Q7MVTKT5LDHVOMYFOHWY2VD5XWBG	resident	\N	2026-07-19 09:58:52.102098	2026-07-19 09:58:52.102098	Delphine	Arnaud	\N	\N	16 rue de Paris, 94220 Charenton-le-Pont	48.821	2.413	\N	\N
cf7d045f-2bd3-4ea4-bff2-ea1952fbe942	nathalie.ferreira@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$EXDDEJCfLY9JB++ImxCQdw$c5TDBl6n4V5p2XQKMXshRU1s5OGSh/EtqhjpnJGk9Hc	PRB4F3MDXE7OYXPNN5CFWDS5ZIQ37U3A	resident	\N	2026-07-19 09:58:52.39033	2026-07-19 09:58:52.39033	Nathalie	Ferreira	\N	\N	52 rue Martre, 92110 Clichy	48.904	2.306	\N	\N
f7025b74-7036-4140-890d-85eecf174883	manon.leroy@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$QRxZNftS38V8xKAGW9k0LQ$1DQl0+lHpv3j7cEqCSvsZcBM6uY4RJK4HoXf547r6JI	FLC2O7KDQVL5JLUHF4V66GEKYYIRCKIQ	resident	$argon2id$v=19$m=65536,t=3,p=4$uCdN8/TXRbpl6bnyBt7I3g$KkxemahxO5efgS/LidreF/47FERf3nhg37CEB/uEzgQ	2026-07-19 09:58:44.957462	2026-07-19 09:58:44.957462	Manon	Leroy	\N	6a5c9fdda6f783f8fe6b09d6	27 rue Joseph de Maistre, 75018 Paris	48.886	2.3446	+33612888088	\N
33feda5e-d072-44ab-9793-3d95a8ea87d5	damien.faure@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$LuSrEl3IgafM5R7XK0BKRg$7IXmGPSfEsj3ADTcfXkKAubHI98CqzhYAT0sR4QYnG4	WNLPZPFTRW2ALEQJ6NITGHSGUL2CJ2Z4	resident	$argon2id$v=19$m=65536,t=3,p=4$bm966GshMinawE3ln8J7kA$S5L0yAsD4BkUrCZeqy8GD+sJM9mqTqL5uCcZGD99l3c	2026-07-19 09:58:48.226997	2026-07-19 09:58:48.226997	Damien	Faure	\N	6a5c9fdda6f783f8fe6b09da	33 rue Legendre, 75017 Paris	48.885	2.3154	\N	\N
faa4f168-5dfe-4683-b0dc-34cad4ab4928	maxime.renaud@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$1MLXjmMsbcWE2I2A5oOQMQ$Kc/l/GcyjXCdAz6oDO00Zz4uUNZFc8X2WV20ruYDRXs	VADESTO4DIB2WPKIC3WV6JYKQZKT5OFS	resident	$argon2id$v=19$m=65536,t=3,p=4$QB4DWQmVL208Qfg7j+IVgw$z1ViJwLi9+9pTFcByO5wAIzjGbTyT7oO7+QBVkvEH8k	2026-07-19 09:58:45.407592	2026-07-19 09:58:45.407592	Maxime	Renaud	\N	6a5c9fdda6f783f8fe6b09d6	6 rue Muller, 75018 Paris	48.8875	2.3404	\N	\N
58b3df0d-2a0b-4f08-96f3-e0924d250b89	kevin.charpentier@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$wyc32b7VyxdsRKq+XP0ITA$9sh8YkQqRmaz9QfrTfFG/uGDpfUUy4/0ODEGheQut4k	6BPHR6PKHUTGKQT66TZEEF55FGJDEZHV	resident	$argon2id$v=19$m=65536,t=3,p=4$BjKc9H5g1QyD/ghESUDfwA$BgAOFgmIWXmvxx+23HGxVmEuo8oxT0I6MMW1zYRi/n8	2026-07-19 09:58:46.755078	2026-07-19 09:58:46.755078	Kévin	Charpentier	\N	6a5c9fdda6f783f8fe6b09d6	7 rue Polonceau, 75018 Paris	48.889	2.346	\N	\N
0c05a6eb-4191-4b8f-8a4e-e9489251eaee	antoine.perrin@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$pO0SFiZq5GBp6jJj4HXCdg$lo4420VlfL+pCnLDnElobzulQF0aQbL/3aQ7gJUAYDg	7OVRYJEFLUYE4WUQ3MZRBT45CGZ6QHNG	resident	$argon2id$v=19$m=65536,t=3,p=4$Nph2fiLHIpya/bWbWloJ/w$zYO29oK++wWuqis0+h/Rq70CDLBg/+IlgS66e+wbb2Y	2026-07-19 09:58:44.801724	2026-07-19 09:58:44.801724	Antoine	Perrin	\N	6a5c9fdda6f783f8fe6b09d6	62 rue Championnet, 75018 Paris	48.886	2.3432	\N	\N
c09230c8-c6b0-4e6f-8ebc-7f3249c6c5ec	remi.delaunay@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$J3LNinMM2JD33veL+ixAbg$WlCnv0G6wnQBF/U4jqz6z4DMXaFg79fnbIYitgj9L30	IMNPMZ7B3BHWAUJZQ4XU57IJSSIN2ZL4	resident	$argon2id$v=19$m=65536,t=3,p=4$H4HkC4FBowHHq4tz60nY3A$7kpShrsvBx8D/OfdsEkp9e24ckrWBeItMsZddftq0wk	2026-07-19 09:58:48.526216	2026-07-19 09:58:48.526216	Rémi	Delaunay	\N	6a5c9fdda6f783f8fe6b09db	48 rue de Charonne, 75011 Paris	48.85	2.3724	\N	\N
f1f39ac2-ded1-4435-8d9c-1323c17b7764	pauline.colin@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$lCZFgrfXtxK8aNYHCy24ew$mrvFZ4BzWE+8zXE46PLhlZiIRK/3jum6EJGrXCD0swo	APS7W6C4UTJ2HLBCSHWXLFFPBGDBIDIA	resident	$argon2id$v=19$m=65536,t=3,p=4$+8SGV+pWvp1LMXlHsHPo8Q$KkYEzBKKebFsJFXB0DaJArEg4q0mUrPjKaOib6pRbu4	2026-07-19 09:58:46.055765	2026-07-19 09:58:46.055765	Pauline	Colin	\N	6a5c9fdda6f783f8fe6b09d6	58 rue Simart, 75018 Paris	48.889	2.339	\N	\N
d0f005ee-d44a-4445-a518-aa8118e9e663	theo.bourgeois@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$gCzeCKNr94M00TjgBFKXkA$cmBwf/pbUp7vzmn/pr8He6R+vM4HXZ1W+G7eGMN5be4	2BOHJAYHV3JVM4VPJATBYRJ4AIB6JQVO	resident	$argon2id$v=19$m=65536,t=3,p=4$Qo6hqmaxhoZHDtRQNZIZrw$/MVUK15MUNeLHMPkAef0cW6g/q635Eomitvxn3CmwGA	2026-07-19 09:58:49.696174	2026-07-19 09:58:49.696174	Théo	Bourgeois	\N	6a5c9fdea6f783f8fe6b09de	54 rue Daguerre, 75014 Paris	48.835	2.3179	\N	\N
57dd4f53-c362-46ef-9938-16bc07c7473a	fabien.michaud@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$p54tPtfg3y2QGKdZp7gYyg$KkIbpBXP8BRDDFGrnaJ4pZkSmiz7bazGtk+8Q378WmU	3USHFHJXUNTOGJHF6QZGCSHH5OAKHTEN	resident	\N	2026-07-19 09:58:49.974664	2026-07-19 09:58:49.974664	Fabien	Michaud	\N	6a5c9fdea6f783f8fe6b09e1	10 rue Poussin, 75016 Paris	48.8445	2.2589	\N	\N
3c3a4d55-de41-4aab-92c5-ed692bba4c9b	ines.bouvier@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$8/LPZsBYmvmF4/TuUXBS4g$iqRO2qWWDDc/5tsYBX4gDEuLHgaXssyGEejk7Gm1dR0	GEG3Z5LZDHIFKVTVS3ZTJAITIGDIP6OR	moderator	$argon2id$v=19$m=65536,t=3,p=4$yjqVqijN6dr4DN/bmCVXoA$LDmU6Xj/2Tsk6eQsuJD5GG3/CBJ4aGXtEKzDVSClJs4	2026-07-19 09:58:47.517633	2026-07-19 09:58:47.517633	Inès	Bouvier	\N	6a5c9fdda6f783f8fe6b09d8	9 rue Dénoyez, 75020 Paris	48.8715	2.3805	+33613332132	\N
31c286fe-e810-4610-994b-16bf85f4b896	yanis.traore@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$R9QchSkvxzhMdnwf00RfLg$DCvXHNI/FgtWx9B8pV2SD4vQtwZyCURAnkyvkqMfNMc	2OSKTRMM4ATGME3L6XPNZNAXO5C4YWB4	resident	$argon2id$v=19$m=65536,t=3,p=4$p+NrbMjAh0+WjZSCIHQ/uQ$j17eomB/NLd+fSThvMIAMfayQH/PJ7Y57TySWWuSvyQ	2026-07-19 09:58:47.658777	2026-07-19 09:58:47.658777	Yanis	Traoré	\N	6a5c9fdda6f783f8fe6b09d8	64 rue de Belleville, 75020 Paris	48.8715	2.3819	\N	\N
a4f76676-2a58-4081-809c-7c52f7035f52	etienne.berger@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$quse25iRr2puuXGbuw0RiA$AvcdrsInnfubwU2NFDzfXfCW5x9eAtSmWH2gI4R593s	FYYKJPNLL3NOKLSI4G565XOLENDVIQ5R	resident	$argon2id$v=19$m=65536,t=3,p=4$eXvXGjCnx65Tt1RPxySavw$XAm4Ajpvf1QRPhMw6lDxVdAENxBOedAm2Ojle2zH0Lk	2026-07-19 09:58:47.92435	2026-07-19 09:58:47.92435	Étienne	Berger	\N	6a5c9fdda6f783f8fe6b09d9	29 rue Saint-Jacques, 75005 Paris	48.8475	2.3444	\N	\N
5799641d-4f77-4b46-83e2-a66347a96d8d	admin@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$U1IyuUDlq+LoIjcgSJrtUQ$Vf+3LgbMTqpqycVd5ZxiEDpKr8mcTyl5p0lwozEhnQM	4PX635D55YS6JJV3NYIXKZPREIO6YIIV	admin	$argon2id$v=19$m=65536,t=3,p=4$y0c22ChrGMMI8vaMCzDcWQ$3+N8KwDSWjo+kMw4oW1kr/EL3bJBot0EuPMyBlwnY3E	2026-07-19 09:58:53.514388	2026-07-19 09:58:53.514388	Admin	QuartierConnect	\N	\N	\N	\N	\N	+33612222022	\N
9d33a952-846f-4e64-90c1-95b8693cba19	sabrina.costa@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$ALBSnZ+U8u+RusvyN+NlRA$gCA8xjnFJhUl6lLbewN1uM1Ws9YFXVAjTSEDX7bpZcw	763ELUMZCSC6NUN6KULE3XEGTUVBV25O	moderator	$argon2id$v=19$m=65536,t=3,p=4$qBHecUWbUXGmq7jLOmU2jQ$X+zDe3aMhOE99PtcLih2dUpZzB0124ehI+4txFMOi5w	2026-07-19 09:58:48.084462	2026-07-19 09:58:48.084462	Sabrina	Costa	\N	6a5c9fdda6f783f8fe6b09da	7 rue des Dames, 75017 Paris	48.885	2.314	+33613554154	\N
205eea65-1170-4b3b-a376-68931d39e971	oceane.roy@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$+SGE8F3lRHELVT+Cvk3sMA$/AqcHLf/1RdKBi9jzlk1c3meVES++uUMLijcRntO74c	L5SDZAE22EUIXLRA567ITBT4EY6QUXLQ	resident	$argon2id$v=19$m=65536,t=3,p=4$xUr2ui/HydZsrfF3zoYwSw$i6YgElgO9ovYKD9Cstwl5dCnMXduR36d8hZePHkWFSM	2026-07-19 09:58:48.376345	2026-07-19 09:58:48.376345	Océane	Roy	\N	6a5c9fdda6f783f8fe6b09db	15 rue de la Roquette, 75011 Paris	48.85	2.371	+33613665165	\N
bfdee603-ddfa-4297-b6e4-d00fe76abc43	charlotte.pichon@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$6T5AaUdS5eOBlUntaa+zXw$OUBE5M2zS1R2f9PaFucKRCJQw9IcXE2ma2y8F4yaE/M	5XPWAVBHHVUBMPDO3I4UZUNPRZXXWVHO	resident	\N	2026-07-19 09:58:49.254063	2026-07-19 09:58:49.254063	Charlotte	Pichon	\N	6a5c9fdea6f783f8fe6b09dc	13 rue de Crimée, 75019 Paris	48.8815	2.3805	\N	\N
748db717-7aa9-4aae-b444-c1ca530f29b4	samuel.ferrand@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$2LB081iMN/emJBZguDsnkw$WjGnrR2vLLTKjz30CYhA02ZHPhaQkUOTQp3vFyEsHAs	WNGAOLYDWM3BZCHC5ZWVCIQNBBC24FEN	resident	\N	2026-07-19 09:58:49.407642	2026-07-19 09:58:49.407642	Samuel	Ferrand	\N	6a5c9fdea6f783f8fe6b09df	26 avenue Jean Jaurès, 75019 Paris	48.8915	2.3805	\N	\N
a782092a-7430-42b3-b001-601e4f564898	cedric.hamon@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$Fgv2iHaIoPcmkGFuoyDwcg$WvllTOeskxLks6EkIYx/oJKcUe/a2mmQXMgY8OV+xhI	3EO74BRPRLTL4UU37UXRHEJ32UTNG2RB	resident	\N	2026-07-19 09:58:50.240605	2026-07-19 09:58:50.240605	Cédric	Hamon	\N	6a5c9fdea6f783f8fe6b09dd	3 rue des Rondeaux, 75020 Paris	48.858	2.3909	\N	\N
025ddc0c-383c-48e4-a197-c8d52661daf7	loic.perrot@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$jZ2pczkXDuu7OgSTnwjLXA$sllXtKAk8c60/+AzavtG5gysyAIPLkd0O5LrnjTwkyA	QBJ7FLOAC4QJ3M2DB5XMVDKGRUYJGMNL	banned	\N	2026-07-19 09:58:53.229827	2026-07-19 09:58:53.229827	Loïc	Perrot	\N	6a5c9fdea6f783f8fe6b09de	17 rue Boulard, 75014 Paris	48.835	2.3193	\N	resident
98b72c78-8549-4aac-874c-c19391150b07	adrien.roussel@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$pm9wwZCnkDKHny2BpDcACw$COmx6zgOThW/xY8NnKa6gUGhwmqmBow7J7qSukQgmOQ	EXWF5EGL7O4HG2MKJ7LRCBS3IEDD2JYO	resident	$argon2id$v=19$m=65536,t=3,p=4$EuhZIs0Bv9XxGFxTj3bLaw$onA3ROqnedsUafTL7F0NcUHhb5BsCIEvj/BdRCl/qf4	2026-07-19 09:58:46.184361	2026-07-19 09:58:46.184361	Adrien	Roussel	\N	6a5c9fdda6f783f8fe6b09d6	11 rue Poulet, 75018 Paris	48.889	2.3404	\N	\N
21b7538b-ed2b-446d-b042-03ab835595e6	helene.vasseur@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$5UKaoTEbDUAPmdrnl01FTw$uRtCJqVybjiodu9yAxbA3WzBsa08HGEAZlL+2RfIN80	54GKIYZI6LNHAYQ3O67DZYRF777D4OAC	resident	\N	2026-07-19 09:58:48.957914	2026-07-19 09:58:48.957914	Hélène	Vasseur	\N	6a5c9fdea6f783f8fe6b09e4	5 rue de Lancry, 75010 Paris	48.868	2.3619	\N	\N
66ec6d9d-19df-470b-8a2f-c14dcf32c9a2	bastien.noel@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$VxwoURll8CEAnr8idTVYiA$UYG/T5kwppCskvsMMw0K9rt+GolsJBzHvyhwIcLTAbk	AWA6THMN7BYZBUGHYJYQT4CZK2L2MQ4M	resident	\N	2026-07-19 09:58:49.109562	2026-07-19 09:58:49.109562	Bastien	Noël	\N	6a5c9fdea6f783f8fe6b09e1	71 rue d'Auteuil, 75016 Paris	48.8445	2.2575	\N	\N
4de869de-be0a-47b9-9f6a-772041cdc24f	camille.bernard@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$y2WJPDHTa7v1rO8f5+7z5A$i9TaBe4wzYcIVzQSmDJ2M1HjfGU7/FQCI4oiesLY10s	VQ7EBK6B5VFBL7CNZ5ZNVAM7GHH35YSM	resident	$argon2id$v=19$m=65536,t=3,p=4$g8dOfhRopzNfQ87oPK7IpQ$ZD9Jd7zHrMI6dB434NmUjxCwE4JGKsF7VyfhdIn+NUQ	2026-07-19 09:58:43.764083	2026-07-19 09:58:43.764083	Camille	Bernard	\N	6a5c9fdda6f783f8fe6b09d6	45 rue Caulaincourt, 75018 Paris	48.8845	2.3418	+33612333033	\N
9f590f91-ff38-4388-9e5c-c30bf1b8d63a	lucie.gaillard@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$zfJO52VlWwJyxmA46Z94LA$6eiwylJEjT87DualFBlSAf6VOXAkDPwlbfam0ujTXcc	WFSEQ5PKH3S7XUUZOVPZZX2RHL4VT2JM	resident	$argon2id$v=19$m=65536,t=3,p=4$F8kkO5SnYAHWkjZXUQE3xQ$VBp29vboqFgXUTefekEQchQb9FW9UTLNJQsK8S0NWcI	2026-07-19 09:58:49.548439	2026-07-19 09:58:49.548439	Lucie	Gaillard	\N	6a5c9fdea6f783f8fe6b09de	8 rue Delambre, 75014 Paris	48.835	2.3165	\N	\N
fac2acc3-190b-43cd-baed-122358be1259	emilie.chevalier@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$13mDF4lpkmj1VLWB9xXhCg$Cu4dFqfbn1o0zARxEm6kAD1JKr1qSNXHQ8bGT2b7bVQ	4V4SYV2MOV3URFIVG7KTTXA2HFSLEHRD	resident	$argon2id$v=19$m=65536,t=3,p=4$HysYyTBX/qCPuUUU1v+Tsg$p4IiXQJjWGZnc1X/s5/ahRpNE25VvRhbseZjbQncM2w	2026-07-19 09:58:44.663511	2026-07-19 09:58:44.663511	Émilie	Chevalier	\N	6a5c9fdda6f783f8fe6b09d6	14 rue Ramey, 75018 Paris	48.886	2.3418	\N	\N
5d9f0169-e33f-4fe7-8154-d085cda50715	anais.leclerc@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$NM0A11+bIgzToTofwn+kBA$bpEHkz1NrY3LGI1limEoxExygHiai7vnpDDzqWRqNtA	GK2CZGYIISCN2OQADCIIHFSIBUV63KDZ	resident	\N	2026-07-19 09:58:49.829221	2026-07-19 09:58:49.829221	Anaïs	Leclerc	\N	6a5c9fdea6f783f8fe6b09e2	37 rue de Bagnolet, 75020 Paris	48.846	2.3895	\N	\N
16850636-c1fa-4cf3-84c7-ad7664d6cad0	nadia.benali@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$C2+4gAxvfZ87GWEwoOi/mQ$2CgKhzaYu/Qx/rHUjUxVien631NI0XFvR3DLXY/pL8E	JCSEJEOJ4HNE3M4JMPATXCV26NNSSVVE	resident	$argon2id$v=19$m=65536,t=3,p=4$wULiHdaBq7jm/IXI9b9iNQ$sI785w/zHr8+wT+Y075qw50iwmoQsVG293Oxcl9FQRY	2026-07-19 09:58:46.899987	2026-07-19 09:58:46.899987	Nadia	Benali	\N	6a5c9fdda6f783f8fe6b09d6	102 rue de Clignancourt, 75018 Paris	48.8905	2.339	\N	\N
3d383b6c-6a03-43e9-92ac-34fda017e104	laura.millet@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$cEA+9sxRW6xXBfS5h/QVFg$iZkldrpzBH1Ew3x7pn0mwr+lu/6nEP0/7R56Bx33oDI	SPWTUXKDLBYD73VJ5R2X2PXURABM3ZQM	resident	$argon2id$v=19$m=65536,t=3,p=4$Cw8bUqrke0cU82ltF0zPGw$HV1tTapzJYVMmBWMXi6gf6S8B/CdRjJ6bs9Goco74iA	2026-07-19 09:58:47.798319	2026-07-19 09:58:47.798319	Laura	Millet	\N	6a5c9fdda6f783f8fe6b09d9	12 rue Mouffetard, 75005 Paris	48.8475	2.343	+33613443143	\N
b1a43198-1fa6-4045-9731-b6a02dc1e1aa	alix.marty@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$1ivOy3LCI+5i0zxVHSU/Qw$BqfUEMOpE0wizSsQXLIdaJ/y95qn0+qR8ggcbEt5XcA	677WVWC4V3NND2GSC3J4ILLTCT2V4TZG	resident	\N	2026-07-19 09:58:48.674856	2026-07-19 09:58:48.674856	Alix	Marty	\N	6a5c9fdea6f783f8fe6b09e0	6 rue de Dijon, 75012 Paris	48.831	2.3775	\N	\N
28d0c40a-0f51-4754-8ca9-a9ea9c0c7799	farid.amrani@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$Ej2nttvke+wbhUkY33gOQg$9Cle+MMY7qZccQlaViWxYfM7feCRBtBhGCMF01Jz7vs	HTPXNHUW4V2GK2HXBMBWKBTA5WODK5JG	resident	$argon2id$v=19$m=65536,t=3,p=4$KEV9PaZaaVD6LRjhdZKPNw$gDgJ9J+pZqswuyeI29k2Y//uvi0l3KY9+9rwV89xCgA	2026-07-19 09:58:48.808228	2026-07-19 09:58:48.808228	Farid	Amrani	\N	6a5c9fdea6f783f8fe6b09e4	22 quai de Valmy, 75010 Paris	48.868	2.3605	\N	\N
f3d8ad6f-e1e8-4fe5-bbfa-2d2177efc1e8	karim.benhamou@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$ge1r2/9vqlDYgY1o9saFeg$FrBBLHzykmP2Kkfi3YqfUXTvB0dzBsshhy3oXCmBYr4	WLNCKFKZOBPAQQD7AEZI62VFCOSL5X5B	resident	\N	2026-07-19 09:58:50.519405	2026-07-19 09:58:50.519405	Karim	Benhamou	\N	\N	14 rue de Paris, 93100 Montreuil	48.862	2.441	+33613776176	\N
e6de4f49-8147-4dfd-afed-86ba3ef09d04	fatou.diallo@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$ayIQpinxJfgXq3JzsKuVNg$uRP32CG0UTWIVOpIdlcPNDX0RJF2cmzNuBk+MPd733I	SK27QT7VE4ZEQ43CWG57T73AYOBI5PDZ	resident	\N	2026-07-19 09:58:51.255171	2026-07-19 09:58:51.255171	Fatou	Diallo	\N	\N	12 rue Heurtault, 93300 Aubervilliers	48.916	2.382	\N	\N
b7049f67-a79e-455d-ae23-1d9711ec2c7a	franck.aubry@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$bHw9NGWCK3L2cCPRWLNBCg$OQZ5+aNBEWv/YCzd0j3NwgWcoMyl7qhwns7ov4ODpyM	XTLBQK52CCLDGKOROAYRZLKQZ4SGS234	banned	\N	2026-07-19 09:58:52.974793	2026-07-19 09:58:52.974793	Franck	Aubry	\N	6a5c9fdda6f783f8fe6b09d8	38 rue Julien Lacroix, 75020 Paris	48.8715	2.3833	\N	resident
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

\unrestrict tSsIK4KZXPI7JOz6WnP1omeeTOhQoiToJBNizi29F4d7y8Mn7zlIDhSfrMq1IXu

