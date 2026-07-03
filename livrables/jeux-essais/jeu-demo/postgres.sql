--
-- PostgreSQL database dump
--

\restrict Txs3HG3gFpfjMgtlMrB8IwXjopM92B4WGIyO5ntvjb5zQdX9BvIZcxfSiCZTfhE

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
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: qc
--

INSERT INTO public.users (id, email, password_hash, totp_secret, role, refresh_token_hash, created_at, updated_at, first_name, last_name, avatar_url, neighborhood_id, address, address_lat, address_lng, phone, previous_role) VALUES ('ea7894ed-97f8-45ef-b955-35cd773830e5', 'bob@demo.fr', '$argon2id$v=19$m=65536,t=3,p=4$AWwFNog4NMy8ii54EEugmQ$vautpOr7zJOB9vyPFtz61KU4OvhYHkTFuXnQyu4oevI', 'JBSWY3DPEHPK3PXP', 'moderator', '$argon2id$v=19$m=65536,t=3,p=4$HrzIbatdqgIDBofT37NPBQ$heh2dUXB1UTd37ee447aL2D887uLReyc+9SvfQzOASo', '2026-05-22 15:35:47.9295', '2026-06-29 21:09:44.708', 'Bob', 'Dupont', NULL, '6a42833f5980b9e26ff1a71c', 'Centre du quartier, Paris', 48.879765, 2.3652313, NULL, NULL);
INSERT INTO public.users (id, email, password_hash, totp_secret, role, refresh_token_hash, created_at, updated_at, first_name, last_name, avatar_url, neighborhood_id, address, address_lat, address_lng, phone, previous_role) VALUES ('41d91ab9-b9a9-45ed-a5b8-9c2ae4819316', 'admin@demo.fr', '$argon2id$v=19$m=65536,t=3,p=4$BFXOyzgbmSXLGRprbK5oRQ$BDHsltx61zxlZrzH5r43Stat0ct+GPYHeS3ZDWlUof8', 'JBSWY3DPEHPK3PXP', 'admin', '$argon2id$v=19$m=65536,t=3,p=4$h6IEJG4qg+NkSrDfIIUwbQ$rMSHJyDA1CD6au1b5bmNBbXRyMwZyhDrHh7wSM9IhUg', '2026-05-22 15:35:48.317005', '2026-07-02 18:47:19.08', 'Admin', 'QuartierConnect', NULL, '6a4283405980b9e26ff1a729', '21, Rue Érard, Quartier de Picpus, Paris 12e Arrondissement, Paris, Île-de-France, France métropolitaine, 75012, France', 48.84614, 2.385631, NULL, NULL);
INSERT INTO public.users (id, email, password_hash, totp_secret, role, refresh_token_hash, created_at, updated_at, first_name, last_name, avatar_url, neighborhood_id, address, address_lat, address_lng, phone, previous_role) VALUES ('f3dad978-6792-4d0c-b2a5-fe3f3f08253f', 'alice@demo.fr', '$argon2id$v=19$m=65536,t=3,p=4$gBmQ3GoMSKPpxKcTzH8Kqw$hFPgPSWfv21n47M1BJgcOlFxd5IQHkVGkOd9MJZ/toA', 'JBSWY3DPEHPK3PXP', 'moderator', '$argon2id$v=19$m=65536,t=3,p=4$GWcVbt9g9nxVM4XFLe2ffQ$LRjTURObYGLi6/sZxh990A1EK6qcwV1u4UzXN/g4Mww', '2026-05-22 15:35:47.59014', '2026-05-22 17:10:34.152', 'Alice', 'Martin', NULL, '6a42833f5980b9e26ff1a71c', 'Centre du quartier, Paris', 48.879765, 2.3652313, NULL, NULL);


--
-- Data for Name: incidents; Type: TABLE DATA; Schema: public; Owner: qc
--

