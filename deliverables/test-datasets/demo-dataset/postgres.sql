--
-- PostgreSQL database dump
--

\restrict cyjRqhXZK91NwDmcmwBvEKUiual4GZx8brczY67Rtu8EoEf1DIuBNcqi6cLJcMH

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
adb7ad8b-1c95-4668-8ac6-62ef02ba326d	Lampadaire éteint rue Lepic	Le lampadaire devant le 42 ne s'allume plus depuis une semaine, le trottoir est totalement noir le soir.	open	7105c223-a4bf-4c32-8588-9014011de2a7	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.404846	2026-07-19 16:21:05.404846	48.893757	2.348127	neighborhood
cf60c211-fc11-4d8f-9a51-98c8ea0c56b7	Conteneur à verre débordant place des Abbesses	Le conteneur n'a pas été vidé depuis la semaine dernière, les bouteilles s'entassent autour.	open	83c4577b-667e-468e-bb6f-a879147e8c93	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.442444	2026-07-19 16:21:05.442444	48.888256	2.339051	neighborhood
968655a1-88e0-40ee-bec2-39448de51ee8	Trottoir effondré rue Damrémont	Un affaissement s'est formé après les fortes pluies, difficile à franchir en poussette.	open	f5e1f506-00f9-4740-a148-a4430e8f42c5	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.45277	2026-07-19 16:21:05.45277	48.897804	2.348438	neighborhood
a303e99f-4765-467b-a7a5-44a124577a32	Banc cassé square Louise-Michel	Deux lattes sont arrachées et laissent apparaître des vis, risque de blessure pour les enfants.	open	e3e6a2c0-fcb3-453c-ac72-2049c8fd8469	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.475936	2026-07-19 16:21:05.475936	48.893383	2.348438	neighborhood
92aa184b-7ba7-4e67-bb8f-6545a1409cd3	Éclairage défaillant dans l'escalier de la rue Foyatier	Une marche sur trois est dans l'ombre, la descente est dangereuse par temps de pluie.	open	f8c1b29d-7618-4398-a45a-b005d66538c4	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.506274	2026-07-19 16:21:05.506274	48.89591	2.346579	neighborhood
d72e4ba0-06ca-4d31-8e9d-c33aafad4e21	Voiture ventouse rue Burq	Le même véhicule occupe la place depuis six semaines, pneus à plat et pare-brise couvert d'avis.	open	98d76b0b-a146-44f8-a189-e182cd0ff9a5	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.532854	2026-07-19 16:21:05.532854	48.88741	2.339809	neighborhood
ed98a490-a639-4017-bca0-f6c6cb7114be	Nuisances sonores nocturnes rue des Trois-Frères	Musique et cris jusqu'à trois heures du matin plusieurs nuits par semaine depuis un mois.	open	8c71e147-6268-4866-ad27-1d543d7c1bef	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.547716	2026-07-19 16:21:05.547716	48.89864	2.352268	neighborhood
2ea1cb10-3117-40ef-b952-88372d9b66fc	Branche menaçante square Jehan-Rictus	Une grosse branche est fendue et surplombe l'aire de jeux, il faudrait l'élaguer.	open	84952860-7e56-4de1-ad1c-21ae9db7713c	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.571569	2026-07-19 16:21:05.571569	48.88799	2.345453	neighborhood
5436fe96-2165-4f81-841f-89575bc1847e	Piste cyclable obstruée par un chantier	Les barrières du chantier empiètent sur toute la largeur de la piste sans déviation balisée.	open	f9ce9fd7-98bd-4752-8c1d-b16a9e607390	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.577062	2026-07-19 16:21:05.577062	48.891888	2.346029	neighborhood
fc82c56f-2195-4e59-a31e-d3c7088d9c0e	Bouche d'égout bruyante rue Véron	La plaque claque à chaque passage de voiture, jour et nuit, sous les fenêtres du 12.	open	375018f5-9ff8-4631-9e7f-46cecffec45d	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.583848	2026-07-19 16:21:05.583848	48.898052	2.340308	neighborhood
41176547-3a73-437a-b989-dfc3982dd40e	Stationnement gênant devant la crèche	Des véhicules se garent systématiquement sur le bateau, les poussettes doivent passer sur la route.	open	dcd2b387-ead0-4ef2-b905-51d9e5d2720f	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.614337	2026-07-19 16:21:05.614337	48.89788	2.332139	neighborhood
7de7b6e0-566b-4569-99b0-2a910b910df9	Odeurs persistantes près du local à ordures	Le local n'a pas été lavé depuis longtemps, l'odeur remonte jusqu'au premier étage.	open	915cc86c-6668-4bad-9c2b-c595d5ab95a2	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.636636	2026-07-19 16:21:05.636636	48.899685	2.351992	neighborhood
ab7cefc0-43cb-4b2d-870c-bda3c2b1ebc7	Absence de bac de tri rue Constance	L'immeuble du 7 n'a aucun bac jaune, les cartons finissent dans les ordures ménagères.	open	a35d2398-27f4-4e96-a389-f1c8ba97f945	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.666907	2026-07-19 16:21:05.666907	48.887394	2.337207	neighborhood
509f06b0-3f8f-48f2-8b50-933a582c876a	Nid-de-poule dangereux rue Ordener	Trou d'une vingtaine de centimètres au niveau du passage piéton, plusieurs cyclistes ont chuté.	resolved	a35d2398-27f4-4e96-a389-f1c8ba97f945	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.425268	2026-07-19 16:21:06.886	48.889713	2.330082	neighborhood
dbec7b09-69bf-44f3-b810-dcfc3d39dc20	Tag sur la façade de l'école élémentaire	Graffiti sur toute la longueur du mur côté cour, visible depuis la rue.	resolved	388c8909-e9dc-44c8-a91f-efcd3b73503a	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.434064	2026-07-19 16:21:06.909	48.88808	2.346122	neighborhood
ae86f1f9-2827-4d07-a73b-46d277151f07	Fuite d'eau au coin de la rue Marcadet	De l'eau claire coule en continu depuis une bouche d'arrosage et ruisselle sur la chaussée.	resolved	492d4bf3-490b-4c29-a271-58293ceff4b1	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.462549	2026-07-19 16:21:06.935	48.884766	2.344088	neighborhood
3de74bac-7e41-4529-9100-859746fef2a9	Grille d'arbre descellée rue des Martyrs	La grille bascule quand on marche dessus, elle mériterait d'être refixée rapidement.	resolved	7b7f3282-657b-4b46-b276-7d61a8ab93a0	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.486434	2026-07-19 16:21:06.964	48.892868	2.34755	neighborhood
99e1a68d-921c-4804-8d50-0b607c0cf75e	Feu tricolore hors service rue Custine	Le feu clignote en orange dans les deux sens depuis hier matin, la traversée est risquée.	in_progress	8b416e20-2d9e-4651-a404-ad4dee77e628	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.495733	2026-07-19 16:21:06.982	48.896854	2.352577	neighborhood
81104071-188e-46c6-9533-f79818d574d7	Poubelles non ramassées depuis trois jours	Les bacs jaunes et verts sont restés sur le trottoir, ils débordent et gênent le passage.	resolved	83efbf4f-0768-4acd-b920-04c0099062b2	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.516745	2026-07-19 16:21:07.005	48.884125	2.328324	neighborhood
9e0d131a-7c05-4505-8275-8aa473d3efa7	Rats aperçus près des poubelles du marché	Plusieurs rongeurs sortent des grilles d'arbre en fin de journée, autour du local à ordures.	in_progress	9bd75be7-b5ef-4c46-bec4-2a7ffb9bd2d8	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.525894	2026-07-19 16:21:07.017	48.884235	2.34847	neighborhood
fb6f397c-f34d-4d4f-8d11-49075d80482d	Panneau de signalisation arraché rue Lamarck	Le panneau de sens interdit est au sol, les voitures s'engagent à contresens.	resolved	d1d6807d-d977-48e4-9c6b-77e95432a8d8	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.541213	2026-07-19 16:21:07.039	48.899124	2.330921	neighborhood
e0a5fa66-9494-4333-99c8-b5f6612b29f6	Rambarde descellée escalier rue Chappe	La main courante bouge sur une dizaine de mètres, plusieurs fixations ont sauté.	in_progress	2f5c3427-fff8-4210-a68a-7d6b8a197be0	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.555945	2026-07-19 16:21:07.051	48.89895	2.330438	neighborhood
b72e1fca-2cec-4821-a4d3-4f45104f982c	Affichage sauvage sur les vitrines vacantes	Des dizaines d'affiches collées sur les rideaux de fer des commerces fermés.	resolved	84eb8a87-2ad8-47c9-927a-6eea110c33a3	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.563379	2026-07-19 16:21:07.071	48.89622	2.341966	neighborhood
89c53d62-fbf7-4010-9581-8264c0c54c48	Vitre brisée à l'abribus rue Championnet	Le panneau latéral est éclaté, des éclats de verre traînent encore sur le trottoir.	in_progress	682656d4-a8f2-4d70-bfa7-4bc5ef15e182	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.59434	2026-07-19 16:21:07.079	48.892326	2.329418	neighborhood
96f1e70a-ac7c-4437-953e-a63db216c9c1	Boîte aux lettres vandalisée rue Tholozé	La serrure de la boîte collective a été forcée, le courrier reste accessible à tous.	resolved	3e37ed32-e92c-46c6-b6c9-751726a19406	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.604903	2026-07-19 16:21:07.101	48.885483	2.338363	neighborhood
32cfe6a1-1b0d-45fa-8ca8-3c3543d8ff26	Défaut d'entretien du jardin partagé	Les allées sont envahies, le composteur déborde et personne ne s'en occupe depuis le printemps.	resolved	161ac166-164d-4e8e-a842-a1850e237a0e	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.627027	2026-07-19 16:21:07.122	48.884327	2.343823	neighborhood
3bc0d120-8919-42cc-97be-55fb2680e7fe	Mobilier urbain tagué rue Yvonne-le-Tac	Les deux bancs et la borne d'information ont été recouverts de peinture pendant le week-end.	in_progress	7105c223-a4bf-4c32-8588-9014011de2a7	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.64643	2026-07-19 16:21:07.136	48.900375	2.343237	neighborhood
a81223cd-7d2c-426f-bd20-373788828e27	Chaussée glissante après les travaux rue Berthe	Le revêtement provisoire devient très glissant dès qu'il pleut, deux chutes constatées.	resolved	a6c75ac0-0c57-4a44-890c-8fee1912b601	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.656401	2026-07-19 16:21:07.159	48.899223	2.343319	neighborhood
ad1b5399-c67a-4f59-8d8f-1c733d56b45a	Fuite sur la fontaine du square des Batignolles	L'eau coule en continu même robinet fermé, une flaque permanente s'est formée.	open	31de33e2-92aa-4fc2-ae5a-8967526fbdd8	6a5cf951bd665b4769d4d333	\N	2026-07-19 16:21:05.87169	2026-07-19 16:21:05.87169	\N	\N	neighborhood
4568ef1e-853e-446b-8687-2533056b4ac3	Abribus dégradé rue de la Gaîté	Le panneau d'horaires est arraché et le banc a été démonté.	open	abefbf68-8f1a-4a92-ab47-3b59d1a467f0	6a5cf951bd665b4769d4d339	\N	2026-07-19 16:21:05.890055	2026-07-19 16:21:05.890055	\N	\N	neighborhood
7b37aa10-58e4-4627-8b9d-8b44ee57bead	Le bouton « Charger plus » ne répond pas	Sur la liste des services, le bouton reste actif mais aucune nouvelle page n'est chargée.	open	34ab8278-8cbd-45ae-b84b-3413f37217b5	6a5cf951bd665b4769d4d332	\N	2026-07-19 16:21:06.519265	2026-07-19 16:21:06.519265	\N	\N	bug
037b2e7b-82dd-4773-950a-e5612574a3aa	La recherche ignore les accents	Une recherche sur « éclairage » ne remonte pas les annonces écrites sans accent.	open	6b155725-0b75-43a3-a79b-8be86eb084a9	6a5cf951bd665b4769d4d339	\N	2026-07-19 16:21:06.846853	2026-07-19 16:21:06.846853	\N	\N	bug
0934cc0a-8738-4814-96a5-99eb7c396e9a	Dépôt sauvage devant le 24 rue Caulaincourt	Un matelas et deux cartons de gravats sont abandonnés sur le trottoir depuis samedi.	in_progress	a6c75ac0-0c57-4a44-890c-8fee1912b601	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.416057	2026-07-19 16:21:06.86	48.895367	2.333468	neighborhood
1131c213-cb76-478a-a894-58190cd3fb58	Plaque d'égout descellée rue Antoinette	La plaque se soulève au passage des camions de livraison et retombe de travers.	resolved	388c8909-e9dc-44c8-a91f-efcd3b73503a	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.678067	2026-07-19 16:21:07.18	48.886047	2.337783	neighborhood
f68afdd4-9687-4c7d-aabf-f09117c4915c	Sonnette d'immeuble hors service rue Gabrielle	Aucun interphone ne fonctionne au 15, les livreurs sonnent chez les voisins du rez-de-chaussée.	in_progress	f5e1f506-00f9-4740-a148-a4430e8f42c5	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.699901	2026-07-19 16:21:07.19	48.88881	2.334582	neighborhood
38e8f338-d296-4f4e-9a73-6185b19db757	Éclairage du terrain de sport en panne	Les projecteurs ne s'allument plus, le terrain est inutilisable après 18h en hiver.	resolved	e3e6a2c0-fcb3-453c-ac72-2049c8fd8469	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.717226	2026-07-19 16:21:07.212	48.89635	2.335629	neighborhood
e3d8844e-ece6-4b0d-91f7-704d9497f3df	Message injurieux reçu en messagerie	Suite à un refus de service, l'utilisateur a envoyé plusieurs messages insultants.	resolved	7b7f3282-657b-4b46-b276-7d61a8ab93a0	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.734878	2026-07-19 16:21:07.245	48.88879	2.349806	reporting
7243d23f-106c-4c1f-b452-c760b31cfa88	Annonce de covoiturage manifestement frauduleuse	Trajet proposé à un tarif absurde avec demande d'acompte immédiat par lien externe.	resolved	f8c1b29d-7618-4398-a45a-b005d66538c4	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.753281	2026-07-19 16:21:07.262	48.89227	2.33109	reporting
d1e5d506-2e68-4610-aedd-e7e363b2acdc	Annonce dupliquée publiée en série	La même offre de jardinage est publiée six fois avec des titres légèrement différents.	in_progress	9bd75be7-b5ef-4c46-bec4-2a7ffb9bd2d8	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.771655	2026-07-19 16:21:07.272	48.891087	2.340681	reporting
b4856afa-f70f-41cf-aa84-75185846d171	La carte des incidents reste vide au premier chargement	Les marqueurs n'apparaissent qu'après un changement d'onglet et un retour sur la carte.	in_progress	7105c223-a4bf-4c32-8588-9014011de2a7	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.790964	2026-07-19 16:21:07.281	48.893898	2.342956	bug
6c62b65b-901a-4889-99e3-0bdcbcf469bb	Les notifications de messagerie arrivent en double	Chaque nouveau message déclenche deux notifications identiques à quelques secondes d'écart.	resolved	8c71e147-6268-4866-ad27-1d543d7c1bef	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.816563	2026-07-19 16:21:07.298	48.89602	2.347748	bug
2d6d0f54-2f18-466f-b5f6-aca3403a45b3	La page de résultats de vote affiche un total erroné	Le total des participations dépasse le nombre de votants sur les scrutins pondérés.	resolved	84eb8a87-2ad8-47c9-927a-6eea110c33a3	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.835289	2026-07-19 16:21:07.315	48.898335	2.346318	bug
41920380-d8ac-4951-bf58-e740f7e94d44	Éclairage public en panne rue de Belleville	Trois lampadaires consécutifs sont éteints entre le métro et la boulangerie.	in_progress	c51f41a7-3810-4d0b-bedc-a8ed7b23ac02	6a5cf951bd665b4769d4d331	\N	2026-07-19 16:21:05.853609	2026-07-19 16:21:07.325	\N	\N	neighborhood
1f34c7f0-baf1-47d8-94b0-eba591ab0d8f	Comportement agressif signalé en messagerie	Relances insistantes et menaces voilées après l'annulation d'une réservation.	resolved	e8cca443-33b1-4cc2-a92d-601ee0d4601f	6a5cf951bd665b4769d4d331	\N	2026-07-19 16:21:06.205289	2026-07-19 16:21:07.399	\N	\N	reporting
7246d49e-513e-4459-a81a-c4c3e9fdb86c	Panneau d'information illisible place Émile-Goudeau	Le plan du quartier est délavé et rayé, il n'est plus lisible pour les visiteurs.	open	83c4577b-667e-468e-bb6f-a879147e8c93	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.69042	2026-07-19 16:21:05.69042	48.89331	2.330929	neighborhood
89f77cb1-b7cf-4d26-a5c0-2ef4812d9339	Encombrants abandonnés rue Paul-Albert	Une armoire démontée bloque la moitié du trottoir devant l'entrée de l'immeuble.	open	492d4bf3-490b-4c29-a271-58293ceff4b1	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.709233	2026-07-19 16:21:05.709233	48.89787	2.351749	neighborhood
88cd7725-350f-477f-aaf4-8e667842663f	Photo de profil manifestement usurpée	La photo du profil est une image de banque d'images utilisée sur plusieurs autres comptes.	open	8b416e20-2d9e-4651-a404-ad4dee77e628	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.744355	2026-07-19 16:21:05.744355	48.891937	2.342135	reporting
76d26063-76ea-4610-9f47-e51d6e1c2fd2	Propos discriminatoires dans une description d'annonce	L'annonce précise des critères d'exclusion sur l'origine des demandeurs.	open	83efbf4f-0768-4acd-b920-04c0099062b2	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.763013	2026-07-19 16:21:05.763013	48.88732	2.327405	reporting
205c42b0-5af6-4b6b-b7a2-dcfea2bcafad	Contenu commercial déguisé en entraide	Une société de nettoyage publie ses prestations tarifées comme s'il s'agissait d'un échange.	open	98d76b0b-a146-44f8-a189-e182cd0ff9a5	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.78127	2026-07-19 16:21:05.78127	48.889107	2.344696	reporting
39a96441-a1ca-40c3-9cc6-4159a9d1e2e7	Le filtre par catégorie ne se réinitialise pas	Après un retour arrière, la liste reste filtrée alors que le sélecteur affiche « toutes ».	open	d1d6807d-d977-48e4-9c6b-77e95432a8d8	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.802267	2026-07-19 16:21:05.802267	48.88943	2.330619	bug
470104ce-54b7-4bae-8c83-e48f0b881efa	Impossible de téléverser une photo de plus de 5 Mo	L'envoi échoue sans message d'erreur, le formulaire reste bloqué sur l'indicateur de chargement.	open	2f5c3427-fff8-4210-a68a-7d6b8a197be0	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.826834	2026-07-19 16:21:05.826834	48.90018	2.332519	bug
af367eea-83c2-40ab-861b-c3ed769b6f76	Pavés descellés rue des Rosiers	Une dizaine de pavés bougent sous les pieds au milieu de la rue piétonne.	open	ae5e859e-128c-4e29-9894-fc2ef17b5e42	6a5cf951bd665b4769d4d330	\N	2026-07-19 16:21:05.844326	2026-07-19 16:21:05.844326	\N	\N	neighborhood
6f41aac9-42e5-4a7b-8dae-cc67f5816cd8	Annonce trompeuse sur un service de bricolage	Le tarif affiché ne correspond pas à celui annoncé une fois le contact établi.	open	2b384ed6-34e6-4bfb-8532-bfc8cc4a6ac2	6a5cf951bd665b4769d4d330	\N	2026-07-19 16:21:06.045446	2026-07-19 16:21:06.045446	\N	\N	reporting
4ae975c2-b171-4d73-a73d-4133ee09f8c6	Annonce suspecte : paiement demandé hors plateforme	Une annonce de bricolage renvoie vers un virement bancaire avant toute prestation.	in_progress	7105c223-a4bf-4c32-8588-9014011de2a7	6a5cf951bd665b4769d4d32f	\N	2026-07-19 16:21:05.72625	2026-07-19 16:21:07.222	48.89493	2.345589	reporting
2fd6efff-4a31-4cc6-813e-4cacdfb02285	Dépôt d'encombrants rue Mouffetard	Cageots et cartons entassés après le marché, non ramassés depuis deux jours.	resolved	c36636c3-b65f-4a2f-9ccd-aaa9e5d74b50	6a5cf951bd665b4769d4d332	\N	2026-07-19 16:21:05.863021	2026-07-19 16:21:07.349	\N	\N	neighborhood
66323821-6caf-410a-b92e-0848d3090f9e	Marquage au sol effacé boulevard Richard-Lenoir	Le passage piéton n'est presque plus visible, notamment de nuit.	resolved	22ff32e7-f40c-49c9-b43c-328326460de4	6a5cf951bd665b4769d4d334	\N	2026-07-19 16:21:05.881039	2026-07-19 16:21:07.376	\N	\N	neighborhood
fd187233-1104-4778-b168-0b3214db4626	Faux profil de voisin	Le compte utilise une adresse qui ne correspond à aucun immeuble de la rue indiquée.	in_progress	51c7580a-6004-40f3-8838-b700787ffe3a	6a5cf951bd665b4769d4d334	\N	2026-07-19 16:21:06.349499	2026-07-19 16:21:07.411	\N	\N	reporting
f1f993f2-e01b-4a24-9a81-78fb3ef1496a	L'export PDF du contrat échoue	Le téléchargement démarre puis s'interrompt, le fichier obtenu fait zéro octet.	resolved	6a830c5d-3251-4918-bb56-c0675e78052d	6a5cf951bd665b4769d4d333	\N	2026-07-19 16:21:06.679454	2026-07-19 16:21:07.434	\N	\N	bug
\.


