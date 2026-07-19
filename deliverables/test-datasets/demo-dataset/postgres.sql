--
-- PostgreSQL database dump
--

\restrict BaO1QwfVSjg7mcKIElYXL3n8BL547b0tfaQpb6FQsDgJ1erbwW3GgAoTzb4Yz1X

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
33de5300-3491-4e4a-acd8-226e75866021	Lampadaire éteint rue Lepic	Le lampadaire devant le 42 ne s'allume plus depuis une semaine, le trottoir est totalement noir le soir.	open	612c6b63-da2a-4693-9375-01a85b2c2077	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.506559	2026-07-19 14:56:27.506559	48.893757	2.348127	neighborhood
7f4c300b-aa42-499e-83a0-55dd02ea3017	Conteneur à verre débordant place des Abbesses	Le conteneur n'a pas été vidé depuis la semaine dernière, les bouteilles s'entassent autour.	open	2be71142-1779-49ed-b55f-698dd68545eb	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.559927	2026-07-19 14:56:27.559927	48.888256	2.339051	neighborhood
3b4ac119-0408-4afb-ab54-733c83039fe7	Trottoir effondré rue Damrémont	Un affaissement s'est formé après les fortes pluies, difficile à franchir en poussette.	open	5a277d88-783c-423f-a507-2e2fb6af80dd	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.568728	2026-07-19 14:56:27.568728	48.897804	2.348438	neighborhood
5591e0af-c193-40aa-b804-e99cc4515ba3	Banc cassé square Louise-Michel	Deux lattes sont arrachées et laissent apparaître des vis, risque de blessure pour les enfants.	open	e22bd119-e927-4b22-970f-bbdd16dd84ca	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.588097	2026-07-19 14:56:27.588097	48.893383	2.348438	neighborhood
b4d38bd7-519a-40c1-87fa-14144d37f78b	Éclairage défaillant dans l'escalier de la rue Foyatier	Une marche sur trois est dans l'ombre, la descente est dangereuse par temps de pluie.	open	3e8bd595-58e6-49a4-98da-d2ac19fd77dc	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.624721	2026-07-19 14:56:27.624721	48.89591	2.346579	neighborhood
5b52b1bd-edc3-4a3d-ae68-3a7844fa0b1e	Voiture ventouse rue Burq	Le même véhicule occupe la place depuis six semaines, pneus à plat et pare-brise couvert d'avis.	open	55ff23d0-bd6d-43bd-b6de-e9e45ae9ee95	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.657349	2026-07-19 14:56:27.657349	48.88741	2.339809	neighborhood
59d22195-e65c-40b1-859b-2d982f8ca6e7	Nuisances sonores nocturnes rue des Trois-Frères	Musique et cris jusqu'à trois heures du matin plusieurs nuits par semaine depuis un mois.	open	53446db9-6f46-467b-aeca-19159817b241	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.679235	2026-07-19 14:56:27.679235	48.89864	2.352268	neighborhood
97d1c7f9-2010-4036-8f81-e867354f9bf9	Branche menaçante square Jehan-Rictus	Une grosse branche est fendue et surplombe l'aire de jeux, il faudrait l'élaguer.	open	df31de38-4d4f-479f-9db8-e63e4d18708d	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.706495	2026-07-19 14:56:27.706495	48.88799	2.345453	neighborhood
4fefba2a-9383-4047-87bd-00d6ed0e99e0	Piste cyclable obstruée par un chantier	Les barrières du chantier empiètent sur toute la largeur de la piste sans déviation balisée.	open	248667a3-5bb9-4b0d-bcd6-457fd3d8bf2e	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.716478	2026-07-19 14:56:27.716478	48.891888	2.346029	neighborhood
9930dc37-431d-46ae-af37-da3cd311badc	Bouche d'égout bruyante rue Véron	La plaque claque à chaque passage de voiture, jour et nuit, sous les fenêtres du 12.	open	877f5496-b8dd-47d1-b661-bb0a2deba875	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.73651	2026-07-19 14:56:27.73651	48.898052	2.340308	neighborhood
c97cd9e9-c946-4521-8a5a-6e3cb2c72a14	Stationnement gênant devant la crèche	Des véhicules se garent systématiquement sur le bateau, les poussettes doivent passer sur la route.	open	cd168ac1-6eda-4167-9061-9c7082f72772	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.777203	2026-07-19 14:56:27.777203	48.89788	2.332139	neighborhood
6c37e057-dd0b-4d18-abee-3cb8f19cad5c	Odeurs persistantes près du local à ordures	Le local n'a pas été lavé depuis longtemps, l'odeur remonte jusqu'au premier étage.	open	0177012d-9b8c-4275-bcb9-dc80ef677926	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.79379	2026-07-19 14:56:27.79379	48.899685	2.351992	neighborhood
8c1a46eb-1f9b-4dca-8bb8-65cccf3c3209	Absence de bac de tri rue Constance	L'immeuble du 7 n'a aucun bac jaune, les cartons finissent dans les ordures ménagères.	open	d1b09528-2b3e-4c5d-bf48-2f8a0636eab1	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.819275	2026-07-19 14:56:27.819275	48.887394	2.337207	neighborhood
4c187b77-7051-41da-9fcf-c6906a35d816	Nid-de-poule dangereux rue Ordener	Trou d'une vingtaine de centimètres au niveau du passage piéton, plusieurs cyclistes ont chuté.	resolved	d1b09528-2b3e-4c5d-bf48-2f8a0636eab1	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.539285	2026-07-19 14:56:29	48.889713	2.330082	neighborhood
ccfdd74c-7803-4a23-86dc-05129369a9ee	Tag sur la façade de l'école élémentaire	Graffiti sur toute la longueur du mur côté cour, visible depuis la rue.	resolved	d4d42f0b-f270-4951-a38d-6297a66373d6	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.551327	2026-07-19 14:56:29.026	48.88808	2.346122	neighborhood
fbf3f826-782a-45f0-a0b5-5d91a31cd976	Fuite d'eau au coin de la rue Marcadet	De l'eau claire coule en continu depuis une bouche d'arrosage et ruisselle sur la chaussée.	resolved	0da094f5-007f-45a8-bf5e-e6fae0b67f28	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.577611	2026-07-19 14:56:29.052	48.884766	2.344088	neighborhood
46f98aa9-b429-4dfe-9619-da91a7bb28b4	Grille d'arbre descellée rue des Martyrs	La grille bascule quand on marche dessus, elle mériterait d'être refixée rapidement.	resolved	bea4ccd4-3a57-483c-91a7-ae11e329b6c9	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.600342	2026-07-19 14:56:29.077	48.892868	2.34755	neighborhood
fb32fe28-17c7-4f23-a720-d939853a05ef	Feu tricolore hors service rue Custine	Le feu clignote en orange dans les deux sens depuis hier matin, la traversée est risquée.	in_progress	6eac4cb7-4f80-41ea-bf50-0a451c921c5e	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.611765	2026-07-19 14:56:29.088	48.896854	2.352577	neighborhood
4a813cf9-f66e-4972-971f-3a4e49a9a154	Poubelles non ramassées depuis trois jours	Les bacs jaunes et verts sont restés sur le trottoir, ils débordent et gênent le passage.	resolved	3121a232-c2bc-4409-84e5-26070344683f	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.635116	2026-07-19 14:56:29.116	48.884125	2.328324	neighborhood
1e6ccbe4-2115-45cc-83db-656999509f4e	Rats aperçus près des poubelles du marché	Plusieurs rongeurs sortent des grilles d'arbre en fin de journée, autour du local à ordures.	in_progress	e022df10-5e19-4837-8b5d-eca7ac29506f	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.646316	2026-07-19 14:56:29.13	48.884235	2.34847	neighborhood
e8bb3d96-fa4a-4f2b-933a-ce64b3879136	Panneau de signalisation arraché rue Lamarck	Le panneau de sens interdit est au sol, les voitures s'engagent à contresens.	resolved	8166de43-60db-4588-b48f-699893a60069	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.668585	2026-07-19 14:56:29.154	48.899124	2.330921	neighborhood
d1a13c59-cf58-4530-94ea-be49d4232c7a	Rambarde descellée escalier rue Chappe	La main courante bouge sur une dizaine de mètres, plusieurs fixations ont sauté.	in_progress	a387e686-0f23-4b32-9e66-da59dfce9ea7	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.687922	2026-07-19 14:56:29.165	48.89895	2.330438	neighborhood
dfdd428a-b6b1-4053-ae5e-27093b0a58c4	Affichage sauvage sur les vitrines vacantes	Des dizaines d'affiches collées sur les rideaux de fer des commerces fermés.	resolved	74878d54-7d43-4c71-a6b0-ca38ebd8862c	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.69646	2026-07-19 14:56:29.188	48.89622	2.341966	neighborhood
8cc3af36-fd51-4ed4-9119-29a758bcd983	Vitre brisée à l'abribus rue Championnet	Le panneau latéral est éclaté, des éclats de verre traînent encore sur le trottoir.	in_progress	13507342-fa7a-418f-939b-df328f02b048	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.761214	2026-07-19 14:56:29.197	48.892326	2.329418	neighborhood
4bb28d0f-ef00-42a7-b26a-00729319c843	Boîte aux lettres vandalisée rue Tholozé	La serrure de la boîte collective a été forcée, le courrier reste accessible à tous.	resolved	0f5a66f8-fc42-47be-a119-34517927df33	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.769644	2026-07-19 14:56:29.22	48.885483	2.338363	neighborhood
deb7098d-67da-4c5b-a56b-05a7215e0391	Défaut d'entretien du jardin partagé	Les allées sont envahies, le composteur déborde et personne ne s'en occupe depuis le printemps.	resolved	987c1e1a-1794-41bf-945d-26727f56f5a0	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.785796	2026-07-19 14:56:29.244	48.884327	2.343823	neighborhood
e7bb15f3-5d56-4222-ad23-a9f416852cc1	Mobilier urbain tagué rue Yvonne-le-Tac	Les deux bancs et la borne d'information ont été recouverts de peinture pendant le week-end.	in_progress	612c6b63-da2a-4693-9375-01a85b2c2077	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.802504	2026-07-19 14:56:29.254	48.900375	2.343237	neighborhood
b4e91168-2aaa-4b4c-bc71-8d2ccc67d79a	Chaussée glissante après les travaux rue Berthe	Le revêtement provisoire devient très glissant dès qu'il pleut, deux chutes constatées.	resolved	6001eff0-6bb2-4358-9ae0-60eff974ea0e	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.81058	2026-07-19 14:56:29.271	48.899223	2.343319	neighborhood
18970f26-66d0-4f46-bd75-43aae6c8427b	Fuite sur la fontaine du square des Batignolles	L'eau coule en continu même robinet fermé, une flaque permanente s'est formée.	open	4ba03cef-0ce8-4e19-95f8-5c33f65fe786	6a5ce58c564b887ea821d898	\N	2026-07-19 14:56:27.980753	2026-07-19 14:56:27.980753	\N	\N	neighborhood
22a408ef-fee8-4c6e-ba29-c6465390d0c0	Abribus dégradé rue de la Gaîté	Le panneau d'horaires est arraché et le banc a été démonté.	open	613fa246-6c72-4236-b1fb-47210da4660e	6a5ce58c564b887ea821d89e	\N	2026-07-19 14:56:27.996084	2026-07-19 14:56:27.996084	\N	\N	neighborhood
f1f78a44-4515-48aa-9505-c9a05f2b56d5	Le bouton « Charger plus » ne répond pas	Sur la liste des services, le bouton reste actif mais aucune nouvelle page n'est chargée.	open	008516fb-eefe-48c4-a959-d31f8b4dcac0	6a5ce58c564b887ea821d897	\N	2026-07-19 14:56:28.641367	2026-07-19 14:56:28.641367	\N	\N	bug
df0e5aad-a0ff-49cf-a827-601e8e7ea2aa	La recherche ignore les accents	Une recherche sur « éclairage » ne remonte pas les annonces écrites sans accent.	open	9195b3ab-d4d9-463d-aeba-4a1fdcf9406b	6a5ce58c564b887ea821d89e	\N	2026-07-19 14:56:28.953428	2026-07-19 14:56:28.953428	\N	\N	bug
c357fdbd-322a-49f1-a2a1-cc9a1c06b44a	Dépôt sauvage devant le 24 rue Caulaincourt	Un matelas et deux cartons de gravats sont abandonnés sur le trottoir depuis samedi.	in_progress	6001eff0-6bb2-4358-9ae0-60eff974ea0e	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.522908	2026-07-19 14:56:28.971	48.895367	2.333468	neighborhood
a6406ce5-d97a-4f71-95e7-a79753080af6	Plaque d'égout descellée rue Antoinette	La plaque se soulève au passage des camions de livraison et retombe de travers.	resolved	d4d42f0b-f270-4951-a38d-6297a66373d6	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.827188	2026-07-19 14:56:29.287	48.886047	2.337783	neighborhood
76e9798a-430b-4aad-8658-ec5e2548f2e1	Sonnette d'immeuble hors service rue Gabrielle	Aucun interphone ne fonctionne au 15, les livreurs sonnent chez les voisins du rez-de-chaussée.	in_progress	5a277d88-783c-423f-a507-2e2fb6af80dd	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.843133	2026-07-19 14:56:29.298	48.88881	2.334582	neighborhood
69e62a0c-6443-44c0-98c5-cc2206012cfc	Éclairage du terrain de sport en panne	Les projecteurs ne s'allument plus, le terrain est inutilisable après 18h en hiver.	resolved	e22bd119-e927-4b22-970f-bbdd16dd84ca	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.85958	2026-07-19 14:56:29.321	48.89635	2.335629	neighborhood
c0b95801-7ead-431d-b7ec-ec37fbb94d5c	Message injurieux reçu en messagerie	Suite à un refus de service, l'utilisateur a envoyé plusieurs messages insultants.	resolved	bea4ccd4-3a57-483c-91a7-ae11e329b6c9	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.875495	2026-07-19 14:56:29.357	48.88879	2.349806	reporting
3d10a26f-4081-46a4-a396-a13be0f87833	Annonce de covoiturage manifestement frauduleuse	Trajet proposé à un tarif absurde avec demande d'acompte immédiat par lien externe.	resolved	3e8bd595-58e6-49a4-98da-d2ac19fd77dc	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.890072	2026-07-19 14:56:29.376	48.89227	2.33109	reporting
3cf57a68-6ca0-43f1-b941-3c95c3e8af36	Annonce dupliquée publiée en série	La même offre de jardinage est publiée six fois avec des titres légèrement différents.	in_progress	e022df10-5e19-4837-8b5d-eca7ac29506f	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.902949	2026-07-19 14:56:29.387	48.891087	2.340681	reporting
4f87e37a-5e4e-4c67-be41-eb0255c4422b	La carte des incidents reste vide au premier chargement	Les marqueurs n'apparaissent qu'après un changement d'onglet et un retour sur la carte.	in_progress	612c6b63-da2a-4693-9375-01a85b2c2077	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.917492	2026-07-19 14:56:29.397	48.893898	2.342956	bug
8279e722-0c37-4ee4-9388-ee84853ac331	Les notifications de messagerie arrivent en double	Chaque nouveau message déclenche deux notifications identiques à quelques secondes d'écart.	resolved	53446db9-6f46-467b-aeca-19159817b241	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.934311	2026-07-19 14:56:29.41	48.89602	2.347748	bug
0b2273e5-7156-4657-929c-62fded91db59	La page de résultats de vote affiche un total erroné	Le total des participations dépasse le nombre de votants sur les scrutins pondérés.	resolved	74878d54-7d43-4c71-a6b0-ca38ebd8862c	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.95058	2026-07-19 14:56:29.424	48.898335	2.346318	bug
33945cda-e7e2-4eaf-9b88-c1f805e3a52a	Éclairage public en panne rue de Belleville	Trois lampadaires consécutifs sont éteints entre le métro et la boulangerie.	in_progress	6a924633-9af9-4503-ba58-9c30a37d6514	6a5ce58c564b887ea821d896	\N	2026-07-19 14:56:27.965725	2026-07-19 14:56:29.43	\N	\N	neighborhood
a7b9888f-8a73-44fe-b0f2-e01e02f099d9	Comportement agressif signalé en messagerie	Relances insistantes et menaces voilées après l'annulation d'une réservation.	resolved	1ff8df9d-6050-48ee-b841-86febf3b31c5	6a5ce58c564b887ea821d896	\N	2026-07-19 14:56:28.331641	2026-07-19 14:56:29.467	\N	\N	reporting
5e4a8479-dc5e-4f63-a513-7be662d5642d	Panneau d'information illisible place Émile-Goudeau	Le plan du quartier est délavé et rayé, il n'est plus lisible pour les visiteurs.	open	2be71142-1779-49ed-b55f-698dd68545eb	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.835271	2026-07-19 14:56:27.835271	48.89331	2.330929	neighborhood
abf570ea-1263-4a73-b33a-816109dda93c	Encombrants abandonnés rue Paul-Albert	Une armoire démontée bloque la moitié du trottoir devant l'entrée de l'immeuble.	open	0da094f5-007f-45a8-bf5e-e6fae0b67f28	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.851497	2026-07-19 14:56:27.851497	48.89787	2.351749	neighborhood
3bf2ae45-8955-41f7-93ed-94a74564ccea	Photo de profil manifestement usurpée	La photo du profil est une image de banque d'images utilisée sur plusieurs autres comptes.	open	6eac4cb7-4f80-41ea-bf50-0a451c921c5e	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.883449	2026-07-19 14:56:27.883449	48.891937	2.342135	reporting
5593d94f-d7fe-499a-856f-2a9e473fe1c5	Propos discriminatoires dans une description d'annonce	L'annonce précise des critères d'exclusion sur l'origine des demandeurs.	open	3121a232-c2bc-4409-84e5-26070344683f	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.896592	2026-07-19 14:56:27.896592	48.88732	2.327405	reporting
a6c32335-6741-4df1-ad0c-a7ffa97a7479	Contenu commercial déguisé en entraide	Une société de nettoyage publie ses prestations tarifées comme s'il s'agissait d'un échange.	open	55ff23d0-bd6d-43bd-b6de-e9e45ae9ee95	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.910461	2026-07-19 14:56:27.910461	48.889107	2.344696	reporting
530d03b0-7487-414e-ba2d-6ad32323c165	Le filtre par catégorie ne se réinitialise pas	Après un retour arrière, la liste reste filtrée alors que le sélecteur affiche « toutes ».	open	8166de43-60db-4588-b48f-699893a60069	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.92579	2026-07-19 14:56:27.92579	48.88943	2.330619	bug
23ead9f1-3062-4693-8ebb-a5c7023d58dd	Impossible de téléverser une photo de plus de 5 Mo	L'envoi échoue sans message d'erreur, le formulaire reste bloqué sur l'indicateur de chargement.	open	a387e686-0f23-4b32-9e66-da59dfce9ea7	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.942341	2026-07-19 14:56:27.942341	48.90018	2.332519	bug
bced2308-d9af-4d56-9ab0-26960dd219d6	Pavés descellés rue des Rosiers	Une dizaine de pavés bougent sous les pieds au milieu de la rue piétonne.	open	38e7c65f-2229-4566-a54f-79a9f1f5fd91	6a5ce58c564b887ea821d895	\N	2026-07-19 14:56:27.958632	2026-07-19 14:56:27.958632	\N	\N	neighborhood
d3642704-5098-4dce-ae8b-cafec37dcb2a	Annonce trompeuse sur un service de bricolage	Le tarif affiché ne correspond pas à celui annoncé une fois le contact établi.	open	960764c5-9d0c-4d80-8752-b3510aa2e1fa	6a5ce58c564b887ea821d895	\N	2026-07-19 14:56:28.163379	2026-07-19 14:56:28.163379	\N	\N	reporting
17ab94fb-8fdc-48f6-9844-da9e5d404cc9	Annonce suspecte : paiement demandé hors plateforme	Une annonce de bricolage renvoie vers un virement bancaire avant toute prestation.	in_progress	612c6b63-da2a-4693-9375-01a85b2c2077	6a5ce58c564b887ea821d894	\N	2026-07-19 14:56:27.868193	2026-07-19 14:56:29.333	48.89493	2.345589	reporting
abb9e96a-d7be-42da-8dbb-a4e416c7604d	Dépôt d'encombrants rue Mouffetard	Cageots et cartons entassés après le marché, non ramassés depuis deux jours.	resolved	4edbee6e-29e0-473b-ba04-823f39d214d1	6a5ce58c564b887ea821d897	\N	2026-07-19 14:56:27.973247	2026-07-19 14:56:29.441	\N	\N	neighborhood
26c443bc-5f40-4fbf-ab84-4df2b0e4bc5a	Marquage au sol effacé boulevard Richard-Lenoir	Le passage piéton n'est presque plus visible, notamment de nuit.	resolved	eeb62541-25c3-4c23-beab-a6814c50e7e8	6a5ce58c564b887ea821d899	\N	2026-07-19 14:56:27.988615	2026-07-19 14:56:29.452	\N	\N	neighborhood
bc31d003-4bb7-4f82-9b14-59652bd5faa1	Faux profil de voisin	Le compte utilise une adresse qui ne correspond à aucun immeuble de la rue indiquée.	in_progress	e253a027-70cd-4800-8b21-09ffa47e39fc	6a5ce58c564b887ea821d899	\N	2026-07-19 14:56:28.479561	2026-07-19 14:56:29.475	\N	\N	reporting
ae9b2c56-19ec-4eb4-97f3-ffc088b89fca	L'export PDF du contrat échoue	Le téléchargement démarre puis s'interrompt, le fichier obtenu fait zéro octet.	resolved	8b038917-4073-4ad3-82b7-609d444f789e	6a5ce58c564b887ea821d898	\N	2026-07-19 14:56:28.7995	2026-07-19 14:56:29.5	\N	\N	bug
\.