INSERT INTO public.incidents (id, title, description, status, created_by, neighborhood_id, deleted_at, created_at, updated_at, lat, lng, category) VALUES ('4de2e8a6-4c8c-4adb-8dcd-6c750afb258f', 'Lampadaire cassé rue de la Paix', 'Le lampadaire est tombé et bloque en partie le trottoir.', 'open', '41d91ab9-b9a9-45ed-a5b8-9c2ae4819316', '6a42833f5980b9e26ff1a71c', NULL, '2026-06-30 21:26:06.353566', '2026-06-30 21:26:06.353566', 48.881763, 2.3682313, 'neighborhood');
INSERT INTO public.incidents (id, title, description, status, created_by, neighborhood_id, deleted_at, created_at, updated_at, lat, lng, category) VALUES ('72d6406c-530d-48a9-b648-7e89ac7d5603', 'Dépôt sauvage de déchets', 'Encombrants abandonnés depuis plusieurs jours au coin de la rue.', 'open', '41d91ab9-b9a9-45ed-a5b8-9c2ae4819316', '6a42833f5980b9e26ff1a71c', NULL, '2026-06-30 21:26:06.375739', '2026-06-30 21:26:06.375739', 48.880764, 2.3612313, 'neighborhood');
INSERT INTO public.incidents (id, title, description, status, created_by, neighborhood_id, deleted_at, created_at, updated_at, lat, lng, category) VALUES ('131337de-654d-49ed-82a6-370126842e6a', 'Nid-de-poule dangereux', 'Trou important sur la chaussée, risque pour les cyclistes.', 'open', '41d91ab9-b9a9-45ed-a5b8-9c2ae4819316', '6a42833f5980b9e26ff1a71c', NULL, '2026-06-30 21:26:06.386651', '2026-06-30 21:26:06.386651', 48.876766, 2.3672311, 'neighborhood');
INSERT INTO public.incidents (id, title, description, status, created_by, neighborhood_id, deleted_at, created_at, updated_at, lat, lng, category) VALUES ('ad276d71-bdb8-4ca9-99d2-ed409a09292c', 'Tag sur le mur de l''école', 'Graffiti à nettoyer sur la façade de l''école primaire.', 'open', '41d91ab9-b9a9-45ed-a5b8-9c2ae4819316', '6a42833f5980b9e26ff1a71c', NULL, '2026-06-30 21:26:06.397956', '2026-06-30 21:26:06.397956', 48.877766, 2.3632312, 'neighborhood');
INSERT INTO public.incidents (id, title, description, status, created_by, neighborhood_id, deleted_at, created_at, updated_at, lat, lng, category) VALUES ('f09cb9c8-dd89-4ca2-9c61-84d8b02b0750', 'Bug : la page Votes ne charge pas', 'Signalement technique de l''application (interne modération).', 'open', '41d91ab9-b9a9-45ed-a5b8-9c2ae4819316', '6a42833f5980b9e26ff1a71c', NULL, '2026-06-30 21:26:06.409163', '2026-06-30 21:26:06.409163', NULL, NULL, 'bug');
INSERT INTO public.incidents (id, title, description, status, created_by, neighborhood_id, deleted_at, created_at, updated_at, lat, lng, category) VALUES ('f20990e9-b2d3-4f0a-935a-49ad21d279f2', 'Signalement : contenu inapproprié', 'Un message à modérer dans la messagerie.', 'in_progress', '41d91ab9-b9a9-45ed-a5b8-9c2ae4819316', '6a42833f5980b9e26ff1a71c', NULL, '2026-06-30 21:26:06.418287', '2026-07-03 11:29:21.609', NULL, NULL, 'reporting');


--
-- Data for Name: points_balances; Type: TABLE DATA; Schema: public; Owner: qc
--

INSERT INTO public.points_balances (id, user_id, balance, updated_at) VALUES ('bcb67c92-91f0-4122-883f-0e31926bf50d', 'ea7894ed-97f8-45ef-b955-35cd773830e5', 25, '2026-07-02 23:35:30.217');
INSERT INTO public.points_balances (id, user_id, balance, updated_at) VALUES ('d80e2763-8b0e-4b44-9647-4f8176995f75', 'f3dad978-6792-4d0c-b2a5-fe3f3f08253f', 14, '2026-07-02 23:35:30.215');
INSERT INTO public.points_balances (id, user_id, balance, updated_at) VALUES ('e14d421d-348e-4b0d-9c9e-fc825c3793fc', '41d91ab9-b9a9-45ed-a5b8-9c2ae4819316', 21, '2026-07-02 12:17:01.070278');


--
-- Data for Name: points_transactions; Type: TABLE DATA; Schema: public; Owner: qc
--