--
-- Data for Name: points_balances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.points_balances (id, user_id, balance, updated_at) FROM stdin;
9ec569fb-0e8b-46ae-94bb-e44bbedc081a	a6c75ac0-0c57-4a44-890c-8fee1912b601	20	2026-07-19 16:20:38.946143
c71ec717-2742-4df3-abd4-a80c94050021	388c8909-e9dc-44c8-a91f-efcd3b73503a	20	2026-07-19 16:20:39.106208
a63b319c-9c0e-4d2a-8155-8c4390327ee6	8b416e20-2d9e-4651-a404-ad4dee77e628	20	2026-07-19 16:20:39.537948
032b9646-6891-497b-9b82-1b92d718a72e	83efbf4f-0768-4acd-b920-04c0099062b2	20	2026-07-19 16:20:39.696722
708e8965-963d-4e80-a142-1773398badbf	d1d6807d-d977-48e4-9c6b-77e95432a8d8	20	2026-07-19 16:20:39.92886
77c5655a-43e7-4c7b-b06a-f54c71e98dd2	8c71e147-6268-4866-ad27-1d543d7c1bef	20	2026-07-19 16:20:40.002431
838dc46f-7279-4f70-adf3-b35b1dae7a76	2f5c3427-fff8-4210-a68a-7d6b8a197be0	20	2026-07-19 16:20:40.068489
9624ec6a-201e-4edb-be9f-eae78ba0b69f	375018f5-9ff8-4631-9e7f-46cecffec45d	20	2026-07-19 16:20:40.352768
4a612de7-b947-4bce-b5dc-67972d6e7802	161ac166-164d-4e8e-a842-a1850e237a0e	20	2026-07-19 16:20:40.680526
57d9f46a-d3db-456e-8948-0a0e73b452a5	915cc86c-6668-4bad-9c2b-c595d5ab95a2	20	2026-07-19 16:20:40.759737
bfce5aa4-9c17-4bd5-b6b3-1f8caba734c4	ae5e859e-128c-4e29-9894-fc2ef17b5e42	20	2026-07-19 16:20:40.835324
78d9075c-f830-4662-b19f-4f0dbca144bc	2b384ed6-34e6-4bfb-8532-bfc8cc4a6ac2	20	2026-07-19 16:20:40.914821
ace719b1-52bd-45ac-b9d2-d1a2bc7cdd68	c51f41a7-3810-4d0b-bedc-a8ed7b23ac02	20	2026-07-19 16:20:41.000854
41475965-2e84-48dc-a4d7-f34aeb9c1f89	e8cca443-33b1-4cc2-a92d-601ee0d4601f	20	2026-07-19 16:20:41.079113
366ee3df-d580-4e89-baa7-f84414bfc8af	c36636c3-b65f-4a2f-9ccd-aaa9e5d74b50	20	2026-07-19 16:20:41.149313
79cd8b4a-0fbe-4317-8d5c-8db85f9eb9e6	34ab8278-8cbd-45ae-b84b-3413f37217b5	20	2026-07-19 16:20:41.216723
a04f899d-4c46-4f11-ba5c-8396652ecd88	31de33e2-92aa-4fc2-ae5a-8967526fbdd8	20	2026-07-19 16:20:41.289937
df22f36a-5719-47dc-b8f7-532a2a87d52e	6a830c5d-3251-4918-bb56-c0675e78052d	20	2026-07-19 16:20:41.370305
42b0295d-9859-425f-8420-a98027d96140	22ff32e7-f40c-49c9-b43c-328326460de4	20	2026-07-19 16:20:41.448831
ec8e8e37-e80f-4b49-9309-fa20e3ac957b	51c7580a-6004-40f3-8838-b700787ffe3a	20	2026-07-19 16:20:41.524432
9fca0bd4-e88b-406b-a3d0-c562696b83cf	85f7d6ea-8a33-477a-97e5-7c10adb6ec20	20	2026-07-19 16:20:41.602011
8d745781-f630-4a9d-8887-f40f46b3642c	bb7be65b-9e6d-477d-b4a7-43bff3fd9b03	20	2026-07-19 16:20:41.676791
37f744ff-42c9-45c0-adca-c3880bf4cead	f9166624-469c-4db8-a6e2-1613d09a94be	20	2026-07-19 16:20:41.754975
708fb255-0eca-454c-9784-599ca6707b68	1d82fd2c-47e5-4cf3-a22a-829d957c8212	20	2026-07-19 16:20:41.831886
27060a6d-3720-4743-bc0a-733a348e6912	94a7fe44-c2f3-430c-9546-12deee420a9c	20	2026-07-19 16:20:41.909109
4934fc5c-44eb-421f-9ce7-5ec2c441765c	6af7650d-0291-4f27-8c2a-d011cd8aa5c3	20	2026-07-19 16:20:41.990672
36297950-b891-40b4-94e5-10f882431655	abefbf68-8f1a-4a92-ab47-3b59d1a467f0	20	2026-07-19 16:20:42.057376
f55a8138-6968-43ce-9459-3a7f38f68dc0	6b155725-0b75-43a3-a79b-8be86eb084a9	20	2026-07-19 16:20:42.12216
55ee4f01-6a4c-4454-b250-916ef27b345b	14cab1e0-e09d-4470-b463-8693377057ee	20	2026-07-19 16:20:42.191408
85f6b00c-f937-499e-a624-837c9419c5a1	7954b9b5-31d9-41af-8a10-f69973d28f78	20	2026-07-19 16:20:42.248429
75f4cec0-714a-4026-90cc-f83cb1c0ee5d	2185e0ea-79ab-46a8-9c75-998456405f7b	20	2026-07-19 16:20:42.319974
56843a1a-6ce3-46b7-b3ed-faf46c97d82b	9c455af2-f5fe-4e13-9895-479ffa570f71	20	2026-07-19 16:20:42.389859
744d10b3-0f36-4061-8c6e-c93731c866d8	9957a821-49a4-43ac-8de8-56bc90f65f75	20	2026-07-19 16:20:42.469106
dd78fa51-0530-456d-b95b-9ccd06117651	2af73d2b-763e-4f47-bf3e-1f5851cd7855	20	2026-07-19 16:20:42.547185
0c6d77f0-1aa5-40d0-908a-b5713000c6a2	59ef6c4c-1dae-4dcf-a052-ccda69c8c2f6	20	2026-07-19 16:20:42.623883
dcf5f3f1-59e1-4598-a56b-e897c71e3237	f9a38646-8dd4-4188-a5c8-0755800239cd	20	2026-07-19 16:20:42.708602
cd54ebb1-7966-4748-b962-7241467eeecc	e3129c13-1e94-48af-a377-ac05032d85e7	20	2026-07-19 16:20:42.77661
d46c92b1-c503-476f-baa3-28c1efbfe36c	baafe31d-2814-4fd2-b364-26cb7aef816d	20	2026-07-19 16:20:42.854122
4cdca3ef-ccf7-483a-b1f3-a9936bb09f69	05ab0110-a272-402e-adfc-97ec350bdbbd	20	2026-07-19 16:20:42.928375
fc00e450-3b1c-453c-8abb-1c92144b17e9	a232dcd6-c561-482f-ad14-00915896b5bb	20	2026-07-19 16:20:43.006524
eaeccfd0-4dc3-4613-bed5-db340063ba2a	385f0c46-6506-4665-bd31-94572dc0bfa3	20	2026-07-19 16:20:43.090049
020a53ff-0312-4ca7-a98d-73f6416743a4	2989dba5-6a42-47b8-9a0b-2027bc350270	20	2026-07-19 16:20:43.166586
14722d8e-1c8e-4b8f-9ca1-c32d651cab2c	ece1a9bf-e540-4b93-a9a8-c5927ee41bff	20	2026-07-19 16:20:43.24423
0547169a-664e-4d38-81ed-475a5b2e2f66	70b2e1ee-0aaf-42ee-b0d7-b06a507f0ac6	20	2026-07-19 16:20:43.333137
78b16bf7-60ae-4397-b063-836345a27cdc	496778d2-5ed4-4e14-997e-026613a39799	20	2026-07-19 16:20:43.416055
5fe47c9c-72f0-4fd7-98ad-d24321bee148	a608b260-7347-4bb9-aa9a-486f6f8fe2ad	20	2026-07-19 16:20:43.504214
164e69d6-fd2f-4d8c-89b8-602b24daf78f	2d93a163-0c15-4358-bd5a-402b7873daab	20	2026-07-19 16:20:43.581971
b432ed9b-6ff2-4f70-90f0-e3673d5d4492	a6f122f9-3050-4dc0-b0db-e64bbdd5670d	20	2026-07-19 16:20:43.654872
93145036-5df6-4e94-860c-5d05a83f2e1a	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	20	2026-07-19 16:20:43.731922
d4dbd0c4-9d0c-430e-be79-c6483f943015	35709110-f34a-41c1-80ff-4b71a62dadf7	20	2026-07-19 16:20:43.806881
d5d20487-ce3c-40ac-aec0-6e69e0d68e57	98d76b0b-a146-44f8-a189-e182cd0ff9a5	16	2026-07-19 16:21:31.047
e8a4ee80-05a0-494d-a538-417525e74114	492d4bf3-490b-4c29-a271-58293ceff4b1	18	2026-07-19 16:21:31.261
70a5e8fe-f077-468b-853d-3ebae9d62c21	f8c1b29d-7618-4398-a45a-b005d66538c4	16	2026-07-19 16:21:31.498
13b6df69-1732-4a79-9124-a2c4070b5fc5	83c4577b-667e-468e-bb6f-a879147e8c93	24	2026-07-19 16:21:31.498
7829fdc2-3e3e-4179-a58b-0b2a9f7923bb	a35d2398-27f4-4e96-a389-f1c8ba97f945	18	2026-07-19 16:21:31.533
21d5273a-9f04-43ce-8b12-c024dbbeb663	84eb8a87-2ad8-47c9-927a-6eea110c33a3	22	2026-07-19 16:21:31.534
7795aca0-ba28-4ba8-8e8c-c920b4040f09	7105c223-a4bf-4c32-8588-9014011de2a7	18	2026-07-19 16:22:01.052
de9adaf6-447c-456f-8424-dba500cba282	9bd75be7-b5ef-4c46-bec4-2a7ffb9bd2d8	18	2026-07-19 16:22:01.108
7743341c-ed3b-48b7-8fdc-c410fbf49167	3e37ed32-e92c-46c6-b6c9-751726a19406	16	2026-07-19 16:22:01.138
ba86ebbe-e27a-43a6-82b8-d7b5eed840c2	e3e6a2c0-fcb3-453c-ac72-2049c8fd8469	18	2026-07-19 16:22:01.163
3d83c784-766d-4fcd-b23a-037839f9b08f	682656d4-a8f2-4d70-bfa7-4bc5ef15e182	18	2026-07-19 16:22:31.055
321821d2-d231-45d6-908c-0801adf85a81	f5e1f506-00f9-4740-a148-a4430e8f42c5	26	2026-07-19 16:22:31.057
2dd8ebb5-a4c4-4b1b-826f-57f142d34947	dcd2b387-ead0-4ef2-b905-51d9e5d2720f	16	2026-07-19 16:22:31.109
6783432a-cdf2-4cd6-84c5-a8dd748473da	84952860-7e56-4de1-ad1c-21ae9db7713c	32	2026-07-19 16:22:31.11
25a243ec-8435-423b-b0b2-01d4030abe2e	7b7f3282-657b-4b46-b276-7d61a8ab93a0	18	2026-07-19 16:22:31.148
ec6448ac-0236-4687-b351-8abb7219d5ec	f9ce9fd7-98bd-4752-8c1d-b16a9e607390	26	2026-07-19 16:22:31.149
\.