--
-- Data for Name: points_balances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.points_balances (id, user_id, balance, updated_at) FROM stdin;
e4a0fab5-6f00-4417-9ed2-fc8cb0146c97	6001eff0-6bb2-4358-9ae0-60eff974ea0e	20	2026-07-19 14:56:17.578567
d24822fd-9d27-474d-8013-e15831fcf2da	d4d42f0b-f270-4951-a38d-6297a66373d6	20	2026-07-19 14:56:17.724006
c5e28dfd-85dc-4718-b9eb-14b984e66217	6eac4cb7-4f80-41ea-bf50-0a451c921c5e	20	2026-07-19 14:56:18.183096
9450a8d1-afab-4c56-8336-9d1d7f61c796	3121a232-c2bc-4409-84e5-26070344683f	20	2026-07-19 14:56:18.32016
4daac7d9-9f50-4442-a457-55699ab28ac8	8166de43-60db-4588-b48f-699893a60069	20	2026-07-19 14:56:18.542953
6b086f47-6861-4498-a672-8212f0f6b8e1	53446db9-6f46-467b-aeca-19159817b241	20	2026-07-19 14:56:18.613931
44885d5e-20ba-4909-85ff-61ecdfd80d40	a387e686-0f23-4b32-9e66-da59dfce9ea7	20	2026-07-19 14:56:18.688946
65240926-31c4-44d9-a59e-9bf35f76d983	877f5496-b8dd-47d1-b661-bb0a2deba875	20	2026-07-19 14:56:18.969103
dcf95cca-d6a5-41da-b90c-88f06dea84b8	987c1e1a-1794-41bf-945d-26727f56f5a0	20	2026-07-19 14:56:19.278275
22ab1b0e-d881-4377-b7b5-65c976524e79	0177012d-9b8c-4275-bcb9-dc80ef677926	20	2026-07-19 14:56:19.353702
d41f7552-fa7b-49aa-a0a6-6316748a9622	38e7c65f-2229-4566-a54f-79a9f1f5fd91	20	2026-07-19 14:56:19.441652
56f3aa6d-e75f-4e90-96b9-de21bffd2f88	960764c5-9d0c-4d80-8752-b3510aa2e1fa	20	2026-07-19 14:56:19.51807
f9a4ebff-f31a-4993-a0db-dab59b3f6a90	6a924633-9af9-4503-ba58-9c30a37d6514	20	2026-07-19 14:56:19.587927
ee7d1e74-18f8-45ec-9b57-c645e1fd7b1b	1ff8df9d-6050-48ee-b841-86febf3b31c5	20	2026-07-19 14:56:19.661979
b57021ad-ac8a-421e-8dfa-fc107391bcbb	4edbee6e-29e0-473b-ba04-823f39d214d1	20	2026-07-19 14:56:19.73297
b6e298c3-d7b4-4abe-8f89-088865309da3	008516fb-eefe-48c4-a959-d31f8b4dcac0	20	2026-07-19 14:56:19.816272
bda800ad-8f92-4597-8b10-1c543475fca7	4ba03cef-0ce8-4e19-95f8-5c33f65fe786	20	2026-07-19 14:56:19.898997
ec720b4f-9b15-4ab3-9a10-650356b04f9a	8b038917-4073-4ad3-82b7-609d444f789e	20	2026-07-19 14:56:19.990023
03dcda37-98e5-440f-8228-1d274e657c83	eeb62541-25c3-4c23-beab-a6814c50e7e8	20	2026-07-19 14:56:20.075601
6656366d-3480-4265-bac2-93a9ebd7e0d6	e253a027-70cd-4800-8b21-09ffa47e39fc	20	2026-07-19 14:56:20.152271
10e932cb-ccfd-4b28-83fc-532747352eaf	a4d7d7f8-b7b0-4bed-957d-3545b756e212	20	2026-07-19 14:56:20.239388
5cdf03ea-3597-4935-8d3d-d675b7375def	ddf009a6-a3bf-4d3b-9620-873475cdb6c7	20	2026-07-19 14:56:20.319195
e5b87871-c28a-46eb-bdd2-08ea8174eab3	a3244363-c3f0-455b-b516-00e58eb1b622	20	2026-07-19 14:56:20.399812
21748acc-0ab8-4d53-9a9f-c7100973d2a2	64afd1e8-e4d6-45a2-9622-d44f3cc0d1fc	20	2026-07-19 14:56:20.47723
55b8b91e-5efd-41a0-9540-73d1af717086	87b0ae96-3fac-4eb6-a978-8a6272df4169	20	2026-07-19 14:56:20.555678
8fbd9790-a38f-4cec-ba44-efdbb376fd85	528af856-d6cc-403e-8d5c-44109d3e9119	20	2026-07-19 14:56:20.642396
ef1ea1b1-02e8-4775-8ac8-395c551cdebf	613fa246-6c72-4236-b1fb-47210da4660e	20	2026-07-19 14:56:20.728245
4da1ccf3-e43e-4fec-97b1-549288687804	9195b3ab-d4d9-463d-aeba-4a1fdcf9406b	20	2026-07-19 14:56:20.812677
ddf8f18b-922d-43b7-92ba-0b8ef2d37ecd	c7e0d9f1-50df-4492-a6c8-0b84629ae27b	20	2026-07-19 14:56:20.888727
25c81b9b-3349-4178-a989-abcb5b8a76eb	b2ec86b0-359b-4a34-8f8d-1bc478526f0c	20	2026-07-19 14:56:20.970833
243026fd-5770-4ff7-a1bd-8b06d061ea0d	238b6169-7df6-4077-ac5c-9b9aa52891de	20	2026-07-19 14:56:21.05082
922f4478-9cc8-4973-85ba-f74267298cba	9a4ea009-cc4d-4e2b-82f9-d6e8dc505a21	20	2026-07-19 14:56:21.131514
a9289145-e623-4c11-b6ac-4a670319bc0e	5fb10d8e-02f5-46f4-ac28-ab0d0af1bda3	20	2026-07-19 14:56:21.209867
bce37d99-a470-4985-86e8-3d7fb231bd95	5b1e1745-600a-491b-b172-02448e683deb	20	2026-07-19 14:56:21.289305
f284d904-3bfb-4b8a-aaec-1947aacc249b	282199da-05dd-4eaa-8609-942d17f0d321	20	2026-07-19 14:56:21.361789
e016c00e-95e2-438e-8e35-cdce128ee09e	12e0e3a5-8460-46ff-a82b-79083e593efc	20	2026-07-19 14:56:21.439768
63db3249-e87b-494b-8340-3858eaca0980	378d6f0a-81a4-4eb2-a52a-ad492347cc14	20	2026-07-19 14:56:21.526355
a7deea73-6146-4826-8993-6ebd233a3293	d6470f4c-b2fc-4713-916a-c28558c3a656	20	2026-07-19 14:56:21.60026
93062e77-651e-4882-a1c2-cf05a6f8633d	fbafe5eb-2936-4516-854f-c6556885ade3	20	2026-07-19 14:56:21.67307
ef714b73-6156-4577-9ca7-f81141284207	8b745990-084c-4e68-8cc8-ea595245d636	20	2026-07-19 14:56:21.750483
782f9010-8c9b-4c88-bffc-e1ef9ce7d638	1b1b1be0-af89-4184-a66d-417f09a80a79	20	2026-07-19 14:56:21.830357
67668f3a-e30a-4d48-8e44-f9432686751b	6b4a583a-c6e8-4802-83b5-c09f14bf6120	20	2026-07-19 14:56:21.909571
421d02ea-f120-4923-a4a4-4ba1c03945b4	2ac9f996-2f7e-4374-b049-843ca7152048	20	2026-07-19 14:56:21.989117
963a189e-26b7-49de-bb32-a55c795dcaeb	58803df8-9b4c-4278-b4ca-de37d50ca981	20	2026-07-19 14:56:22.068701
50cb3e91-2287-4469-9a35-e51934a9ee62	39212aeb-7eaa-46c7-af4c-7b1d16825146	20	2026-07-19 14:56:22.141001
017c4a04-29a7-4306-ad2d-474d17e9b404	c9555846-2963-4242-abd2-79168de0eb53	20	2026-07-19 14:56:22.216881
ef2352c0-8286-4873-8b96-2249c2e56135	907ceb6e-49f3-4a3f-a202-8c7097f6ea8b	20	2026-07-19 14:56:22.299645
a58d8036-0ed8-4195-a2aa-9753309dba8e	d187b7ed-b7e8-47e2-862b-b302f48aad14	20	2026-07-19 14:56:22.373218
80c868db-6814-4de0-9f94-ad5847b12389	3220464f-c8c5-4073-b164-4308eb61af5b	20	2026-07-19 14:56:22.434819
79687e01-543b-43a2-a6c7-95f4c7d86ddb	b16d8998-2cdf-4eac-9a39-78c88f8e7b27	20	2026-07-19 14:56:22.486719
cb16af98-be1e-4b5c-8167-6f271070a18b	55ff23d0-bd6d-43bd-b6de-e9e45ae9ee95	16	2026-07-19 14:56:34.504
8667cf6c-77fa-48fa-9ebc-7e10a4faa521	0da094f5-007f-45a8-bf5e-e6fae0b67f28	18	2026-07-19 14:56:34.617
b291fba9-438f-4f4a-8080-2f066b22289f	3e8bd595-58e6-49a4-98da-d2ac19fd77dc	16	2026-07-19 14:56:34.825
3d479896-bd09-471c-a573-119f7f42f100	2be71142-1779-49ed-b55f-698dd68545eb	24	2026-07-19 14:56:34.826
fd33940c-f937-42d1-bae3-2adf9745ef9b	d1b09528-2b3e-4c5d-bf48-2f8a0636eab1	18	2026-07-19 14:56:34.891
a4e662c7-eed0-430b-a265-fe6fb93420a3	74878d54-7d43-4c71-a6b0-ca38ebd8862c	22	2026-07-19 14:56:34.893
aded0253-8ba4-4f7b-9a4a-83e64c6846d7	e022df10-5e19-4837-8b5d-eca7ac29506f	18	2026-07-19 14:57:01.094
5a3c9539-88e6-41b2-92f6-1454a301846a	0f5a66f8-fc42-47be-a119-34517927df33	16	2026-07-19 14:57:01.132
91628653-2824-48bf-b094-63ed7fc3cddc	e22bd119-e927-4b22-970f-bbdd16dd84ca	18	2026-07-19 14:57:01.161
d4aa5a9f-4b8b-4259-95bb-b1138de1cc81	612c6b63-da2a-4693-9375-01a85b2c2077	18	2026-07-19 14:57:31.06
47f3fa2f-b7fe-4492-9238-a4c7fa74cb0d	13507342-fa7a-418f-939b-df328f02b048	18	2026-07-19 14:57:31.117
469f1065-bce8-4c18-8ed4-a35fe1445cca	5a277d88-783c-423f-a507-2e2fb6af80dd	26	2026-07-19 14:57:31.118
cb869743-bf31-472b-9a3e-2a86fda3b9dd	cd168ac1-6eda-4167-9061-9c7082f72772	16	2026-07-19 14:57:31.155
4789031d-d722-4bc9-b3db-fc5aeafd5e75	df31de38-4d4f-479f-9db8-e63e4d18708d	32	2026-07-19 14:57:31.156
5642909d-fa00-45c2-98a2-fa0e952b3a83	bea4ccd4-3a57-483c-91a7-ae11e329b6c9	18	2026-07-19 14:57:31.192
baefd3a5-cc37-4cc6-b549-e66436d2e2d1	248667a3-5bb9-4b0d-bcd6-457fd3d8bf2e	26	2026-07-19 14:57:31.194
\.