INSERT INTO public.points_transactions (id, sender_id, recipient_id, amount, note, created_at, contract_id, type, status, completed_at) VALUES ('c1e9f723-a40b-4a2a-8c4b-84083075bb82', 'f3dad978-6792-4d0c-b2a5-fe3f3f08253f', 'ea7894ed-97f8-45ef-b955-35cd773830e5', 2, 'Service payment: Coup de main bricolage par Bob', '2026-07-02 23:34:24.398845', '6a46f580cc59f9b84636dfb9', 'service_payment', 'completed', '2026-07-02 23:35:30.219');
INSERT INTO public.points_transactions (id, sender_id, recipient_id, amount, note, created_at, contract_id, type, status, completed_at) VALUES ('e900a815-0d6d-4498-b83c-6868b9ab9552', 'f3dad978-6792-4d0c-b2a5-fe3f3f08253f', 'ea7894ed-97f8-45ef-b955-35cd773830e5', 5, 'Merci pour le jardinage', '2026-06-27 14:21:16.983022', NULL, 'bonus', 'completed', NULL);
INSERT INTO public.points_transactions (id, sender_id, recipient_id, amount, note, created_at, contract_id, type, status, completed_at) VALUES ('c9243f01-c5b3-4fc1-8173-d3e51dafd4b0', 'ea7894ed-97f8-45ef-b955-35cd773830e5', 'f3dad978-6792-4d0c-b2a5-fe3f3f08253f', 2, 'Service payment: Réparation de vélo par Alice', '2026-07-02 20:38:00.379836', '6a46cc2831b9e8b1eac99713', 'service_payment', 'cancelled', NULL);
INSERT INTO public.points_transactions (id, sender_id, recipient_id, amount, note, created_at, contract_id, type, status, completed_at) VALUES ('ea874eed-faec-4ca0-8ff0-2dfa13e29898', 'ea7894ed-97f8-45ef-b955-35cd773830e5', 'f3dad978-6792-4d0c-b2a5-fe3f3f08253f', 2, 'Service payment: Réparation de vélo par Alice', '2026-07-02 23:33:53.752964', '6a46f561cc59f9b84636dfb0', 'service_payment', 'completed', '2026-07-02 23:33:53.834');
INSERT INTO public.points_transactions (id, sender_id, recipient_id, amount, note, created_at, contract_id, type, status, completed_at) VALUES ('f4ac763d-46c2-4d02-bc58-bd9deb6c514b', 'f3dad978-6792-4d0c-b2a5-fe3f3f08253f', '41d91ab9-b9a9-45ed-a5b8-9c2ae4819316', 1, 'Service payment: Cours de soutien scolaire', '2026-07-01 22:30:34.055488', '6a459509586efbb7cf0889fb', 'service_payment', 'completed', '2026-07-01 22:30:34.157');
INSERT INTO public.points_transactions (id, sender_id, recipient_id, amount, note, created_at, contract_id, type, status, completed_at) VALUES ('cd3ab959-57c3-45bc-9cbe-64e97818b28b', '41d91ab9-b9a9-45ed-a5b8-9c2ae4819316', 'f3dad978-6792-4d0c-b2a5-fe3f3f08253f', 20, 'Crédit de bienvenue', '2026-05-22 15:35:47.59014', NULL, 'bonus', 'completed', '2026-05-22 15:35:47.59014');
INSERT INTO public.points_transactions (id, sender_id, recipient_id, amount, note, created_at, contract_id, type, status, completed_at) VALUES ('cc8b9b21-1e71-40f0-ad78-90a032def9e7', '41d91ab9-b9a9-45ed-a5b8-9c2ae4819316', 'ea7894ed-97f8-45ef-b955-35cd773830e5', 20, 'Crédit de bienvenue', '2026-05-22 15:35:47.9295', NULL, 'bonus', 'completed', '2026-05-22 15:35:47.9295');
INSERT INTO public.points_transactions (id, sender_id, recipient_id, amount, note, created_at, contract_id, type, status, completed_at) VALUES ('decf9183-e0ac-47c6-aeaf-c4e143028149', '41d91ab9-b9a9-45ed-a5b8-9c2ae4819316', '41d91ab9-b9a9-45ed-a5b8-9c2ae4819316', 20, 'Crédit de bienvenue', '2026-05-22 15:35:48.317005', NULL, 'bonus', 'completed', '2026-05-22 15:35:48.317005');
INSERT INTO public.points_transactions (id, sender_id, recipient_id, amount, note, created_at, contract_id, type, status, completed_at) VALUES ('cebe86a3-6479-4b4b-8b17-1c2d0bde8f45', 'f3dad978-6792-4d0c-b2a5-fe3f3f08253f', '41d91ab9-b9a9-45ed-a5b8-9c2ae4819316', 1, 'Service payment: Cours de soutien scolaire', '2026-07-03 06:28:01.004839', '6a475670ef7bb82ab044d3e5', 'service_payment', 'pending', NULL);


--
-- Data for Name: revoked_tokens; Type: TABLE DATA; Schema: public; Owner: qc
--

INSERT INTO public.revoked_tokens (jti, expires_at) VALUES ('7c3e42c6-8012-404f-82d4-abbcc53ebfa9', '2026-07-03 02:08:23');
INSERT INTO public.revoked_tokens (jti, expires_at) VALUES ('2b6316b3-0e94-4050-81c6-95430cdf3231', '2026-07-03 02:08:25');


--
-- PostgreSQL database dump complete
--

\unrestrict Txs3HG3gFpfjMgtlMrB8IwXjopM92B4WGIyO5ntvjb5zQdX9BvIZcxfSiCZTfhE