--
-- Data for Name: points_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.points_transactions (id, sender_id, recipient_id, amount, note, created_at, contract_id, type, status, completed_at) FROM stdin;
26add22a-c814-4bf9-903c-b843e920a0b6	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	7105c223-a4bf-4c32-8588-9014011de2a7	20	Crédit de bienvenue	2026-07-19 16:20:23.064591	\N	bonus	completed	2026-07-19 16:20:23.064591
55598694-a345-4285-bfba-b243bf41ceff	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	a6c75ac0-0c57-4a44-890c-8fee1912b601	20	Crédit de bienvenue	2026-07-19 16:20:23.216914	\N	bonus	completed	2026-07-19 16:20:23.216914
510befc4-ff7a-42a8-9774-162fc8326a8c	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	a35d2398-27f4-4e96-a389-f1c8ba97f945	20	Crédit de bienvenue	2026-07-19 16:20:23.369778	\N	bonus	completed	2026-07-19 16:20:23.369778
c596de65-ed37-414b-8b95-75b2f6c9fd02	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	388c8909-e9dc-44c8-a91f-efcd3b73503a	20	Crédit de bienvenue	2026-07-19 16:20:23.520222	\N	bonus	completed	2026-07-19 16:20:23.520222
6b731dc4-7936-4a09-ad98-a73ecef88420	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	83c4577b-667e-468e-bb6f-a879147e8c93	20	Crédit de bienvenue	2026-07-19 16:20:23.659339	\N	bonus	completed	2026-07-19 16:20:23.659339
bfa591d7-d26b-4786-b31f-7e8e48c38cc2	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	f5e1f506-00f9-4740-a148-a4430e8f42c5	20	Crédit de bienvenue	2026-07-19 16:20:23.82137	\N	bonus	completed	2026-07-19 16:20:23.82137
bb3c0c7c-2cff-4898-aacf-43278ba400c5	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	492d4bf3-490b-4c29-a271-58293ceff4b1	20	Crédit de bienvenue	2026-07-19 16:20:23.972377	\N	bonus	completed	2026-07-19 16:20:23.972377
20de8f4f-2ed5-4316-96f8-c8cb96781c9f	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	e3e6a2c0-fcb3-453c-ac72-2049c8fd8469	20	Crédit de bienvenue	2026-07-19 16:20:24.11982	\N	bonus	completed	2026-07-19 16:20:24.11982
77114089-5a94-4f25-a80d-7ae53bd5e1a1	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	7b7f3282-657b-4b46-b276-7d61a8ab93a0	20	Crédit de bienvenue	2026-07-19 16:20:24.278103	\N	bonus	completed	2026-07-19 16:20:24.278103
54f86e90-563e-4864-bc30-ee9f5c10f37e	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	8b416e20-2d9e-4651-a404-ad4dee77e628	20	Crédit de bienvenue	2026-07-19 16:20:24.432511	\N	bonus	completed	2026-07-19 16:20:24.432511
462d3821-6366-4aa0-9491-fce719a52650	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	f8c1b29d-7618-4398-a45a-b005d66538c4	20	Crédit de bienvenue	2026-07-19 16:20:24.5924	\N	bonus	completed	2026-07-19 16:20:24.5924
28eb8da7-d230-49e1-bbc4-bf43866a6361	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	83efbf4f-0768-4acd-b920-04c0099062b2	20	Crédit de bienvenue	2026-07-19 16:20:24.734393	\N	bonus	completed	2026-07-19 16:20:24.734393
a99ff211-4ddd-4a4f-882e-43f2356c78f6	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	9bd75be7-b5ef-4c46-bec4-2a7ffb9bd2d8	20	Crédit de bienvenue	2026-07-19 16:20:24.885865	\N	bonus	completed	2026-07-19 16:20:24.885865
06f30a2d-e075-46c6-b3fd-ba74259bda59	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	98d76b0b-a146-44f8-a189-e182cd0ff9a5	20	Crédit de bienvenue	2026-07-19 16:20:25.020676	\N	bonus	completed	2026-07-19 16:20:25.020676
4196737c-a99b-4da3-ad52-a1a37c74c476	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	d1d6807d-d977-48e4-9c6b-77e95432a8d8	20	Crédit de bienvenue	2026-07-19 16:20:25.169804	\N	bonus	completed	2026-07-19 16:20:25.169804
78b97623-c260-4bcc-896b-e22484feeb4f	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	8c71e147-6268-4866-ad27-1d543d7c1bef	20	Crédit de bienvenue	2026-07-19 16:20:25.30034	\N	bonus	completed	2026-07-19 16:20:25.30034
070e3afa-7d84-41fd-bc8d-6447383a08b4	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	2f5c3427-fff8-4210-a68a-7d6b8a197be0	20	Crédit de bienvenue	2026-07-19 16:20:25.449808	\N	bonus	completed	2026-07-19 16:20:25.449808
8b1c7ed0-131f-4325-8ede-5c30c2448ead	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	84eb8a87-2ad8-47c9-927a-6eea110c33a3	20	Crédit de bienvenue	2026-07-19 16:20:25.595277	\N	bonus	completed	2026-07-19 16:20:25.595277
c6b0e1ec-91f7-4c90-93bc-1cc0e8f6f766	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	84952860-7e56-4de1-ad1c-21ae9db7713c	20	Crédit de bienvenue	2026-07-19 16:20:25.739834	\N	bonus	completed	2026-07-19 16:20:25.739834
13000abc-9747-4d86-b63c-b45d1c5d9498	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	f9ce9fd7-98bd-4752-8c1d-b16a9e607390	20	Crédit de bienvenue	2026-07-19 16:20:25.882894	\N	bonus	completed	2026-07-19 16:20:25.882894
36e8f8e5-20a7-4ab2-bb02-4c8543fc8e29	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	375018f5-9ff8-4631-9e7f-46cecffec45d	20	Crédit de bienvenue	2026-07-19 16:20:26.039635	\N	bonus	completed	2026-07-19 16:20:26.039635
0c3cda94-c158-49ee-8997-0f4e137f31f4	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	682656d4-a8f2-4d70-bfa7-4bc5ef15e182	20	Crédit de bienvenue	2026-07-19 16:20:26.197848	\N	bonus	completed	2026-07-19 16:20:26.197848
bedb92f7-efea-4c23-9f56-2fafaa712653	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	3e37ed32-e92c-46c6-b6c9-751726a19406	20	Crédit de bienvenue	2026-07-19 16:20:26.324466	\N	bonus	completed	2026-07-19 16:20:26.324466
796ae1b0-e8b8-4b0e-b557-a6784a86a559	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	dcd2b387-ead0-4ef2-b905-51d9e5d2720f	20	Crédit de bienvenue	2026-07-19 16:20:26.452594	\N	bonus	completed	2026-07-19 16:20:26.452594
1fd64c84-efd6-4a96-a088-91452ef61906	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	161ac166-164d-4e8e-a842-a1850e237a0e	20	Crédit de bienvenue	2026-07-19 16:20:26.596107	\N	bonus	completed	2026-07-19 16:20:26.596107
cc8c11a5-c6e3-48af-910b-3d7b8a16edaf	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	915cc86c-6668-4bad-9c2b-c595d5ab95a2	20	Crédit de bienvenue	2026-07-19 16:20:26.744364	\N	bonus	completed	2026-07-19 16:20:26.744364
b11c67a6-d0c3-4f4c-999e-5f96a798159a	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	ae5e859e-128c-4e29-9894-fc2ef17b5e42	20	Crédit de bienvenue	2026-07-19 16:20:26.894665	\N	bonus	completed	2026-07-19 16:20:26.894665
473f34f0-26af-4041-b28b-d0ffc1978eae	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	2b384ed6-34e6-4bfb-8532-bfc8cc4a6ac2	20	Crédit de bienvenue	2026-07-19 16:20:27.034721	\N	bonus	completed	2026-07-19 16:20:27.034721
f76189f0-2d33-43b1-a8eb-54bd6a3bafd8	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	c51f41a7-3810-4d0b-bedc-a8ed7b23ac02	20	Crédit de bienvenue	2026-07-19 16:20:27.179223	\N	bonus	completed	2026-07-19 16:20:27.179223
238affc6-76cb-4953-b492-82a56c3a70b7	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	e8cca443-33b1-4cc2-a92d-601ee0d4601f	20	Crédit de bienvenue	2026-07-19 16:20:27.324611	\N	bonus	completed	2026-07-19 16:20:27.324611
3d8bb999-8af7-4e4f-87e7-0670ec99e2e7	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	c36636c3-b65f-4a2f-9ccd-aaa9e5d74b50	20	Crédit de bienvenue	2026-07-19 16:20:27.466223	\N	bonus	completed	2026-07-19 16:20:27.466223
d53ce2c5-f78d-4acc-af26-2f14df91df22	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	34ab8278-8cbd-45ae-b84b-3413f37217b5	20	Crédit de bienvenue	2026-07-19 16:20:27.615374	\N	bonus	completed	2026-07-19 16:20:27.615374
3b4f44f7-5973-4f68-abb9-db327180f4bf	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	31de33e2-92aa-4fc2-ae5a-8967526fbdd8	20	Crédit de bienvenue	2026-07-19 16:20:27.765205	\N	bonus	completed	2026-07-19 16:20:27.765205
3e44f9d5-1f78-45ff-8f37-7eaf9f8d5e1d	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	6a830c5d-3251-4918-bb56-c0675e78052d	20	Crédit de bienvenue	2026-07-19 16:20:27.90394	\N	bonus	completed	2026-07-19 16:20:27.90394
b1ae735a-f5f4-41c0-a434-1c00952fb8d5	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	22ff32e7-f40c-49c9-b43c-328326460de4	20	Crédit de bienvenue	2026-07-19 16:20:28.063422	\N	bonus	completed	2026-07-19 16:20:28.063422
998ef720-8573-460a-a932-ce7e293ca07b	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	51c7580a-6004-40f3-8838-b700787ffe3a	20	Crédit de bienvenue	2026-07-19 16:20:28.203565	\N	bonus	completed	2026-07-19 16:20:28.203565
ff22b886-f6e9-473a-819f-f1644bfea0cb	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	85f7d6ea-8a33-477a-97e5-7c10adb6ec20	20	Crédit de bienvenue	2026-07-19 16:20:28.337403	\N	bonus	completed	2026-07-19 16:20:28.337403
3e94ee80-f74b-466f-b6e0-2d4e486906cb	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	bb7be65b-9e6d-477d-b4a7-43bff3fd9b03	20	Crédit de bienvenue	2026-07-19 16:20:28.493099	\N	bonus	completed	2026-07-19 16:20:28.493099
93f1a656-b8a6-46e7-b381-cbd19ddbbb5e	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	f9166624-469c-4db8-a6e2-1613d09a94be	20	Crédit de bienvenue	2026-07-19 16:20:28.62931	\N	bonus	completed	2026-07-19 16:20:28.62931
90dc04b3-2c3c-44bf-8128-2a7b41c3b504	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	1d82fd2c-47e5-4cf3-a22a-829d957c8212	20	Crédit de bienvenue	2026-07-19 16:20:28.777874	\N	bonus	completed	2026-07-19 16:20:28.777874
93f6a849-b181-4754-b0b5-c3bb2f2e799e	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	94a7fe44-c2f3-430c-9546-12deee420a9c	20	Crédit de bienvenue	2026-07-19 16:20:28.923875	\N	bonus	completed	2026-07-19 16:20:28.923875
a7d4f444-b511-40ea-bdd4-60d9e956ade0	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	6af7650d-0291-4f27-8c2a-d011cd8aa5c3	20	Crédit de bienvenue	2026-07-19 16:20:29.07297	\N	bonus	completed	2026-07-19 16:20:29.07297
bde430d7-ea24-4065-8985-8011f454dc32	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	abefbf68-8f1a-4a92-ab47-3b59d1a467f0	20	Crédit de bienvenue	2026-07-19 16:20:29.217495	\N	bonus	completed	2026-07-19 16:20:29.217495
916f7229-a0f5-4a2f-9081-356abb3db281	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	6b155725-0b75-43a3-a79b-8be86eb084a9	20	Crédit de bienvenue	2026-07-19 16:20:29.356562	\N	bonus	completed	2026-07-19 16:20:29.356562
54b2fe10-c6f3-4766-abd4-7d42090da58a	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	14cab1e0-e09d-4470-b463-8693377057ee	20	Crédit de bienvenue	2026-07-19 16:20:29.504325	\N	bonus	completed	2026-07-19 16:20:29.504325
97e09c53-51b0-44e6-bfa7-785433dd308e	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	7954b9b5-31d9-41af-8a10-f69973d28f78	20	Crédit de bienvenue	2026-07-19 16:20:29.654802	\N	bonus	completed	2026-07-19 16:20:29.654802
1d9c94b1-6fe8-4ca9-b3ac-e124c73fce83	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	2185e0ea-79ab-46a8-9c75-998456405f7b	20	Crédit de bienvenue	2026-07-19 16:20:29.807797	\N	bonus	completed	2026-07-19 16:20:29.807797
743a89c4-b802-46ce-abd2-56412256d520	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	9c455af2-f5fe-4e13-9895-479ffa570f71	20	Crédit de bienvenue	2026-07-19 16:20:29.949188	\N	bonus	completed	2026-07-19 16:20:29.949188
b07c9775-c7be-4d81-a239-5fcfa0b3b6c2	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	9957a821-49a4-43ac-8de8-56bc90f65f75	20	Crédit de bienvenue	2026-07-19 16:20:30.097767	\N	bonus	completed	2026-07-19 16:20:30.097767
307f1591-0320-4faf-a5e0-48afcb38398f	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	2af73d2b-763e-4f47-bf3e-1f5851cd7855	20	Crédit de bienvenue	2026-07-19 16:20:30.255909	\N	bonus	completed	2026-07-19 16:20:30.255909
cfdb9dfc-2266-4a9d-924a-7e5ff734ae9d	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	59ef6c4c-1dae-4dcf-a052-ccda69c8c2f6	20	Crédit de bienvenue	2026-07-19 16:20:30.412902	\N	bonus	completed	2026-07-19 16:20:30.412902
14878deb-55ee-4282-ab49-1f714d2b49cc	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	f9a38646-8dd4-4188-a5c8-0755800239cd	20	Crédit de bienvenue	2026-07-19 16:20:30.552075	\N	bonus	completed	2026-07-19 16:20:30.552075
51483f1d-9dee-455e-82a2-5694851bf7d2	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	e3129c13-1e94-48af-a377-ac05032d85e7	20	Crédit de bienvenue	2026-07-19 16:20:30.703901	\N	bonus	completed	2026-07-19 16:20:30.703901
0980c284-466c-4831-af90-b865f2cbb7d5	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	baafe31d-2814-4fd2-b364-26cb7aef816d	20	Crédit de bienvenue	2026-07-19 16:20:30.849928	\N	bonus	completed	2026-07-19 16:20:30.849928
ae0d9bc7-f9fa-4b79-aa91-7bdcea44f8f7	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	05ab0110-a272-402e-adfc-97ec350bdbbd	20	Crédit de bienvenue	2026-07-19 16:20:31.000794	\N	bonus	completed	2026-07-19 16:20:31.000794
108c4caf-e8a0-4802-9355-d0f7aaae8bea	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	a232dcd6-c561-482f-ad14-00915896b5bb	20	Crédit de bienvenue	2026-07-19 16:20:31.153011	\N	bonus	completed	2026-07-19 16:20:31.153011
4c0c3112-00e1-4652-91c8-43aeb88f80ae	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	385f0c46-6506-4665-bd31-94572dc0bfa3	20	Crédit de bienvenue	2026-07-19 16:20:31.303773	\N	bonus	completed	2026-07-19 16:20:31.303773
eb16871b-bd56-418b-8b09-9cac32959bbd	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	2989dba5-6a42-47b8-9a0b-2027bc350270	20	Crédit de bienvenue	2026-07-19 16:20:31.442626	\N	bonus	completed	2026-07-19 16:20:31.442626
05d2b2d7-cdbe-4e1e-aa92-7d642d4c4cb5	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	ece1a9bf-e540-4b93-a9a8-c5927ee41bff	20	Crédit de bienvenue	2026-07-19 16:20:31.563186	\N	bonus	completed	2026-07-19 16:20:31.563186
c4e9d274-ec10-47a0-b37b-a218c8fb2a9d	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	70b2e1ee-0aaf-42ee-b0d7-b06a507f0ac6	20	Crédit de bienvenue	2026-07-19 16:20:31.688208	\N	bonus	completed	2026-07-19 16:20:31.688208
15556822-880b-4a96-8701-002d21f98cf5	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	496778d2-5ed4-4e14-997e-026613a39799	20	Crédit de bienvenue	2026-07-19 16:20:31.816923	\N	bonus	completed	2026-07-19 16:20:31.816923
2e5275dd-553c-4d79-bfa6-4c6a9974fe77	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	a608b260-7347-4bb9-aa9a-486f6f8fe2ad	20	Crédit de bienvenue	2026-07-19 16:20:32.002474	\N	bonus	completed	2026-07-19 16:20:32.002474
7803381c-18fc-4313-b8a1-6d5d3aee5a1e	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	2d93a163-0c15-4358-bd5a-402b7873daab	20	Crédit de bienvenue	2026-07-19 16:20:32.151757	\N	bonus	completed	2026-07-19 16:20:32.151757
6121cd80-ccd8-4c10-a433-8dd298e0212a	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	a6f122f9-3050-4dc0-b0db-e64bbdd5670d	20	Crédit de bienvenue	2026-07-19 16:20:32.298789	\N	bonus	completed	2026-07-19 16:20:32.298789
3af66ec2-4e70-43f5-a787-be2a6ca07831	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	20	Crédit de bienvenue	2026-07-19 16:20:33.321013	\N	bonus	completed	2026-07-19 16:20:33.321013
067c38b8-7cc5-47d8-a860-4ff6a7f8fa8e	1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	35709110-f34a-41c1-80ff-4b71a62dadf7	20	Crédit de bienvenue	2026-07-19 16:20:33.465115	\N	bonus	completed	2026-07-19 16:20:33.465115
ff212e9b-740c-4c7e-862c-d019d7a8772c	7b7f3282-657b-4b46-b276-7d61a8ab93a0	7105c223-a4bf-4c32-8588-9014011de2a7	3	Service payment: Initiation à la photo numérique	2026-07-19 16:21:11.29371	6a5cf977bd665b4769d4dd90	service_payment	pending	\N
6f2a0f79-17da-45ae-90e9-8b603ce0e2ae	d1d6807d-d977-48e4-9c6b-77e95432a8d8	7105c223-a4bf-4c32-8588-9014011de2a7	3	Service payment: Cours de jardinage sur balcon	2026-07-19 16:21:11.374464	6a5cf977bd665b4769d4dd96	service_payment	pending	\N
b6d032fa-372c-44a0-a7ae-b3b97c0929df	7105c223-a4bf-4c32-8588-9014011de2a7	8b416e20-2d9e-4651-a404-ad4dee77e628	6	Service payment: Aide au déménagement de petit volume	2026-07-19 16:21:11.411407	6a5cf977bd665b4769d4dd99	service_payment	pending	\N
7715390c-db72-41ea-9e57-9facdc02d406	8c71e147-6268-4866-ad27-1d543d7c1bef	a6c75ac0-0c57-4a44-890c-8fee1912b601	3	Service payment: Montage de meubles en kit	2026-07-19 16:21:11.859996	6a5cf977bd665b4769d4ddc0	service_payment	pending	\N
28a739c8-4bae-4069-9fc7-c7f5854ca792	2f5c3427-fff8-4210-a68a-7d6b8a197be0	d1d6807d-d977-48e4-9c6b-77e95432a8d8	8	Service payment: Recherche baby-sitter pour une soirée	2026-07-19 16:21:11.888234	6a5cf977bd665b4769d4ddc3	service_payment	pending	\N
772fa6b0-0552-481a-8e63-4d2467a19a7c	7105c223-a4bf-4c32-8588-9014011de2a7	c51f41a7-3810-4d0b-bedc-a8ed7b23ac02	3	Service payment: Cours de cuisine végétarienne	2026-07-19 16:21:11.453672	6a5cf977bd665b4769d4dd9c	service_payment	cancelled	\N
4c3163bd-759a-40b3-9392-ea2049b6b31c	98d76b0b-a146-44f8-a189-e182cd0ff9a5	7105c223-a4bf-4c32-8588-9014011de2a7	4	Service payment: Préparation de repas maison pour la semaine	2026-07-19 16:21:11.342485	6a5cf977bd665b4769d4dd93	service_payment	completed	2026-07-19 16:21:31.052
e2789598-04c1-432b-a907-2f5cf1390f69	7105c223-a4bf-4c32-8588-9014011de2a7	84952860-7e56-4de1-ad1c-21ae9db7713c	4	Service payment: Peinture de petites surfaces	2026-07-19 16:21:11.486106	6a5cf977bd665b4769d4dd9f	service_payment	completed	2026-07-19 16:21:31.163
144ad5a8-93e8-4f49-a612-d3f5f15bf486	492d4bf3-490b-4c29-a271-58293ceff4b1	f5e1f506-00f9-4740-a148-a4430e8f42c5	2	Service payment: Dépannage informatique à domicile	2026-07-19 16:21:11.557401	6a5cf977bd665b4769d4dda5	service_payment	completed	2026-07-19 16:21:31.265
c6c396e5-2757-43c2-8385-051360596b46	f8c1b29d-7618-4398-a45a-b005d66538c4	83c4577b-667e-468e-bb6f-a879147e8c93	4	Service payment: Garde d'enfants après l'école	2026-07-19 16:21:11.795595	6a5cf977bd665b4769d4ddba	service_payment	completed	2026-07-19 16:21:31.499
e1b52c88-e9a8-4606-9510-925e4378d9c1	a35d2398-27f4-4e96-a389-f1c8ba97f945	84eb8a87-2ad8-47c9-927a-6eea110c33a3	2	Service payment: Conversation en anglais autour d'un café	2026-07-19 16:21:11.825488	6a5cf977bd665b4769d4ddbd	service_payment	completed	2026-07-19 16:21:31.535
17d7d4b9-2194-4953-aebd-eff76eccf655	7105c223-a4bf-4c32-8588-9014011de2a7	f9ce9fd7-98bd-4752-8c1d-b16a9e607390	2	Service payment: Transport de courses lourdes jusqu'à l'étage	2026-07-19 16:21:11.520626	6a5cf977bd665b4769d4dda2	service_payment	completed	2026-07-19 16:22:01.055
6fd56f0f-546a-446c-8738-6a817f045917	9bd75be7-b5ef-4c46-bec4-2a7ffb9bd2d8	f5e1f506-00f9-4740-a148-a4430e8f42c5	2	Service payment: Dépannage informatique à domicile	2026-07-19 16:21:11.601974	6a5cf977bd665b4769d4dda8	service_payment	completed	2026-07-19 16:22:01.11
642fd599-f78c-4815-8929-42a82feacb5e	3e37ed32-e92c-46c6-b6c9-751726a19406	84952860-7e56-4de1-ad1c-21ae9db7713c	4	Service payment: Peinture de petites surfaces	2026-07-19 16:21:11.677932	6a5cf977bd665b4769d4ddae	service_payment	completed	2026-07-19 16:22:01.139
78be9166-5baa-4a2e-ac57-9fa03bcc325f	e3e6a2c0-fcb3-453c-ac72-2049c8fd8469	f9ce9fd7-98bd-4752-8c1d-b16a9e607390	2	Service payment: Transport de courses lourdes jusqu'à l'étage	2026-07-19 16:21:11.730172	6a5cf977bd665b4769d4ddb4	service_payment	completed	2026-07-19 16:22:01.164
adcc6ba6-1e89-4d9c-90c8-4a4320f50d67	682656d4-a8f2-4d70-bfa7-4bc5ef15e182	f5e1f506-00f9-4740-a148-a4430e8f42c5	2	Service payment: Dépannage informatique à domicile	2026-07-19 16:21:11.642407	6a5cf977bd665b4769d4ddab	service_payment	completed	2026-07-19 16:22:31.058
e1b5ac65-37ab-41a2-85d9-26aeb7c9a4e1	dcd2b387-ead0-4ef2-b905-51d9e5d2720f	84952860-7e56-4de1-ad1c-21ae9db7713c	4	Service payment: Peinture de petites surfaces	2026-07-19 16:21:11.703208	6a5cf977bd665b4769d4ddb1	service_payment	completed	2026-07-19 16:22:31.112
a4b73449-8878-4f56-850f-a8f73e40ce6c	7b7f3282-657b-4b46-b276-7d61a8ab93a0	f9ce9fd7-98bd-4752-8c1d-b16a9e607390	2	Service payment: Transport de courses lourdes jusqu'à l'étage	2026-07-19 16:21:11.762367	6a5cf977bd665b4769d4ddb7	service_payment	completed	2026-07-19 16:22:31.15
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
a6c75ac0-0c57-4a44-890c-8fee1912b601	bob@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$WkxEBC2p/nPXTC7BNmtK7g$TmxcQXqMkWEIMrBSjWVVB9GhNEb3F7D101n4x222i0s	K7QM4TZBX2VNHR5CJWYD6LPS3AF4EGU2	moderator	$argon2id$v=19$m=65536,t=3,p=4$YNjZ0Tp6lHzZC40/ACak1A$a5IfTNttCffp04La5/QbUZLsBmCiwasgqei/MnPjqbM	2026-07-19 16:20:23.216914	2026-07-19 16:20:44.346	Bob	Dupont	/users/avatar/6a5cf95cbd665b4769d4d340	6a5cf951bd665b4769d4d32f	44 Rue Custine 75018 Paris	48.889168	2.345603	+33612111011	\N
f5e1f506-00f9-4740-a148-a4430e8f42c5	thomas.girard@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$7I4r9VUx+FrVcjoUCJNY3w$dEDtTgbj4/feohAwh4MnufGpFDQUhTmuFPAv8M/bBfc	WTKOWYEKZKDPRXWAFT66DR6WZZNQRIBZ	resident	$argon2id$v=19$m=65536,t=3,p=4$hHnnK5+1v/DKZvzpnC5D0A$6od6WnNb5rfiQpCJJIyAG/RcHdB6gWZuS+fuYdZJ/R8	2026-07-19 16:20:23.82137	2026-07-19 16:20:23.82137	Thomas	Girard	\N	6a5cf951bd665b4769d4d32f	6 Rue Steinlen 75018 Paris	48.888855	2.332706	+33612666066	\N
388c8909-e9dc-44c8-a91f-efcd3b73503a	julien.moreau@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$8qpe9feQM5CcVQXrnpAGQA$aiAn7B3UN5J0cxL68FrzW0dcmn+gLDHeoa742yKmKcA	AUFVE5AM2PXHZA3YTP4GTOUT56Y6FGFA	resident	$argon2id$v=19$m=65536,t=3,p=4$0XUxsHgE3B9gzBx/yn2MjQ$GjXi0RGDRjtBEwvqtehsCkp6QUqNR2zBOL2skT82X1c	2026-07-19 16:20:23.520222	2026-07-19 16:20:44.808	Julien	Moreau	/users/avatar/6a5cf95cbd665b4769d4d344	6a5cf951bd665b4769d4d32f	14 Rue Forest 75018 Paris	48.885735	2.329087	+33612444044	\N
492d4bf3-490b-4c29-a271-58293ceff4b1	lea.rousseau@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$4MJAWzUyX3DKI5bMXOmV4Q$lEjzEzdyDODBD9hhw1J801P/kOv8ZSB1dYTMZya777M	4NBWQYAKI33FFYPOEBDP56Y5ZH27W54W	resident	$argon2id$v=19$m=65536,t=3,p=4$zBHn4V6wEFTHU+HFIgfFqQ$LTuqccGPte+6TOjjJp83XBQ7/X7WWOV9+fwYwWMQdzI	2026-07-19 16:20:23.972377	2026-07-19 16:20:23.972377	Léa	Rousseau	\N	6a5cf951bd665b4769d4d32f	31 Rue Simart 75018 Paris	48.891342	2.347124	+33612777077	\N
e3e6a2c0-fcb3-453c-ac72-2049c8fd8469	nicolas.fontaine@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$JniehyZ6bOKKBMFWQAFYzg$frCIM2yfngzzMhkvIMFNlWDFXg2DFVNnhGFOh79SiEk	JYESGLPA7MUJXL6FYK6IN2ZDT4G7DTBH	resident	$argon2id$v=19$m=65536,t=3,p=4$B+ajo1sCNSKz0KsxaFahhg$1RRdjUaQ9a+R/GVbIZOrOmx1sAB6HdRR7Rnr2nEc6GU	2026-07-19 16:20:24.11982	2026-07-19 16:20:24.11982	Nicolas	Fontaine	\N	6a5cf951bd665b4769d4d32f	180 Boulevard Ney 75018 Paris	48.897842	2.330422	\N	\N
7b7f3282-657b-4b46-b276-7d61a8ab93a0	emilie.chevalier@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$SqUNqJFwz72J3llR0M5WaA$3YvGjBiK1XFWIhEX+PoknKney2i8ZNaW5/R69oVY5/k	4V4SYV2MOV3URFIVG7KTTXA2HFSLEHRD	resident	$argon2id$v=19$m=65536,t=3,p=4$L1pSrDombhD0okMj9tHDpw$nM93Bg4+Tqw4wdOCTmkLo3blJOHXiKpMrBZZa4B/gWY	2026-07-19 16:20:24.278103	2026-07-19 16:20:24.278103	Émilie	Chevalier	\N	6a5cf951bd665b4769d4d32f	6 Impasse Massonnet 75018 Paris	48.895756	2.351727	\N	\N
f8c1b29d-7618-4398-a45a-b005d66538c4	manon.leroy@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$winp+yVREzJlMU4GNZ0VfA$BacnUZGULa/09aZSpcsptXbyyBqolytp3cuPH19iNWE	FLC2O7KDQVL5JLUHF4V66GEKYYIRCKIQ	resident	$argon2id$v=19$m=65536,t=3,p=4$b8GEXrRK2NLO6zp3/Z3/kw$tXrgjNtkLSSoqP8foyc8JqGnE08Pe28+PWfW5B61kgA	2026-07-19 16:20:24.5924	2026-07-19 16:20:24.5924	Manon	Leroy	\N	6a5cf951bd665b4769d4d32f	4 Place Marcel Aymé 75018 Paris	48.887703	2.337753	+33612888088	\N
9bd75be7-b5ef-4c46-bec4-2a7ffb9bd2d8	chloe.barbier@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$LB3vhSWUUrsXNw+tiak4Wg$PZDRPhpqxSZ3IChu608dtJXQYqkgnYYk+hyCw/kjFF0	7SWT4PMNQ5QY67DP4OL5RJOOQVSUEYN2	resident	$argon2id$v=19$m=65536,t=3,p=4$Vxya4r6zz/Xgh/ccoqkmMw$bKWSM11/XzIHupfpjgQhd1p75NVp9i5Poh3Luk/S5+M	2026-07-19 16:20:24.885865	2026-07-19 16:20:24.885865	Chloé	Barbier	\N	6a5cf951bd665b4769d4d32f	128B Boulevard de Clichy 75018 Paris	48.884632	2.329114	\N	\N
98d76b0b-a146-44f8-a189-e182cd0ff9a5	maxime.renaud@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$tRHgl5j05RHoUEVIyKU6hg$af7pn8aKA7uN1NjrD7iHSif+JmUb2eop/jbR4ZvgIyw	VADESTO4DIB2WPKIC3WV6JYKQZKT5OFS	resident	$argon2id$v=19$m=65536,t=3,p=4$J2qwvzMmsbc73mXoG+x4JA$DlZVr90FSAyeMPJXPmSUr0gtTheJ4TEtCz56hGxuH5E	2026-07-19 16:20:25.020676	2026-07-19 16:20:25.020676	Maxime	Renaud	\N	6a5cf951bd665b4769d4d32f	4 Villa Dancourt 75018 Paris	48.883045	2.341077	\N	\N
8c71e147-6268-4866-ad27-1d543d7c1bef	vincent.dumas@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$6hnivvQ0+TH/3yKsURcJSg$8IdKkubvyFy7JNOpnX9yfrw+4X5vSbI+NWyG7UMA5Fg	GGFLEW35CZSHGQVULJIPQKMY53VQY64Y	resident	$argon2id$v=19$m=65536,t=3,p=4$VYrW6PDzDI2Uiv8N7CLFBA$l0LqtafLEUyPJ7Em5XoTD39SeeB8jEbOUcTDOqPy7pg	2026-07-19 16:20:25.30034	2026-07-19 16:20:25.30034	Vincent	Dumas	\N	6a5cf951bd665b4769d4d32f	51 Rue d'Orsel 75018 Paris	48.883465	2.340585	\N	\N
84eb8a87-2ad8-47c9-927a-6eea110c33a3	romain.guerin@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$Xu21xwNpzXuweLBioEw7hQ$z5YLymdIGHxsWhVySfGyzbNEz7hxP/BJQdw6sB8OfGs	Q3FEQ7C73MIH2ZONYBSO62QDEXPUZUSX	resident	$argon2id$v=19$m=65536,t=3,p=4$hT7haPB4+M4dFOMTUpkKwQ$w3CFWuhwllXdROhCTz98OjAi7rRTf6t/QS8ezKzVCVQ	2026-07-19 16:20:25.595277	2026-07-19 16:20:25.595277	Romain	Guérin	\N	6a5cf951bd665b4769d4d32f	4 Rue Carpeaux 75018 Paris	48.890396	2.330252	\N	\N
84952860-7e56-4de1-ad1c-21ae9db7713c	pauline.colin@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$QjYVGxWNY5aYECEQpeLbLw$jUTgy3Qp+YinTlB/xNoQNIl+ZsFQT5Bma7VZxtktun0	APS7W6C4UTJ2HLBCSHWXLFFPBGDBIDIA	resident	$argon2id$v=19$m=65536,t=3,p=4$5+9PBzwVW+eh72VX4tfbwA$PvR/Jn+9APhus26nLy1GyDNGCbbzdNm3geOfvCuPKdE	2026-07-19 16:20:25.739834	2026-07-19 16:20:25.739834	Pauline	Colin	\N	6a5cf951bd665b4769d4d32f	40 Rue du Poteau 75018 Paris	48.89452	2.341271	\N	\N
375018f5-9ff8-4631-9e7f-46cecffec45d	elodie.blanchard@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$4N18z7l5OTVXD0sMdBL/8A$EROgOVSdblG6jboED61KyzuzpNX70Wh0vVVdCa5Om/g	ABW4HV2PND3XVQGCTW3RUNJP6TJTSUQQ	resident	$argon2id$v=19$m=65536,t=3,p=4$rakbtGBWvIiHG0OUqBnAkg$tmIsKskvPcxEjp2nRdhTiAQGp+nwqn1JOn8+uCYM5Io	2026-07-19 16:20:26.039635	2026-07-19 16:20:26.039635	Élodie	Blanchard	\N	6a5cf951bd665b4769d4d32f	18 Rue Camille Flammarion 75018 Paris	48.89897	2.340179	\N	\N
3e37ed32-e92c-46c6-b6c9-751726a19406	amandine.poirier@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$AezMHtzNQNp304kbs+k3tw$W0t3g1Bximkgqt+j6iDEKmN0QWqPJuYuAJ0RDz110eU	B42BIE2I7YCOZ2WNUPSKXT65JSQVNCBN	resident	$argon2id$v=19$m=65536,t=3,p=4$5IgVAnPH8aUfNPH5amhlBg$J8lCVh4hULwg//Ip9BuZQpEbPP879KNba0U6BoOWYco	2026-07-19 16:20:26.324466	2026-07-19 16:20:26.324466	Amandine	Poirier	\N	6a5cf951bd665b4769d4d32f	36B Avenue Junot 75018 Paris	48.889156	2.33666	\N	\N
dcd2b387-ead0-4ef2-b905-51d9e5d2720f	kevin.charpentier@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$a7Dlf3Xhuwrxh3axN3ijxQ$qmLj5Ub810GQf1gaOZ5pjX3g5MU/nqcTgejkw9gTlSQ	6BPHR6PKHUTGKQT66TZEEF55FGJDEZHV	resident	$argon2id$v=19$m=65536,t=3,p=4$BAX17jlRfQxdi0Cm38jwWw$2+gHmK9Vkpheq+q8fAHQ9WjB+bN5KTToiJKut/uJxxo	2026-07-19 16:20:26.452594	2026-07-19 16:20:26.452594	Kévin	Charpentier	\N	6a5cf951bd665b4769d4d32f	100 Rue de Clignancourt 75018 Paris	48.891544	2.348809	\N	\N
915cc86c-6668-4bad-9c2b-c595d5ab95a2	olivier.deschamps@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$763iBr/8M19wFLLxnA0JjQ$tngb0/jWoBWk4TAVD7o1yoa0IOvNl1CZICjpvq/ZUJc	7ETE373XXPDHJGJRYUT3CANI4WQ67MOL	resident	$argon2id$v=19$m=65536,t=3,p=4$ElaN5xyaEPwu6u7uDAJYoA$jZIk2qKlR4a+G9Zu3RSvsSNk2JR0R0FWDu6PWwGo/5s	2026-07-19 16:20:26.744364	2026-07-19 16:20:26.744364	Olivier	Deschamps	\N	6a5cf951bd665b4769d4d32f	17 Rue Cauchois 75018 Paris	48.885414	2.333008	\N	\N
2b384ed6-34e6-4bfb-8532-bfc8cc4a6ac2	pierre.lacroix@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$FxQo2nVTbnFx9YVt2gdFRg$YTFZqBACLLhtuH3EZd8iueR2Eal2+04kILekx0Mxi88	WMYQ2IZ6N7HAHNILUVJBT5MHL5WECBRJ	resident	$argon2id$v=19$m=65536,t=3,p=4$t4ViG50sHg3PnA6iUum4/g$agpKNIoJ4BxoVrHLRw0anchjIWQ125OCYrT1PVluhz0	2026-07-19 16:20:27.034721	2026-07-19 16:20:27.034721	Pierre	Lacroix	\N	6a5cf951bd665b4769d4d330	21 Rue des Minimes 75003 Paris	48.857346	2.364825	+33613221121	\N
ae5e859e-128c-4e29-9894-fc2ef17b5e42	mathilde.aubert@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$Q6psPbJqpCV5JS0rGvq7GA$tIULeMpFIdz4gQwdrKPugGXtMXBcc3xRtwrIAxsUw6k	TTVLFHFDRBEN35BNCPKK6H3IDECF4RK3	moderator	$argon2id$v=19$m=65536,t=3,p=4$+Oq3PL8ODn31f5Zt+X8cHw$+0hIgGGsMqnjahidyznAfe4AS/fG20m43xUK+kekOMM	2026-07-19 16:20:26.894665	2026-07-19 16:20:45.038	Mathilde	Aubert	/users/avatar/6a5cf95dbd665b4769d4d346	6a5cf951bd665b4769d4d330	41 Rue de Turenne 75003 Paris	48.85736	2.364332	+33613110110	\N
1d82fd2c-47e5-4cf3-a22a-829d957c8212	bastien.noel@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$DqmnqjwQERdhM2CdoNaJRw$V7COTQArFesYm62rw3nZ5plzouVt17/AeKd4qx8k6fY	AWA6THMN7BYZBUGHYJYQT4CZK2L2MQ4M	resident	\N	2026-07-19 16:20:28.777874	2026-07-19 16:20:28.777874	Bastien	Noël	\N	6a5cf951bd665b4769d4d33b	18 Rue Chalgrin 75116 Paris	48.874817	2.288958	\N	\N
6af7650d-0291-4f27-8c2a-d011cd8aa5c3	samuel.ferrand@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$j2YtMy7iJSaS4cd2LL3Wqw$HTtm9fYlPQ7zxSPC9OVMoeM0oVS9WP2zWHN9nnxDDcY	WNGAOLYDWM3BZCHC5ZWVCIQNBBC24FEN	resident	\N	2026-07-19 16:20:29.07297	2026-07-19 16:20:29.07297	Samuel	Ferrand	\N	6a5cf951bd665b4769d4d338	2P Impasse des Anglais 75019 Paris	48.889088	2.375756	\N	\N
bb7be65b-9e6d-477d-b4a7-43bff3fd9b03	farid.amrani@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$NeU2DBgxGOaHrGOG89TUvg$8EAnjYX767INaVkWeoitg11/fn2nFfO601ZQ4UgmsQM	HTPXNHUW4V2GK2HXBMBWKBTA5WODK5JG	resident	$argon2id$v=19$m=65536,t=3,p=4$Bavb835IyPH63VMEo1xjlg$Oh7u2kA3OiB8J3m8IvbnZVj+iJ0EKl9sPJaHSdSsVC8	2026-07-19 16:20:28.493099	2026-07-19 16:20:28.493099	Farid	Amrani	\N	6a5cf951bd665b4769d4d336	16 Rue Eugène Varlin 75010 Paris	48.878784	2.363987	\N	\N
7954b9b5-31d9-41af-8a10-f69973d28f78	fabien.michaud@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$bUE2ekLRlwbojxunKH1vsQ$Gl0oN6dG2UdisEPiMp1keo5jt0XQULkUe6kHycx88OU	3USHFHJXUNTOGJHF6QZGCSHH5OAKHTEN	resident	\N	2026-07-19 16:20:29.654802	2026-07-19 16:20:29.654802	Fabien	Michaud	\N	6a5cf951bd665b4769d4d33b	27 Rue de Longchamp 75116 Paris	48.86491	2.290318	\N	\N
9c455af2-f5fe-4e13-9895-479ffa570f71	cedric.hamon@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$kOXaTzh2lllkvH7XJ/2lXQ$dVXGDqIfPhigwzNhq6lIqKjHAgtStw1ohQTpqNOYZmE	3EO74BRPRLTL4UU37UXRHEJ32UTNG2RB	resident	\N	2026-07-19 16:20:29.949188	2026-07-19 16:20:29.949188	Cédric	Hamon	\N	6a5cf951bd665b4769d4d33c	73B Rue Villiers de l'Isle Adam 75020 Paris	48.868046	2.397438	\N	\N
2af73d2b-763e-4f47-bf3e-1f5851cd7855	karim.benhamou@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$2q+t/Av/i2IHMMEzi3JhIA$aZUlc2K2AOOtK0FBjRZ+6ff+X/KCG2ksDypP9EC9arE	WLNCKFKZOBPAQQD7AEZI62VFCOSL5X5B	resident	$argon2id$v=19$m=65536,t=3,p=4$htMvPZXkn43Dobl1EfvFNw$8kN/Dxorc4rNKgECAKOWfvZChO+60RPpUq7w1FYnQRI	2026-07-19 16:20:30.255909	2026-07-19 16:20:45.51	Karim	Benhamou	/users/avatar/6a5cf95dbd665b4769d4d34a	\N	42 Avenue Gabriel Péri 93100 Montreuil	48.85688	2.442272	+33613776176	\N
f9a38646-8dd4-4188-a5c8-0755800239cd	marc.delorme@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$NYjXsFpXtnqMdab0tKpeWw$PwiwXcZTjp/li7gYkeHJI56A2q22I7fUePyrhHZJh2w	R5O2JJ33YFAW7TNAO3ZRTWWSGINKCFWK	resident	\N	2026-07-19 16:20:30.552075	2026-07-19 16:20:30.552075	Marc	Delorme	\N	\N	Square Pierre de Geyter 93200 Saint-Denis	48.931473	2.351752	+33613998198	\N
baafe31d-2814-4fd2-b364-26cb7aef816d	ludovic.weber@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$x7A1hUr4DVwe7rriWFaOBA$0bPCHDPQqZIULRdh9qGSEXAqEl5fyGaAtFAu+nyqehs	B7SX3KJEWMZEE233LTH3RDIZWEKYZKSF	resident	\N	2026-07-19 16:20:30.849928	2026-07-19 16:20:30.849928	Ludovic	Weber	\N	\N	189 Rue du Vieux Pont de Sèvres 92100 Boulogne-Billancourt	48.82954	2.23718	\N	\N
a232dcd6-c561-482f-ad14-00915896b5bb	gregoire.tanguy@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$sLglp2DroT6LiY2cjHRIkA$CV6WGxn3Y0IeVgbvPiZhcMdilUKgL9qYe6SIdvL1fVw	4XTYYBJSPNDOCPF4XVOZOC3HMHPEX5SB	resident	\N	2026-07-19 16:20:31.153011	2026-07-19 16:20:31.153011	Grégoire	Tanguy	\N	\N	37 Rue Edouard Nortier 92200 Neuilly-sur-Seine	48.889595	2.268798	\N	\N
2989dba5-6a42-47b8-9a0b-2027bc350270	xavier.brunel@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$zijjiyCJMTpaMrpFN6UCwQ$d1r1luTN11tQFasSz7wHIczNMJuuInO4q/NgmkmRgR4	2Q5VPQHKMDBURPXWTOYOKUR5IIN6HO4S	resident	\N	2026-07-19 16:20:31.442626	2026-07-19 16:20:31.442626	Xavier	Brunel	\N	\N	59 Avenue de la Résistance 93100 Montreuil	48.861076	2.43676	\N	\N
70b2e1ee-0aaf-42ee-b0d7-b06a507f0ac6	benoit.carpentier@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$Tcvx3Rol7ypVfcCpeMrIaQ$G0UNv/+ZJZWtY8oNeOnK9/IexKvuDml8sC7YFPEZ3rA	VKAL2LC3VR62BGTT26RL67H3J6JCMA3B	resident	\N	2026-07-19 16:20:31.688208	2026-07-19 16:20:31.688208	Benoît	Carpentier	\N	\N	16 Rue Auguste Gillot 93200 Saint-Denis	48.94022	2.353436	\N	\N
a608b260-7347-4bb9-aa9a-486f6f8fe2ad	sylvain.lacombe@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$gUetqcGdcsALmqh6HXl53g$qTiT/5iZcZoCcOy1J79Y5b5JZM6fdpMdqxvpp5mfABI	VEO5WTAHOZCM5MGW4ZTGIBRQYC3K45DF	resident	\N	2026-07-19 16:20:32.002474	2026-07-19 16:20:32.002474	Sylvain	Lacombe	\N	\N	159 Rue du Vieux Pont de Sèvres 92100 Boulogne-Billancourt	48.831318	2.241804	\N	\N
a6f122f9-3050-4dc0-b0db-e64bbdd5670d	quentin.morvan@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$cRkslJr/s9mm3DYEem0kmw$keCmM7uh87byS27uyD/8SoGlpyNTrXS7zITKR9GhY9A	ETM4NW7ZK4F6CXISJUZC2L3NG2B3M23W	resident	\N	2026-07-19 16:20:32.298789	2026-07-19 16:20:32.298789	Quentin	Morvan	\N	\N	95 Rue de Chézy 92200 Neuilly-sur-Seine	48.890938	2.274747	\N	\N
b59c4dfa-39a5-490c-95ee-5039bf70b6ce	sonia.klein@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$FyEjqRA5cuX9nBQyKu+5gw$oUrwuLhg7rOv+wtanb8DfRBxRurWxmMAE/byT+YiD3Y	HVFF2APGHTHPJB7Q3LVPKS5AVKLOXL7H	deleted	\N	2026-07-19 16:20:32.581542	2026-07-19 16:20:32.581542	Sonia	Klein	\N	6a5cf951bd665b4769d4d32f	7 Rue des Saules 75018 Paris	48.887535	2.339652	\N	\N
6288ed9d-d6b7-424f-aa2e-435bdc89ab9f	ingrid.bertin@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$EfB1EVOkxK3QNeqJC7CrXw$Vi37elnb1kTiiS517hEI5PSS0mucdhn5MQ2zvUeI78o	PH2QBBFIE74LKFZGB4PEXWMXEGWBYDNC	banned	\N	2026-07-19 16:20:32.880595	2026-07-19 16:20:32.880595	Ingrid	Bertin	\N	6a5cf951bd665b4769d4d334	59 Avenue Daumesnil 75012 Paris	48.847023	2.376313	\N	resident
0c2a15f9-a8ff-4055-a1c5-019d92e0cde3	nina.weiss@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$+VH+5MAS8wnE17EFOlHd/g$xvZbOFqjU/+25zboEJn/G3rMNRUAU9tnax3T6CX47SE	XAXKEZKV5QVFTGNMBTC54TWLYAIUERGP	deleted	\N	2026-07-19 16:20:33.156524	2026-07-19 16:20:33.156524	Nina	Weiss	\N	6a5cf951bd665b4769d4d330	21A Place des Vosges 75003 Paris	48.856705	2.365098	\N	\N
e8cca443-33b1-4cc2-a92d-601ee0d4601f	yanis.traore@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$w7XuI1ZwTzS8CQYU7eM/Kw$bT+GsBW6FC3vWjAgXoDF/BbM2f02BGj7uId2bob7vpo	2OSKTRMM4ATGME3L6XPNZNAXO5C4YWB4	resident	$argon2id$v=19$m=65536,t=3,p=4$6oLsSuGW3DUPv8vPIMtqyg$gLRjRPV/kqZRAAMjP8ZvKDIvYytUhOITiY7gP7XU0+c	2026-07-19 16:20:27.324611	2026-07-19 16:20:27.324611	Yanis	Traoré	\N	6a5cf951bd665b4769d4d331	26 Rue Henri Chevreau 75020 Paris	48.869953	2.389378	\N	\N
83c4577b-667e-468e-bb6f-a879147e8c93	sophie.lefevre@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$dp2JTK11V9GroTL5dOetaQ$HU5dL8Tm6k3IJgsm8XWsW9BsVV2sQsF0AEpA5CVHn30	CHUMEDYFMQ7F6YRR6RFVMWUTK45NK5PR	resident	$argon2id$v=19$m=65536,t=3,p=4$uw6jwCD6LftpK3N9jxKXZw$Z4yL9pI+62x6ZlKseOqHARhpg8tVnJALgGw1QVlDXLM	2026-07-19 16:20:23.659339	2026-07-19 16:20:23.659339	Sophie	Lefèvre	\N	6a5cf951bd665b4769d4d32f	3 Rue Dejean 75018 Paris	48.887196	2.350656	+33612555055	\N
51c7580a-6004-40f3-8838-b700787ffe3a	remi.delaunay@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$7KFN9cTXBqJpcyHA4oOOPQ$Nh4OVD1TbMPEsXYlQtGzxBnixtd4ku6ckL5dXZCRueQ	IMNPMZ7B3BHWAUJZQ4XU57IJSSIN2ZL4	resident	$argon2id$v=19$m=65536,t=3,p=4$36rHNytSuC92d6LpI5+yWw$Pg1SLMegwXZThgZk49l6W0Cl2bFzgSO8nwct6tvLZSk	2026-07-19 16:20:28.203565	2026-07-19 16:20:28.203565	Rémi	Delaunay	\N	6a5cf951bd665b4769d4d334	167 Rue de Bercy 75012 Paris	48.842606	2.375239	\N	\N
6a830c5d-3251-4918-bb56-c0675e78052d	damien.faure@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$+9fLEQa85CE9ir/VFug51w$RpIfFSJRnVV/ogqZDbyIG8HftUjHDMgzWx/w2BCmEcY	WNLPZPFTRW2ALEQJ6NITGHSGUL2CJ2Z4	resident	$argon2id$v=19$m=65536,t=3,p=4$91C4Pgda6KI3mJ9MvvkRUg$TZIpDB3V6HO3uhY73mSXY+A0Ts6STYsUUf2nQNNPlHw	2026-07-19 16:20:27.90394	2026-07-19 16:20:27.90394	Damien	Faure	\N	6a5cf951bd665b4769d4d333	82 Place du Docteur Félix Lobligeois 75017 Paris	48.88706	2.317876	\N	\N
6b155725-0b75-43a3-a79b-8be86eb084a9	theo.bourgeois@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$jKY4BgHxAFEe2zDmnASBWA$Maf1ZR9cZMFvacmfSr2rcZ0hOSggceHKa3q+O7AD0n0	2BOHJAYHV3JVM4VPJATBYRJ4AIB6JQVO	resident	$argon2id$v=19$m=65536,t=3,p=4$1NoAaEwc4e7b1ZQQdSRDjQ$uT61cHRYNrLU1jDzPY0quMWeOs7yvTkiamTsSu3eK2U	2026-07-19 16:20:29.356562	2026-07-19 16:20:29.356562	Théo	Bourgeois	\N	6a5cf951bd665b4769d4d339	271 Boulevard Raspail 75014 Paris	48.836884	2.331786	\N	\N
35709110-f34a-41c1-80ff-4b71a62dadf7	valerie.dubois@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$XY75eNmRPOzZZoZ3uFH9WQ$nCKA2bLqYToE7XBPsUwRCpmgGS9shR0Hd1+KP/DabDw	Q3NUNOLNUPRYPE2JLLXJKEJSCMGXC6EQ	admin	\N	2026-07-19 16:20:33.465115	2026-07-19 16:20:33.465115	Valérie	Dubois	\N	\N	\N	\N	\N	+33614109209	\N
22ff32e7-f40c-49c9-b43c-328326460de4	oceane.roy@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$kNtL8jgEpM7ToaCD20R9jA$5jh6dMw3QbpPslZTyVbbAAsAoeNfr9sImlJ5EVIx6UM	L5SDZAE22EUIXLRA567ITBT4EY6QUXLQ	resident	$argon2id$v=19$m=65536,t=3,p=4$BxsQIdWOMC++2zC1QfBBwA$TGpcsUbjEVwIYUO0+A1/+eLqxYCbkWHUhqdkFs1y/iY	2026-07-19 16:20:28.063422	2026-07-19 16:20:28.063422	Océane	Roy	\N	6a5cf951bd665b4769d4d334	9B Rue Michel Chasles 75012 Paris	48.847153	2.37371	+33613665165	\N
abefbf68-8f1a-4a92-ab47-3b59d1a467f0	lucie.gaillard@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$qH1LRdzn/CP1jPcZ5JODWQ$w7a0vRM6qonb9xFzffXzbpJT2G3Ui4W+PLj4qfaPKkA	WFSEQ5PKH3S7XUUZOVPZZX2RHL4VT2JM	resident	$argon2id$v=19$m=65536,t=3,p=4$U3ZcEy9+r8+DbscT7nBhFQ$K1ZWPGTDcNOnqtEszDH39AcuDJXoeKMnUC6AboNJ69g	2026-07-19 16:20:29.217495	2026-07-19 16:20:29.217495	Lucie	Gaillard	\N	6a5cf951bd665b4769d4d339	283 Boulevard Raspail 75014 Paris	48.836117	2.332072	\N	\N
85f7d6ea-8a33-477a-97e5-7c10adb6ec20	alix.marty@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$bLZdna0v6tpSvsoY6bjVrg$FmgDybE0zPh0N7UsbSEVeFiWa1D6ODstiDwe410Joc8	677WVWC4V3NND2GSC3J4ILLTCT2V4TZG	resident	\N	2026-07-19 16:20:28.337403	2026-07-19 16:20:28.337403	Alix	Marty	\N	6a5cf951bd665b4769d4d335	25 Rue Gandon 75013 Paris	48.820766	2.361182	\N	\N
f9166624-469c-4db8-a6e2-1613d09a94be	helene.vasseur@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$tIthnM1InLNRnJJaoKT/Qw$n8o/WIzcQ/C2IPniVJy7mL0/GxgRIEKXW9p0TRMLkDI	54GKIYZI6LNHAYQ3O67DZYRF777D4OAC	resident	\N	2026-07-19 16:20:28.62931	2026-07-19 16:20:28.62931	Hélène	Vasseur	\N	6a5cf951bd665b4769d4d336	21 Rue du Terrage 75010 Paris	48.87736	2.362756	\N	\N
94a7fe44-c2f3-430c-9546-12deee420a9c	charlotte.pichon@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$NMKrHpXrAofSDOfCM3RFoQ$yPrIuPGgvdj3IGxBzHrQQj9GaFWfOl/yu1ukl7c88eE	5XPWAVBHHVUBMPDO3I4UZUNPRZXXWVHO	resident	\N	2026-07-19 16:20:28.923875	2026-07-19 16:20:28.923875	Charlotte	Pichon	\N	6a5cf951bd665b4769d4d33a	11 Rue Auguste Barbier 75011 Paris	48.86895	2.371318	\N	\N
14cab1e0-e09d-4470-b463-8693377057ee	anais.leclerc@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$ny7UMhRieNhE7WZzzmYvkQ$YBTF40DA8oP458rbB37Dty4UilQOaV16sAMMIsJVBe8	GK2CZGYIISCN2OQADCIIHFSIBUV63KDZ	resident	\N	2026-07-19 16:20:29.504325	2026-07-19 16:20:29.504325	Anaïs	Leclerc	\N	6a5cf951bd665b4769d4d337	71 Quai de Grenelle 75015 Paris	48.84933	2.282294	\N	\N
9957a821-49a4-43ac-8de8-56bc90f65f75	nolwenn.legall@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$0eSXkmhTTv3h0ieIAb5MGQ$5AGoPWgAigAMx1sMa+vz5CKdKzf8RFZAlnY5NCTkIV4	QTCMCNJVVEKPL23T5UU2QCSKJ5KX5ZW6	resident	\N	2026-07-19 16:20:30.097767	2026-07-19 16:20:30.097767	Nolwenn	Le Gall	\N	6a5cf951bd665b4769d4d33d	13 Rue de l'Abbaye 75006 Paris	48.854263	2.334369	\N	\N
59ef6c4c-1dae-4dcf-a052-ccda69c8c2f6	justine.prevost@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$qhcztY05goVh+n53SW54tg$CmZPzuWA3m9+7Nqri5vmoJAJ3fUpnGncHq9sQbFnVqI	XSKLFPJCVHHMKCGCAWJ7UUX2QP55TNYE	resident	\N	2026-07-19 16:20:30.412902	2026-07-19 16:20:30.412902	Justine	Prévost	\N	\N	18 Rue du Pré Saint Gervais 93500 Pantin	48.89031	2.402991	+33613887187	\N
e3129c13-1e94-48af-a377-ac05032d85e7	aurelie.blanc@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$NWRq3AIq7djgl28IMmdpTw$xg0eLBW/dOrfOiufw9U7OkubFTeS/M0NfcrUUZT+IG0	4YK5NXN4VRZAS67KP5T3NJNTSSAAOFJ6	resident	\N	2026-07-19 16:20:30.703901	2026-07-19 16:20:30.703901	Aurélie	Blanc	\N	\N	43 Rue Gabriel Péri 94200 Ivry-sur-Seine	48.813824	2.382626	\N	\N
385f0c46-6506-4665-bd31-94572dc0bfa3	solene.maillard@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$6KtXuYDsQ9QCIqF8LAXwKw$wPhmCP7B+MoIQMqXf1DJtc2Y34akOc4RqQK146Lcogw	F3EOUC7AHYPGBLFCY4H3KFNJ3GRVQGR2	resident	\N	2026-07-19 16:20:31.303773	2026-07-19 16:20:31.303773	Solène	Maillard	\N	\N	6 Square Nungesser 94160 Saint-Mandé	48.840492	2.416588	\N	\N
ece1a9bf-e540-4b93-a9a8-c5927ee41bff	myriam.sassi@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$lVoqni+KuvynEdBMUtCchg$DeY5pCrNZusopTd3YewcLCZ4FHIqhhp/cbwz2Fg/Mbk	7JWGLUIV2YR2PP7UEAXDK23IY4BNMHOJ	resident	\N	2026-07-19 16:20:31.563186	2026-07-19 16:20:31.563186	Myriam	Sassi	\N	\N	30 Avenue Jean Lolive 93500 Pantin	48.890324	2.399599	\N	\N
496778d2-5ed4-4e14-997e-026613a39799	delphine.arnaud@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$JCxvQxmdENpgDgfLWAHMZA$IGZiuzeh+5Xm0xhJS97ZLlXb76UhdeOGHD6P2SLeIZY	LDG3Q7MVTKT5LDHVOMYFOHWY2VD5XWBG	resident	\N	2026-07-19 16:20:31.816923	2026-07-19 16:20:31.816923	Delphine	Arnaud	\N	\N	35 Quai Marcel Boyer 94200 Ivry-sur-Seine	48.821	2.394243	\N	\N
2d93a163-0c15-4358-bd5a-402b7873daab	nathalie.ferreira@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$hfk1hlYuelTteL+9zrnELg$pSzWcEhPRS28WwH2ByOKae5Xqd2Le+Mqlkn/CFI9T4Y	PRB4F3MDXE7OYXPNN5CFWDS5ZIQ37U3A	resident	\N	2026-07-19 16:20:32.151757	2026-07-19 16:20:32.151757	Nathalie	Ferreira	\N	\N	26 Rue de Valmy 93120 La Courneuve	48.921844	2.379704	\N	\N
78eb96dc-650d-4cd0-8d97-cc96bc6f882f	bruno.vidal@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$rVnCe0uXDjXxoWrlnS7Dyw$farAMfThgaaWJ8UfDM8gwFm+u7+OWhRKCKLeKvm4EtE	3CZOVKZKKPUPOBASXUXIXLJCZXVOAVHL	banned	\N	2026-07-19 16:20:32.442049	2026-07-19 16:20:32.442049	Bruno	Vidal	\N	6a5cf951bd665b4769d4d32f	1 Place Jacques Froment 75018 Paris	48.8909	2.330896	\N	resident
9ecfb473-92e5-45e4-9797-341fe8d2ef1d	loic.perrot@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$DTsWwhQ5MOE79pdTP+5GHQ$boPVkcN8qm5pRO+qbKB1fxVsG0wzyW6el0E1+Q7vS78	QBJ7FLOAC4QJ3M2DB5XMVDKGRUYJGMNL	banned	\N	2026-07-19 16:20:33.016588	2026-07-19 16:20:33.016588	Loïc	Perrot	\N	6a5cf951bd665b4769d4d339	18 Rue d'Odessa 75014 Paris	48.841923	2.324533	\N	resident
8b416e20-2d9e-4651-a404-ad4dee77e628	antoine.perrin@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$QultgYRFBitIhBUTGefKBA$JvXQOrMBO7+3mP6e5wB2DFOXt/JgfoyACZOhXoOyEnY	7OVRYJEFLUYE4WUQ3MZRBT45CGZ6QHNG	resident	$argon2id$v=19$m=65536,t=3,p=4$QnUrT4f7IWLFS2+MqrEn4A$QnvFvt2JehuFWS6QawQZDGuQSSmEFVmy/PIgz7KN/6c	2026-07-19 16:20:24.432511	2026-07-19 16:20:24.432511	Antoine	Perrin	\N	6a5cf951bd665b4769d4d32f	10 Rue de Trétaigne 75018 Paris	48.89184	2.342293	\N	\N
1e2fbcfd-ec78-4da0-88fa-78c40e7293a3	admin@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$GGMCQz8aCCCvdNvOQl2IZg$Bm0YSCeW5BFoipfmYbpfHyUeAJjD2/VSGaR2AnkTwgk	P4WDGNQ7RJ25XKTCVBM3ZLHY6SFA4EDN	admin	$argon2id$v=19$m=65536,t=3,p=4$5fX2LbGKWSGGuXyxRBJUNA$USUrtsrn2h+gPhIBOv63HvvCY59TxSRTwMPCBvWEb3U	2026-07-19 16:20:33.321013	2026-07-19 16:21:01.167	Admin	QuartierConnect	/users/avatar/6a5cf96dbd665b4769d4d34c	\N	\N	\N	\N	+33612222022	\N
d1d6807d-d977-48e4-9c6b-77e95432a8d8	sarah.lemoine@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$M1ypWzQM7T+vOHJWqkvX0A$MeCik+k59RtOw3wtOZ7vMLx+DTJE9GD3OL5ZG6eOGdo	5UCSZF3BAWOZQOSYFJI76TCGMOAI3SZZ	resident	$argon2id$v=19$m=65536,t=3,p=4$SOXoKmI5DGRIf0bQkINEzg$7xCa5VfiHeLFJMG32+ag5UIl1yep+CnpY4T0/jwR1h8	2026-07-19 16:20:25.169804	2026-07-19 16:20:25.169804	Sarah	Lemoine	\N	6a5cf951bd665b4769d4d32f	4 Rue Henri Brisson 75018 Paris	48.898335	2.335014	\N	\N
31de33e2-92aa-4fc2-ae5a-8967526fbdd8	sabrina.costa@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$U4xIv70rKexGemM4nhHYGw$UEZke65LehT4aO4CwZZb0QpQTE9PsO7gEXbVjy+jj0s	763ELUMZCSC6NUN6KULE3XEGTUVBV25O	moderator	$argon2id$v=19$m=65536,t=3,p=4$++b9It9ft5YmQKR/f8HESw$SdShag4jyDQX85H1ii2xCoZ1Xps/td5bA+OYcesgRiY	2026-07-19 16:20:27.765205	2026-07-19 16:20:27.765205	Sabrina	Costa	\N	6a5cf951bd665b4769d4d333	36 Avenue de la Porte d'Asnières 75017 Paris	48.892586	2.300954	+33613554154	\N
f9ce9fd7-98bd-4752-8c1d-b16a9e607390	adrien.roussel@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$MxOCwGY59rbVY348J3bPPQ$2/s4KqXaDHfjZvGiYPqSOsVL7QAv2/LkJ9tD7Uz4sVE	EXWF5EGL7O4HG2MKJ7LRCBS3IEDD2JYO	resident	$argon2id$v=19$m=65536,t=3,p=4$9BoD5wnRSGNBEytb1yHr2Q$dDoHQzSHPa4u7J6gupzKEg+lZO3AqJiKfUbZVwwriYU	2026-07-19 16:20:25.882894	2026-07-19 16:20:25.882894	Adrien	Roussel	\N	6a5cf951bd665b4769d4d32f	48 Rue Vauvenargues 75018 Paris	48.89526	2.331692	\N	\N
161ac166-164d-4e8e-a842-a1850e237a0e	nadia.benali@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$+7dQy5YNQLuDIHvVbq9A5g$92oQfaYXUf+goZhZRuex+NRx9bFx5fFxzVQnXs9VrdE	JCSEJEOJ4HNE3M4JMPATXCV26NNSSVVE	resident	$argon2id$v=19$m=65536,t=3,p=4$jcfU6l1bn9cBlHhObL7Zbg$tzHV6VHAOQw4mB8XTfkS/ehah7xQExAN9t/5U0hPIns	2026-07-19 16:20:26.596107	2026-07-19 16:20:26.596107	Nadia	Benali	\N	6a5cf951bd665b4769d4d32f	39 Rue Labat 75018 Paris	48.88911	2.348559	\N	\N
05ab0110-a272-402e-adfc-97ec350bdbbd	fatou.diallo@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$EXyp/doKs7sBY+4pTAiFcA$+BDUxJPx8v27RySsd4iIJiFgWyW8u6SqLtr795A84Xo	SK27QT7VE4ZEQ43CWG57T73AYOBI5PDZ	resident	\N	2026-07-19 16:20:31.000794	2026-07-19 16:20:31.000794	Fatou	Diallo	\N	\N	4 Rue du Chemin Vert 93300 Aubervilliers	48.918804	2.377537	\N	\N
f2a20a77-ff89-42eb-a400-49f9db86359f	franck.aubry@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$CxgtUuzD7w9ekwXWv42tVQ$cgJb+3FodqMkukmP0+py6ozf82AN08fNSAf5QJbmQQA	XTLBQK52CCLDGKOROAYRZLKQZ4SGS234	banned	\N	2026-07-19 16:20:32.727655	2026-07-19 16:20:32.727655	Franck	Aubry	\N	6a5cf951bd665b4769d4d331	18 Rue Julien Lacroix 75020 Paris	48.86959	2.385506	\N	resident
7105c223-a4bf-4c32-8588-9014011de2a7	alice@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$Iap4EnnTW/ls66sCv3QcDA$wUElWmX7J/qXDDVIsrlP3LXW64fJU+Abtrk6qEawWoU	4PX635D55YS6JJV3NYIXKZPREIO6YIIV	resident	$argon2id$v=19$m=65536,t=3,p=4$yUTkNw34g2YfCYV6FsR7Mg$UKLvK1Ns+7PbCbHLgmUM9GhiaUOsXE9eRIltnjOSkDc	2026-07-19 16:20:23.064591	2026-07-19 16:20:44.081	Alice	Martin	/users/avatar/6a5cf95cbd665b4769d4d33e	6a5cf951bd665b4769d4d32f	8 Rue du Nord 75018 Paris	48.892796	2.351738	+33612000000	\N
a35d2398-27f4-4e96-a389-f1c8ba97f945	camille.bernard@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$lgLBsUMt6XBF1fBVX7U2ew$6hiped2u8ULKPi857h6DJtiso+smg0t9FI6c3N86qnE	VQ7EBK6B5VFBL7CNZ5ZNVAM7GHH35YSM	resident	$argon2id$v=19$m=65536,t=3,p=4$CegHahQrUC6rqtknVsnq0w$IBiBMGcxdZLorMiMzzXzkQcNXHNvTkEgfaSEpT+SZes	2026-07-19 16:20:23.369778	2026-07-19 16:20:44.591	Camille	Bernard	/users/avatar/6a5cf95cbd665b4769d4d342	6a5cf951bd665b4769d4d32f	28 Rue Ganneron 75018 Paris	48.88716	2.32863	+33612333033	\N
c51f41a7-3810-4d0b-bedc-a8ed7b23ac02	ines.bouvier@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$IiFYuvpk1MaGInMWjmfrjg$aSP/3bIyblrHYhZ/m70YPf0arF4v641WJkPyMf0b8lU	GEG3Z5LZDHIFKVTVS3ZTJAITIGDIP6OR	moderator	$argon2id$v=19$m=65536,t=3,p=4$tA75X5kIjCS+eHPAGLaLqA$F1YKjgzm1uPbIGyvTPGI7fuaMTsNicNi2P2VBsrUcVo	2026-07-19 16:20:27.179223	2026-07-19 16:20:45.263	Inès	Bouvier	/users/avatar/6a5cf95dbd665b4769d4d348	6a5cf951bd665b4769d4d331	38 Rue des Maronites 75020 Paris	48.868484	2.384715	+33613332132	\N
83efbf4f-0768-4acd-b920-04c0099062b2	hugo.marchand@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$kj3W7pz45V7SQ/6asJsUbw$jHrkeoAXU3Xc3T0860jJZ7bQkQzoJRyCBOU0hpXDwDQ	2B4OXDZM5FJFZQV4BBWKN5HZSWORYJRP	resident	$argon2id$v=19$m=65536,t=3,p=4$aKQ9Do7KivN2MbCaUkWYOQ$bSWs+RzEgl31TjGxn+BwebgrR7Pw6JNp4//os6tZcd8	2026-07-19 16:20:24.734393	2026-07-19 16:20:24.734393	Hugo	Marchand	\N	6a5cf951bd665b4769d4d32f	143B Rue Ordener 75018 Paris	48.89312	2.339341	+33612999099	\N
2f5c3427-fff8-4210-a68a-7d6b8a197be0	claire.fabre@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$F9BWtubCvzN1I4wQWjMVdg$JBVAR8dE7js1XJv6Wf53waYNYrsNSK/aHWWNpw//2M0	6F6D3CCMAUD53WEVMNKO4B44FYM3UQMH	resident	$argon2id$v=19$m=65536,t=3,p=4$NpZh7wfaH095+bc8pcUdtA$D6f2ETCCuGlAELQsMlmUymYj8b621TtmVaLFJd4XoKo	2026-07-19 16:20:25.449808	2026-07-19 16:20:25.449808	Claire	Fabre	\N	6a5cf951bd665b4769d4d32f	5 Rue Puget 75018 Paris	48.88412	2.333571	\N	\N
682656d4-a8f2-4d70-bfa7-4bc5ef15e182	guillaume.masson@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$+PHtD0+Ksgnr0HavA3JVOw$v38OlyFLUHsnrIkbZE7bKV1qQDec8ju4DVb8HoLydSg	JRZFE6EVKLVCUKUBDDPVGYIBQ3AK6Y6M	resident	$argon2id$v=19$m=65536,t=3,p=4$hg9IfUEBa4uRb1o2W9tesw$6FoFutYZHtFL3d0fu+7QTr9Zgx/KHlEASng6T+dNp3Q	2026-07-19 16:20:26.197848	2026-07-19 16:20:26.197848	Guillaume	Masson	\N	6a5cf951bd665b4769d4d32f	146 Avenue de Saint-Ouen 75018 Paris	48.896885	2.328919	\N	\N
c36636c3-b65f-4a2f-9ccd-aaa9e5d74b50	laura.millet@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$MOUivEWbnZ1JsYs2n5BdcA$60li7G7GXAzdotx8/TgDk6UbJ/mlXgkdOoo8lvRgT9g	SPWTUXKDLBYD73VJ5R2X2PXURABM3ZQM	resident	$argon2id$v=19$m=65536,t=3,p=4$cIyV9yDe3aOu6ylEhaEGfw$5mXDs0SLjEiuh94BnYCvhU+Gq52FY0/oKBX+/C2zzIU	2026-07-19 16:20:27.466223	2026-07-19 16:20:27.466223	Laura	Millet	\N	6a5cf951bd665b4769d4d332	23 Rue Valette 75005 Paris	48.846848	2.346575	+33613443143	\N
34ab8278-8cbd-45ae-b84b-3413f37217b5	etienne.berger@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$d2WiXgGVqwhDx2i+fz5Drw$dwbJPhagHhS2I8GYogGkGeLNUq7pOtAwiW8x0TaOHpc	FYYKJPNLL3NOKLSI4G565XOLENDVIQ5R	resident	$argon2id$v=19$m=65536,t=3,p=4$OD7rIT9aU7C9yy2qyvYxhQ$h3L5Hl1jac34q2uyQz/tafQ0xfuQgK5hnbAbA1skrPc	2026-07-19 16:20:27.615374	2026-07-19 16:20:27.615374	Étienne	Berger	\N	6a5cf951bd665b4769d4d332	12 Rue Laplace 75005 Paris	48.84737	2.347419	\N	\N
2185e0ea-79ab-46a8-9c75-998456405f7b	margaux.rey@demo.fr	$argon2id$v=19$m=65536,t=3,p=4$k7wbAR4qc4vQRhfU6yiZyg$NKUz47a+jsjtVW/WEljk5gTHYoeYPeVVrivGOdEQOHI	UX3X43FHDHJAYDA7JOSEVFOYKXJQWUCU	resident	$argon2id$v=19$m=65536,t=3,p=4$3iU8HurCfIQA8TFZAPL/7w$++qfsQl5jrKSBRAbCRdyuRGAAU4XRCWEJvor1r66QSU	2026-07-19 16:20:29.807797	2026-07-19 16:20:29.807797	Margaux	Rey	\N	6a5cf951bd665b4769d4d33c	31 Villa Godin 75020 Paris	48.859447	2.400277	\N	\N
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

\unrestrict cyjRqhXZK91NwDmcmwBvEKUiual4GZx8brczY67Rtu8EoEf1DIuBNcqi6cLJcMH

