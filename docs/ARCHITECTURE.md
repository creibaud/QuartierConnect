# Technical Architecture — QuartierConnect

> **Version** 0.2.0 · **Date** 16 April 2026 · **Stage** 4 (95 %)

---

## Table of contents

1. [Overview](#1-overview)
2. [Docker containers](#2-docker-containers)
3. [NestJS modules diagram](#3-nestjs-modules-diagram)
4. [Complete authentication flows](#4-complete-authentication-flows)
5. [Cross-surface SSO](#5-cross-surface-sso)
6. [Refresh token and rotation](#6-refresh-token-and-rotation)
7. [Database architecture](#7-database-architecture)
8. [Bidirectional Java ↔ API sync](#8-bidirectional-java--api-sync)
9. [Real-time Neo4j sync](#9-real-time-neo4j-sync)
10. [WebSocket — Real-time messaging](#10-websocket--real-time-messaging)
11. [Voting system](#11-voting-system)
12. [DSL — Compilation pipeline](#12-dsl--compilation-pipeline)
13. [Java desktop offline mode](#13-java-desktop-offline-mode)
14. [Java desktop plugin system](#14-java-desktop-plugin-system)
15. [Auto-reconnect and token auto-refresh](#15-auto-reconnect-and-token-auto-refresh)
16. [Layered security](#16-layered-security)
17. [Request lifecycle](#17-request-lifecycle)

---

## 1. Overview

QuartierConnect is a **multi-component** platform made up of 4 active applications and 3 databases, all orchestrated through Docker Compose.

```mermaid
graph TB
    subgraph Internet
        U1[Resident<br/>browser]
        U2[Admin<br/>browser]
        U3[Admin/Moderator<br/>JavaFX Desktop]
    end

    subgraph Docker["Docker Compose Network"]
        CADDY[Caddy<br/>Reverse Proxy<br/>:80/:443]

        subgraph Frontend
            CLIENT[React Client<br/>:3000]
            ADMIN[React Admin<br/>:3001]
        end

        subgraph Backend
            API[NestJS API<br/>:5000<br/>REST + WebSocket]
            PYTHON[Python DSL<br/>PLY - internal port]
        end

        subgraph Storage
            MONGO[(MongoDB<br/>:27017<br/>Documents)]
            PG[(PostgreSQL<br/>:5432<br/>Relational)]
            NEO4J[(Neo4j<br/>:7474/:7687<br/>Graph)]
        end
    end

    subgraph Desktop
        JAVA[JavaFX App<br/>Fat JAR]
        SQLITE[(SQLite<br/>Local)]
    end

    U1 --> CADDY
    U2 --> CADDY
    U3 --> JAVA
    CADDY -->|"/"| CLIENT
    CADDY -->|"/admin"| ADMIN
    CADDY -->|"/api"| API
    API --> MONGO
    API --> PG
    API --> NEO4J
    JAVA -->|HTTP REST| API
    JAVA --- SQLITE
```

---

## 2. Docker containers

| # | Container | Image | Port(s) | Role |
|---|-----------|-------|---------|------|
| 1 | `caddy` | `caddy:2-alpine` | 80, 443 | HTTPS reverse proxy + automatic Let's Encrypt |
| 2 | `client` | Node 20 + Vite | 3000 | React SPA — resident interface |
| 3 | `admin` | Node 20 + Vite | 3001 | React SPA — admin back office |
| 4 | `api` | Node 20 | 5000 | NestJS REST + WebSocket + DSL bridge |
| 5 | `mongodb` | `mongo:7` | 27017 | Flexible documents, GeoJSON, GridFS |
| 6 | `postgres` | `postgres:16` | 5432 | ACID data — users, incidents, points |
| 7 | `neo4j` | `neo4j:5` | 7474, 7687 | Social graph — Cypher recommendations |

### Caddy routing

```
/ → client:3000
/admin → admin:3001
/api → api:5000
/api/docs → api:5000/docs (Scalar)
```

---

## 3. NestJS modules diagram

```mermaid
graph TB
    APP[AppModule<br/>global ThrottlerGuard<br/>I18n · ConfigModule]

    APP --> AUTH[AuthModule<br/>register · login · SSO<br/>refresh · logout]
    APP --> DB[DrizzleModule<br/>PostgreSQL ORM]
    APP --> NEO[SocialModule<br/>Neo4j driver<br/>recommendations + sync]

    APP --> NBH[NeighborhoodsModule<br/>GeoJSON neighborhoods CRUD]
    APP --> SVC[ServicesModule<br/>neighbor services CRUD]
    APP --> EVT[EventsModule<br/>events CRUD]
    APP --> INC[IncidentsModule<br/>state machine<br/>Java sync]
    APP --> PTS[PointsModule<br/>ACID transactions]
    APP --> USR[UsersModule<br/>account management + GDPR]
    APP --> CTR[ContractsModule<br/>TOTP + SHA-256 signing]
    APP --> MSG[MessagingModule<br/>REST + WebSocket Gateway]
    APP --> VOT[VotesModule<br/>Strategy Pattern]
    APP --> CVT[CommunityVotesModule<br/>community ballots]
    APP --> DOC[DocumentsModule<br/>GridFS upload/download]
    APP --> DSL[DslModule<br/>Python PLY bridge]

    AUTH --> DB
    AUTH --> NEO
    INC --> DB
    PTS --> DB
    USR --> DB
    CTR --> DB
    NBH --> NEO
    SVC --> NEO
    EVT --> NEO
```

---

## 4. Complete authentication flows

### 4.1 Registration

```mermaid
sequenceDiagram
    participant C as Client React
    participant API as NestJS API
    participant PG as PostgreSQL
    participant N4J as Neo4j

    C->>API: POST /auth/register {email, password}
    API->>API: argon2.hash(password) — Argon2id
    API->>API: speakeasy.generateSecret(email) — RFC 6238
    API->>PG: INSERT users (email, passwordHash, totpSecret) RETURNING id
    PG-->>API: {id: uuid}
    API-)N4J: MERGE (u:User {id}) [fire-and-forget]
    API-->>C: {otpauthUrl: "otpauth://totp/..."}
    C->>C: QRCode.toDataURL(otpauthUrl) — render QR
    C->>C: User scans with Google Authenticator
```

### 4.2 Login (3 sequential validations)

```mermaid
sequenceDiagram
    participant C as Client React
    participant API as NestJS API
    participant PG as PostgreSQL
    participant TS as TotpService

    C->>API: POST /auth/login {email, password, totpCode}
    API->>PG: SELECT * FROM users WHERE email = ?
    PG-->>API: user row

    alt Banned account
        API-->>C: 401 ACCOUNT_BANNED
    end

    API->>API: argon2.verify(passwordHash, password)
    alt Invalid password
        API-->>C: 401 INVALID_PASSWORD
    end

    API->>TS: totp.verify(totpSecret, totpCode)
    Note over TS: window=1 (±30s tolerance)<br/>anti-replay TanStack Store 90s
    alt Invalid or replayed TOTP
        API-->>C: 401 INVALID_TOTP
    end

    API->>API: JWT.sign({sub, email, role, jti}, 15m) — access
    API->>API: JWT.sign({sub, email, role, jti}, 7d) — refresh
    API->>API: argon2.hash(refreshToken)
    API->>PG: UPDATE users SET refresh_token_hash = ?
    API-->>C: Set-Cookie qc_rt (httpOnly SameSite=strict) + {accessToken, user:{id,email,role}}
```

---

## 5. Cross-surface SSO

SSO lets an administrator authenticate into the **Java desktop application** through the **web admin interface**, without re-entering their credentials.

```mermaid
sequenceDiagram
    participant Java as JavaFX App
    participant Browser as System browser
    participant Admin as React Admin (:3001)
    participant API as NestJS API
    participant Mongo as MongoDB ssoTokens

    Java->>Java: state = UUID.randomUUID() — PKCE
    Java->>Java: SsoCallbackServer.java — listens on a random OS port
    Java->>Browser: open("http://localhost:3001/sso/authorize?state=...&redirect=http://localhost:{port}/cb")
    Browser->>Admin: GET /sso/authorize — admin login page
    Admin->>Admin: Login (email + password + TOTP required, admin role)
    Admin->>API: POST /auth/sso/generate {surface:"java-desktop", state}
    API->>Mongo: INSERT {token:UUID, userId, surface, state, expiresAt:now+300s, usedAt:null}
    Note over Mongo: MongoDB TTL index — auto-expiry 5min
    API-->>Admin: {ssoToken, expiresAt, expiresIn:300}
    Admin->>Browser: redirect → http://localhost:{port}/cb?token=xxx&state=yyy
    Browser->>Java: SsoCallbackServer.java receives the HTTP callback
    Java->>Java: Validates state == local state (PKCE)
    Java->>API: POST /auth/sso/exchange {ssoToken, state}
    API->>Mongo: findOneAndUpdate({token, usedAt:null, expiresAt:{gt:now}}, {usedAt:now})
    Note over API,Mongo: Atomic — replay impossible
    API->>API: generateTokenPair(user)
    API-->>Java: Set-Cookie qc_rt (httpOnly) + {accessToken, user} (Java reads refreshToken from body via dto.refreshToken)
    Java->>Java: applyTokens() → TokenVault.saveTokens() + SQLiteDatabase.saveSession(email)
```

---

## 6. Refresh token and rotation

```mermaid
sequenceDiagram
    participant C as Client
    participant API as NestJS API
    participant PG as PostgreSQL

    Note over C: Access token expired (15 min)
    C->>API: POST /auth/refresh (qc_rt cookie automatic — or body for Java desktop)
    API->>API: JWT.verify(refreshToken) → payload

    Note over API,PG: Transactional lock — anti-TOCTOU
    API->>PG: BEGIN — SELECT refreshTokenHash WHERE id=sub FOR UPDATE
    alt Null hash — already revoked
        API-->>C: 401 TOKEN_REVOKED (ROLLBACK)
    end
    alt Banned account
        API-->>C: 401 ACCOUNT_BANNED (ROLLBACK)
    end
    API->>API: argon2.verify(refreshTokenHash, refreshToken)
    alt Hash does not match
        API-->>C: 401 TOKEN_REVOKED (ROLLBACK)
    end

    Note over API,PG: Strict rotation — invalidate the old one
    API->>PG: UPDATE users SET refresh_token_hash = NULL
    API->>API: generatePair(sub, email, role)
    API->>API: argon2.hash(newRefreshToken)
    API->>PG: UPDATE users SET refresh_token_hash = hash(new) — COMMIT
    API-->>C: Set-Cookie qc_rt (new) + {accessToken (15m)}
```

---

## 7. Database architecture

### 7.1 Data distribution

```mermaid
graph LR
    subgraph PG["PostgreSQL — strict ACID"]
        U[users<br/>auth · roles · tokens]
        I[incidents<br/>state machine]
        PB[points_balances<br/>current balance]
        PT[points_transactions<br/>history]
    end

    subgraph MDB["MongoDB — Flexible documents"]
        N[neighborhoods<br/>GeoJSON 2dsphere]
        S[services<br/>neighbor listings]
        E[events<br/>events]
        C[contracts<br/>SHA-256 hash]
        M[messages / conversations]
        V[votes Strategy Pattern]
        CV[communityVotes<br/>multi-type ballots]
        D[documents GridFS]
        SSO[ssoTokens TTL 5min]
    end

    subgraph N4J["Neo4j — Social graph"]
        NU[User]
        NN[Neighborhood]
        NS[Service]
        NE[Event]
        NU -->|LIVES_IN| NN
        NS -->|LOCATED_IN| NN
        NE -->|HELD_IN| NN
        NU -->|INTERESTED_IN| NE
        NU -->|USED| NS
    end
```

### 7.2 Rationale for the three-database design

| Criterion | PostgreSQL | MongoDB | Neo4j |
|---------|-----------|---------|-------|
| ACID transactions | Mandatory (points, auth) | Not critical | Not applicable |
| Flexible schema | No | Yes (GeoJSON, subdocs) | Free-form properties |
| Geolocation | No | Native `2dsphere` index | No |
| Recommendations | No | No | Cypher traversals |

---

## 8. Bidirectional Java ↔ API sync

### 8.1 Synchronization flow

```mermaid
sequenceDiagram
    participant Java as JavaFX Desktop
    participant SQLite as local SQLite
    participant API as NestJS API
    participant PG as PostgreSQL

    Note over Java: Offline mode — create an incident
    Java->>SQLite: INSERT incidents (is_dirty=1, updated_at=now)
    Java->>Java: Shows the incident in the local list

    Note over Java,API: Network connection — SyncService every 30s
    Java->>API: GET /health
    API-->>Java: {status:"ok"}

    Java->>SQLite: SELECT * FROM incidents WHERE is_dirty = 1 AND is_conflict = 0
    SQLite-->>Java: [modified incidents, conflicts excluded]

    loop For each dirty incident
        Java->>API: POST /sync/incidents [{remoteId?, title, status, updatedAt}]
        API->>PG: UPSERT incidents ON CONFLICT DO UPDATE
        API-->>Java: [{id, synced:true}]
        Java->>SQLite: UPDATE SET is_dirty=0, remote_id=?
        Java->>SQLite: UPDATE SET base_title/desc/status/updated_at (3WM ancestor)
    end

    Note over Java: Push returns justPushed (set of IDs)
    Note over Java,SQLite: Pull — Three-Way Merge resolution (skip justPushed IDs)
    Java->>API: GET /incidents?since=lastPull
    API-->>Java: [updated incidents]
    loop For each received incident (except justPushed)
        alt base == null (never synced)
            Java->>SQLite: LWW fallback — server wins if more recent
        else local unchanged since base
            Java->>SQLite: Auto-merge — applies the server version
        else server unchanged since base
            Java->>SQLite: Auto-merge — keeps the local version
        else both changed the same field
            Java->>SQLite: SET is_conflict=1, remote_title/desc/status
            Note over Java: Conflict visible in the UI (⚠ badge + Resolve dialog)
        end
    end

    Note over Java,SQLite: Orphan cleanup — tombstone server-deleted incidents
    Java->>SQLite: tombstoneOrphans(remoteIds) — SET deleted_at for those absent from the server
    Java->>SQLite: INSERT sync_log (synced_at, success=1)
```

### 8.2 Three-Way Merge — conflict resolution

The Three-Way Merger compares three versions of each field (title, description, status):

| Case | Base | Local | Remote | Result |
|-----|------|-------|--------|----------|
| No base (1st sync) | null | L | R | LWW — remote wins if more recent |
| Local unchanged | B | B | R | Auto-merge — applies remote |
| Remote unchanged | B | L | B | Auto-merge — keeps local |
| Same change | B | X | X | Auto-merge — both converge |
| True conflict | B | L | R | `is_conflict=1` — manual resolution required |

### 8.3 Conflict handling in the UI

- **Banner**: an alert shown at the top of the incidents view when conflicts exist
- **Filter**: a "Conflicts" button to display only the incidents in conflict
- **Merge modal**: a double-click opens a 4-column GridPane (field / base / local / remote) with diff highlighting
- **Resolution**: the user picks each field; resolving updates the ancestor and clears the conflict flag

### 8.4 Tombstone delete

Server-side deletions are propagated locally through a `deleted_at` column (soft delete). `tombstoneOrphans()` marks incidents missing from the server response during a full pull. Marked incidents are excluded from views but kept for auditing.

---

## 9. Real-time Neo4j sync

On every CRUD operation involving social entities, a **fire-and-forget** call synchronizes Neo4j. A Neo4j outage never blocks the main API. On a recoverable error (`ServiceUnavailable`, `SessionExpired`, `TransientError`), `withRetry` retries up to 3 times with exponential backoff (100 ms → 200 ms → 400 ms). Non-recoverable errors (e.g. Cypher syntax) fail immediately without retrying.

```mermaid
flowchart TD
    A["CRUD Endpoint<br/>neighborhoods / services / events / auth/register"] --> B["Main operation<br/>MongoDB or PostgreSQL"]
    B --> C{Success?}
    C -->|No| D[HTTP error returned to the client]
    C -->|Yes| E[HTTP response sent to the client]
    E --> F["void socialService.syncX()<br/>fire-and-forget — no await"]
    F --> R["withRetry — 3 attempts<br/>backoff 100/200/400 ms"]
    R --> G{Neo4j available?}
    G -->|Yes| H["Neo4j session<br/>MERGE (n:Label {id}) ON CREATE/MATCH SET"]
    G -->|No, attempt < 3| R
    G -->|No, attempt = 3| I["Logger.warn<br/>silently ignored"]
```

---

## 10. WebSocket — Real-time messaging

```mermaid
sequenceDiagram
    participant A as Alice (Socket.io)
    participant GW as MessagingGateway
    participant SVC as MessagingService
    participant Mongo as MongoDB

    A->>GW: connect() + auth.token = JWT
    GW->>GW: JWT.verify(token) → userId
    GW->>SVC: findConversations(userId)
    Mongo-->>SVC: [{_id, participants, ...}]
    GW->>GW: socket.join("conversation:convId") × N
    Note over GW: Rooms rebuilt from MongoDB on each connection (restart-resilient)

    A->>GW: emit("join_conversation", conversationId)
    Note over A,GW: For new conversations created during the session
    GW->>SVC: isParticipant(conversationId, userId)
    Mongo-->>SVC: {participants:[...]}
    GW->>GW: socket.join("conversation:convId")

    A->>GW: emit("send_message", {conversationId, content})
    GW->>SVC: sendMessage(convId, userId, content, TEXT)
    SVC->>Mongo: INSERT message
    GW->>GW: server.to("conversation:convId").emit("new_message", message)
    Note over GW: Broadcast to all connected participants
```

---

## 11. Voting system

### Strategy Pattern — two modes

```mermaid
classDiagram
    class VoteStrategy {
        <<interface>>
        +allowedTypes() string[]
        +calculate(votes) VoteResult
    }
    class UpDownStrategy {
        +allowedTypes() ["up","down"]
        +calculate() score = up - down
    }
    class LikeDislikeStrategy {
        +allowedTypes() ["like","dislike"]
        +calculate() score = like - dislike
    }
    class VoteStrategyFactory {
        +getVoteStrategy(targetType) VoteStrategy
    }
    VoteStrategy <|.. UpDownStrategy
    VoteStrategy <|.. LikeDislikeStrategy
    VoteStrategyFactory --> VoteStrategy
```

### Toggle logic

```mermaid
flowchart TD
    A["POST /votes {targetId, targetType, voteType}"] --> B[Look up existing vote]
    B --> C{Existing vote?}
    C -->|No| D["CREATE vote — action:'added'"]
    C -->|Yes, same type| E["DELETE vote — action:'removed' toggle off"]
    C -->|Yes, different type| F["UPDATE vote — action:'changed'"]
```

---

## 12. DSL — Compilation pipeline

```mermaid
flowchart LR
    A["DSL text<br/>FIND incidents WHERE status='open' LIMIT 10"]
    B["Lexer PLY<br/>tokens: FIND IDENTIFIER WHERE IDENTIFIER EQ STRING LIMIT NUMBER"]
    C["Parser PLY LALR<br/>AST dict Python"]
    D["Compiler<br/>collection whitelist validation"]
    E["MongoDB query<br/>{type:'find', collection:'incidents', filter:{status:'open'}, limit:10}"]
    F["Motor async<br/>execution + JSON result"]

    A --> B --> C --> D --> E --> F
```

### Simplified grammar

```
query : FIND IDENTIFIER
      | FIND IDENTIFIER WHERE conditions
      | FIND IDENTIFIER LIMIT NUMBER
      | FIND IDENTIFIER WHERE conditions LIMIT NUMBER
      | COUNT IDENTIFIER
      | COUNT IDENTIFIER WHERE conditions

conditions : condition
           | conditions AND condition    → merge dicts
           | conditions OR condition     → {$or: [left, right]}

condition : IDENTIFIER EQ value         → {field: value}
          | IDENTIFIER NEQ value        → {field: {$ne: value}}
          | IDENTIFIER GT value         → {field: {$gt: value}}
          | IDENTIFIER LIKE value       → {field: {$regex: value, $options: 'i'}}
```

---

## 13. Java desktop offline mode

```mermaid
stateDiagram-v2
    [*] --> Startup

    Startup --> CheckSession : tryResumeFromDatabase()

    CheckSession --> NoSession : SQLite empty
    CheckSession --> HasSession : Session found

    NoSession --> WaitSSO : Shows SSO button

    HasSession --> CheckNetwork : isReachable() — GET /health timeout 3s

    CheckNetwork --> Refresh : Network available
    CheckNetwork --> OfflineDirect : Network unavailable

    Refresh --> MainView : refreshAccessToken() OK
    Refresh --> ShowOfflineOption : refresh fails

    OfflineDirect --> MainView : Token still valid
    OfflineDirect --> ShowOfflineOption : Token expired

    ShowOfflineOption --> MainView : Continue offline
    ShowOfflineOption --> WaitSSO : Reconnect

    WaitSSO --> MainView : SSO exchanged + tokens saved to OS keychain (TokenVault)
    MainView --> [*]
```

---

## 14. Java desktop plugin system

### 14.1 Architecture

```mermaid
classDiagram
    class QuartierConnectPlugin {
        <<interface>>
        +getId() String
        +getName() String
        +getVersion() String
        +getDescription() String
        +onLoad()
        +onUnload()
    }
    class ViewablePlugin {
        <<interface>>
        +getViewName() String
        +createView() Node
    }
    class ContextAwarePlugin {
        <<interface>>
        +setContext(AppContext)
    }
    class PluginRegistry {
        -plugins Map
        +register(plugin, context)
        +unregister(pluginId)
        +getPlugins() List
    }
    class AppContext {
        +getApiService() ApiService
        +getAuthService() AuthService
        +getScene() Scene
        +getIncidentRepository() IncidentRepository
        +getSyncService() SyncService
        +getToastManager() ToastManager
        +getEventBus() PluginEventBus
    }
    class PluginEventBus {
        +subscribe(listener)
        +unsubscribe(listener)
        +publish(event, payload)
    }
    QuartierConnectPlugin <|.. ViewablePlugin
    QuartierConnectPlugin <|.. ContextAwarePlugin
    PluginRegistry --> QuartierConnectPlugin
    PluginRegistry --> AppContext
    AppContext --> PluginEventBus
```

### 14.2 EventBus — inter-plugin communication

The `PluginEventBus` implements a thread-safe publish/subscribe pattern (`CopyOnWriteArrayList`) with 5 event types:

| Event | Emitter | Payload |
|-----------|----------|---------|
| `INCIDENTS_CHANGED` | SyncService, IncidentsView | null |
| `SYNC_STARTED` | SyncService | null |
| `SYNC_COMPLETED` | SyncService | null |
| `SYNC_FAILED` | SyncService | Exception message |
| `ONLINE_STATUS_CHANGED` | SyncService | Boolean (online) |

### 14.3 Built-in plugins

| Plugin | Type | Role |
|--------|------|------|
| ThemePlugin | ContextAware | CSS themes (Primer Dark by default), applied on `onLoad()` |
| CompactModePlugin | ContextAware | Compact UI mode |
| NotificationPlugin | ContextAware | Event-driven notifications via EventBus (no more polling) |
| ExportPlugin | ContextAware | Incident data export via AppContext |
| OfflineModePlugin | ContextAware | Offline toggle in AppTopBar.pluginSlot |

---

## 15. Auto-reconnect and token auto-refresh

```mermaid
stateDiagram-v2
    [*] --> CheckSession : Application startup

    CheckSession --> AutoConnect : SQLite session found + valid token
    CheckSession --> WaitSSO : No session

    AutoConnect --> Refresh : Access token < 60s remaining
    AutoConnect --> MainView : Access token valid

    Refresh --> MainView : New access token obtained
    Refresh --> OfflineMode : Network unavailable

    OfflineMode --> BackgroundReconnect : Periodic timer
    BackgroundReconnect --> MainView : isReachable() + refresh OK
    BackgroundReconnect --> OfflineMode : Still offline

    WaitSSO --> MainView : SSO exchanged

    state MainView {
        [*] --> Active
        Active --> TokenRefresh : access token < 60s
        TokenRefresh --> Active : New token
    }
```

The 60-second threshold for proactive token renewal prevents API request failures caused by expiry during processing.

---

## 16. Layered security

```mermaid
graph TD
    subgraph L1["Layer 1 — Transport"]
        HTTPS[HTTPS TLS 1.3 Caddy + Let's Encrypt]
        HELMET[Helmet.js — CSP HSTS XSS]
        CORS[strict CORS whitelisted origins]
    end
    subgraph L2["Layer 2 — Rate limiting"]
        THROTTLE[global ThrottlerGuard — 100 req/15min/IP]
    end
    subgraph L3["Layer 3 — Authentication"]
        JWT[JWT HS256 — access 15min unique jti — revocable via revoked_tokens PG]
        ARGON2[Argon2id — passwords + refresh token hashes]
        TOTP[TOTP RFC 6238 — anti-replay 90s in-memory]
        COOKIE[Refresh token httpOnly cookie qc_rt — SameSite=strict]
    end
    subgraph L4["Layer 4 — Authorization"]
        JWTG[JwtAuthGuard passport-jwt]
        ROLESG[RolesGuard @Roles decorator]
    end
    subgraph L5["Layer 5 — Validation"]
        PIPE[ValidationPipe whitelist:true class-validator]
    end
    subgraph L6["Layer 6 — Integrity"]
        SHA[SHA-256 contract content hash]
        SSO2[SSO Token UUID v4 TTL 5min single use]
    end

    L1 --> L2 --> L3 --> L4 --> L5 --> L6
```

---

## 17. Request lifecycle

```mermaid
sequenceDiagram
    participant Client
    participant Caddy
    participant NestJS
    participant Guard as JwtAuthGuard
    participant Pipe as ValidationPipe
    participant Controller
    participant Service
    participant DB

    Client->>Caddy: HTTPS Request
    Caddy->>NestJS: Proxy (strip /api prefix)
    NestJS->>NestJS: Helmet headers
    NestJS->>NestJS: ThrottlerGuard — rate limit
    NestJS->>Guard: verify JWT Bearer
    Guard->>Guard: check JTI not in revoked_tokens
    Guard->>NestJS: req.user = {sub, email, role, jti, exp}
    NestJS->>Pipe: validate DTO class-validator
    Pipe->>Controller: handler(dto, req)
    Controller->>Service: business logic
    Service->>DB: query
    DB-->>Service: result
    Service-->>Controller: data
    Controller-->>Client: 200/201/4xx JSON
```

---

## 18. Shared mapping — `<Map>` component

`packages/ui/src/components/map.tsx` exposes a declarative React wrapper around
`react-leaflet@5` used across 6 surfaces (4 client + 2 admin) plus the
`admin/neighborhoods` refactor. Exports: `Map`, `Marker` (4 variants
mapped onto the Civic Editorial palette), `NeighborhoodPolygon`,
`MarkerCluster`, `DrawControl` (leaflet-draw), `UserLocation`, `useFitBounds`.

| Surface | Usage |
|---|---|
| `client/dashboard` | Neighborhood mini-map (h-48) with user geolocation |
| `client/services` | Clustered service pins (MarkerCluster) + popup |
| `client/events` | "Map" tab: event pins + date |
| `client/incidents` | Click-to-place in the dialog + incident map |
| `admin/services` | List/map tab + picker in the dialog |
| `admin/incidents` | List/map tab with pins colored by status |
| `admin/neighborhoods` | Polygon drawing via `<DrawControl>` (leaflet-draw) |

**Geo helpers**: `packages/shared/src/lib/geo.ts` exposes `centroidOf`,
`pointToLatLng`, `latLngToPoint` (3 Vitest tests).

**Backend schema**: reusable GeoJSON Point subdocument
`api/src/common/schemas/geo-point.schema.ts`. Services and Events use
this Mongoose subschema with a `2dsphere` (sparse) index; Postgres
Incidents simply store `lat REAL` + `lng REAL` (migration
`0002_incident_coords.sql`).
