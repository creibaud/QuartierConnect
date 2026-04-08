# Architecture Technique — QuartierConnect

> **Version** 0.1.3 · **Date** 7 avril 2026 · **Étape** 4 (95 %)

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Conteneurs Docker](#2-conteneurs-docker)
3. [Diagramme des modules NestJS](#3-diagramme-des-modules-nestjs)
4. [Flux d'authentification complets](#4-flux-dauthentification-complets)
5. [SSO cross-surface](#5-sso-cross-surface)
6. [Refresh token et rotation](#6-refresh-token-et-rotation)
7. [Architecture des bases de données](#7-architecture-des-bases-de-données)
8. [Sync bidirectionnelle Java ↔ API](#8-sync-bidirectionnelle-java--api)
9. [Sync Neo4j temps réel](#9-sync-neo4j-temps-réel)
10. [WebSocket — Messagerie temps réel](#10-websocket--messagerie-temps-réel)
11. [Système de votes](#11-système-de-votes)
12. [DSL — Pipeline de compilation](#12-dsl--pipeline-de-compilation)
13. [Offline mode Java desktop](#13-offline-mode-java-desktop)
14. [Sécurité en couches](#14-sécurité-en-couches)
15. [Cycle de vie d'une requête](#15-cycle-de-vie-dune-requête)

---

## 1. Vue d'ensemble

QuartierConnect est une plateforme **multi-composants** composée de 4 applications actives et 3 bases de données, toutes orchestrées via Docker Compose.

```mermaid
graph TB
    subgraph Internet
        U1[Habitant<br/>navigateur]
        U2[Admin<br/>navigateur]
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
            PYTHON[Python DSL<br/>PLY - port interne]
        end

        subgraph Storage
            MONGO[(MongoDB<br/>:27017<br/>Documents)]
            PG[(PostgreSQL<br/>:5432<br/>Relationnel)]
            NEO4J[(Neo4j<br/>:7474/:7687<br/>Graphe)]
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

## 2. Conteneurs Docker

| # | Conteneur | Image | Port(s) | Rôle |
|---|-----------|-------|---------|------|
| 1 | `caddy` | `caddy:2-alpine` | 80, 443 | Reverse proxy HTTPS + Let's Encrypt automatique |
| 2 | `client` | Node 20 + Vite | 3000 | SPA React — interface habitant |
| 3 | `admin` | Node 20 + Vite | 3001 | SPA React — back-office admin |
| 4 | `api` | Node 20 | 5000 | NestJS REST + WebSocket + DSL bridge |
| 5 | `mongodb` | `mongo:7` | 27017 | Documents flexibles, GeoJSON, GridFS |
| 6 | `postgres` | `postgres:16` | 5432 | Données ACID — users, incidents, points |
| 7 | `neo4j` | `neo4j:5` | 7474, 7687 | Graphe social — recommandations Cypher |

### Routage Caddy

```
/ → client:3000
/admin → admin:3001
/api → api:5000
/api/docs → api:5000/docs (Scalar)
```

---

## 3. Diagramme des modules NestJS

```mermaid
graph TB
    APP[AppModule<br/>ThrottlerGuard global<br/>I18n · ConfigModule]

    APP --> AUTH[AuthModule<br/>register · login · SSO<br/>refresh · logout]
    APP --> DB[DrizzleModule<br/>PostgreSQL ORM]
    APP --> NEO[SocialModule<br/>Neo4j driver<br/>recommandations + sync]

    APP --> NBH[NeighborhoodsModule<br/>CRUD quartiers GeoJSON]
    APP --> SVC[ServicesModule<br/>CRUD services voisins]
    APP --> EVT[EventsModule<br/>CRUD événements]
    APP --> INC[IncidentsModule<br/>machine d'états<br/>sync Java]
    APP --> PTS[PointsModule<br/>transactions ACID]
    APP --> USR[UsersModule<br/>gestion comptes + RGPD]
    APP --> CTR[ContractsModule<br/>signature TOTP + SHA-256]
    APP --> MSG[MessagingModule<br/>REST + WebSocket Gateway]
    APP --> VOT[VotesModule<br/>Strategy Pattern]
    APP --> CVT[CommunityVotesModule<br/>scrutins communautaires]
    APP --> DOC[DocumentsModule<br/>GridFS upload/download]
    APP --> DSL[DslModule<br/>bridge Python PLY]

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

## 4. Flux d'authentification complets

### 4.1 Inscription

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
    C->>C: QRCode.toDataURL(otpauthUrl) — affiche QR
    C->>C: Utilisateur scanne avec Google Authenticator
```

### 4.2 Connexion (3 validations séquentielles)

```mermaid
sequenceDiagram
    participant C as Client React
    participant API as NestJS API
    participant PG as PostgreSQL
    participant TS as TotpService

    C->>API: POST /auth/login {email, password, totpCode}
    API->>PG: SELECT * FROM users WHERE email = ?
    PG-->>API: user row

    alt Compte banni
        API-->>C: 401 ACCOUNT_BANNED
    end

    API->>API: argon2.verify(passwordHash, password)
    alt Mot de passe invalide
        API-->>C: 401 INVALID_PASSWORD
    end

    API->>TS: totp.verify(totpSecret, totpCode)
    Note over TS: window=1 (±30s tolerance)<br/>anti-replay TanStack Store 90s
    alt TOTP invalide ou rejoué
        API-->>C: 401 INVALID_TOTP
    end

    API->>API: JWT.sign({sub, email, role, jti}, 15m) — access
    API->>API: JWT.sign({sub, email, role, jti}, 7d) — refresh
    API->>API: argon2.hash(refreshToken)
    API->>PG: UPDATE users SET refresh_token_hash = ?
    API-->>C: {accessToken, refreshToken, user:{id,email,role}}
```

---

## 5. SSO cross-surface

Le SSO permet à un utilisateur connecté sur le **web** d'authentifier automatiquement l'**application Java desktop** sans ressaisir ses identifiants.

```mermaid
sequenceDiagram
    participant Web as React Client
    participant API as NestJS API
    participant Mongo as MongoDB ssoTokens
    participant Java as JavaFX App
    participant Browser as Navigateur système

    Web->>Web: Utilisateur clique "Connecter le desktop"
    Web->>Web: state = crypto.randomUUID() — PKCE
    Web->>API: POST /auth/sso/generate {surface:"desktop", state}
    API->>Mongo: INSERT {token:UUID, userId, surface, state, expiresAt:now+300s, usedAt:null}
    Note over Mongo: Index TTL MongoDB — auto-expiration 5min
    API-->>Web: {ssoToken, expiresAt, expiresIn:300}
    Web->>Web: Affiche dialog countdown 5min

    Web->>Browser: open("quartierconnect://sso?token=xxx&state=yyy")
    Browser->>Java: SsoCallbackServer.java — serveur HTTP local
    Java->>Java: Valide state == state local (PKCE)
    Java->>API: POST /auth/sso/exchange {ssoToken, state}
    API->>Mongo: findOneAndUpdate({token, usedAt:null, expiresAt:{gt:now}}, {usedAt:now})
    Note over API,Mongo: Atomique — replay impossible
    API->>API: generateTokenPair(user)
    API-->>Java: {accessToken, refreshToken, user}
    Java->>Java: applyTokens() → SQLiteDatabase.saveSession()
```

---

## 6. Refresh token et rotation

```mermaid
sequenceDiagram
    participant C as Client
    participant API as NestJS API
    participant PG as PostgreSQL

    Note over C: Access token expiré (15 min)
    C->>API: POST /auth/refresh {refreshToken}
    API->>API: JWT.verify(refreshToken) → payload

    API->>PG: SELECT refreshTokenHash WHERE id = payload.sub
    alt Hash null — déjà révoqué
        API-->>C: 401 TOKEN_REVOKED
    end
    alt Compte banni
        API-->>C: 401 ACCOUNT_BANNED
    end
    API->>API: argon2.verify(refreshTokenHash, refreshToken)
    alt Hash ne correspond pas
        API-->>C: 401 TOKEN_REVOKED
    end

    Note over API,PG: Rotation stricte — invalider l'ancien
    API->>PG: UPDATE users SET refresh_token_hash = NULL

    API->>API: generatePair(sub, email, role)
    API->>API: argon2.hash(newRefreshToken)
    API->>PG: UPDATE users SET refresh_token_hash = hash(new)
    API-->>C: {accessToken (15m), refreshToken (7j)}
```

---

## 7. Architecture des bases de données

### 7.1 Répartition des données

```mermaid
graph LR
    subgraph PG["PostgreSQL — ACID strict"]
        U[users<br/>auth · rôles · tokens]
        I[incidents<br/>machine d'états]
        PB[points_balances<br/>solde courant]
        PT[points_transactions<br/>historique]
    end

    subgraph MDB["MongoDB — Documents flexibles"]
        N[neighborhoods<br/>GeoJSON 2dsphere]
        S[services<br/>annonces voisins]
        E[events<br/>événements]
        C[contracts<br/>hash SHA-256]
        M[messages / conversations]
        V[votes Strategy Pattern]
        CV[communityVotes<br/>scrutins multi-types]
        D[documents GridFS]
        SSO[ssoTokens TTL 5min]
    end

    subgraph N4J["Neo4j — Graphe social"]
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

### 7.2 Justification du tri-base

| Critère | PostgreSQL | MongoDB | Neo4j |
|---------|-----------|---------|-------|
| Transactions ACID | Obligatoire (points, auth) | Non critique | Non applicable |
| Schéma flexible | Non | Oui (GeoJSON, subdocs) | Propriétés libres |
| Géolocalisation | Non | Index `2dsphere` natif | Non |
| Recommandations | Non | Non | Cypher traversals |

---

## 8. Sync bidirectionnelle Java ↔ API

```mermaid
sequenceDiagram
    participant Java as JavaFX Desktop
    participant SQLite as SQLite local
    participant API as NestJS API
    participant PG as PostgreSQL

    Note over Java: Mode hors-ligne — créer un incident
    Java->>SQLite: INSERT incidents (is_dirty=1, updated_at=now)
    Java->>Java: Affiche l'incident en liste locale

    Note over Java,API: Connexion réseau — SyncService toutes les 30s
    Java->>API: GET /health
    API-->>Java: {status:"ok"}

    Java->>SQLite: SELECT * FROM incidents WHERE is_dirty = 1
    SQLite-->>Java: [incidents modifiés]

    loop Pour chaque incident dirty
        Java->>API: POST /sync/incidents [{remoteId?, title, status, updatedAt}]
        Note over API: LWW — last-write-wins sur updated_at
        API->>PG: UPSERT incidents ON CONFLICT DO UPDATE IF newer
        API-->>Java: [{id, synced:true}]
        Java->>SQLite: UPDATE SET is_dirty=0, remote_id=?
    end
    Java->>SQLite: INSERT sync_log (synced_at, success=1)
```

---

## 9. Sync Neo4j temps réel

À chaque opération CRUD sur les entités sociales, un appel **fire-and-forget** synchronise Neo4j. Une panne Neo4j ne bloque jamais l'API principale.

```mermaid
flowchart TD
    A["CRUD Endpoint<br/>neighborhoods / services / events / auth/register"] --> B["Opération principale<br/>MongoDB ou PostgreSQL"]
    B --> C{Succès?}
    C -->|Non| D[Erreur HTTP renvoyée au client]
    C -->|Oui| E[Réponse HTTP envoyée au client]
    E --> F["void socialService.syncX()<br/>fire-and-forget — pas d'await"]
    F --> G{Neo4j disponible?}
    G -->|Oui| H["Session Neo4j<br/>MERGE (n:Label {id}) ON CREATE/MATCH SET"]
    G -->|Non| I["Logger.warn<br/>ignoré silencieusement"]
```

---

## 10. WebSocket — Messagerie temps réel

```mermaid
sequenceDiagram
    participant A as Alice (Socket.io)
    participant GW as MessagingGateway
    participant SVC as MessagingService
    participant Mongo as MongoDB

    A->>GW: connect() + auth.token = JWT
    GW->>GW: JWT.verify(token) → userId
    GW->>GW: userSockets.set(userId, socketId)

    A->>GW: emit("join_conversation", conversationId)
    GW->>SVC: isParticipant(conversationId, userId)
    Mongo-->>SVC: {participants:[...]}
    GW->>GW: socket.join("conversation:convId")

    A->>GW: emit("send_message", {conversationId, content})
    GW->>SVC: sendMessage(convId, userId, content, TEXT)
    SVC->>Mongo: INSERT message
    GW->>GW: server.to("conversation:convId").emit("new_message", message)
    Note over GW: Diffusé à tous les participants connectés
```

---

## 11. Système de votes

### Strategy Pattern — deux modes

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

### Logique toggle

```mermaid
flowchart TD
    A["POST /votes {targetId, targetType, voteType}"] --> B[Chercher vote existant]
    B --> C{Vote existant?}
    C -->|Non| D["CREATE vote — action:'added'"]
    C -->|Oui, même type| E["DELETE vote — action:'removed' toggle off"]
    C -->|Oui, type différent| F["UPDATE vote — action:'changed'"]
```

---

## 12. DSL — Pipeline de compilation

```mermaid
flowchart LR
    A["Texte DSL<br/>FIND incidents WHERE status='open' LIMIT 10"]
    B["Lexer PLY<br/>tokens: FIND IDENTIFIER WHERE IDENTIFIER EQ STRING LIMIT NUMBER"]
    C["Parser PLY LALR<br/>AST dict Python"]
    D["Compiler<br/>validation whitelist collection"]
    E["MongoDB query<br/>{type:'find', collection:'incidents', filter:{status:'open'}, limit:10}"]
    F["Motor async<br/>exécution + résultat JSON"]

    A --> B --> C --> D --> E --> F
```

### Grammaire simplifiée

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

## 13. Offline mode Java desktop

```mermaid
stateDiagram-v2
    [*] --> Startup

    Startup --> CheckSession : tryResumeFromDatabase()

    CheckSession --> NoSession : SQLite vide
    CheckSession --> HasSession : Session trouvée

    NoSession --> WaitSSO : Affiche bouton SSO

    HasSession --> CheckNetwork : isReachable() — GET /health timeout 3s

    CheckNetwork --> Refresh : Réseau disponible
    CheckNetwork --> OfflineDirect : Réseau indisponible

    Refresh --> MainView : refreshAccessToken() OK
    Refresh --> ShowOfflineOption : refresh échoue

    OfflineDirect --> MainView : Token encore valide
    OfflineDirect --> ShowOfflineOption : Token expiré

    ShowOfflineOption --> MainView : Continuer hors ligne
    ShowOfflineOption --> WaitSSO : Se reconnecter

    WaitSSO --> MainView : SSO échangé + tokens sauvés SQLite
    MainView --> [*]
```

---

## 14. Sécurité en couches

```mermaid
graph TD
    subgraph L1["Couche 1 — Transport"]
        HTTPS[HTTPS TLS 1.3 Caddy + Let's Encrypt]
        HELMET[Helmet.js — CSP HSTS XSS]
        CORS[CORS strict origines whitelistées]
    end
    subgraph L2["Couche 2 — Rate limiting"]
        THROTTLE[ThrottlerGuard global — 100 req/15min/IP]
    end
    subgraph L3["Couche 3 — Authentification"]
        JWT[JWT HS256 — access 15min jti unique]
        ARGON2[Argon2id — passwords + refresh token hashes]
        TOTP[TOTP RFC 6238 — anti-replay 90s in-memory]
    end
    subgraph L4["Couche 4 — Autorisation"]
        JWTG[JwtAuthGuard passport-jwt]
        ROLESG[RolesGuard @Roles decorator]
    end
    subgraph L5["Couche 5 — Validation"]
        PIPE[ValidationPipe whitelist:true class-validator]
    end
    subgraph L6["Couche 6 — Intégrité"]
        SHA[SHA-256 hash contenu contrats]
        SSO2[SSO Token UUID v4 TTL 5min usage unique]
    end

    L1 --> L2 --> L3 --> L4 --> L5 --> L6
```

---

## 15. Cycle de vie d'une requête

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
    Guard->>NestJS: req.user = {sub, email, role}
    NestJS->>Pipe: validate DTO class-validator
    Pipe->>Controller: handler(dto, req)
    Controller->>Service: business logic
    Service->>DB: query
    DB-->>Service: result
    Service-->>Controller: data
    Controller-->>Client: 200/201/4xx JSON
```