--
-- Data for Name: points_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.points_transactions (id, sender_id, recipient_id, amount, note, created_at, contract_id, type, status, completed_at) FROM stdin;
4b057b3d-7cef-42a3-8443-ebd97a0ad1e5	3220464f-c8c5-4073-b164-4308eb61af5b	612c6b63-da2a-4693-9375-01a85b2c2077	20	Crédit de bienvenue	2026-07-19 14:56:01.454209	\N	bonus	completed	2026-07-19 14:56:01.454209
04636376-8001-475d-abfb-0133cdabab6d	3220464f-c8c5-4073-b164-4308eb61af5b	6001eff0-6bb2-4358-9ae0-60eff974ea0e	20	Crédit de bienvenue	2026-07-19 14:56:01.636005	\N	bonus	completed	2026-07-19 14:56:01.636005
4affa4db-e498-47dd-b19a-006652056e74	3220464f-c8c5-4073-b164-4308eb61af5b	d1b09528-2b3e-4c5d-bf48-2f8a0636eab1	20	Crédit de bienvenue	2026-07-19 14:56:01.783365	\N	bonus	completed	2026-07-19 14:56:01.783365
7adfdbf3-a0b0-4b8b-90c8-71bfc5b089b9	3220464f-c8c5-4073-b164-4308eb61af5b	d4d42f0b-f270-4951-a38d-6297a66373d6	20	Crédit de bienvenue	2026-07-19 14:56:01.923904	\N	bonus	completed	2026-07-19 14:56:01.923904
e75ee206-dcb7-4dc5-9236-810aaa5c4fe4	3220464f-c8c5-4073-b164-4308eb61af5b	2be71142-1779-49ed-b55f-698dd68545eb	20	Crédit de bienvenue	2026-07-19 14:56:02.072818	\N	bonus	completed	2026-07-19 14:56:02.072818
35f44533-6018-4557-9133-6b7d46cf6513	3220464f-c8c5-4073-b164-4308eb61af5b	5a277d88-783c-423f-a507-2e2fb6af80dd	20	Crédit de bienvenue	2026-07-19 14:56:02.243854	\N	bonus	completed	2026-07-19 14:56:02.243854
600f02e7-547e-45b0-99ae-d53d644b5241	3220464f-c8c5-4073-b164-4308eb61af5b	0da094f5-007f-45a8-bf5e-e6fae0b67f28	20	Crédit de bienvenue	2026-07-19 14:56:02.402551	\N	bonus	completed	2026-07-19 14:56:02.402551
4a082031-0c84-4a65-b56d-3546e788315b	3220464f-c8c5-4073-b164-4308eb61af5b	e22bd119-e927-4b22-970f-bbdd16dd84ca	20	Crédit de bienvenue	2026-07-19 14:56:02.57112	\N	bonus	completed	2026-07-19 14:56:02.57112
b0cd06cf-c56e-4972-8e45-f80a16ce4ffb	3220464f-c8c5-4073-b164-4308eb61af5b	bea4ccd4-3a57-483c-91a7-ae11e329b6c9	20	Crédit de bienvenue	2026-07-19 14:56:02.720576	\N	bonus	completed	2026-07-19 14:56:02.720576
3231a0e5-76b3-48de-90a6-f3503a9d2b89	3220464f-c8c5-4073-b164-4308eb61af5b	6eac4cb7-4f80-41ea-bf50-0a451c921c5e	20	Crédit de bienvenue	2026-07-19 14:56:02.872201	\N	bonus	completed	2026-07-19 14:56:02.872201
7a406436-7c91-4535-85f4-b4f62d26ff49	3220464f-c8c5-4073-b164-4308eb61af5b	3e8bd595-58e6-49a4-98da-d2ac19fd77dc	20	Crédit de bienvenue	2026-07-19 14:56:03.016281	\N	bonus	completed	2026-07-19 14:56:03.016281
c16fc4c8-044d-4d32-8160-1d70322f5f13	3220464f-c8c5-4073-b164-4308eb61af5b	3121a232-c2bc-4409-84e5-26070344683f	20	Crédit de bienvenue	2026-07-19 14:56:03.161878	\N	bonus	completed	2026-07-19 14:56:03.161878
f854e39a-e8c5-44cc-bcea-43aa33253c11	3220464f-c8c5-4073-b164-4308eb61af5b	e022df10-5e19-4837-8b5d-eca7ac29506f	20	Crédit de bienvenue	2026-07-19 14:56:03.311017	\N	bonus	completed	2026-07-19 14:56:03.311017
ea24a077-240c-4b26-94a0-fbf772185bc6	3220464f-c8c5-4073-b164-4308eb61af5b	55ff23d0-bd6d-43bd-b6de-e9e45ae9ee95	20	Crédit de bienvenue	2026-07-19 14:56:03.445236	\N	bonus	completed	2026-07-19 14:56:03.445236
1322a710-4b06-4d1e-944e-48ebbfea6067	3220464f-c8c5-4073-b164-4308eb61af5b	8166de43-60db-4588-b48f-699893a60069	20	Crédit de bienvenue	2026-07-19 14:56:03.589945	\N	bonus	completed	2026-07-19 14:56:03.589945
6cd2e167-1322-47fe-b481-0460cc08bdc4	3220464f-c8c5-4073-b164-4308eb61af5b	53446db9-6f46-467b-aeca-19159817b241	20	Crédit de bienvenue	2026-07-19 14:56:03.739996	\N	bonus	completed	2026-07-19 14:56:03.739996
8d36ce63-8db8-4978-b512-88a09dff5e7f	3220464f-c8c5-4073-b164-4308eb61af5b	a387e686-0f23-4b32-9e66-da59dfce9ea7	20	Crédit de bienvenue	2026-07-19 14:56:03.894188	\N	bonus	completed	2026-07-19 14:56:03.894188
5b1d482a-e8ae-4fed-a0bf-88f549b824d8	3220464f-c8c5-4073-b164-4308eb61af5b	74878d54-7d43-4c71-a6b0-ca38ebd8862c	20	Crédit de bienvenue	2026-07-19 14:56:04.037526	\N	bonus	completed	2026-07-19 14:56:04.037526
d40da933-de85-4127-ad14-7565ce9c23d4	3220464f-c8c5-4073-b164-4308eb61af5b	df31de38-4d4f-479f-9db8-e63e4d18708d	20	Crédit de bienvenue	2026-07-19 14:56:04.17847	\N	bonus	completed	2026-07-19 14:56:04.17847
c61b92fc-6a2d-45b2-8dd4-1f91500631c3	3220464f-c8c5-4073-b164-4308eb61af5b	248667a3-5bb9-4b0d-bcd6-457fd3d8bf2e	20	Crédit de bienvenue	2026-07-19 14:56:04.314445	\N	bonus	completed	2026-07-19 14:56:04.314445
067e4eb7-1764-4962-8a7c-2d7f0907c024	3220464f-c8c5-4073-b164-4308eb61af5b	877f5496-b8dd-47d1-b661-bb0a2deba875	20	Crédit de bienvenue	2026-07-19 14:56:04.455903	\N	bonus	completed	2026-07-19 14:56:04.455903
711c8d00-e109-44e3-819b-02d697bc25b4	3220464f-c8c5-4073-b164-4308eb61af5b	13507342-fa7a-418f-939b-df328f02b048	20	Crédit de bienvenue	2026-07-19 14:56:04.596417	\N	bonus	completed	2026-07-19 14:56:04.596417
70a17264-1b18-4686-a298-7ce558b0c056	3220464f-c8c5-4073-b164-4308eb61af5b	0f5a66f8-fc42-47be-a119-34517927df33	20	Crédit de bienvenue	2026-07-19 14:56:04.721034	\N	bonus	completed	2026-07-19 14:56:04.721034
ad21892c-6794-4021-8617-a050df217102	3220464f-c8c5-4073-b164-4308eb61af5b	cd168ac1-6eda-4167-9061-9c7082f72772	20	Crédit de bienvenue	2026-07-19 14:56:04.856521	\N	bonus	completed	2026-07-19 14:56:04.856521
15d6ef7c-527a-48e4-95e7-0c7b075c5c41	3220464f-c8c5-4073-b164-4308eb61af5b	987c1e1a-1794-41bf-945d-26727f56f5a0	20	Crédit de bienvenue	2026-07-19 14:56:05.006992	\N	bonus	completed	2026-07-19 14:56:05.006992
4e088252-d2ea-487b-956d-03c39bd1d518	3220464f-c8c5-4073-b164-4308eb61af5b	0177012d-9b8c-4275-bcb9-dc80ef677926	20	Crédit de bienvenue	2026-07-19 14:56:05.153196	\N	bonus	completed	2026-07-19 14:56:05.153196
8320f573-a9bd-4db5-9a6a-ea0da78ce6b9	3220464f-c8c5-4073-b164-4308eb61af5b	38e7c65f-2229-4566-a54f-79a9f1f5fd91	20	Crédit de bienvenue	2026-07-19 14:56:05.300145	\N	bonus	completed	2026-07-19 14:56:05.300145
319b98cd-b1c7-4046-a2b8-235eb9eaf35d	3220464f-c8c5-4073-b164-4308eb61af5b	960764c5-9d0c-4d80-8752-b3510aa2e1fa	20	Crédit de bienvenue	2026-07-19 14:56:05.440633	\N	bonus	completed	2026-07-19 14:56:05.440633
d37d62e0-9785-4272-9dcc-9e6b59736221	3220464f-c8c5-4073-b164-4308eb61af5b	6a924633-9af9-4503-ba58-9c30a37d6514	20	Crédit de bienvenue	2026-07-19 14:56:05.583973	\N	bonus	completed	2026-07-19 14:56:05.583973
bc3bf353-79ea-43c0-ad8a-93103b846879	3220464f-c8c5-4073-b164-4308eb61af5b	1ff8df9d-6050-48ee-b841-86febf3b31c5	20	Crédit de bienvenue	2026-07-19 14:56:05.720572	\N	bonus	completed	2026-07-19 14:56:05.720572
0f9366d0-5413-4b32-a0c0-b7aa66a12d68	3220464f-c8c5-4073-b164-4308eb61af5b	4edbee6e-29e0-473b-ba04-823f39d214d1	20	Crédit de bienvenue	2026-07-19 14:56:05.867006	\N	bonus	completed	2026-07-19 14:56:05.867006
58a7d097-0763-4bfb-b608-8822802995db	3220464f-c8c5-4073-b164-4308eb61af5b	008516fb-eefe-48c4-a959-d31f8b4dcac0	20	Crédit de bienvenue	2026-07-19 14:56:06.019622	\N	bonus	completed	2026-07-19 14:56:06.019622
4b34a89b-ba96-473d-9c04-d12ef5cc80f3	3220464f-c8c5-4073-b164-4308eb61af5b	4ba03cef-0ce8-4e19-95f8-5c33f65fe786	20	Crédit de bienvenue	2026-07-19 14:56:06.168117	\N	bonus	completed	2026-07-19 14:56:06.168117
d936a517-11e2-461c-a148-9ff41f2e280b	3220464f-c8c5-4073-b164-4308eb61af5b	8b038917-4073-4ad3-82b7-609d444f789e	20	Crédit de bienvenue	2026-07-19 14:56:06.316731	\N	bonus	completed	2026-07-19 14:56:06.316731
7935e4a4-cfea-4592-8801-a0eefc9a1678	3220464f-c8c5-4073-b164-4308eb61af5b	eeb62541-25c3-4c23-beab-a6814c50e7e8	20	Crédit de bienvenue	2026-07-19 14:56:06.453703	\N	bonus	completed	2026-07-19 14:56:06.453703
31f31f06-89cb-470f-a7bd-7f9881d0e96c	3220464f-c8c5-4073-b164-4308eb61af5b	e253a027-70cd-4800-8b21-09ffa47e39fc	20	Crédit de bienvenue	2026-07-19 14:56:06.586168	\N	bonus	completed	2026-07-19 14:56:06.586168
ce6af728-d661-4c94-bedd-f435a97adc8d	3220464f-c8c5-4073-b164-4308eb61af5b	a4d7d7f8-b7b0-4bed-957d-3545b756e212	20	Crédit de bienvenue	2026-07-19 14:56:06.718461	\N	bonus	completed	2026-07-19 14:56:06.718461
f52a06d2-3cf6-4c58-b7d7-443f4c9ce688	3220464f-c8c5-4073-b164-4308eb61af5b	ddf009a6-a3bf-4d3b-9620-873475cdb6c7	20	Crédit de bienvenue	2026-07-19 14:56:06.863525	\N	bonus	completed	2026-07-19 14:56:06.863525
a05ea2e3-132f-4048-90df-505e740a82f8	3220464f-c8c5-4073-b164-4308eb61af5b	a3244363-c3f0-455b-b516-00e58eb1b622	20	Crédit de bienvenue	2026-07-19 14:56:07.010915	\N	bonus	completed	2026-07-19 14:56:07.010915
29b7d404-0089-4b07-a4b6-10ddfb65c67b	3220464f-c8c5-4073-b164-4308eb61af5b	64afd1e8-e4d6-45a2-9622-d44f3cc0d1fc	20	Crédit de bienvenue	2026-07-19 14:56:07.151914	\N	bonus	completed	2026-07-19 14:56:07.151914
cb64d39a-2967-49fb-8c88-f442810fd6a0	3220464f-c8c5-4073-b164-4308eb61af5b	87b0ae96-3fac-4eb6-a978-8a6272df4169	20	Crédit de bienvenue	2026-07-19 14:56:07.304218	\N	bonus	completed	2026-07-19 14:56:07.304218
a3e7ce05-f6ac-49aa-86f8-1ef5c5488cdc	3220464f-c8c5-4073-b164-4308eb61af5b	528af856-d6cc-403e-8d5c-44109d3e9119	20	Crédit de bienvenue	2026-07-19 14:56:07.454618	\N	bonus	completed	2026-07-19 14:56:07.454618
ad0fdca6-717c-465c-a77a-f3be796066e5	3220464f-c8c5-4073-b164-4308eb61af5b	613fa246-6c72-4236-b1fb-47210da4660e	20	Crédit de bienvenue	2026-07-19 14:56:07.604303	\N	bonus	completed	2026-07-19 14:56:07.604303
2e4d32ab-9f72-4301-891b-e929e53ca1ee	3220464f-c8c5-4073-b164-4308eb61af5b	9195b3ab-d4d9-463d-aeba-4a1fdcf9406b	20	Crédit de bienvenue	2026-07-19 14:56:07.755509	\N	bonus	completed	2026-07-19 14:56:07.755509
8dba3ff8-cdfc-4f80-adb5-be7d34b9e9b2	3220464f-c8c5-4073-b164-4308eb61af5b	c7e0d9f1-50df-4492-a6c8-0b84629ae27b	20	Crédit de bienvenue	2026-07-19 14:56:07.903529	\N	bonus	completed	2026-07-19 14:56:07.903529
b1b72c64-329e-4976-8bc0-d5e98b9a51e1	3220464f-c8c5-4073-b164-4308eb61af5b	b2ec86b0-359b-4a34-8f8d-1bc478526f0c	20	Crédit de bienvenue	2026-07-19 14:56:08.059399	\N	bonus	completed	2026-07-19 14:56:08.059399
06684908-0ccb-486f-8061-41621083078b	3220464f-c8c5-4073-b164-4308eb61af5b	238b6169-7df6-4077-ac5c-9b9aa52891de	20	Crédit de bienvenue	2026-07-19 14:56:08.202547	\N	bonus	completed	2026-07-19 14:56:08.202547
474c0dad-8103-4916-9b09-060b244d7f90	3220464f-c8c5-4073-b164-4308eb61af5b	9a4ea009-cc4d-4e2b-82f9-d6e8dc505a21	20	Crédit de bienvenue	2026-07-19 14:56:08.341307	\N	bonus	completed	2026-07-19 14:56:08.341307
8be81737-cc2a-4ecf-a99f-4ee714ecc6c5	3220464f-c8c5-4073-b164-4308eb61af5b	5fb10d8e-02f5-46f4-ac28-ab0d0af1bda3	20	Crédit de bienvenue	2026-07-19 14:56:08.481683	\N	bonus	completed	2026-07-19 14:56:08.481683
4e1dc064-366b-4a68-856e-f959fb53f4fe	3220464f-c8c5-4073-b164-4308eb61af5b	5b1e1745-600a-491b-b172-02448e683deb	20	Crédit de bienvenue	2026-07-19 14:56:08.629434	\N	bonus	completed	2026-07-19 14:56:08.629434
aeccf674-0185-41a1-93d8-fca49150a031	3220464f-c8c5-4073-b164-4308eb61af5b	282199da-05dd-4eaa-8609-942d17f0d321	20	Crédit de bienvenue	2026-07-19 14:56:08.767574	\N	bonus	completed	2026-07-19 14:56:08.767574
7dd7715a-fdec-4dd4-bcc9-fe4c067ec81b	3220464f-c8c5-4073-b164-4308eb61af5b	12e0e3a5-8460-46ff-a82b-79083e593efc	20	Crédit de bienvenue	2026-07-19 14:56:08.913907	\N	bonus	completed	2026-07-19 14:56:08.913907
a63be1c6-1e32-4fe6-a277-f3589d2ace71	3220464f-c8c5-4073-b164-4308eb61af5b	378d6f0a-81a4-4eb2-a52a-ad492347cc14	20	Crédit de bienvenue	2026-07-19 14:56:09.056226	\N	bonus	completed	2026-07-19 14:56:09.056226
7ba1d291-3564-41d2-a9b0-b6ef25aa4a35	3220464f-c8c5-4073-b164-4308eb61af5b	d6470f4c-b2fc-4713-916a-c28558c3a656	20	Crédit de bienvenue	2026-07-19 14:56:09.204242	\N	bonus	completed	2026-07-19 14:56:09.204242
37fd41f1-ebe3-442b-b5f1-48b3caf8c669	3220464f-c8c5-4073-b164-4308eb61af5b	fbafe5eb-2936-4516-854f-c6556885ade3	20	Crédit de bienvenue	2026-07-19 14:56:09.348956	\N	bonus	completed	2026-07-19 14:56:09.348956
017f51c3-0d69-4979-b847-a633de4a324c	3220464f-c8c5-4073-b164-4308eb61af5b	8b745990-084c-4e68-8cc8-ea595245d636	20	Crédit de bienvenue	2026-07-19 14:56:09.492618	\N	bonus	completed	2026-07-19 14:56:09.492618
a82e706b-9423-4a85-a734-752a89260ad6	3220464f-c8c5-4073-b164-4308eb61af5b	1b1b1be0-af89-4184-a66d-417f09a80a79	20	Crédit de bienvenue	2026-07-19 14:56:09.628236	\N	bonus	completed	2026-07-19 14:56:09.628236
5953cacf-3258-4fff-b0de-6a3e00ded575	3220464f-c8c5-4073-b164-4308eb61af5b	6b4a583a-c6e8-4802-83b5-c09f14bf6120	20	Crédit de bienvenue	2026-07-19 14:56:09.756166	\N	bonus	completed	2026-07-19 14:56:09.756166
069a6b39-e885-4780-846a-968e33140fd7	3220464f-c8c5-4073-b164-4308eb61af5b	2ac9f996-2f7e-4374-b049-843ca7152048	20	Crédit de bienvenue	2026-07-19 14:56:09.903778	\N	bonus	completed	2026-07-19 14:56:09.903778
1941af7c-535f-4cc7-adfd-64f44984f8ca	3220464f-c8c5-4073-b164-4308eb61af5b	58803df8-9b4c-4278-b4ca-de37d50ca981	20	Crédit de bienvenue	2026-07-19 14:56:10.056611	\N	bonus	completed	2026-07-19 14:56:10.056611
7764662f-23f3-4a83-b982-6d6854a62dc8	3220464f-c8c5-4073-b164-4308eb61af5b	39212aeb-7eaa-46c7-af4c-7b1d16825146	20	Crédit de bienvenue	2026-07-19 14:56:10.200616	\N	bonus	completed	2026-07-19 14:56:10.200616
0db54ba1-275d-48f0-b558-dcb06e99dd47	3220464f-c8c5-4073-b164-4308eb61af5b	c9555846-2963-4242-abd2-79168de0eb53	20	Crédit de bienvenue	2026-07-19 14:56:10.354358	\N	bonus	completed	2026-07-19 14:56:10.354358
0bc3bd39-e848-478c-b02a-f312a7586ded	3220464f-c8c5-4073-b164-4308eb61af5b	907ceb6e-49f3-4a3f-a202-8c7097f6ea8b	20	Crédit de bienvenue	2026-07-19 14:56:10.508087	\N	bonus	completed	2026-07-19 14:56:10.508087
9c283ff9-91cd-46ff-be51-9f1f11eb973b	3220464f-c8c5-4073-b164-4308eb61af5b	d187b7ed-b7e8-47e2-862b-b302f48aad14	20	Crédit de bienvenue	2026-07-19 14:56:10.654419	\N	bonus	completed	2026-07-19 14:56:10.654419
30e40c93-b08b-40e4-ae7c-d240159fb56e	3220464f-c8c5-4073-b164-4308eb61af5b	3220464f-c8c5-4073-b164-4308eb61af5b	20	Crédit de bienvenue	2026-07-19 14:56:11.700827	\N	bonus	completed	2026-07-19 14:56:11.700827
40fd6a0c-af78-4a71-8cce-c5fae0bdb3ab	3220464f-c8c5-4073-b164-4308eb61af5b	b16d8998-2cdf-4eac-9a39-78c88f8e7b27	20	Crédit de bienvenue	2026-07-19 14:56:11.843246	\N	bonus	completed	2026-07-19 14:56:11.843246
39560dbf-bf25-4fcc-b3fd-411164f74609	bea4ccd4-3a57-483c-91a7-ae11e329b6c9	612c6b63-da2a-4693-9375-01a85b2c2077	3	Service payment: Initiation à la photo numérique	2026-07-19 14:56:33.675397	6a5ce5a1564b887ea821e2e5	service_payment	pending	\N
7c7d61a9-128c-40be-a7de-81acfedc2b34	8166de43-60db-4588-b48f-699893a60069	612c6b63-da2a-4693-9375-01a85b2c2077	3	Service payment: Cours de jardinage sur balcon	2026-07-19 14:56:33.770344	6a5ce5a1564b887ea821e2eb	service_payment	pending	\N
1a2f411c-18ec-4b3d-9b25-3268a57ee45e	612c6b63-da2a-4693-9375-01a85b2c2077	6eac4cb7-4f80-41ea-bf50-0a451c921c5e	6	Service payment: Aide au déménagement de petit volume	2026-07-19 14:56:33.807446	6a5ce5a1564b887ea821e2ee	service_payment	pending	\N
aebabbeb-7f84-4d66-80f0-003412619858	53446db9-6f46-467b-aeca-19159817b241	6001eff0-6bb2-4358-9ae0-60eff974ea0e	3	Service payment: Montage de meubles en kit	2026-07-19 14:56:34.249384	6a5ce5a2564b887ea821e315	service_payment	pending	\N
24123f42-badb-4d25-80b8-70a3077660d0	a387e686-0f23-4b32-9e66-da59dfce9ea7	8166de43-60db-4588-b48f-699893a60069	8	Service payment: Recherche baby-sitter pour une soirée	2026-07-19 14:56:34.281317	6a5ce5a2564b887ea821e318	service_payment	pending	\N
29965e4a-4704-496d-a442-2f92566279a8	612c6b63-da2a-4693-9375-01a85b2c2077	6a924633-9af9-4503-ba58-9c30a37d6514	3	Service payment: Cours de cuisine végétarienne	2026-07-19 14:56:33.873409	6a5ce5a1564b887ea821e2f1	service_payment	cancelled	\N
da5d6946-d6f9-4e30-ad64-026fe8ced845	55ff23d0-bd6d-43bd-b6de-e9e45ae9ee95	612c6b63-da2a-4693-9375-01a85b2c2077	4	Service payment: Préparation de repas maison pour la semaine	2026-07-19 14:56:33.731793	6a5ce5a1564b887ea821e2e8	service_payment	completed	2026-07-19 14:56:34.507
a1a4cc89-7ff6-4b90-99db-4ed62646b0f1	0da094f5-007f-45a8-bf5e-e6fae0b67f28	5a277d88-783c-423f-a507-2e2fb6af80dd	2	Service payment: Dépannage informatique à domicile	2026-07-19 14:56:33.977406	6a5ce5a1564b887ea821e2fa	service_payment	completed	2026-07-19 14:56:34.62
8ec097a7-02b7-4e12-a224-8e70ea32d830	3e8bd595-58e6-49a4-98da-d2ac19fd77dc	2be71142-1779-49ed-b55f-698dd68545eb	4	Service payment: Garde d'enfants après l'école	2026-07-19 14:56:34.196625	6a5ce5a2564b887ea821e30f	service_payment	completed	2026-07-19 14:56:34.827
96a08385-b0cd-405b-9eee-ae2df399dcff	d1b09528-2b3e-4c5d-bf48-2f8a0636eab1	74878d54-7d43-4c71-a6b0-ca38ebd8862c	2	Service payment: Conversation en anglais autour d'un café	2026-07-19 14:56:34.222835	6a5ce5a2564b887ea821e312	service_payment	completed	2026-07-19 14:56:34.895
c57efb0e-81be-49b6-b994-fd65e328f158	612c6b63-da2a-4693-9375-01a85b2c2077	df31de38-4d4f-479f-9db8-e63e4d18708d	4	Service payment: Peinture de petites surfaces	2026-07-19 14:56:33.915083	6a5ce5a1564b887ea821e2f4	service_payment	completed	2026-07-19 14:57:01.051
a9caba60-a947-4bc8-8085-917c2c768d53	e022df10-5e19-4837-8b5d-eca7ac29506f	5a277d88-783c-423f-a507-2e2fb6af80dd	2	Service payment: Dépannage informatique à domicile	2026-07-19 14:56:34.015894	6a5ce5a1564b887ea821e2fd	service_payment	completed	2026-07-19 14:57:01.097
4f965f67-a171-4e3c-bbad-fa27cccb1bec	0f5a66f8-fc42-47be-a119-34517927df33	df31de38-4d4f-479f-9db8-e63e4d18708d	4	Service payment: Peinture de petites surfaces	2026-07-19 14:56:34.085119	6a5ce5a2564b887ea821e303	service_payment	completed	2026-07-19 14:57:01.133
433cd683-1048-4e2e-a561-9fcd13428338	e22bd119-e927-4b22-970f-bbdd16dd84ca	248667a3-5bb9-4b0d-bcd6-457fd3d8bf2e	2	Service payment: Transport de courses lourdes jusqu'à l'étage	2026-07-19 14:56:34.146828	6a5ce5a2564b887ea821e309	service_payment	completed	2026-07-19 14:57:01.163
a8fe4fd8-fb4e-4663-8ccb-4bba48cf77c1	612c6b63-da2a-4693-9375-01a85b2c2077	248667a3-5bb9-4b0d-bcd6-457fd3d8bf2e	2	Service payment: Transport de courses lourdes jusqu'à l'étage	2026-07-19 14:56:33.945975	6a5ce5a1564b887ea821e2f7	service_payment	completed	2026-07-19 14:57:31.064
aeaa39f3-c36b-494e-93a1-3f9fac329c89	13507342-fa7a-418f-939b-df328f02b048	5a277d88-783c-423f-a507-2e2fb6af80dd	2	Service payment: Dépannage informatique à domicile	2026-07-19 14:56:34.054325	6a5ce5a2564b887ea821e300	service_payment	completed	2026-07-19 14:57:31.119
2f9fd10a-8da9-4d85-9d29-613d20f74917	cd168ac1-6eda-4167-9061-9c7082f72772	df31de38-4d4f-479f-9db8-e63e4d18708d	4	Service payment: Peinture de petites surfaces	2026-07-19 14:56:34.115951	6a5ce5a2564b887ea821e306	service_payment	completed	2026-07-19 14:57:31.157
6ba52ca9-2842-4c49-a120-5c1e3c7593bd	bea4ccd4-3a57-483c-91a7-ae11e329b6c9	248667a3-5bb9-4b0d-bcd6-457fd3d8bf2e	2	Service payment: Transport de courses lourdes jusqu'à l'étage	2026-07-19 14:56:34.170885	6a5ce5a2564b887ea821e30c	service_payment	completed	2026-07-19 14:57:31.195
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
d1b09528-2b3e-4c5d-bf48-2f8a0636eab1	camille.bernard@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$prOM54E+4DYYVB/cD/fm9w$xE7oeakaDFhHUxN+PZkUJ95JqVb4jcRpC+t9ZO1QDl8	VQ7EBK6B5VFBL7CNZ5ZNVAM7GHH35YSM	resident	$argon2id$v=19$m=65536,t=3,p=4$5aj8fHPnRO4zwvuqMLoJPQ$zLXnXAFLjxs6b8VdE8ZT54N27lX5OEigdZucYh9cmrY	2026-07-19 14:56:01.783365	2026-07-19 14:56:01.783365	Camille	Bernard	\N	6a5ce58c564b887ea821d894	28 Rue Ganneron 75018 Paris	48.88716	2.32863	+33612333033	\N
5a277d88-783c-423f-a507-2e2fb6af80dd	thomas.girard@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$lzKblmYz3lNbIiJyhQ8EOA$mO1dwBMmgkqMSjP1KiMSgooH6onXaAVDBa+y3PZVtXk	WTKOWYEKZKDPRXWAFT66DR6WZZNQRIBZ	resident	$argon2id$v=19$m=65536,t=3,p=4$HFDuF00MWW+n6BYj3WxYOA$yz1BuDrawqfrwoPO2OtlhWLlk1r6hLp/A5nGvUS73po	2026-07-19 14:56:02.243854	2026-07-19 14:56:02.243854	Thomas	Girard	\N	6a5ce58c564b887ea821d894	6 Rue Steinlen 75018 Paris	48.888855	2.332706	+33612666066	\N
0da094f5-007f-45a8-bf5e-e6fae0b67f28	lea.rousseau@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$qGBn38t+Fw/lkL2KGRVnlg$CqlFzX+D43WFEl3q3Q3JJX0cmaMXzDcln2tB4TM3ivI	4NBWQYAKI33FFYPOEBDP56Y5ZH27W54W	resident	$argon2id$v=19$m=65536,t=3,p=4$qs+5Gan8T2QO8P6zU4Te8A$X7JbJR+llJfNPvaYm1bk5h8rnOIAf5p46hItQLcac7g	2026-07-19 14:56:02.402551	2026-07-19 14:56:02.402551	Léa	Rousseau	\N	6a5ce58c564b887ea821d894	31 Rue Simart 75018 Paris	48.891342	2.347124	+33612777077	\N
e22bd119-e927-4b22-970f-bbdd16dd84ca	nicolas.fontaine@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$WBJxo5CYOmR0UAOIUavhow$SFgazovdYjTZj1Hj5rrDJFe17jGkAtYuOPt9cAca1fA	JYESGLPA7MUJXL6FYK6IN2ZDT4G7DTBH	resident	$argon2id$v=19$m=65536,t=3,p=4$2m3e2oDksYNbYz+XWL7zhA$9jinMAuWfUymlBsIntDb1fzR5h3VqzSIxrtMjhiQgQE	2026-07-19 14:56:02.57112	2026-07-19 14:56:02.57112	Nicolas	Fontaine	\N	6a5ce58c564b887ea821d894	180 Boulevard Ney 75018 Paris	48.897842	2.330422	\N	\N
bea4ccd4-3a57-483c-91a7-ae11e329b6c9	emilie.chevalier@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$GkYCtx7AKUqTBG1Gz5UvVQ$bc8zr3duDv7qF0UI9iZa+XTsJ7qTRWbp+2er9udGwxg	4V4SYV2MOV3URFIVG7KTTXA2HFSLEHRD	resident	$argon2id$v=19$m=65536,t=3,p=4$comJl+aNAmbrebsZ6mB2kw$XKogjgjTjaIV9x1nj3mHWxC44xL23aGcKckHwczeIxg	2026-07-19 14:56:02.720576	2026-07-19 14:56:02.720576	Émilie	Chevalier	\N	6a5ce58c564b887ea821d894	6 Impasse Massonnet 75018 Paris	48.895756	2.351727	\N	\N
3121a232-c2bc-4409-84e5-26070344683f	hugo.marchand@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$eklqiNL706ric+7e0CIv/w$/CTqQLYHYMq6gpO5MGGY6uQEBqVqrMQzvHbvGiFM0H8	2B4OXDZM5FJFZQV4BBWKN5HZSWORYJRP	resident	$argon2id$v=19$m=65536,t=3,p=4$OLTVpqqMgHrL2h8CrfV7tw$2CZNYIZ/zxBmuXLsKoTnBoOkxvyQnvuQvYGU50/HQnY	2026-07-19 14:56:03.161878	2026-07-19 14:56:03.161878	Hugo	Marchand	\N	6a5ce58c564b887ea821d894	143B Rue Ordener 75018 Paris	48.89312	2.339341	+33612999099	\N
e022df10-5e19-4837-8b5d-eca7ac29506f	chloe.barbier@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$+U/zm+iTOMiB7fa6OQEgWA$DJm38Oof1XL88iMOlkICY0d6q6BoYGixDnsZjhAtY54	7SWT4PMNQ5QY67DP4OL5RJOOQVSUEYN2	resident	$argon2id$v=19$m=65536,t=3,p=4$y4n3mSkfzrk/n68yZkKMKQ$+63hTRpfc2o/eGAJ9ag1+ARFGmG6yFJ+p/oGuBrm9tE	2026-07-19 14:56:03.311017	2026-07-19 14:56:03.311017	Chloé	Barbier	\N	6a5ce58c564b887ea821d894	128B Boulevard de Clichy 75018 Paris	48.884632	2.329114	\N	\N
55ff23d0-bd6d-43bd-b6de-e9e45ae9ee95	maxime.renaud@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$LZCQ+mU43RPO65kAqftAqg$C2YogHvisUWMDV+UHOe6m9rHl5oFLSEbLOhRtyexuWI	VADESTO4DIB2WPKIC3WV6JYKQZKT5OFS	resident	$argon2id$v=19$m=65536,t=3,p=4$uTRWpq1Y69mFFWSU523nig$OlHEAsXKePX37hePZ0Xgbxost1INxK+YgRndmaW6oXc	2026-07-19 14:56:03.445236	2026-07-19 14:56:03.445236	Maxime	Renaud	\N	6a5ce58c564b887ea821d894	4 Villa Dancourt 75018 Paris	48.883045	2.341077	\N	\N
a387e686-0f23-4b32-9e66-da59dfce9ea7	claire.fabre@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$IBbGziGSEED3B5fGpP0wBg$WbIbdjqXfxpJOxjB2Fi97RbljOD7UQfqWLwX/wv6c50	6F6D3CCMAUD53WEVMNKO4B44FYM3UQMH	resident	$argon2id$v=19$m=65536,t=3,p=4$FyRyAG78vJUlBqnt0brpMQ$TltLExa477CL22jeZ/Raq9i89oIXtRVnDR2g1jLB2a0	2026-07-19 14:56:03.894188	2026-07-19 14:56:03.894188	Claire	Fabre	\N	6a5ce58c564b887ea821d894	5 Rue Puget 75018 Paris	48.88412	2.333571	\N	\N
74878d54-7d43-4c71-a6b0-ca38ebd8862c	romain.guerin@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$BBtUjpJF6/xDaKPIRj4GCA$e5yRNf+Mzz1KgGTig3t7+2y536ndQWggSueXyDhCb1U	Q3FEQ7C73MIH2ZONYBSO62QDEXPUZUSX	resident	$argon2id$v=19$m=65536,t=3,p=4$H415Mwf1c6nKNsedWEKflw$mY7bTvxxTflptg9jlA09UqlrQ07K+SH3AoILM0vYYaI	2026-07-19 14:56:04.037526	2026-07-19 14:56:04.037526	Romain	Guérin	\N	6a5ce58c564b887ea821d894	4 Rue Carpeaux 75018 Paris	48.890396	2.330252	\N	\N
df31de38-4d4f-479f-9db8-e63e4d18708d	pauline.colin@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$/4SGbhmaFV1vonbPYnxdGg$byeHesy9o6ChPJt4IXs2hlvoqrfPMbSMksoLzKMr0MA	APS7W6C4UTJ2HLBCSHWXLFFPBGDBIDIA	resident	$argon2id$v=19$m=65536,t=3,p=4$EFPGEnxB15I4Vry4FhSjMw$vPkNo92Kk+PfiZVqE3bUsOm8vd37GpZa5VM3sYMEq+s	2026-07-19 14:56:04.17847	2026-07-19 14:56:04.17847	Pauline	Colin	\N	6a5ce58c564b887ea821d894	40 Rue du Poteau 75018 Paris	48.89452	2.341271	\N	\N
13507342-fa7a-418f-939b-df328f02b048	guillaume.masson@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$rQAi6fcvdOX1+rly3iJPXQ$qIqy4IbB+3uuMFn7gTrTVLAMRXomwoafbEijPO5t9aM	JRZFE6EVKLVCUKUBDDPVGYIBQ3AK6Y6M	resident	$argon2id$v=19$m=65536,t=3,p=4$wtYXnyShKNyiZeNYBWg8xg$PJuYRGab8Jyxm8+pEEsFjVURPhSOlonk+McA6jlqQQg	2026-07-19 14:56:04.596417	2026-07-19 14:56:04.596417	Guillaume	Masson	\N	6a5ce58c564b887ea821d894	146 Avenue de Saint-Ouen 75018 Paris	48.896885	2.328919	\N	\N
0f5a66f8-fc42-47be-a119-34517927df33	amandine.poirier@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$2YRBRsHjgGG2jR0e6fD2yQ$iIK1za4g3jXMfZWKwtqkuzJ9Faiu5uaToBukJNVdT7g	B42BIE2I7YCOZ2WNUPSKXT65JSQVNCBN	resident	$argon2id$v=19$m=65536,t=3,p=4$UvwBsegxj2ycBxNhVOyktQ$V68tgXco1E70DvrqLOpEI3GgGUkY+zTjnQLLI5fkhSQ	2026-07-19 14:56:04.721034	2026-07-19 14:56:04.721034	Amandine	Poirier	\N	6a5ce58c564b887ea821d894	36B Avenue Junot 75018 Paris	48.889156	2.33666	\N	\N
cd168ac1-6eda-4167-9061-9c7082f72772	kevin.charpentier@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$1zMVRCppuJ2XDg0VdkR/Hg$JjLiqjOdaUJvb1FIHx9JPymvtbt52/o0tzM2PCgKHUM	6BPHR6PKHUTGKQT66TZEEF55FGJDEZHV	resident	$argon2id$v=19$m=65536,t=3,p=4$VA1X2AltgLcUzwJcpmg57g$Z9ETuOCAk7zeXK7eR4JF2Nj8qtvWar7lotImk+gGubc	2026-07-19 14:56:04.856521	2026-07-19 14:56:04.856521	Kévin	Charpentier	\N	6a5ce58c564b887ea821d894	100 Rue de Clignancourt 75018 Paris	48.891544	2.348809	\N	\N
0177012d-9b8c-4275-bcb9-dc80ef677926	olivier.deschamps@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$AYzUd/7vOygnr1a6FbN3YQ$Nu2tW3/y7ECQHyxEqvkSbWdG+qqAKJot0t7eRfpW1aY	7ETE373XXPDHJGJRYUT3CANI4WQ67MOL	resident	$argon2id$v=19$m=65536,t=3,p=4$4rIFM21IEUbDLz4rqhbA6A$Xd4VzXWP9DRyPhcLRNE6VMc0WkKaxlg6vgPkq5FZyO8	2026-07-19 14:56:05.153196	2026-07-19 14:56:05.153196	Olivier	Deschamps	\N	6a5ce58c564b887ea821d894	17 Rue Cauchois 75018 Paris	48.885414	2.333008	\N	\N
6a924633-9af9-4503-ba58-9c30a37d6514	ines.bouvier@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$VRtFX3ZVJjWXdvOJLzk6sQ$vhxeUnyUh2hIpDXaTYssViwFdP+pmrE9xyDzztErOBE	GEG3Z5LZDHIFKVTVS3ZTJAITIGDIP6OR	moderator	$argon2id$v=19$m=65536,t=3,p=4$z/QuxXOZIo1W/18tA8PgkA$OJc9JNg9KjCFS8v52agQXLGNjaWvFMrWrg/avxLqQcg	2026-07-19 14:56:05.583973	2026-07-19 14:56:05.583973	Inès	Bouvier	\N	6a5ce58c564b887ea821d896	38 Rue des Maronites 75020 Paris	48.868484	2.384715	+33613332132	\N
960764c5-9d0c-4d80-8752-b3510aa2e1fa	pierre.lacroix@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$iT05j5VfZSJaBkl1Gp+BnQ$zBaPlKjC6Q13Y1L3dBZ4mRca1fs0HIxe5os1dm0BahE	WMYQ2IZ6N7HAHNILUVJBT5MHL5WECBRJ	resident	$argon2id$v=19$m=65536,t=3,p=4$NSADBo8pk5lrMu5rAzo3Tg$/80Yq/yueXma+slsahMh2jrt+E5VgA+jgY3/poYxnQ8	2026-07-19 14:56:05.440633	2026-07-19 14:56:05.440633	Pierre	Lacroix	\N	6a5ce58c564b887ea821d895	21 Rue des Minimes 75003 Paris	48.857346	2.364825	+33613221121	\N
6001eff0-6bb2-4358-9ae0-60eff974ea0e	bob@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$NZSUgSgJR4t/8LQIay7ehA$lEWlKWfsn/WoaQjBHGoqAJSL44CXbAPvZL7gPx9K/kk	K7QM4TZBX2VNHR5CJWYD6LPS3AF4EGU2	moderator	$argon2id$v=19$m=65536,t=3,p=4$ZKnzHjnliYGZzB8Tf2c2YA$BqpoyZPx8Egg9UWRQgQeBzQcci7Ww7g9m6jOhAcnCrI	2026-07-19 14:56:01.636005	2026-07-19 14:56:01.636005	Bob	Dupont	\N	6a5ce58c564b887ea821d894	44 Rue Custine 75018 Paris	48.889168	2.345603	+33612111011	\N
9195b3ab-d4d9-463d-aeba-4a1fdcf9406b	theo.bourgeois@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$xxsfpgeA37vF+k7TXcka7w$WrgWuY/Q5oEgllBT6YTN2UtpILmqCw0m2orW+sbtyEs	2BOHJAYHV3JVM4VPJATBYRJ4AIB6JQVO	resident	$argon2id$v=19$m=65536,t=3,p=4$u9b/8ZcZfsSZEIBqgJXT7g$5lFm2bLeqw77KrPpCqExtouP6VCKdl6QX30vkYx9nEA	2026-07-19 14:56:07.755509	2026-07-19 14:56:07.755509	Théo	Bourgeois	\N	6a5ce58c564b887ea821d89e	271 Boulevard Raspail 75014 Paris	48.836884	2.331786	\N	\N
eeb62541-25c3-4c23-beab-a6814c50e7e8	oceane.roy@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$SX23fmoLr84Nfyz+xnpSbQ$g8n17YOzkaWhfr0Op5+WSmAnhBbo2Y8zg2ncEAZDPio	L5SDZAE22EUIXLRA567ITBT4EY6QUXLQ	resident	$argon2id$v=19$m=65536,t=3,p=4$IWz/LWk9PP9kC9Z/SB3H0A$AqYtY80UqmAVpATEUXDcQcnIGoA24LeZS7cGOxYBYhQ	2026-07-19 14:56:06.453703	2026-07-19 14:56:06.453703	Océane	Roy	\N	6a5ce58c564b887ea821d899	9B Rue Michel Chasles 75012 Paris	48.847153	2.37371	+33613665165	\N
238b6169-7df6-4077-ac5c-9b9aa52891de	margaux.rey@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$lgFdPK4IWd6Ep67QWz+a0Q$pNRsaBoVrONEWOpXeTnXd3gP2UhqEZBf230XyLAVcJ4	UX3X43FHDHJAYDA7JOSEVFOYKXJQWUCU	resident	$argon2id$v=19$m=65536,t=3,p=4$Kxzqhv8tofxEFWmpOUkYEQ$jkJsi+hDyOTnmaI1KGXzCtBT/d1X3gnT/IKo1AG+EDI	2026-07-19 14:56:08.202547	2026-07-19 14:56:08.202547	Margaux	Rey	\N	6a5ce58c564b887ea821d8a1	31 Villa Godin 75020 Paris	48.859447	2.400277	\N	\N
613fa246-6c72-4236-b1fb-47210da4660e	lucie.gaillard@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$EOD0gmPfnVLf1qpITyrczA$0rDS3rELIDmgYHlv3K1SZNjHIMWZa/+vmaQ8V8ahK50	WFSEQ5PKH3S7XUUZOVPZZX2RHL4VT2JM	resident	$argon2id$v=19$m=65536,t=3,p=4$gW2juZDcv3JWaUqI5+BzZQ$/e0UEiPkK01WWWMKkL4Z1EifiIJFQvkE+Eqd7kJyXsA	2026-07-19 14:56:07.604303	2026-07-19 14:56:07.604303	Lucie	Gaillard	\N	6a5ce58c564b887ea821d89e	283 Boulevard Raspail 75014 Paris	48.836117	2.332072	\N	\N
a4d7d7f8-b7b0-4bed-957d-3545b756e212	alix.marty@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$7DqwY37CGIh767bumJwIOA$pDNcvMf7y8VuOLbR80MRQKTGA1oaD5g/flAYoeE0TGE	677WVWC4V3NND2GSC3J4ILLTCT2V4TZG	resident	\N	2026-07-19 14:56:06.718461	2026-07-19 14:56:06.718461	Alix	Marty	\N	6a5ce58c564b887ea821d89a	25 Rue Gandon 75013 Paris	48.820766	2.361182	\N	\N
a3244363-c3f0-455b-b516-00e58eb1b622	helene.vasseur@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$Qe+e1ynYetG4QbFxqeGXSA$+94yKItw3TSjvpokWNVeCuBv2LJxEy35L9OFp09oly0	54GKIYZI6LNHAYQ3O67DZYRF777D4OAC	resident	\N	2026-07-19 14:56:07.010915	2026-07-19 14:56:07.010915	Hélène	Vasseur	\N	6a5ce58c564b887ea821d89b	21 Rue du Terrage 75010 Paris	48.87736	2.362756	\N	\N
64afd1e8-e4d6-45a2-9622-d44f3cc0d1fc	bastien.noel@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$hZadQmuHtoqU2zV2tpKRvQ$W4sIVet5oOK0DoMXxqUO/e567KSVRM01bcE6tn19uWI	AWA6THMN7BYZBUGHYJYQT4CZK2L2MQ4M	resident	\N	2026-07-19 14:56:07.151914	2026-07-19 14:56:07.151914	Bastien	Noël	\N	6a5ce58c564b887ea821d8a0	18 Rue Chalgrin 75116 Paris	48.874817	2.288958	\N	\N
528af856-d6cc-403e-8d5c-44109d3e9119	samuel.ferrand@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$yFyU5AXDiuLlyCB1P+w3uQ$3kzFj4n7MU+jXUelAjrkcxUpLKPGNbPac6nEfxqEFcI	WNGAOLYDWM3BZCHC5ZWVCIQNBBC24FEN	resident	\N	2026-07-19 14:56:07.454618	2026-07-19 14:56:07.454618	Samuel	Ferrand	\N	6a5ce58c564b887ea821d89d	2P Impasse des Anglais 75019 Paris	48.889088	2.375756	\N	\N
1ff8df9d-6050-48ee-b841-86febf3b31c5	yanis.traore@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$TzAEonMOpe/blgXblqAWjQ$ZCgngrmlxIOVMBaEeN2jeMKXUpeRRS7s4QtizIXVX8g	2OSKTRMM4ATGME3L6XPNZNAXO5C4YWB4	resident	$argon2id$v=19$m=65536,t=3,p=4$zbLOdxHKnhTEoaoYlO2tzQ$vIsuqGy3784YTrZPik5UEuL2r6KtnyIY24aGn0bixzs	2026-07-19 14:56:05.720572	2026-07-19 14:56:05.720572	Yanis	Traoré	\N	6a5ce58c564b887ea821d896	26 Rue Henri Chevreau 75020 Paris	48.869953	2.389378	\N	\N
ddf009a6-a3bf-4d3b-9620-873475cdb6c7	farid.amrani@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$LeK70IgzCDjQe1LNsnycYg$9ghlBpBmJ9kqcWPAzBB/JUh404BPqNMxs8bDS5Q7x7s	HTPXNHUW4V2GK2HXBMBWKBTA5WODK5JG	resident	$argon2id$v=19$m=65536,t=3,p=4$/BNp1dpte3uDT6P2PO3dxA$WYcrTQNt6msosjyG/yseMerPN9Y6Z+60f0MPLItYi5A	2026-07-19 14:56:06.863525	2026-07-19 14:56:06.863525	Farid	Amrani	\N	6a5ce58c564b887ea821d89b	16 Rue Eugène Varlin 75010 Paris	48.878784	2.363987	\N	\N
c7e0d9f1-50df-4492-a6c8-0b84629ae27b	anais.leclerc@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$zasYfqxgOR+QgzyXsACUJg$iIc6/INS2IytTJuGdUptQcWI1MDY6fEOt+QYhCTuOew	GK2CZGYIISCN2OQADCIIHFSIBUV63KDZ	resident	\N	2026-07-19 14:56:07.903529	2026-07-19 14:56:07.903529	Anaïs	Leclerc	\N	6a5ce58c564b887ea821d89c	71 Quai de Grenelle 75015 Paris	48.84933	2.282294	\N	\N
9a4ea009-cc4d-4e2b-82f9-d6e8dc505a21	cedric.hamon@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$ckLK/HpLZhPjg8ACQjAH/w$XcSQV66Y3vCqyLrWa6SwneToI9PxGskR3J2kjIfvWUA	3EO74BRPRLTL4UU37UXRHEJ32UTNG2RB	resident	\N	2026-07-19 14:56:08.341307	2026-07-19 14:56:08.341307	Cédric	Hamon	\N	6a5ce58c564b887ea821d8a1	73B Rue Villiers de l'Isle Adam 75020 Paris	48.868046	2.397438	\N	\N
5fb10d8e-02f5-46f4-ac28-ab0d0af1bda3	nolwenn.legall@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$aa2QJ6IJL2mDkEenp0Ui8g$u2PHkGzm8Ni9ZtKaJRFBfgUlZW9Evd1BZD0haoattg8	QTCMCNJVVEKPL23T5UU2QCSKJ5KX5ZW6	resident	\N	2026-07-19 14:56:08.481683	2026-07-19 14:56:08.481683	Nolwenn	Le Gall	\N	6a5ce58c564b887ea821d8a2	13 Rue de l'Abbaye 75006 Paris	48.854263	2.334369	\N	\N
5b1e1745-600a-491b-b172-02448e683deb	karim.benhamou@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$ZgQTxcwww6THtB3vjSvJaA$UY3Yf6kbmOV4Y0t6bU6XECX/ygcibcYLHwCL70kbDlU	WLNCKFKZOBPAQQD7AEZI62VFCOSL5X5B	resident	\N	2026-07-19 14:56:08.629434	2026-07-19 14:56:08.629434	Karim	Benhamou	\N	\N	42 Avenue Gabriel Péri 93100 Montreuil	48.85688	2.442272	+33613776176	\N
12e0e3a5-8460-46ff-a82b-79083e593efc	marc.delorme@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$R0jBfDHQlCnd9v+DcNaDqA$8etHpuF0wu6LHGFy8Tf01VI5fscP1usjK7tj2SyobBg	R5O2JJ33YFAW7TNAO3ZRTWWSGINKCFWK	resident	\N	2026-07-19 14:56:08.913907	2026-07-19 14:56:08.913907	Marc	Delorme	\N	\N	Square Pierre de Geyter 93200 Saint-Denis	48.931473	2.351752	+33613998198	\N
378d6f0a-81a4-4eb2-a52a-ad492347cc14	aurelie.blanc@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$pDetpBWwXGRbvyrTY3FAhw$HEfcqQ7Yu1I+9X4bcnP+2STLSC1Eun0v1U/XiU8j/28	4YK5NXN4VRZAS67KP5T3NJNTSSAAOFJ6	resident	\N	2026-07-19 14:56:09.056226	2026-07-19 14:56:09.056226	Aurélie	Blanc	\N	\N	43 Rue Gabriel Péri 94200 Ivry-sur-Seine	48.813824	2.382626	\N	\N
d6470f4c-b2fc-4713-916a-c28558c3a656	ludovic.weber@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$LwAXS4KIog4/ZseGHvivOw$EixxFZUzPTlFWU/wxLwjixb1cnOHpT8DCOBPv/u7KwQ	B7SX3KJEWMZEE233LTH3RDIZWEKYZKSF	resident	\N	2026-07-19 14:56:09.204242	2026-07-19 14:56:09.204242	Ludovic	Weber	\N	\N	189 Rue du Vieux Pont de Sèvres 92100 Boulogne-Billancourt	48.82954	2.23718	\N	\N
fbafe5eb-2936-4516-854f-c6556885ade3	fatou.diallo@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$YjiCJ5J07GpfAp4J35XoQg$4FJ4FxDDXiPwVNBa/8vgxiXbfKIAEkDX+niB2IgOYBg	SK27QT7VE4ZEQ43CWG57T73AYOBI5PDZ	resident	\N	2026-07-19 14:56:09.348956	2026-07-19 14:56:09.348956	Fatou	Diallo	\N	\N	4 Rue du Chemin Vert 93300 Aubervilliers	48.918804	2.377537	\N	\N
8b745990-084c-4e68-8cc8-ea595245d636	gregoire.tanguy@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$tjrjPz7WFxyQDlRQQcw6gg$2ItJ7UbmaPUo/qXzqrTIo/nae8qlm82p2ZX08OB9YiE	4XTYYBJSPNDOCPF4XVOZOC3HMHPEX5SB	resident	\N	2026-07-19 14:56:09.492618	2026-07-19 14:56:09.492618	Grégoire	Tanguy	\N	\N	37 Rue Edouard Nortier 92200 Neuilly-sur-Seine	48.889595	2.268798	\N	\N
6b4a583a-c6e8-4802-83b5-c09f14bf6120	xavier.brunel@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$0D4OxPaoqg5JrqcnFlCU6g$3C1K4N/4JKvbliIwk3hu1IlKwn40gGtsLEzMIcgHnzk	2Q5VPQHKMDBURPXWTOYOKUR5IIN6HO4S	resident	\N	2026-07-19 14:56:09.756166	2026-07-19 14:56:09.756166	Xavier	Brunel	\N	\N	59 Avenue de la Résistance 93100 Montreuil	48.861076	2.43676	\N	\N
2ac9f996-2f7e-4374-b049-843ca7152048	myriam.sassi@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$wqoJKgWjen6xr7x03QBO0Q$sFvtHNMIWe23Dol5oCZvRRHg2ieMnoHXFL0WP6fMQuI	7JWGLUIV2YR2PP7UEAXDK23IY4BNMHOJ	resident	\N	2026-07-19 14:56:09.903778	2026-07-19 14:56:09.903778	Myriam	Sassi	\N	\N	30 Avenue Jean Lolive 93500 Pantin	48.890324	2.399599	\N	\N
008516fb-eefe-48c4-a959-d31f8b4dcac0	etienne.berger@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$Fdt4rUg0dWJrpjs0pceDCA$blkEZuSVqQktheeUw2hlj7YCHXyD4sQ4lIRpka2feFc	FYYKJPNLL3NOKLSI4G565XOLENDVIQ5R	resident	$argon2id$v=19$m=65536,t=3,p=4$NZVpkWZIDeRVMA+8uwsW1g$x6yUk78Lnb7XDl6yLwiqg/n2V5x8sb0yGqjve8N6fvA	2026-07-19 14:56:06.019622	2026-07-19 14:56:06.019622	Étienne	Berger	\N	6a5ce58c564b887ea821d897	12 Rue Laplace 75005 Paris	48.84737	2.347419	\N	\N
407039f0-0ad7-4fb0-bcf5-aa0568f46339	nina.weiss@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$X+WCVuv9VE2oX3gxdFx8FQ$eEvb2O6uXJlJ77d0sWUYiotbUjzc+JndklzJ+jFi4eg	XAXKEZKV5QVFTGNMBTC54TWLYAIUERGP	deleted	\N	2026-07-19 14:56:11.534157	2026-07-19 14:56:11.534157	Nina	Weiss	\N	6a5ce58c564b887ea821d895	21A Place des Vosges 75003 Paris	48.856705	2.365098	\N	\N
d4d42f0b-f270-4951-a38d-6297a66373d6	julien.moreau@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$PHn/UYnTj9e5L3gRwppE5Q$IRmtu7lM5Ly0wYAvbFkBtMQ0WhkSQEeguclfT+oDUns	AUFVE5AM2PXHZA3YTP4GTOUT56Y6FGFA	resident	$argon2id$v=19$m=65536,t=3,p=4$Xu16pXUPTjX6sP28ELPUFQ$BWYeyKp95shqOPWLYPjCVl9W+sEx/3Bj0N3dBPT9wf0	2026-07-19 14:56:01.923904	2026-07-19 14:56:01.923904	Julien	Moreau	\N	6a5ce58c564b887ea821d894	14 Rue Forest 75018 Paris	48.885735	2.329087	+33612444044	\N
2be71142-1779-49ed-b55f-698dd68545eb	sophie.lefevre@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$Rh1EhaXkxNjXUyJMYwtGGw$BVrhTOQ5MeRJsDt5JVnpfC4uHs9PMBVNK4HEdsKW7yE	CHUMEDYFMQ7F6YRR6RFVMWUTK45NK5PR	resident	$argon2id$v=19$m=65536,t=3,p=4$1iQ6W6Fn2rHYd8+dUrrIdQ$bjQBal3ygTRnhQoCspQgnmXmYW0o3R459HpUX1eLUEE	2026-07-19 14:56:02.072818	2026-07-19 14:56:02.072818	Sophie	Lefèvre	\N	6a5ce58c564b887ea821d894	3 Rue Dejean 75018 Paris	48.887196	2.350656	+33612555055	\N
6eac4cb7-4f80-41ea-bf50-0a451c921c5e	antoine.perrin@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$L2VoZ/eqChgeDA26LOVuyg$5xdYqWtKvvlDGBLHp7yMr6bw0Oszi4YFqiNiwaVDJQA	7OVRYJEFLUYE4WUQ3MZRBT45CGZ6QHNG	resident	$argon2id$v=19$m=65536,t=3,p=4$bpa9nDb/btvCj9LGwxisNg$61gSHKIZ0US0G8ok8d3zUMbsdZfQqRPvq2v9yhHc/Dk	2026-07-19 14:56:02.872201	2026-07-19 14:56:02.872201	Antoine	Perrin	\N	6a5ce58c564b887ea821d894	10 Rue de Trétaigne 75018 Paris	48.89184	2.342293	\N	\N
3e8bd595-58e6-49a4-98da-d2ac19fd77dc	manon.leroy@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$L+cQbZWrL7VF/H1A5P9uZg$VdjExtZQGMWJxvO/CmWnVjDVlEwgthW/GFJmpjFCazQ	FLC2O7KDQVL5JLUHF4V66GEKYYIRCKIQ	resident	$argon2id$v=19$m=65536,t=3,p=4$nKqexasF2B7yLKn4KPzU8Q$y5N1fGsBp1N/0oKBUMlhX9kLowkU91wnD6A8dvrUVyE	2026-07-19 14:56:03.016281	2026-07-19 14:56:03.016281	Manon	Leroy	\N	6a5ce58c564b887ea821d894	4 Place Marcel Aymé 75018 Paris	48.887703	2.337753	+33612888088	\N
8166de43-60db-4588-b48f-699893a60069	sarah.lemoine@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$E9XuyFQcvLNMdSX0xL6wQQ$cg0uQ+g/rqbEdltGllWZ4jmgOWjJisLdGHq+DGJd2m0	5UCSZF3BAWOZQOSYFJI76TCGMOAI3SZZ	resident	$argon2id$v=19$m=65536,t=3,p=4$EYIwNWjItkdLkJiQv2lRgg$g4X448ClHyWxVEA1gcDJ8zpLhrAFuf6EeoqVEBdY/so	2026-07-19 14:56:03.589945	2026-07-19 14:56:03.589945	Sarah	Lemoine	\N	6a5ce58c564b887ea821d894	4 Rue Henri Brisson 75018 Paris	48.898335	2.335014	\N	\N
53446db9-6f46-467b-aeca-19159817b241	vincent.dumas@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$H84zs89UC2LaUgbjDFeZ2w$h5mBT2vzWP9LJpFEzqe0EUkQ0BfnLhxCtb7eCFRMaNU	GGFLEW35CZSHGQVULJIPQKMY53VQY64Y	resident	$argon2id$v=19$m=65536,t=3,p=4$u+mqrUJkFD6ZnnRemrE1Nw$hENtq2GnfBdxgJmOnvl2VPn3mzoQXVPsmxGr/BX7gEA	2026-07-19 14:56:03.739996	2026-07-19 14:56:03.739996	Vincent	Dumas	\N	6a5ce58c564b887ea821d894	51 Rue d'Orsel 75018 Paris	48.883465	2.340585	\N	\N
877f5496-b8dd-47d1-b661-bb0a2deba875	elodie.blanchard@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$W5SLLKfH2YXPu6E/JWu+Pw$+jF4ETNa3eWAani8oH8sRgjq4Px8/uoyb0onVAmSE44	ABW4HV2PND3XVQGCTW3RUNJP6TJTSUQQ	resident	$argon2id$v=19$m=65536,t=3,p=4$wCPlsvDL6q/Y9AEz6l8qPw$aSCFyvHxXB/VRyNzjOXiVhbo/fbjj56b7KvHn4Qff+s	2026-07-19 14:56:04.455903	2026-07-19 14:56:04.455903	Élodie	Blanchard	\N	6a5ce58c564b887ea821d894	18 Rue Camille Flammarion 75018 Paris	48.89897	2.340179	\N	\N
38e7c65f-2229-4566-a54f-79a9f1f5fd91	mathilde.aubert@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$zKeW2SRUmBam/YgPxHDmvQ$p+YwFIcyj6J+YHcrO71sPHYxtrJC1wEWrNqk0TLygko	TTVLFHFDRBEN35BNCPKK6H3IDECF4RK3	moderator	$argon2id$v=19$m=65536,t=3,p=4$RgQ/BDI/go3OrY6jAt9DJQ$meF1VjQ3WUMnu1/sPZKmYpPsAARhWSn+JpDbZuWqk/M	2026-07-19 14:56:05.300145	2026-07-19 14:56:05.300145	Mathilde	Aubert	\N	6a5ce58c564b887ea821d895	41 Rue de Turenne 75003 Paris	48.85736	2.364332	+33613110110	\N
58803df8-9b4c-4278-b4ca-de37d50ca981	benoit.carpentier@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$1DBUIJVs31lmZSu2cCCJEA$MNt0ePgWRrJnuBg0IwFdcSGNNgywxwcpMMwh/2PY9AA	VKAL2LC3VR62BGTT26RL67H3J6JCMA3B	resident	\N	2026-07-19 14:56:10.056611	2026-07-19 14:56:10.056611	Benoît	Carpentier	\N	\N	16 Rue Auguste Gillot 93200 Saint-Denis	48.94022	2.353436	\N	\N
b16d8998-2cdf-4eac-9a39-78c88f8e7b27	valerie.dubois@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$qTn20QGC9tO6BJRD6c2PBg$Uf3HFm7DmgmW3I9p1nBbRmKAsVTfNh8QjGQo17jgNLM	Q3NUNOLNUPRYPE2JLLXJKEJSCMGXC6EQ	admin	\N	2026-07-19 14:56:11.843246	2026-07-19 14:56:11.843246	Valérie	Dubois	\N	\N	\N	\N	\N	+33614109209	\N
3220464f-c8c5-4073-b164-4308eb61af5b	admin@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$WXrfI1Fwtu2mfYdO2l/+aQ$JxS0UpclvHVUoJsAzDAtid5pr8w+rxlZpR9TSh9Dxpo	P4WDGNQ7RJ25XKTCVBM3ZLHY6SFA4EDN	admin	$argon2id$v=19$m=65536,t=3,p=4$mH6i25Z5MmlrSynszI6V/Q$dwgGfUSyBRzwZxhYNyXtK6vymnXvz69+9x9ylgwkq+I	2026-07-19 14:56:11.700827	2026-07-19 14:56:11.700827	Admin	QuartierConnect	\N	\N	\N	\N	\N	+33612222022	\N
39212aeb-7eaa-46c7-af4c-7b1d16825146	delphine.arnaud@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$Yx3aexYwRzpuj3ftk7HLPQ$l0IxckZZ0NlpLcTm67wDpwJnWOb9B1gMHujxCyV6Kfw	LDG3Q7MVTKT5LDHVOMYFOHWY2VD5XWBG	resident	\N	2026-07-19 14:56:10.200616	2026-07-19 14:56:10.200616	Delphine	Arnaud	\N	\N	35 Quai Marcel Boyer 94200 Ivry-sur-Seine	48.821	2.394243	\N	\N
c9555846-2963-4242-abd2-79168de0eb53	sylvain.lacombe@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$RbxRmBQ1ASpIPDNVWmRs0Q$+UNIDGMn1YkwC23PkTnQ560/WMuiZXev/m++0GOL7Aw	VEO5WTAHOZCM5MGW4ZTGIBRQYC3K45DF	resident	\N	2026-07-19 14:56:10.354358	2026-07-19 14:56:10.354358	Sylvain	Lacombe	\N	\N	159 Rue du Vieux Pont de Sèvres 92100 Boulogne-Billancourt	48.831318	2.241804	\N	\N
907ceb6e-49f3-4a3f-a202-8c7097f6ea8b	nathalie.ferreira@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$NJ8CB/BcjeWbLyeux+oVJg$qYVo2tYD8QBi1+0BbZNBBL9CWck99TBECllA6yMAlg0	PRB4F3MDXE7OYXPNN5CFWDS5ZIQ37U3A	resident	\N	2026-07-19 14:56:10.508087	2026-07-19 14:56:10.508087	Nathalie	Ferreira	\N	\N	26 Rue de Valmy 93120 La Courneuve	48.921844	2.379704	\N	\N
d187b7ed-b7e8-47e2-862b-b302f48aad14	quentin.morvan@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$nIl5owRtbL9VSwCX7EPV6g$j5IJdisObUxFLUbII+rJ2J7T7O54f62Ivu5LZvpRYy8	ETM4NW7ZK4F6CXISJUZC2L3NG2B3M23W	resident	\N	2026-07-19 14:56:10.654419	2026-07-19 14:56:10.654419	Quentin	Morvan	\N	\N	95 Rue de Chézy 92200 Neuilly-sur-Seine	48.890938	2.274747	\N	\N
0282346e-54e9-4697-bf63-141e8c1313f3	bruno.vidal@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$oUp/dcBm1085mfqsbzuuAw$HHOkUV/j9ar3z3BZkQaAjZNE9WInb/J5PBjmZ6qJBYg	3CZOVKZKKPUPOBASXUXIXLJCZXVOAVHL	banned	\N	2026-07-19 14:56:10.796443	2026-07-19 14:56:10.796443	Bruno	Vidal	\N	6a5ce58c564b887ea821d894	1 Place Jacques Froment 75018 Paris	48.8909	2.330896	\N	resident
ecfaadc5-acb7-4f58-a3aa-06a007faca5e	sonia.klein@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$QTqAh+avxo60mcdUNwEOzA$99TajGam0+EEPKgX1yJrxqk+DX5hfHrOhCtL3C/Qitg	HVFF2APGHTHPJB7Q3LVPKS5AVKLOXL7H	deleted	\N	2026-07-19 14:56:10.943239	2026-07-19 14:56:10.943239	Sonia	Klein	\N	6a5ce58c564b887ea821d894	7 Rue des Saules 75018 Paris	48.887535	2.339652	\N	\N
f77389a9-fb7b-470d-a9cf-c2c17549e013	franck.aubry@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$mtPeVIfv/+MfxSF45iAU1w$TRzia6EEvSkPxxbq6aczCDHijkvNEKwGsvovel7TWaE	XTLBQK52CCLDGKOROAYRZLKQZ4SGS234	banned	\N	2026-07-19 14:56:11.089592	2026-07-19 14:56:11.089592	Franck	Aubry	\N	6a5ce58c564b887ea821d896	18 Rue Julien Lacroix 75020 Paris	48.86959	2.385506	\N	resident
3b72d562-9c5c-4fad-be00-d6af8ff36e82	ingrid.bertin@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$xos1ML8f2aNaU3JfzFq1MQ$p7qOjkMD5e157dPN4tP1aMsHZlVsbHPYmvbE5nRq3hk	PH2QBBFIE74LKFZGB4PEXWMXEGWBYDNC	banned	\N	2026-07-19 14:56:11.236617	2026-07-19 14:56:11.236617	Ingrid	Bertin	\N	6a5ce58c564b887ea821d899	59 Avenue Daumesnil 75012 Paris	48.847023	2.376313	\N	resident
d3bcdf06-a114-4e3b-93ee-baebc0e36aeb	loic.perrot@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$xNnxvxApoQWPt/16SwqetQ$z5/vX/Pszvb4Gi636s/YPY3VY2NJVKZlgQDW5Vg31Zg	QBJ7FLOAC4QJ3M2DB5XMVDKGRUYJGMNL	banned	\N	2026-07-19 14:56:11.38002	2026-07-19 14:56:11.38002	Loïc	Perrot	\N	6a5ce58c564b887ea821d89e	18 Rue d'Odessa 75014 Paris	48.841923	2.324533	\N	resident
87b0ae96-3fac-4eb6-a978-8a6272df4169	charlotte.pichon@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$WSWUK2v8z39L6hc5lvT9CA$IG6+r8bI9EDhw5gRY6So8MkpSHzVPxNcXUz+BaV8jbU	5XPWAVBHHVUBMPDO3I4UZUNPRZXXWVHO	resident	\N	2026-07-19 14:56:07.304218	2026-07-19 14:56:07.304218	Charlotte	Pichon	\N	6a5ce58c564b887ea821d89f	11 Rue Auguste Barbier 75011 Paris	48.86895	2.371318	\N	\N
b2ec86b0-359b-4a34-8f8d-1bc478526f0c	fabien.michaud@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$HEm5aDKTrXzMwPHfVdbpdQ$dP9HnH3eMN5MAp1IBR/ZhqyEYl8pvCXRyzFopByC+d0	3USHFHJXUNTOGJHF6QZGCSHH5OAKHTEN	resident	\N	2026-07-19 14:56:08.059399	2026-07-19 14:56:08.059399	Fabien	Michaud	\N	6a5ce58c564b887ea821d8a0	27 Rue de Longchamp 75116 Paris	48.86491	2.290318	\N	\N
282199da-05dd-4eaa-8609-942d17f0d321	justine.prevost@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$QwfpLrCoZzY8MTpUc09SEQ$WwAAYSdW3SX9VliQDu2CTMV9+ZBAzF6j/FC1/pYn6Xg	XSKLFPJCVHHMKCGCAWJ7UUX2QP55TNYE	resident	\N	2026-07-19 14:56:08.767574	2026-07-19 14:56:08.767574	Justine	Prévost	\N	\N	18 Rue du Pré Saint Gervais 93500 Pantin	48.89031	2.402991	+33613887187	\N
1b1b1be0-af89-4184-a66d-417f09a80a79	solene.maillard@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$CNuyTFOwiO4fc7g7UfSgaQ$OvnDTDZNN3gfNMsYymKCA/emFOxF9In1k4DvAu0YnEI	F3EOUC7AHYPGBLFCY4H3KFNJ3GRVQGR2	resident	\N	2026-07-19 14:56:09.628236	2026-07-19 14:56:09.628236	Solène	Maillard	\N	\N	6 Square Nungesser 94160 Saint-Mandé	48.840492	2.416588	\N	\N
248667a3-5bb9-4b0d-bcd6-457fd3d8bf2e	adrien.roussel@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$BYDHsY4pa6y2Y+C2ILmTrQ$Hyw09d7TPxzr+gu1VsHCOQwNOX1flg5YXABahU5Habc	EXWF5EGL7O4HG2MKJ7LRCBS3IEDD2JYO	resident	$argon2id$v=19$m=65536,t=3,p=4$ki847LLVfhEsruCK7IWzoA$eV/puJ7DoBdd0x8PpvMEfr7tTHpFz0hAUMD27Y2UEP0	2026-07-19 14:56:04.314445	2026-07-19 14:56:04.314445	Adrien	Roussel	\N	6a5ce58c564b887ea821d894	48 Rue Vauvenargues 75018 Paris	48.89526	2.331692	\N	\N
987c1e1a-1794-41bf-945d-26727f56f5a0	nadia.benali@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$PVBh4YR5WSAhvOwEA/Yjtw$2r6VGCg2MSmqbHeWF+9B+u96/FXwXlb2TLqv47CUTvM	JCSEJEOJ4HNE3M4JMPATXCV26NNSSVVE	resident	$argon2id$v=19$m=65536,t=3,p=4$pCvLyXyHUt1sSbv1mlHetQ$eUL3KiVL8YxsofMn1JaKtLOqP3JfqGA3hrxoDEjRipg	2026-07-19 14:56:05.006992	2026-07-19 14:56:05.006992	Nadia	Benali	\N	6a5ce58c564b887ea821d894	39 Rue Labat 75018 Paris	48.88911	2.348559	\N	\N
4edbee6e-29e0-473b-ba04-823f39d214d1	laura.millet@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$4tpWuXPpkLku1DkBPopuSA$YMPZTSFLro2SBQv1VB3D9/vMFsDsR+TlptlZVkLEcAA	SPWTUXKDLBYD73VJ5R2X2PXURABM3ZQM	resident	$argon2id$v=19$m=65536,t=3,p=4$8a7pfZMDnozRsX9MIjcEfQ$pm28iFsNcRv/RRpjsV6jZ+qMVFCI32761Quh2CyE2Ps	2026-07-19 14:56:05.867006	2026-07-19 14:56:05.867006	Laura	Millet	\N	6a5ce58c564b887ea821d897	23 Rue Valette 75005 Paris	48.846848	2.346575	+33613443143	\N
e253a027-70cd-4800-8b21-09ffa47e39fc	remi.delaunay@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$38fSIaDDASHD/bHfLw1JJg$lxlaipMUasojGN5lr+0Ify0Bz9kzHIQTO0tvcoSAaj4	IMNPMZ7B3BHWAUJZQ4XU57IJSSIN2ZL4	resident	$argon2id$v=19$m=65536,t=3,p=4$DdtsSbjZ15w2fYwWA2VO1w$Kv2wSHdSBbh6EbXkkjVPgOg12cRZ9zbnR+dAneJ5eQ8	2026-07-19 14:56:06.586168	2026-07-19 14:56:06.586168	Rémi	Delaunay	\N	6a5ce58c564b887ea821d899	167 Rue de Bercy 75012 Paris	48.842606	2.375239	\N	\N
4ba03cef-0ce8-4e19-95f8-5c33f65fe786	sabrina.costa@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$VU80g3Mu1+G7Vg9NHkdhuQ$gcyzLJWV80pl/3uqkO3VKKkSlHHjSs8+Ek9QGxeX8n4	763ELUMZCSC6NUN6KULE3XEGTUVBV25O	moderator	$argon2id$v=19$m=65536,t=3,p=4$WNBco11YY4FVI7r6ALKqSw$P1Z1jP+3jaUvkBEMTDS6kqhAzfQXxLgZbK7bf/3KY60	2026-07-19 14:56:06.168117	2026-07-19 14:56:06.168117	Sabrina	Costa	\N	6a5ce58c564b887ea821d898	36 Avenue de la Porte d'Asnières 75017 Paris	48.892586	2.300954	+33613554154	\N
8b038917-4073-4ad3-82b7-609d444f789e	damien.faure@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$wcmDW9WLaJmLBZ7XYGI/tg$+bXMgPzxLssVbg5MWKqDJRmG9+++2EF7qgkK7xrGDUg	WNLPZPFTRW2ALEQJ6NITGHSGUL2CJ2Z4	resident	$argon2id$v=19$m=65536,t=3,p=4$YBqib2iuV+h1+n5g8EqgOg$oDejvG/FE9II4MgpSRTFxPFttdAeFCSTZq5/QyHZnLo	2026-07-19 14:56:06.316731	2026-07-19 14:56:06.316731	Damien	Faure	\N	6a5ce58c564b887ea821d898	82 Place du Docteur Félix Lobligeois 75017 Paris	48.88706	2.317876	\N	\N
612c6b63-da2a-4693-9375-01a85b2c2077	alice@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$1xEm9KeLFRvKINVSBjZEpg$VMgphja6tfpubJPoyvRGqxBppWGUQRfQNpQ1IoLb1ws	4PX635D55YS6JJV3NYIXKZPREIO6YIIV	resident	$argon2id$v=19$m=65536,t=3,p=4$lIVAe3k3qHdaovtxmfLsuA$27+xQYwGVPEvtmvoXUjjKdiOOjhLMRIC2m3YLY5LhPM	2026-07-19 14:56:01.454209	2026-07-19 14:56:01.454209	Alice	Martin	\N	6a5ce58c564b887ea821d894	8 Rue du Nord 75018 Paris	48.892796	2.351738	+33612000000	\N
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

\unrestrict BaO1QwfVSjg7mcKIElYXL3n8BL547b0tfaQpb6FQsDgJ1erbwW3GgAoTzb4Yz1X

