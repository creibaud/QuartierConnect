# Cahier des Charges — QuartierConnect
> **Connected Neighbours** · Groupe 1 · 3AL2 · ESGI 2025-2026  
> *«Le lien qui rapproche votre quartier»*

---

## Table des matières

1. [Présentation du projet](#1-présentation-du-projet)
2. [Équipe et organisation](#2-équipe-et-organisation)
3. [Architecture technique](#3-architecture-technique)
4. [Fonctionnalités Web](#4-fonctionnalités-web)
5. [Client Java Desktop](#5-client-java-desktop)
6. [SSO — Single Sign-On](#6-sso--single-sign-on)
7. [Sécurité](#7-sécurité)
8. [RGPD](#8-rgpd)
9. [Micro-langage DSL](#9-micro-langage-dsl)
10. [Tests](#10-tests)
11. [Infrastructure & Déploiement](#11-infrastructure--déploiement)
12. [Documentation attendue](#12-documentation-attendue)
13. [Workflow de développement](#13-workflow-de-développement)
14. [Jalons & Livrables](#14-jalons--livrables)
15. [Notation et conditions de validation](#15-notation-et-conditions-de-validation)

---

## 1. Présentation du projet

### 1.1 Contexte

Les quartiers résidentiels manquent d'outils numériques adaptés pour structurer l'entraide locale, formaliser les échanges et gérer les affaires communautaires. Les solutions généralistes ne répondent pas à ces besoins de manière sécurisée et organisée.

QuartierConnect s'inscrit dans le cadre du projet académique **Connected Neighbours** (3AL2) et propose une plateforme dédiée, géolocalisée et sécurisée, disponible sur navigateur et sur poste de travail.

### 1.2 Objectif

Construire une plateforme collaborative sécurisée, extensible et résiliente (offline-first) permettant aux habitants d'un quartier de :

- Échanger des services valorisés par un système de points
- Signer des documents numériques de manière sécurisée (SHA-256 + MFA)
- Participer à des événements communautaires avec recommandations Neo4j
- Communiquer via une messagerie multimédia en temps réel (WebSocket)
- Gérer incidents et alertes via une application desktop offline-first

### 1.3 Public cible

| Profil             | Surface                                   | Permissions                                           |
| ------------------ | ----------------------------------------- | ----------------------------------------------------- |
| **Habitant**       | React Client (web)                        | Services, événements, messagerie, votes, signature    |
| **Modérateur**     | React Client (web)                        | Droits habitant + suppression contenu inapproprié     |
| **Administrateur** | React Client + React Admin + Java Desktop | Gestion quartiers, utilisateurs, back-office, desktop |

---

## 2. Équipe et organisation

### 2.1 Composition

| Membre                 | Rôle                           | Responsabilités principales                           | Secondaires                              |
| ---------------------- | ------------------------------ | ----------------------------------------------------- | ---------------------------------------- |
| **Claudio REIBAUD**    | Chef de projet & Fullstack Dev | Back-end NestJS, React Client & Admin, Java Desktop   | PLY/pythonia, UI/UX, Docker, tests, docs |
| **Andras SCHULLER**    | Front-end & Documentation      | Tests Jest/Playwright, documentation technique, React | Figma, syntaxe PLY                       |
| **Mouhamadou N'DIAYE** | Infrastructure & DevOps        | VPS, Caddy, Docker Compose, CI/CD GitHub Actions      | Endpoints CRUD, tests automatisés        |

> Logique d'entonnoir dynamique : chaque membre bascule sur ses tâches secondaires dès ses livrables prioritaires terminés.

### 2.2 Outils

- **Code** : GitHub — `github.com/creibaud/QuartierConnect`
- **Projet** : Trello — `trello.com/b/oidFFT0p/pa-quartierconnect`
- **Design** : Figma
- **CI/CD** : GitHub Actions
- **Enseignant** : Frédéric SANANES — `sananes@myges.fr`

---

## 3. Architecture technique

### 3.1 Vue d'ensemble — 7 conteneurs Docker

| #   | Service          | Port(s)    | Rôle                                           |
| --- | ---------------- | ---------- | ---------------------------------------------- |
| 1   | **Caddy**        | 80, 443    | Reverse proxy HTTPS, Let's Encrypt automatique |
| 2   | **React Client** | 3000       | Interface habitants                            |
| 3   | **React Admin**  | 3001       | Back-office administrateur                     |
| 4   | **NestJS**       | 5000       | API REST + WebSocket + SSO + DSL               |
| 5   | **MongoDB**      | 27017      | Documents, contrats, médias (GridFS), GeoJSON  |
| 6   | **Neo4j**        | 7474, 7687 | Graphe social, moteur de recommandations       |
| 7   | **PostgreSQL**   | 5432       | Données admin, synchronisation Java            |

**Trois environnements** : `dev` (hot reload), `test` (base isolée, seed auto), `prod` (HTTPS Caddy)

### 3.2 Stack technique détaillée

| Composant         | Technologie                      | Justification                                                                  |
| ----------------- | -------------------------------- | ------------------------------------------------------------------------------ |
| **Back-end**      | NestJS 11 (TypeScript)           | Modulaire, WebSocket Gateways natives, Scalar automatique                      |
| **Documentation** | Scalar                           | Documentation interactive, remplace Swagger                                    |
| **Front-end**     | React 19 + Vite                  | HMR, Server Components, performances                                           |
| **Data fetching** | TanStack Query                   | Cache serveur, Optimistic Updates                                              |
| **Routage**       | TanStack Router                  | 100% type-safe                                                                 |
| **Formulaires**   | TanStack Form + Zod              | Validation robuste                                                             |
| **DataGrids**     | TanStack Table v8                | Headless, tri, filtres                                                         |
| **Design System** | Shadcn/ui + Tailwind v4          | Radix UI accessible, thème Zinc/Blue                                           |
| **Monorepo**      | Turbo + pnpm workspaces          | Mutualisation Client/Admin                                                     |
| **Client lourd**  | Java 21 + JavaFX                 | Multithreading natif, offline-first                                            |
| **BDD Documents** | MongoDB + Mongoose               | GeoJSON, GridFS                                                                |
| **Graphe Social** | Neo4j + Cypher                   | Recommandations performantes                                                   |
| **BDD Admin**     | PostgreSQL 16                    | SQL standard, ACID natif pour les transactions de points, symétrie avec SQLite |
| **BDD Offline**   | SQLite (JDBC)                    | Cache local Java, miroir PostgreSQL                                            |
| **Temps réel**    | NestJS WebSocket Gateways        | Messagerie, présence, notifications                                            |
| **Cartographie**  | Leaflet + OSM                    | Tracé dynamique polygones                                                      |
| **Signature PDF** | pdf-lib + react-signature-canvas | Canvas + injection SHA-256                                                     |
| **Sécurité**      | JWT HS256 + TOTP + argon2        | Sessions robustes, MFA                                                         |
| **SSO**           | Token UUID éphémère              | Partagé web ↔ Java, usage unique 5min                                          |
| **i18n**          | i18next + nestjs-i18n            | FR/EN, Accept-Language                                                         |
| **DSL**           | PLY (Python) + pythonia          | Micro-langage MongoDB, zéro-copie                                              |
| **Tests**         | Jest + Playwright + JUnit        | Tous types                                                                     |

### 3.3 Structure du repository

```
api/
  src/
    auth/           JWT, TOTP, SSO, guards
    users/          CRUD, rôles, RGPD
    neighborhoods/  GeoJSON, 2dsphere
    services/       Annonces, points
    contracts/      PDF, signature, GridFS
    documents/      Audit, métadonnées
    social/         Neo4j, recommandations
    messaging/      WebSocket, médias
    votes/          Pattern Strategy
    incidents/      PostgreSQL — incidents + alertes
    points/         PostgreSQL — balances + transactions ACID
    dsl/            Bridge pythonia
    i18n/           FR/EN translations

web-apps/
  apps/client/      React Client (3000)
  apps/admin/       React Admin (3001)
  packages/shared/  lib/api.ts, lib/auth.ts
  packages/ui/      shadcn + Tailwind v4

desktop-app/
  plugin-api/       Interface PluginInterface (JAR séparé)
  plugins/          export-csv, export-pdf, social-graph, calendar
  src/main/java/
    MainApp.java
    LoginView.java
    MainView.java
    services/AuthService.java
    services/ApiService.java
    services/SyncService.java
    database/SQLiteDatabase.java
    plugins/PluginManager.java
    themes/ThemeManager.java
  resources/themes/default.css

dsl/
  lexer.py
  parser.py
  compiler.py
  main.py

docs/               Documentation complète
scripts/            seed-demo.ts
docker/             Compose + Caddyfile
```

### 3.4 Modélisation des bases de données

#### MongoDB — Collections

| Collection      | Champs clés                                                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`         | `email`, `passwordHash`, `totpSecret`, `totpEnabled`, `role`, `neighborhoodId`, `consentTimestamp`, `refreshTokenHash` — solde de points dans PostgreSQL |
| `ssoTokens`     | `userId`, `token` (UUID), `surface`, `expiresAt`, `usedAt` — TTL index                                                                                   |
| `neighborhoods` | `name`, `geometry` (GeoJSON Polygon), `adminId`                                                                                                          |
| `services`      | `title`, `category`, `type`, `duration`, `status`, `createdBy`, `neighborhoodId`                                                                         |
| `contracts`     | `serviceId`, `parties`, `status`, `pdfFileId`, `signatures`, `pointsAmount`                                                                              |
| `documents`     | `contractId`, `sha256Hash`, `signatoryId`, `timestamp`, `auditLog[]`                                                                                     |
| `events`        | `title`, `date`, `location`, `capacity`, `category`, `createdBy`                                                                                         |
| `messages`      | `conversationId`, `senderId`, `type`, `content`, `mediaFileId`, `timestamp`                                                                              |
| `votes`         | `title`, `type`, `options`, `results`, `parameters`, `createdBy`                                                                                         |

GridFS buckets : `pdfs`, `media`

#### Neo4j — Graphe social

**Nœuds** : `User`, `Service`, `Event`, `Neighborhood`

| Relation        | De → Vers           | Propriétés                         |
| --------------- | ------------------- | ---------------------------------- |
| `HELPED`        | User → User         | `serviceId`, `timestamp`, `points` |
| `INTERESTED_IN` | User → Event        | `timestamp`, `direction`           |
| `LIVES_IN`      | User → Neighborhood | `since`                            |
| `OFFERED`       | User → Service      | `timestamp`                        |
| `ATTENDED`      | User → Event        | `timestamp`                        |

#### PostgreSQL — Administration & Transactions

```sql
CREATE TABLE incidents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT DEFAULT 'open',
  created_by  UUID,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE point_balances (
  user_id     UUID PRIMARY KEY,
  balance     INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT balance_minimum CHECK (balance >= -10)
);

CREATE TABLE point_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id  UUID NOT NULL REFERENCES point_balances(user_id),
  to_user_id    UUID NOT NULL REFERENCES point_balances(user_id),
  contract_id   TEXT NOT NULL,
  amount        INTEGER NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('service_payment', 'bonus', 'correction')),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

CREATE TABLE sync_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  TEXT NOT NULL,
  record_id   UUID NOT NULL,
  operation   TEXT NOT NULL,
  payload     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**Règles d'intégrité sur les transactions de points :**
- Contrainte `CHECK (balance >= -10)` au niveau base — impossible de descendre en dessous
- Transaction `BEGIN` / `COMMIT` obligatoire pour tout transfert : débit `from_user_id` + crédit `to_user_id` en une seule opération atomique
- Statut `pending` → `completed` uniquement après `contract.status = 'fully_signed'`
- Index sur `from_user_id`, `to_user_id`, `contract_id` pour les requêtes d'historique

#### SQLite — Java Desktop (miroir PostgreSQL)

```sql
CREATE TABLE IF NOT EXISTS incidents (
  id          TEXT PRIMARY KEY,
  title       TEXT,
  description TEXT,
  status      TEXT DEFAULT 'open',
  created_at  TEXT,
  updated_at  TEXT,
  is_dirty    INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sync_log (
  id            TEXT PRIMARY KEY,
  table_name    TEXT,
  record_id     TEXT,
  conflict_type TEXT,
  local_ts      TEXT,
  remote_ts     TEXT,
  resolved_at   TEXT
);
```

---

## 4. Fonctionnalités Web

### 4.1 Modélisation géographique du quartier

- Dessin polygones sur **OpenStreetMap** via `Leaflet.js` + `Leaflet.draw`
- Stockage **GeoJSON** dans MongoDB avec index géospatial `2dsphere`
- Détection automatique **chevauchements** via `$geoIntersects`
- Un habitant = **un unique quartier**, interactions avec voisins directs uniquement

### 4.2 Services entre voisins

#### Annonces

- Offres ou demandes : titre, description, catégorie, type (gratuit/payant), durée
- Filtres, tri, pagination via TanStack Table

#### Système de points

| Action                   | Points     |
| ------------------------ | ---------- |
| 1 heure de service       | +2 points  |
| Action rapide (< 30 min) | +1 point   |
| Solde minimum            | -10 points |

- Coefficient multiplicateur par catégorie (configurable admin)
- Transactions de points stockées dans **PostgreSQL** (ACID garanti, pas de session MongoDB)
- Historique complet consultable via `GET /users/me/transactions`
- Transfert **uniquement après double signature**

#### Contrats automatiques

- Service payant → contrat PDF automatique (pdf-lib)
- Contenu : identités, description, points, date, zones signature
- Statuts : `draft` → `partial` → `fully_signed`
- Notifications WebSocket à chaque transition

### 4.3 Signature numérique sécurisée

1. Import PDF ou contrat auto-généré
2. Placement zones signature par **glisser-déposer** (`react-pdf-viewer`)
3. **MFA TOTP obligatoire** avant chaque signature
4. Signature canvas associée à un **hash SHA-256** du document
5. Horodatage côté serveur uniquement
6. Métadonnées stockées séparément dans **MongoDB GridFS** (immuables)
7. **Journal d'audit immuable** : chaque action tracée (import, invitation, signature, consultation)

### 4.4 Événements et activités

- Création : titre, date, lieu, capacité, catégorie
- **Interface swipe** style Tinder (droite = Intéressé, gauche = Pas intéressé)
- Interactions alimentent le **moteur Neo4j**
- Suggestions : événements, services, voisins

### 4.5 Messagerie multimédia sécurisée

- Chat 1-à-1 et groupe via **WebSocket** (NestJS Gateways)
- Médias : photos (JPEG/PNG max 5 Mo), vocaux (MP3 max 2 min), vidéos (MP4 max 1 min)
- Stockage dans **MongoDB GridFS**
- Indicateur «en train d'écrire…» + statut **online/offline** temps réel
- Chiffrement : HTTPS + WSS
- **Bonus** : appels vidéo WebRTC pair-à-pair

### 4.6 Votes

| Type           | Description                 |
| -------------- | --------------------------- |
| Binaire        | Oui / Non                   |
| Choix unique   | Une option parmi N          |
| Choix multiple | Plusieurs options           |
| Vote pondéré   | Points à répartir librement |

- Paramètres : durée, anonymat, quorum, visibilité résultats, restriction groupe
- Architecture **Pattern Strategy** : chaque type = module indépendant extensible sans modifier l'existant

### 4.7 Multilingue

- FR et EN via `i18next` + `react-i18next`
- API : messages traduits selon header `Accept-Language`
- Détection automatique navigateur + sélection manuelle profil
- Extensible : ajout d'un fichier JSON par locale

---

## 5. Client Java Desktop

### 5.1 Périmètre

Application réservée aux **administrateurs**, mode **offline-first** strict.

### 5.2 Gestion des incidents

- `TableView` JavaFX avec tri/filtrage par statut et date
- Ajout et modification disponibles en offline (`is_dirty = true`)
- Synchronisation automatique au retour connexion

### 5.3 Statistiques

- Données : événements créés, services échangés, messages, votes
- Visualisations : `BarChart`, `LineChart`, `PieChart` JavaFX
- Filtres par période et habitant

### 5.4 Système de plugins

Interface `PluginInterface` (JAR séparé `plugin-api/`) :

```java
String getName();
String getVersion();
Node getView();
void onLoad(AppContext context);
void onUnload();
```

Chargement dynamique via `URLClassLoader` depuis `~/.quartierconnect/plugins/`.

| Plugin                    | Description                 |
| ------------------------- | --------------------------- |
| `plugin-export-csv.jar`   | Export incidents en CSV     |
| `plugin-export-pdf.jar`   | Rapport PDF statistiques    |
| `plugin-social-graph.jar` | Visualisation graphe Neo4j  |
| `plugin-calendar.jar`     | Calendrier local événements |

- Activation/désactivation **sans redémarrage**
- Installation par sélection de JAR depuis l'UI
- Sandbox : accès limité à `AppContext` uniquement

### 5.5 Système de thèmes

Interface `ThemePlugin` (étend `PluginInterface`) :

| Thème         | Description                              |
| ------------- | ---------------------------------------- |
| Default       | Zinc/Blue cohérent avec le web (#1D4ED8) |
| Dark          | Dark mode complet                        |
| High Contrast | Accessibilité                            |

- Changement **sans redémarrage** via `scene.getStylesheets()`
- Persistance dans `~/.quartierconnect/config.json`

### 5.6 Fonctionnalités additionnelles

- Mises à jour automatiques depuis le serveur central
- Désinstallation depuis l'interface utilisateur
- Livré en **JAR auto-exécutable** (Maven Shade Plugin)

### 5.7 Synchronisation offline-first

| Phase                  | Mécanisme                                                         |
| ---------------------- | ----------------------------------------------------------------- |
| **Persistance locale** | Mutation validée en SQLite, `is_dirty = true`                     |
| **Sonde réseau**       | Worker thread, polling `GET /health` toutes les **30 secondes**   |
| **Push**               | `SELECT WHERE is_dirty = 1` → batch `POST /sync` → `is_dirty = 0` |
| **Pull**               | `GET /incidents?since={last_sync_timestamp}` → delta uniquement   |
| **Résolution LWW**     | Last-Write-Wins sur comparaison de timestamps                     |
| **Audit**              | Chaque conflit dans `sync_log`                                    |
| **UI**                 | `Platform.runLater()` pour rafraîchissement non-bloquant          |

---

## 6. SSO — Single Sign-On

### 6.1 Architecture

Le SSO partage le même compte entre React Client, React Admin et Java Desktop **sans re-saisie de credentials**.

```
[Surface A connectée]
     │
     ▼
POST /auth/sso/generate { surface: "java-desktop" }
     │
     ▼
{ ssoToken: "uuid-v4", expiresIn: 300 }
     │
     ▼  (token transmis vers Surface B)
POST /auth/sso/exchange { ssoToken: "uuid-v4" }
     │
     ▼
{ accessToken, refreshToken, user }
```

### 6.2 Propriétés du token SSO

- Type : UUID v4
- TTL : **5 minutes**
- Usage : **unique** (invalidé après premier échange)
- Stockage : MongoDB `ssoTokens` avec TTL index automatique
- Validation : `expiresAt > now()` ET `usedAt === null`

### 6.3 Endpoints SSO

| Endpoint                  | Auth       | Description                   |
| ------------------------- | ---------- | ----------------------------- |
| `POST /auth/register`     | Public     | Inscription + génération TOTP |
| `POST /auth/login`        | Public     | Credentials + TOTP → JWT pair |
| `POST /auth/sso/generate` | JWT requis | Génère token SSO éphémère     |
| `POST /auth/sso/exchange` | Public     | Échange token SSO → JWT pair  |
| `POST /auth/refresh`      | Public     | Renouvelle access token       |
| `POST /auth/logout`       | JWT requis | Révoque refresh token         |

### 6.4 Flux Java Desktop

```java
AuthService.login(email, password, totpCode)
  // POST /auth/login
  // stocke accessToken en mémoire (jamais sur disque)

AuthService.exchangeSsoToken(ssoToken)
  // POST /auth/sso/exchange
  // stocke accessToken en mémoire

ApiService.executeRequest()
  // si 401 : AuthService.refreshAccessToken() → retry
```

---

## 7. Sécurité

### 7.1 Authentification

- Email + mot de passe hashé **argon2** (10 rounds)
- **MFA TOTP obligatoire** sur : connexion initiale, modification email/mdp/téléphone, signature
- JWT HS256 : access token **15 min** + refresh token **7 jours** avec rotation
- Rate limiting : **5 tentatives / 15 min** sur `/auth/login`
- SSO : token UUID éphémère 5 min usage unique

### 7.2 Transport

- HTTPS obligatoire (Caddy + Let's Encrypt)
- WebSocket via WSS uniquement
- Headers : CORS restrictif, CSP, HSTS

### 7.3 Signatures

- Hash **SHA-256** calculé côté serveur uniquement
- Horodatage serveur non falsifiable
- Stockage immuable GridFS

### 7.4 Rôles et permissions

| Rôle        | Permissions                                             |
| ----------- | ------------------------------------------------------- |
| `resident`  | Ses propres données, services, messagerie, votes        |
| `moderator` | + Suppression contenu inapproprié                       |
| `admin`     | + Gestion quartiers, utilisateurs, back-office, desktop |

### 7.5 Séparation des responsabilités par base

| Donnée                                                                   | Base       | Justification                                         |
| ------------------------------------------------------------------------ | ---------- | ----------------------------------------------------- |
| Documents, GeoJSON, médias                                               | MongoDB    | Flexibilité documentaire, GridFS, index géospatial    |
| Profils utilisateurs, transactions de points, soldes, incidents, alertes | PostgreSQL | ACID natif, contraintes CHECK, transactions atomiques |
| Graphe social, recommandations                                           | Neo4j      | Parcours de graphe, Cypher                            |
| Cache offline admin                                                      | SQLite     | Miroir léger PostgreSQL, JDBC                         |

---

## 8. RGPD

| Droit             | Endpoint                | Comportement                                               |
| ----------------- | ----------------------- | ---------------------------------------------------------- |
| **Accès**         | `GET /api/me/export`    | JSON complet sans `passwordHash`                           |
| **Rectification** | `PATCH /api/me`         | Modification profil                                        |
| **Suppression**   | `DELETE /api/me/delete` | Suppression MongoDB + anonymisation Neo4j + révocation JWT |
| **Consentement**  | À l'inscription         | `consentTimestamp` enregistré, visible dans l'export       |

- Données sur serveurs UE uniquement
- Contrats immuables après suppression (identité anonymisée)
- Nœuds Neo4j : propriétés PII remplacées par `"anonymized"`

---

## 9. Micro-langage DSL

### 9.1 Syntaxe supportée

```
FIND services WHERE type = "payant"
FIND services WHERE category = "cours" AND status = "available"
FIND users WHERE points > 5 LIMIT 10
FIND events WHERE date > "2026-01-01" LIMIT 5
COUNT services WHERE type = "payant"
COUNT users WHERE role = "habitant"
FIND services WHERE type = "gratuit" AND category = "jardinage"
```

### 9.2 Architecture

```
dsl/lexer.py     Tokens PLY (FIND, WHERE, AND, OR, LIMIT, COUNT, opérateurs, valeurs)
dsl/parser.py    Grammaire PLY → AST Python
dsl/compiler.py  AST → requête MongoDB (dict Python)
dsl/main.py      execute(query_string) → résultats JSON
```

### 9.3 Intégration NestJS

- Bridge via `pythonia` (interop JS/Python zéro-copie, sans processus séparé)
- Endpoint : `POST /dsl/query { "query": "..." }`
- Erreurs syntaxe → `400 Bad Request` avec message lisible
- Erreurs inconnues → `500` avec log serveur

---

## 10. Tests

### 10.1 Stratégie

| Type        | Outil            | Objectif                        |
| ----------- | ---------------- | ------------------------------- |
| Unitaires   | Jest             | >= 70% coverage global          |
| Intégration | Jest + Supertest | Flux critiques avec BDD réelles |
| E2E         | Playwright       | Tous les flux métier            |
| Desktop     | JUnit            | Services Java, sync, plugins    |

### 10.2 Flux E2E obligatoires

| Flux                                 | Fichier                     | Criticité |
| ------------------------------------ | --------------------------- | --------- |
| Auth (register → TOTP → login → SSO) | `auth.e2e-spec.ts`          | CRITIQUE  |
| Quartiers (polygone + chevauchement) | `neighborhoods.e2e-spec.ts` | OK        |
| Services + booking                   | `services.e2e-spec.ts`      | WARNING   |
| Signature double + points            | `contracts.e2e-spec.ts`     | OK        |
| Barème points + limite -10           | `points.e2e-spec.ts`        | WARNING   |
| Neo4j recommandations (réel)         | `social.e2e-spec.ts`        | CRITIQUE  |
| Messagerie WebSocket (2 onglets)     | `messaging.e2e-spec.ts`     | CRITIQUE  |
| RGPD export + suppression            | `rgpd.e2e-spec.ts`          | WARNING   |
| DSL 15 requêtes                      | `dsl.e2e-spec.ts`           | WARNING   |
| Sync Java offline/online             | JUnit `SyncServiceTest`     | WARNING   |

### 10.3 Règles de test

- `beforeAll` : seed des données via API, jamais de mock sur BDD réelles
- `afterAll` : nettoyage complet des données créées
- Tests xfail documentés pour les bugs connus si nécessaire
- Zéro test qui passe si le code est cassé

---

## 11. Infrastructure & Déploiement

### 11.1 Variables d'environnement

```env
MONGO_URI=mongodb://mongodb:27017/quartierconnect
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
POSTGRES_URI=postgresql://postgres:postgres@postgresql:5432/quartierconnect
JWT_SECRET=                    # min 32 chars
JWT_REFRESH_SECRET=            # min 32 chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
SSO_TOKEN_SECRET=              # min 32 chars
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 11.2 Commandes essentielles

```bash
docker compose up -d                                # Dev complet
docker compose -f docker-compose.prod.yml up -d    # Prod
npx ts-node scripts/seed-demo.ts                   # Seed démo
cd api && pnpm run start:dev                        # API
cd web-apps && pnpm run dev                         # Front-end
cd desktop-app && ./mvnw clean package -q           # Build JAR
java -jar desktop-app/target/quartierconnect-desktop.jar
```

### 11.3 Seed de démonstration

Comptes créés (idempotent, TOTP secret fixe `JBSWY3DPEHPK3PXP`) :

| Email           | Mot de passe | Rôle      |
| --------------- | ------------ | --------- |
| `alice@demo.fr` | `Demo1234!`  | resident  |
| `bob@demo.fr`   | `Demo1234!`  | moderator |
| `admin@demo.fr` | `Demo1234!`  | admin     |

Données : 1 quartier Montmartre (GeoJSON réel), 3 services, 1 contrat `fully_signed`, 3 événements, 5 interactions Neo4j, 2 incidents.

---

## 12. Documentation attendue

| Fichier             | Emplacement | Contenu                                        |
| ------------------- | ----------- | ---------------------------------------------- |
| `ARCHITECTURE.md`   | `docs/`     | Diagrammes ASCII, flux données, justifications |
| `API.md`            | `docs/`     | Tous les endpoints, exemples curl              |
| `DATABASE.md`       | `docs/`     | Schémas MongoDB, Neo4j, PostgreSQL, SQLite     |
| `TESTS.md`          | `docs/`     | Coverage, scénarios E2E, instructions          |
| `SECURITY.md`       | `docs/`     | Modèle menaces, mesures, findings              |
| `PLUGINS.md`        | `docs/`     | Guide développeur plugin Java                  |
| `USER_GUIDE.md`     | `docs/`     | Parcours utilisateurs avec screenshots         |
| `DEPLOYMENT.md`     | `docs/`     | Installation pas-à-pas                         |
| `DEMO_SCRIPT.md`    | racine      | Scénario démo minute par minute                |
| `DEMO_CHECKLIST.md` | racine      | Checklist démo 100% cochée                     |
| Scalar              | `GET /docs` | Documentation API interactive                  |
| Figma               | Lien        | Maquettes UI/UX                                |

**Règle absolue** : zéro commentaire inline dans le code. Le code est auto-documenté par des noms explicites. La documentation est dans `docs/`.

---

## 13. Workflow de développement

### 13.1 Règles de code

```
✗ Zéro commentaire inline
✗ Zéro console.log / System.out.println / print()
✗ Zéro TODO / FIXME dans le code
✓ Noms de fonctions explicites (getUserByEmail, pas getUser)
✓ Une fonction = une responsabilité
✓ React : shadcn via CLI uniquement, jamais de CSS inline
✓ Java : CSS JavaFX dans resources/themes/, jamais inline
```

### 13.2 Boucle de validation obligatoire

Après **chaque** modification :

1. `pnpm run build` → zéro erreur TypeScript
2. `pnpm run test` → vert
3. `/qa [url]` → zéro erreur console
4. Coverage ne descend pas

### 13.3 Utilisation de gstack

| Situation               | Commande               |
| ----------------------- | ---------------------- |
| Décision d'architecture | `/plan-eng-review`     |
| Nouvelle page React     | `/design-consultation` |
| Après chaque sprint     | `/review`              |
| Bug                     | `/investigate` d'abord |
| Audit sécurité          | `/cso`                 |
| Valider une page        | `/qa [url]`            |
| Committer               | `/ship`                |
| Mise à jour docs        | `/document-release`    |
| Analyse globale         | `/autoplan`            |
| Rétrospective           | `/retro`               |

### 13.4 Sessions Claude Code

**Une session = un prompt = une branche.**

---

## 14. Jalons & Livrables

### 14.1 Planning

| Étape           | Date            | Objectif                                        | Réunion |
| --------------- | --------------- | ----------------------------------------------- | ------- |
| **Étape 1**     | 15 mars 2026    | Sujet validé, proposition, logo, infrastructure | 12/02   |
| **Étape 2**     | 5 avril 2026    | **30%** — SSO 3 surfaces + pages de base        | 08/04   |
| **Étape 3**     | 31 mai 2026     | **60%** — API complète + Scalar + sync Java     | 04/06   |
| **Étape 4**     | 28 juin 2026    | **95%** — React Admin + PLY finalisé            | 02/07   |
| **Rendu final** | 19 juillet 2026 | Sources + JAR + BDD + docs + soutenance 30min   | 20/07   |

### 14.2 Livrables Étape 2 (5 avril — 30%)

- [ ] Docker Compose 7 services healthy
- [ ] Auth : register, login TOTP, SSO tokens
- [ ] React Client : Login + Register (QR code) + Dashboard
- [ ] React Admin : Login admin + Dashboard admin (vérifie role)
- [ ] Java Desktop : JAR + LoginView SSO + MainView + SyncService timer 30s
- [ ] SSO croisé fonctionnel (web → token → java)
- [ ] Tests unitaires AuthService (9 cas)
- [ ] Scalar accessible sur `GET /docs`
- [ ] `docs/ARCHITECTURE.md` + `docs/DATABASE.md`
- [ ] Figma maquettes

### 14.3 Livrables Étape 3 (31 mai — 60%)

- [ ] ServicesModule + ContractsModule + PointsModule (transactions PostgreSQL ACID)
- [ ] DocumentsModule (signature SHA-256, GridFS, audit)
- [ ] SocialModule (Neo4j, recommandations)
- [ ] MessagingModule (WebSocket)
- [ ] VotesModule (4 types, Pattern Strategy)
- [ ] IncidentsModule (PostgreSQL)
- [ ] React Client : toutes les pages avec données réelles
- [ ] Java Desktop : sync offline/online LWW complète
- [ ] Tests E2E : auth, services, contrats, points, neo4j
- [ ] Coverage >= 60%

### 14.4 Livrables Étape 4 (28 juin — 95%)

- [ ] React Admin : toutes les vues
- [ ] DSL PLY complet (15 tests E2E)
- [ ] Système plugins Java + 4 plugins
- [ ] Système thèmes Java + 3 thèmes
- [ ] i18n API FR/EN
- [ ] RGPD complet
- [ ] Audit `/cso` → zéro CRITICAL/HIGH
- [ ] Coverage >= 70%
- [ ] Design score >= 7/10

### 14.5 Livrables Rendu Final (19 juillet)

- [ ] Sources nettoyés (zéro commentaire, zéro console.log)
- [ ] JAR auto-exécutable
- [ ] Seed idempotent + jeu vide
- [ ] Documentation complète dans `docs/`
- [ ] `DEMO_CHECKLIST.md` 100% coché
- [ ] Application déployée et accessible
- [ ] Score conformité >= 35/40

---

## 15. Notation et conditions de validation

### 15.1 Barème

| Critère                                                 | Poids   |
| ------------------------------------------------------- | ------- |
| Suivi (Trello, réunions, livrables intermédiaires)      | **40%** |
| Présentation finale (démo + dossier + soutenance 30min) | **60%** |

### 15.2 Conditions obligatoires

> ⚠️ **Un projet non déployé n'est pas corrigé.**

- Application **déployée** et accessible
- Java livré en **JAR auto-exécutable**
- Applications **conteneurisées** Docker
- Tous documents **réunis en un seul fichier** pour le jury
- Fichiers postés sur la plateforme **un jour avant** la soutenance
- **Trello utilisé** et à jour
- Outils **cross-platform interdits**
- Code sur **GitHub** avec commits identifiés par développeur

### 15.3 Documents à remettre

- Intégralité des sources (sans traces de debug)
- Exécutables (JAR)
- BDD sous forme de fichier texte importable (plusieurs jeux dont un vide)
- Dossier technique complet + guide utilisateur
- Installateur automatique
- Document de synthèse : démarche, travail par membre, analyse critique