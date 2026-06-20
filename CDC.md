# Requirements Specification — QuartierConnect
> **Connected Neighbours** · Group 1 · 3AL2 · ESGI 2025-2026  
> *«The link that brings your neighbourhood together»*

---

## Table of contents

1. [Project overview](#1-project-overview)
2. [Team and organisation](#2-team-and-organisation)
3. [Technical architecture](#3-technical-architecture)
4. [Web features](#4-web-features)
5. [Java Desktop client](#5-java-desktop-client)
6. [SSO — Single Sign-On](#6-sso--single-sign-on)
7. [Security](#7-security)
8. [GDPR](#8-gdpr)
9. [DSL micro-language](#9-dsl-micro-language)
10. [Testing](#10-testing)
11. [Infrastructure & Deployment](#11-infrastructure--deployment)
12. [Expected documentation](#12-expected-documentation)
13. [Development workflow](#13-development-workflow)
14. [Milestones & Deliverables](#14-milestones--deliverables)
15. [Grading and validation conditions](#15-grading-and-validation-conditions)

---

## 1. Project overview

### 1.1 Context

Residential neighbourhoods lack suitable digital tools to structure local mutual aid, formalise exchanges and manage community matters. General-purpose solutions do not meet these needs in a secure and organised way.

QuartierConnect is part of the **Connected Neighbours** academic project (3AL2) and offers a dedicated, geolocated and secure platform, available both in the browser and on the desktop.

### 1.2 Objective

To build a secure, extensible and resilient (offline-first) collaborative platform that lets the residents of a neighbourhood:

- Exchange services valued through a points system
- Sign digital documents securely (SHA-256 + MFA)
- Take part in community events with Neo4j recommendations
- Communicate through real-time multimedia messaging (WebSocket)
- Manage incidents and alerts via an offline-first desktop application

### 1.3 Target audience

| Profile             | Surface                                   | Permissions                                                  |
| ------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| **Resident**        | React Client (web)                        | Services, events, messaging, votes, signature               |
| **Moderator**       | React Client (web)                        | Resident rights + removal of inappropriate content          |
| **Administrator**   | React Client + React Admin + Java Desktop | Management of neighbourhoods, users, back-office, desktop    |

---

## 2. Team and organisation

### 2.1 Composition

| Member                 | Role                            | Main responsibilities                                  | Secondary                                |
| ---------------------- | ------------------------------- | ------------------------------------------------------ | ---------------------------------------- |
| **Claudio REIBAUD**    | Project lead & Fullstack Dev    | NestJS back-end, React Client & Admin, Java Desktop    | PLY/pythonia, UI/UX, Docker, tests, docs |
| **Andras SCHULLER**    | Front-end & Documentation       | Jest/Playwright tests, technical documentation, React  | Figma, PLY syntax                        |
| **Mouhamadou N'DIAYE** | Infrastructure & DevOps         | VPS, Caddy, Docker Compose, CI/CD GitHub Actions       | CRUD endpoints, automated tests          |

> Dynamic funnel logic: each member moves on to their secondary tasks as soon as their priority deliverables are completed.

### 2.2 Tools

- **Code**: GitHub — `github.com/creibaud/QuartierConnect`
- **Project**: Trello — `trello.com/b/oidFFT0p/pa-quartierconnect`
- **Design**: Figma
- **CI/CD**: GitHub Actions
- **Instructor**: Frédéric SANANES — `sananes@myges.fr`

---

## 3. Technical architecture

### 3.1 Overview — 7 Docker containers

| #   | Service          | Port(s)    | Role                                           |
| --- | ---------------- | ---------- | ---------------------------------------------- |
| 1   | **Caddy**        | 80, 443    | HTTPS reverse proxy, automatic Let's Encrypt   |
| 2   | **React Client** | 3000       | Resident interface                             |
| 3   | **React Admin**  | 3001       | Administrator back-office                       |
| 4   | **NestJS**       | 5000       | REST API + WebSocket + SSO + DSL               |
| 5   | **MongoDB**      | 27017      | Documents, contracts, media (GridFS), GeoJSON  |
| 6   | **Neo4j**        | 7474, 7687 | Social graph, recommendation engine            |
| 7   | **PostgreSQL**   | 5432       | Admin data, Java synchronisation               |

**Three environments**: `dev` (hot reload), `test` (isolated database, auto seed), `prod` (HTTPS Caddy)

### 3.2 Detailed technical stack

| Component         | Technology                       | Rationale                                                                      |
| ----------------- | -------------------------------- | ------------------------------------------------------------------------------ |
| **Back-end**      | NestJS 11 (TypeScript)           | Modular, native WebSocket Gateways, automatic Scalar                            |
| **Documentation** | Scalar                           | Interactive documentation, replaces Swagger                                     |
| **Front-end**     | React 19 + Vite                  | HMR, Server Components, performance                                             |
| **Data fetching** | TanStack Query                   | Server cache, Optimistic Updates                                               |
| **Routing**       | TanStack Router                  | 100% type-safe                                                                 |
| **Forms**         | TanStack Form + Zod              | Robust validation                                                              |
| **DataGrids**     | TanStack Table v8                | Headless, sorting, filters                                                      |
| **Design System** | Shadcn/ui + Tailwind v4          | Accessible Radix UI, Zinc/Blue theme                                            |
| **Monorepo**      | Turbo + pnpm workspaces          | Shared code between Client/Admin                                                |
| **Desktop client**| Java 21 + JavaFX                 | Native multithreading, offline-first                                            |
| **Document DB**   | MongoDB + Mongoose               | GeoJSON, GridFS                                                                |
| **Social Graph**  | Neo4j + Cypher                   | High-performance recommendations                                                |
| **Admin DB**      | PostgreSQL 16                    | Standard SQL, native ACID for point transactions, symmetry with SQLite          |
| **Offline DB**    | SQLite (JDBC)                    | Local Java cache, PostgreSQL mirror                                             |
| **Real-time**     | NestJS WebSocket Gateways        | Messaging, presence, notifications                                              |
| **Mapping**       | Leaflet + OSM                    | Dynamic polygon drawing                                                         |
| **PDF signature** | pdf-lib + react-signature-canvas | Canvas + SHA-256 injection                                                      |
| **Security**      | JWT HS256 + TOTP + argon2        | Robust sessions, MFA                                                            |
| **SSO**           | Ephemeral UUID token             | Shared web ↔ Java, single use 5min                                              |
| **i18n**          | i18next + nestjs-i18n            | FR/EN, Accept-Language                                                         |
| **DSL**           | PLY (Python) + pythonia          | MongoDB micro-language, zero-copy                                               |
| **Tests**         | Jest + Playwright + JUnit        | All types                                                                       |

### 3.3 Repository structure

```
api/
  src/
    auth/           JWT, TOTP, SSO, guards
    users/          CRUD, roles, GDPR
    neighborhoods/  GeoJSON, 2dsphere
    services/       Listings, points
    contracts/      PDF, signature, GridFS
    documents/      Audit, metadata
    social/         Neo4j, recommendations
    messaging/      WebSocket, media
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
  plugin-api/       PluginInterface interface (separate JAR)
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

docs/               Complete documentation
scripts/            seed-demo.ts
docker/             Compose + Caddyfile
```

### 3.4 Database modelling

#### MongoDB — Collections

| Collection      | Key fields                                                                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`         | `email`, `passwordHash`, `totpSecret`, `totpEnabled`, `role`, `neighborhoodId`, `consentTimestamp`, `refreshTokenHash` — points balance in PostgreSQL    |
| `ssoTokens`     | `userId`, `token` (UUID), `surface`, `expiresAt`, `usedAt` — TTL index                                                                                   |
| `neighborhoods` | `name`, `geometry` (GeoJSON Polygon), `adminId`                                                                                                          |
| `services`      | `title`, `category`, `type`, `duration`, `status`, `createdBy`, `neighborhoodId`                                                                         |
| `contracts`     | `serviceId`, `parties`, `status`, `pdfFileId`, `signatures`, `pointsAmount`                                                                              |
| `documents`     | `contractId`, `sha256Hash`, `signatoryId`, `timestamp`, `auditLog[]`                                                                                     |
| `events`        | `title`, `date`, `location`, `capacity`, `category`, `createdBy`                                                                                         |
| `messages`      | `conversationId`, `senderId`, `type`, `content`, `mediaFileId`, `timestamp`                                                                              |
| `votes`         | `title`, `type`, `options`, `results`, `parameters`, `createdBy`                                                                                         |

GridFS buckets: `pdfs`, `media`

#### Neo4j — Social graph

**Nodes**: `User`, `Service`, `Event`, `Neighborhood`

| Relationship    | From → To           | Properties                         |
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

**Integrity rules for point transactions:**
- `CHECK (balance >= -10)` constraint at the database level — it is impossible to go below this
- A `BEGIN` / `COMMIT` transaction is mandatory for any transfer: debiting `from_user_id` + crediting `to_user_id` in a single atomic operation
- Status `pending` → `completed` only after `contract.status = 'fully_signed'`
- Index on `from_user_id`, `to_user_id`, `contract_id` for history queries

#### SQLite — Java Desktop (PostgreSQL mirror)

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

## 4. Web features

### 4.1 Geographic modelling of the neighbourhood

- Polygon drawing on **OpenStreetMap** via `Leaflet.js` + `Leaflet.draw`
- **GeoJSON** storage in MongoDB with a `2dsphere` geospatial index
- Automatic detection of **overlaps** via `$geoIntersects`
- One resident = **one single neighbourhood**, interactions with direct neighbours only

### 4.2 Services between neighbours

#### Listings

- Offers or requests: title, description, category, type (free/paid), duration
- Filters, sorting, pagination via TanStack Table

#### Points system

| Action                   | Points     |
| ------------------------ | ---------- |
| 1 hour of service        | +2 points  |
| Quick action (< 30 min)  | +1 point   |
| Minimum balance          | -10 points |

- Multiplier coefficient per category (admin-configurable)
- Point transactions stored in **PostgreSQL** (ACID guaranteed, no MongoDB session)
- Full history available via `GET /users/me/transactions`
- Transfer **only after a double signature**

#### Automatic contracts

- Paid service → automatic PDF contract (pdf-lib)
- Content: identities, description, points, date, signature areas
- Statuses: `draft` → `partial` → `fully_signed`
- WebSocket notifications on each transition

### 4.3 Secure digital signature

1. Import a PDF or an auto-generated contract
2. Placement of signature areas by **drag and drop** (`react-pdf-viewer`)
3. **Mandatory TOTP MFA** before each signature
4. Canvas signature associated with a **SHA-256 hash** of the document
5. Server-side timestamping only
6. Metadata stored separately in **MongoDB GridFS** (immutable)
7. **Immutable audit log**: every action traced (import, invitation, signature, viewing)

### 4.4 Events and activities

- Creation: title, date, location, capacity, category
- **Tinder-style swipe interface** (right = Interested, left = Not interested)
- Interactions feed the **Neo4j engine**
- Suggestions: events, services, neighbours

### 4.5 Secure multimedia messaging

- 1-to-1 and group chat via **WebSocket** (NestJS Gateways)
- Media: photos (JPEG/PNG max 5 MB), voice notes (MP3 max 2 min), videos (MP4 max 1 min)
- Storage in **MongoDB GridFS**
- "Typing…" indicator + real-time **online/offline** status
- Encryption: HTTPS + WSS
- **Bonus**: peer-to-peer WebRTC video calls

### 4.6 Votes

| Type            | Description                  |
| --------------- | --------------------------- |
| Binary          | Yes / No                    |
| Single choice   | One option out of N         |
| Multiple choice | Several options             |
| Weighted vote   | Points to distribute freely |

- Parameters: duration, anonymity, quorum, results visibility, group restriction
- **Strategy Pattern** architecture: each type = an independent module, extensible without modifying the existing code

### 4.7 Multilingual

- FR and EN via `i18next` + `react-i18next`
- API: messages translated according to the `Accept-Language` header
- Automatic browser detection + manual selection in the profile
- Extensible: add one JSON file per locale

---

## 5. Java Desktop client

### 5.1 Scope

Application reserved for **administrators**, strict **offline-first** mode.

### 5.2 Incident management

- JavaFX `TableView` with sorting/filtering by status and date
- Adding and editing available offline (`is_dirty = true`)
- Automatic synchronisation when the connection returns

### 5.3 Statistics

- Data: events created, services exchanged, messages, votes
- Visualisations: JavaFX `BarChart`, `LineChart`, `PieChart`
- Filters by period and resident

### 5.4 Plugin system

`PluginInterface` interface (separate JAR `plugin-api/`):

```java
String getName();
String getVersion();
Node getView();
void onLoad(AppContext context);
void onUnload();
```

Dynamic loading via `URLClassLoader` from `~/.quartierconnect/plugins/`.

| Plugin                    | Description                 |
| ------------------------- | --------------------------- |
| `plugin-export-csv.jar`   | Incident export to CSV      |
| `plugin-export-pdf.jar`   | PDF statistics report       |
| `plugin-social-graph.jar` | Neo4j graph visualisation   |
| `plugin-calendar.jar`     | Local event calendar        |

- Enabling/disabling **without a restart**
- Installation by selecting a JAR from the UI
- Sandbox: access limited to `AppContext` only

### 5.5 Theme system

`ThemePlugin` interface (extends `PluginInterface`):

| Theme         | Description                              |
| ------------- | ---------------------------------------- |
| Default       | Zinc/Blue consistent with the web (#1D4ED8) |
| Dark          | Full dark mode                           |
| High Contrast | Accessibility                            |

- Switching **without a restart** via `scene.getStylesheets()`
- Persistence in `~/.quartierconnect/config.json`

### 5.6 Additional features

- Automatic updates from the central server
- Uninstall from the user interface
- Delivered as a **self-executable JAR** (Maven Shade Plugin)

### 5.7 Offline-first synchronisation

| Phase                  | Mechanism                                                         |
| ---------------------- | ----------------------------------------------------------------- |
| **Local persistence**  | Mutation committed to SQLite, `is_dirty = true`                  |
| **Network probe**      | Worker thread, polling `GET /health` every **30 seconds**       |
| **Push**               | `SELECT WHERE is_dirty = 1` → batch `POST /sync` → `is_dirty = 0` |
| **Pull**               | `GET /incidents?since={last_sync_timestamp}` → delta only        |
| **LWW resolution**     | Last-Write-Wins based on timestamp comparison                    |
| **Audit**              | Each conflict recorded in `sync_log`                             |
| **UI**                 | `Platform.runLater()` for non-blocking refresh                  |

---

## 6. SSO — Single Sign-On

### 6.1 Architecture

SSO shares the same account across React Client, React Admin and Java Desktop **without re-entering credentials**.

```
[Surface A logged in]
     │
     ▼
POST /auth/sso/generate { surface: "java-desktop" }
     │
     ▼
{ ssoToken: "uuid-v4", expiresIn: 300 }
     │
     ▼  (token transmitted to Surface B)
POST /auth/sso/exchange { ssoToken: "uuid-v4" }
     │
     ▼
{ accessToken, refreshToken, user }
```

### 6.2 SSO token properties

- Type: UUID v4
- TTL: **5 minutes**
- Usage: **single** (invalidated after the first exchange)
- Storage: MongoDB `ssoTokens` with an automatic TTL index
- Validation: `expiresAt > now()` AND `usedAt === null`

### 6.3 SSO endpoints

| Endpoint                  | Auth         | Description                     |
| ------------------------- | ------------ | ------------------------------- |
| `POST /auth/register`     | Public       | Registration + TOTP generation  |
| `POST /auth/login`        | Public       | Credentials + TOTP → JWT pair   |
| `POST /auth/sso/generate` | JWT required | Generates an ephemeral SSO token |
| `POST /auth/sso/exchange` | Public       | Exchanges SSO token → JWT pair   |
| `POST /auth/refresh`      | Public       | Renews the access token          |
| `POST /auth/logout`       | JWT required | Revokes the refresh token        |

### 6.4 Java Desktop flow

```java
AuthService.login(email, password, totpCode)
  // POST /auth/login
  // stores accessToken in memory (never on disk)

AuthService.exchangeSsoToken(ssoToken)
  // POST /auth/sso/exchange
  // stores accessToken in memory

ApiService.executeRequest()
  // if 401: AuthService.refreshAccessToken() → retry
```

---

## 7. Security

### 7.1 Authentication

- Email + password hashed with **argon2** (10 rounds)
- **Mandatory TOTP MFA** on: initial login, change of email/password/phone, signature
- JWT HS256: access token **15 min** + refresh token **7 days** with rotation
- Rate limiting: **5 attempts / 15 min** on `/auth/login`
- SSO: ephemeral UUID token, single use, 5 min

### 7.2 Transport

- HTTPS mandatory (Caddy + Let's Encrypt)
- WebSocket via WSS only
- Headers: restrictive CORS, CSP, HSTS

### 7.3 Signatures

- **SHA-256** hash computed server-side only
- Tamper-proof server timestamp
- Immutable GridFS storage

### 7.4 Roles and permissions

| Role        | Permissions                                                  |
| ----------- | ----------------------------------------------------------- |
| `resident`  | Their own data, services, messaging, votes                  |
| `moderator` | + Removal of inappropriate content                          |
| `admin`     | + Management of neighbourhoods, users, back-office, desktop |

### 7.5 Separation of responsibilities by database

| Data                                                                     | Database   | Rationale                                              |
| ------------------------------------------------------------------------ | ---------- | ----------------------------------------------------- |
| Documents, GeoJSON, media                                                | MongoDB    | Document flexibility, GridFS, geospatial index         |
| User profiles, point transactions, balances, incidents, alerts           | PostgreSQL | Native ACID, CHECK constraints, atomic transactions    |
| Social graph, recommendations                                            | Neo4j      | Graph traversal, Cypher                               |
| Admin offline cache                                                      | SQLite     | Lightweight PostgreSQL mirror, JDBC                    |

---

## 8. GDPR

| Right             | Endpoint                | Behaviour                                                  |
| ----------------- | ----------------------- | --------------------------------------------------------- |
| **Access**        | `GET /api/me/export`    | Full JSON without `passwordHash`                          |
| **Rectification** | `PATCH /api/me`         | Profile modification                                      |
| **Erasure**       | `DELETE /api/me/delete` | MongoDB deletion + Neo4j anonymisation + JWT revocation   |
| **Consent**       | At registration         | `consentTimestamp` recorded, visible in the export        |

- Data on EU servers only
- Contracts immutable after deletion (anonymised identity)
- Neo4j nodes: PII properties replaced by `"anonymized"`

---

## 9. DSL micro-language

### 9.1 Supported syntax

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
dsl/lexer.py     PLY tokens (FIND, WHERE, AND, OR, LIMIT, COUNT, operators, values)
dsl/parser.py    PLY grammar → Python AST
dsl/compiler.py  AST → MongoDB query (Python dict)
dsl/main.py      execute(query_string) → JSON results
```

### 9.3 NestJS integration

- Bridge via `pythonia` (zero-copy JS/Python interop, no separate process)
- Endpoint: `POST /dsl/query { "query": "..." }`
- Syntax errors → `400 Bad Request` with a readable message
- Unknown errors → `500` with a server log

---

## 10. Testing

### 10.1 Strategy

| Type        | Tool             | Goal                              |
| ----------- | ---------------- | --------------------------------- |
| Unit        | Jest             | >= 70% global coverage            |
| Integration | Jest + Supertest | Critical flows with real databases |
| E2E         | Playwright       | All business flows                |
| Desktop     | JUnit            | Java services, sync, plugins      |

### 10.2 Mandatory E2E flows

| Flow                                  | File                        | Criticality |
| ------------------------------------- | --------------------------- | ----------- |
| Auth (register → TOTP → login → SSO)  | `auth.e2e-spec.ts`          | CRITICAL    |
| Neighbourhoods (polygon + overlap)    | `neighborhoods.e2e-spec.ts` | OK          |
| Services + booking                    | `services.e2e-spec.ts`      | WARNING     |
| Double signature + points             | `contracts.e2e-spec.ts`     | OK          |
| Points scale + -10 limit              | `points.e2e-spec.ts`        | WARNING     |
| Neo4j recommendations (real)          | `social.e2e-spec.ts`        | CRITICAL    |
| WebSocket messaging (2 tabs)          | `messaging.e2e-spec.ts`     | CRITICAL    |
| GDPR export + erasure                 | `rgpd.e2e-spec.ts`          | WARNING     |
| DSL 15 queries                        | `dsl.e2e-spec.ts`           | WARNING     |
| Java offline/online sync              | JUnit `SyncServiceTest`     | WARNING     |

### 10.3 Testing rules

- `beforeAll`: seed data via the API, never mock real databases
- `afterAll`: full cleanup of created data
- Documented xfail tests for known bugs if necessary
- Zero tests that pass when the code is broken

---

## 11. Infrastructure & Deployment

### 11.1 Environment variables

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

### 11.2 Essential commands

```bash
docker compose up -d                                # Full dev
docker compose -f docker-compose.prod.yml up -d    # Prod
npx ts-node scripts/seed-demo.ts                   # Demo seed
cd api && pnpm run start:dev                        # API
cd web-apps && pnpm run dev                         # Front-end
cd desktop-app && ./mvnw clean package -q           # Build JAR
java -jar desktop-app/target/quartierconnect-desktop.jar
```

### 11.3 Demonstration seed

Accounts created (idempotent, fixed TOTP secret `JBSWY3DPEHPK3PXP`):

| Email           | Password     | Role      |
| --------------- | ------------ | --------- |
| `alice@demo.fr` | `Demo1234!`  | resident  |
| `bob@demo.fr`   | `Demo1234!`  | moderator |
| `admin@demo.fr` | `Demo1234!`  | admin     |

Data: 1 Montmartre neighbourhood (real GeoJSON), 3 services, 1 `fully_signed` contract, 3 events, 5 Neo4j interactions, 2 incidents.

---

## 12. Expected documentation

| File                | Location    | Content                                          |
| ------------------- | ----------- | ------------------------------------------------ |
| `ARCHITECTURE.md`   | `docs/`     | ASCII diagrams, data flows, rationale            |
| `API.md`            | `docs/`     | All endpoints, curl examples                     |
| `DATABASE.md`       | `docs/`     | MongoDB, Neo4j, PostgreSQL, SQLite schemas       |
| `TESTS.md`          | `docs/`     | Coverage, E2E scenarios, instructions            |
| `SECURITY.md`       | `docs/`     | Threat model, measures, findings                 |
| `PLUGINS.md`        | `docs/`     | Java plugin developer guide                      |
| `USER_GUIDE.md`     | `docs/`     | User journeys with screenshots                   |
| `DEPLOYMENT.md`     | `docs/`     | Step-by-step installation                        |
| `DEMO_SCRIPT.md`    | root        | Minute-by-minute demo scenario                   |
| `DEMO_CHECKLIST.md` | root        | Demo checklist 100% ticked                       |
| Scalar              | `GET /docs` | Interactive API documentation                    |
| Figma               | Link        | UI/UX mockups                                    |

**Absolute rule**: zero inline comments in the code. The code is self-documented through explicit names. The documentation lives in `docs/`.

---

## 13. Development workflow

### 13.1 Coding rules

```
✗ Zero inline comment
✗ Zero console.log / System.out.println / print()
✗ Zero TODO / FIXME in the code
✓ Explicit function names (getUserByEmail, not getUser)
✓ One function = one responsibility
✓ React: shadcn via CLI only, never inline CSS
✓ Java: JavaFX CSS in resources/themes/, never inline
```

### 13.2 Mandatory validation loop

After **each** change:

1. `pnpm run build` → zero TypeScript errors
2. `pnpm run test` → green
3. Browser QA of the page → zero console errors
4. Coverage does not drop

---

## 14. Milestones & Deliverables

### 14.1 Schedule

| Stage           | Date            | Goal                                            | Meeting |
| --------------- | --------------- | ----------------------------------------------- | ------- |
| **Stage 1**     | 15 March 2026   | Topic validated, proposal, logo, infrastructure | 12/02   |
| **Stage 2**     | 5 April 2026    | **30%** — SSO across 3 surfaces + base pages    | 08/04   |
| **Stage 3**     | 31 May 2026     | **60%** — Complete API + Scalar + Java sync     | 04/06   |
| **Stage 4**     | 28 June 2026    | **95%** — React Admin + PLY finalised           | 02/07   |
| **Final delivery** | 19 July 2026 | Sources + JAR + DB + docs + 30min defence       | 20/07   |

### 14.2 Stage 2 deliverables (5 April — 30%)

- [ ] Docker Compose 7 services healthy
- [ ] Auth: register, TOTP login, SSO tokens
- [ ] React Client: Login + Register (QR code) + Dashboard
- [ ] React Admin: admin Login + admin Dashboard (checks role)
- [ ] Java Desktop: JAR + SSO LoginView + MainView + SyncService 30s timer
- [ ] Working cross SSO (web → token → java)
- [ ] AuthService unit tests (9 cases)
- [ ] Scalar accessible at `GET /docs`
- [ ] `docs/ARCHITECTURE.md` + `docs/DATABASE.md`
- [ ] Figma mockups

### 14.3 Stage 3 deliverables (31 May — 60%)

- [ ] ServicesModule + ContractsModule + PointsModule (PostgreSQL ACID transactions)
- [ ] DocumentsModule (SHA-256 signature, GridFS, audit)
- [ ] SocialModule (Neo4j, recommendations)
- [ ] MessagingModule (WebSocket)
- [ ] VotesModule (4 types, Strategy Pattern)
- [ ] IncidentsModule (PostgreSQL)
- [ ] React Client: all pages with real data
- [ ] Java Desktop: full offline/online LWW sync
- [ ] E2E tests: auth, services, contracts, points, neo4j
- [ ] Coverage >= 60%

### 14.4 Stage 4 deliverables (28 June — 95%)

- [ ] React Admin: all views
- [ ] Complete PLY DSL (15 E2E tests)
- [ ] Java plugin system + 4 plugins
- [ ] Java theme system + 3 themes
- [ ] FR/EN API i18n
- [ ] Complete GDPR
- [ ] Security audit → zero CRITICAL/HIGH
- [ ] Coverage >= 70%
- [ ] Design score >= 7/10

### 14.5 Final delivery deliverables (19 July)

- [ ] Cleaned sources (zero comments, zero console.log)
- [ ] Self-executable JAR
- [ ] Idempotent seed + empty dataset
- [ ] Complete documentation in `docs/`
- [ ] `DEMO_CHECKLIST.md` 100% ticked
- [ ] Application deployed and accessible
- [ ] Compliance score >= 35/40

---

## 15. Grading and validation conditions

### 15.1 Grading scale

| Criterion                                               | Weight  |
| ------------------------------------------------------- | ------- |
| Tracking (Trello, meetings, intermediate deliverables)  | **40%** |
| Final presentation (demo + report + 30min defence)      | **60%** |

### 15.2 Mandatory conditions

> ⚠️ **A project that is not deployed will not be graded.**

- Application **deployed** and accessible
- Java delivered as a **self-executable JAR**
- Applications **containerised** with Docker
- All documents **gathered into a single file** for the jury
- Files posted on the platform **one day before** the defence
- **Trello used** and kept up to date
- Cross-platform tools **forbidden**
- Code on **GitHub** with commits identified by developer

### 15.3 Documents to submit

- The entirety of the sources (without any debug traces)
- Executables (JAR)
- Database as an importable text file (several datasets including an empty one)
- Complete technical report + user guide
- Automatic installer
- Synthesis document: approach, work per member, critical analysis
