# Architecture Technique — QuartierConnect

> **Version** 0.2.0 · **Date** 16 avril 2026 · **Étape** 4 (95 %)

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
14. [Système de plugins Java desktop](#14-système-de-plugins-java-desktop)
15. [Auto-reconnexion et token auto-refresh](#15-auto-reconnexion-et-token-auto-refresh)
16. [Sécurité en couches](#16-sécurité-en-couches)
17. [Cycle de vie d'une requête](#17-cycle-de-vie-dune-requête)

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

| #   | Conteneur  | Image            | Port(s)    | Rôle                                            |
| --- | ---------- | ---------------- | ---------- | ----------------------------------------------- |
| 1   | `caddy`    | `caddy:2-alpine` | 80, 443    | Reverse proxy HTTPS + Let's Encrypt automatique |
| 2   | `client`   | Node 20 + Vite   | 3000       | SPA React — interface habitant                  |
| 3   | `admin`    | Node 20 + Vite   | 3001       | SPA React — back-office admin                   |
| 4   | `api`      | Node 20          | 5000       | NestJS REST + WebSocket + DSL bridge            |
| 5   | `mongodb`  | `mongo:7`        | 27017      | Documents flexibles, GeoJSON, GridFS            |
| 6   | `postgres` | `postgres:16`    | 5432       | Données ACID — users, incidents, points         |
| 7   | `neo4j`    | `neo4j:5`        | 7474, 7687 | Graphe social — recommandations Cypher          |

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
    API-->>C: Set-Cookie qc_rt (httpOnly SameSite=strict) + {accessToken, user:{id,email,role}}
```

---

## 5. SSO cross-surface

Le SSO permet à un administrateur de s'authentifier dans l'**application Java desktop** via l'**interface admin web**, sans ressaisir ses identifiants.

```mermaid
sequenceDiagram
    participant Java as JavaFX App
    participant Browser as Navigateur système
    participant Admin as React Admin (:3001)
    participant API as NestJS API
    participant Mongo as MongoDB ssoTokens

    Java->>Java: state = UUID.randomUUID() — PKCE
    Java->>Java: SsoCallbackServer.java — écoute sur port OS aléatoire
    Java->>Browser: open("http://localhost:3001/sso/authorize?state=...&redirect=http://localhost:{port}/cb")
    Browser->>Admin: GET /sso/authorize — page de connexion admin
    Admin->>Admin: Login (email + mot de passe + TOTP requis, role admin)
    Admin->>API: POST /auth/sso/generate {surface:"java-desktop", state}
    API->>Mongo: INSERT {token:UUID, userId, surface, state, expiresAt:now+300s, usedAt:null}
    Note over Mongo: Index TTL MongoDB — auto-expiration 5min
    API-->>Admin: {ssoToken, expiresAt, expiresIn:300}
    Admin->>Browser: redirect → http://localhost:{port}/cb?token=xxx&state=yyy
    Browser->>Java: SsoCallbackServer.java reçoit le callback HTTP
    Java->>Java: Valide state == state local (PKCE)
    Java->>API: POST /auth/sso/exchange {ssoToken, state}
    API->>Mongo: findOneAndUpdate({token, usedAt:null, expiresAt:{gt:now}}, {usedAt:now})
    Note over API,Mongo: Atomique — replay impossible
    API->>API: generateTokenPair(user)
    API-->>Java: Set-Cookie qc_rt (httpOnly) + {accessToken, user} (Java lit refreshToken depuis body via dto.refreshToken)
    Java->>Java: applyTokens() → TokenVault.saveTokens() + SQLiteDatabase.saveSession(email)
```

---

## 6. Refresh token et rotation

```mermaid
sequenceDiagram
    participant C as Client
    participant API as NestJS API
    participant PG as PostgreSQL

    Note over C: Access token expiré (15 min)
    C->>API: POST /auth/refresh (cookie qc_rt automatique — ou body pour desktop Java)
    API->>API: JWT.verify(refreshToken) → payload

    Note over API,PG: Verrou transactionnel — anti-TOCTOU
    API->>PG: BEGIN — SELECT refreshTokenHash WHERE id=sub FOR UPDATE
    alt Hash null — déjà révoqué
        API-->>C: 401 TOKEN_REVOKED (ROLLBACK)
    end
    alt Compte banni
        API-->>C: 401 ACCOUNT_BANNED (ROLLBACK)
    end
    API->>API: argon2.verify(refreshTokenHash, refreshToken)
    alt Hash ne correspond pas
        API-->>C: 401 TOKEN_REVOKED (ROLLBACK)
    end

    Note over API,PG: Rotation stricte — invalider l'ancien
    API->>PG: UPDATE users SET refresh_token_hash = NULL
    API->>API: generatePair(sub, email, role)
    API->>API: argon2.hash(newRefreshToken)
    API->>PG: UPDATE users SET refresh_token_hash = hash(new) — COMMIT
    API-->>C: Set-Cookie qc_rt (nouveau) + {accessToken (15m)}
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

| Critère           | PostgreSQL                 | MongoDB                | Neo4j             |
| ----------------- | -------------------------- | ---------------------- | ----------------- |
| Transactions ACID | Obligatoire (points, auth) | Non critique           | Non applicable    |
| Schéma flexible   | Non                        | Oui (GeoJSON, subdocs) | Propriétés libres |
| Géolocalisation   | Non                        | Index `2dsphere` natif | Non               |
| Recommandations   | Non                        | Non                    | Cypher traversals |

---

## 8. Sync bidirectionnelle Java ↔ API

### 8.1 Flux de synchronisation

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

    Java->>SQLite: SELECT * FROM incidents WHERE is_dirty = 1 AND is_conflict = 0
    SQLite-->>Java: [incidents modifiés, conflits exclus]

    loop Pour chaque incident dirty
        Java->>API: POST /sync/incidents [{remoteId?, title, status, updatedAt}]
        API->>PG: UPSERT incidents ON CONFLICT DO UPDATE
        API-->>Java: [{id, synced:true}]
        Java->>SQLite: UPDATE SET is_dirty=0, remote_id=?
        Java->>SQLite: UPDATE SET base_title/desc/status/updated_at (ancêtre 3WM)
    end

    Note over Java: Push retourne justPushed (set d'IDs)
    Note over Java,SQLite: Pull — résolution Three-Way Merge (skip justPushed IDs)
    Java->>API: GET /incidents?since=lastPull
    API-->>Java: [incidents mis à jour]
    loop Pour chaque incident reçu (sauf justPushed)
        alt base == null (jamais synchronisé)
            Java->>SQLite: LWW fallback — serveur gagne si plus récent
        else local inchangé depuis base
            Java->>SQLite: Auto-merge — applique la version serveur
        else serveur inchangé depuis base
            Java->>SQLite: Auto-merge — conserve la version locale
        else les deux ont changé le même champ
            Java->>SQLite: SET is_conflict=1, remote_title/desc/status
            Note over Java: Conflit visible dans l'UI (⚠ badge + dialog Résoudre)
        end
    end

    Note over Java,SQLite: Orphan cleanup — tombstone des incidents serveur-supprimés
    Java->>SQLite: tombstoneOrphans(remoteIds) — SET deleted_at pour absents du serveur
    Java->>SQLite: INSERT sync_log (synced_at, success=1)
```

### 8.2 Three-Way Merge — résolution de conflits

Le Three-Way Merger compare trois versions de chaque champ (titre, description, statut) :

| Cas                    | Base | Local | Remote | Résultat                                      |
| ---------------------- | ---- | ----- | ------ | --------------------------------------------- |
| Pas de base (1er sync) | null | L     | R      | LWW — remote gagne si plus récent             |
| Local inchangé         | B    | B     | R      | Auto-merge — applique remote                  |
| Remote inchangé        | B    | L     | B      | Auto-merge — conserve local                   |
| Même changement        | B    | X     | X      | Auto-merge — les deux convergent              |
| Conflit vrai           | B    | L     | R      | `is_conflict=1` — résolution manuelle requise |

### 8.3 Gestion des conflits dans l'UI

- **Banner** : alerte visible en haut de la vue incidents quand des conflits existent
- **Filtre** : bouton "Conflits" pour afficher uniquement les incidents en conflit
- **Modal merge** : double-clic ouvre un GridPane 4 colonnes (champ / base / local / remote) avec diff highlighting
- **Résolution** : l'utilisateur choisit chaque champ, la résolution met à jour l'ancêtre et efface le flag conflit

### 8.4 Tombstone delete

Les suppressions côté serveur sont propagées localement via une colonne `deleted_at` (soft delete). `tombstoneOrphans()` marque les incidents absents de la réponse serveur lors d'un pull complet. Les incidents marqués sont exclus des vues mais conservés pour audit.

---

## 9. Sync Neo4j temps réel

À chaque opération CRUD sur les entités sociales, un appel **fire-and-forget** synchronise Neo4j. Une panne Neo4j ne bloque jamais l'API principale. En cas d'erreur récupérable (`ServiceUnavailable`, `SessionExpired`, `TransientError`), `withRetry` retente jusqu'à 3 fois avec un backoff exponentiel (100 ms → 200 ms → 400 ms). Les erreurs non récupérables (ex. syntaxe Cypher) échouent immédiatement sans retry.

```mermaid
flowchart TD
    A["CRUD Endpoint<br/>neighborhoods / services / events / auth/register"] --> B["Opération principale<br/>MongoDB ou PostgreSQL"]
    B --> C{Succès?}
    C -->|Non| D[Erreur HTTP renvoyée au client]
    C -->|Oui| E[Réponse HTTP envoyée au client]
    E --> F["void socialService.syncX()<br/>fire-and-forget — pas d'await"]
    F --> R["withRetry — 3 tentatives<br/>backoff 100/200/400 ms"]
    R --> G{Neo4j disponible?}
    G -->|Oui| H["Session Neo4j<br/>MERGE (n:Label {id}) ON CREATE/MATCH SET"]
    G -->|Non, tentative < 3| R
    G -->|Non, tentative = 3| I["Logger.warn<br/>ignoré silencieusement"]
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
    GW->>SVC: findConversations(userId)
    Mongo-->>SVC: [{_id, participants, ...}]
    GW->>GW: socket.join("conversation:convId") × N
    Note over GW: Rooms reconstruites depuis MongoDB à chaque connexion (résistant aux redémarrages)

    A->>GW: emit("join_conversation", conversationId)
    Note over A,GW: Pour les nouvelles conversations créées pendant la session
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

    WaitSSO --> MainView : SSO échangé + tokens sauvés trousseau OS (TokenVault)
    MainView --> [*]
```

---

## 14. Système de plugins Java desktop

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

### 14.2 EventBus — communication inter-plugins

Le `PluginEventBus` implémente un pattern publish/subscribe thread-safe (`CopyOnWriteArrayList`) avec 5 types d'événements :

| Événement               | Émetteur                   | Payload           |
| ----------------------- | -------------------------- | ----------------- |
| `INCIDENTS_CHANGED`     | SyncService, IncidentsView | null              |
| `SYNC_STARTED`          | SyncService                | null              |
| `SYNC_COMPLETED`        | SyncService                | null              |
| `SYNC_FAILED`           | SyncService                | Exception message |
| `ONLINE_STATUS_CHANGED` | SyncService                | Boolean (online)  |

### 14.3 Plugins intégrés

| Plugin             | Type         | Rôle                                                        |
| ------------------ | ------------ | ----------------------------------------------------------- |
| ThemePlugin        | ContextAware | Thèmes CSS (Primer Dark par défaut), appliqué au `onLoad()` |
| CompactModePlugin  | ContextAware | Mode compact UI                                             |
| NotificationPlugin | ContextAware | Notifications event-driven via EventBus (plus de polling)   |
| ExportPlugin       | ContextAware | Export de données incidents via AppContext                  |
| OfflineModePlugin  | ContextAware | Toggle hors-ligne dans AppTopBar.pluginSlot                 |

---

## 15. Auto-reconnexion et token auto-refresh

```mermaid
stateDiagram-v2
    [*] --> CheckSession : Démarrage application

    CheckSession --> AutoConnect : Session SQLite trouvée + token valide
    CheckSession --> WaitSSO : Pas de session

    AutoConnect --> Refresh : Token access < 60s restantes
    AutoConnect --> MainView : Token access valide

    Refresh --> MainView : Nouveau access token obtenu
    Refresh --> OfflineMode : Réseau indisponible

    OfflineMode --> BackgroundReconnect : Timer périodique
    BackgroundReconnect --> MainView : isReachable() + refresh OK
    BackgroundReconnect --> OfflineMode : Toujours offline

    WaitSSO --> MainView : SSO échangé

    state MainView {
        [*] --> Active
        Active --> TokenRefresh : access token < 60s
        TokenRefresh --> Active : Nouveau token
    }
```

Le seuil de 60 secondes pour le renouvellement proactif du token évite les échecs de requêtes API causés par l'expiration pendant le traitement.

---

## 16. Sécurité en couches

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
        JWT[JWT HS256 — access 15min jti unique — révocable via revoked_tokens PG]
        ARGON2[Argon2id — passwords + refresh token hashes]
        TOTP[TOTP RFC 6238 — anti-replay 90s in-memory]
        COOKIE[Refresh token httpOnly cookie qc_rt — SameSite=strict]
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

## 17. Cycle de vie d'une requête

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

## 18. Cartographie partagée — composant `<Map>`

`packages/ui/src/components/map.tsx` expose un wrapper React déclaratif autour
de `react-leaflet@5` utilisé sur 6 surfaces (4 client + 2 admin) plus le
refactor de `admin/neighborhoods`. Exports : `Map`, `Marker` (4 variants
mappés sur la palette Civic Editorial), `NeighborhoodPolygon`,
`MarkerCluster`, `DrawControl` (leaflet-draw), `UserLocation`, `useFitBounds`.

| Surface               | Usage                                                          |
| --------------------- | -------------------------------------------------------------- |
| `client/dashboard`    | Mini-carte du quartier (h-48) avec géolocalisation utilisateur |
| `client/services`     | Pins services groupés (MarkerCluster) + popup                  |
| `client/events`       | Onglet « Carte » : pins événements + date                      |
| `client/incidents`    | Click-to-place dans le dialog + carte des incidents            |
| `admin/services`      | Onglet liste/carte + picker dans le dialog                     |
| `admin/incidents`     | Onglet liste/carte avec pins colorés par statut                |
| `admin/neighborhoods` | Dessin polygone via `<DrawControl>` (leaflet-draw)             |

**Helpers géo** : `packages/shared/src/lib/geo.ts` expose `centroidOf`,
`pointToLatLng`, `latLngToPoint` (3 tests Vitest).

**Schéma backend** : sous-document GeoJSON Point réutilisable
`api/src/common/schemas/geo-point.schema.ts`. Services et Events utilisent
ce sous-schéma Mongoose avec index `2dsphere` (sparse) ; les Incidents
Postgres stockent simplement `lat REAL` + `lng REAL` (migration
`0002_incident_coords.sql`).

---

## 18. Architecture de déploiement production

> Section ajoutée pour la livraison DevOps. Décrit l'infrastructure réelle en production sur le VPS, distincte de l'environnement de développement local.

### 18.1 Vue réseau production

```mermaid
graph TB
    subgraph Internet
        U1[Habitant<br/>navigateur HTTPS]
        U2[Admin<br/>navigateur HTTPS]
        U3[Admin/Moderator<br/>JavaFX Desktop]
        LE[Let's Encrypt<br/>ACME]
        UR[UptimeRobot<br/>monitoring]
    end

    subgraph VPS["VPS Ubuntu — UFW (22/80/443 only) + fail2ban"]
        CADDY["Caddy 2<br/>:80 / :443 / :443/udp<br/>HTTPS auto + HSTS + CSP"]

        subgraph DockerNet["Réseau Docker interne — quartierconnect_prod"]
            CLIENT["client<br/>:3000<br/>Caddy static"]
            ADMIN["admin<br/>:3001<br/>Caddy static"]
            API["api<br/>:5000<br/>NestJS + Python PLY"]

            MONGO[("mongo<br/>:27017<br/>127.0.0.1 only")]
            PG[("postgres<br/>:5432<br/>127.0.0.1 only")]
            NEO[("neo4j<br/>:7474/:7687<br/>127.0.0.1 only")]
        end
    end

    subgraph Cloud["Stockage distant"]
        S3[("S3 / Backblaze<br/>backups chiffrés")]
    end

    U1 -->|HTTPS| CADDY
    U2 -->|HTTPS| CADDY
    U3 -->|HTTPS REST| CADDY
    LE -.->|challenge :80| CADDY
    UR -.->|GET /api/health| CADDY

    CADDY -->|"/"| CLIENT
    CADDY -->|"/admin"| ADMIN
    CADDY -->|"/api → strip prefix"| API
    CADDY -->|"/docs Scalar"| API
    CADDY -->|"/api WSS → Socket.io"| API

    API --> MONGO
    API --> PG
    API --> NEO

    MONGO -.->|cron 2h| S3
    PG -.->|cron 2h| S3
    NEO -.->|cron 2h| S3

    style CADDY fill:#1D4ED8,color:#fff
    style API fill:#E0234E,color:#fff
    style S3 fill:#16a34a,color:#fff
```

**Points clés de sécurité réseau** :

- Seuls les ports **22, 80, 443** sont exposés à Internet (UFW)
- Les 3 bases sont bindées sur `127.0.0.1` → accessibles uniquement via le réseau Docker interne, jamais depuis l'extérieur
- Caddy est le **seul** point d'entrée HTTP/HTTPS — il termine le TLS et proxifie en interne
- Le WebSocket (Socket.io messagerie) passe par le même `/api` avec upgrade `wss://`

### 18.2 Flux CI/CD

```mermaid
graph LR
    DEV[Développeur] -->|push PR| GH[GitHub]
    GH -->|déclenche| CI[CI workflow]

    CI --> J1[api: lint+build+test]
    CI --> J2[web: lint+typecheck+build]
    CI --> J3[desktop: mvn test+package]
    CI --> J4[dsl: ruff+pytest]
    CI --> J5[make validate-fast]

    J1 & J2 & J3 & J4 & J5 --> OK{tous verts ?}
    OK -->|non| BLOCK[Merge bloqué]
    OK -->|oui| MERGE[Merge vers master]

    MERGE -->|tag v*.*.*| DEPLOY[deploy workflow]
    MERGE -->|tag v*.*.*| REL[release-desktop:<br/>JAR sur Releases]

    DEPLOY -->|environment: production<br/>approbation Claudio| SSH[SSH VPS]
    SSH --> BUILD[docker compose up --build]
    BUILD --> SMOKE{smoke-test ?}
    SMOKE -->|OK| DISCORD1[Discord ✅]
    SMOKE -->|KO| RB[rollback auto]
    RB --> DISCORD2[Discord 🔴]

    style CI fill:#1D4ED8,color:#fff
    style DEPLOY fill:#E0234E,color:#fff
    style SMOKE fill:#f59e0b,color:#fff
```

### 18.3 Conteneurs production vs développement

| Aspect           | Dev (`docker-compose.yml`) | Prod (`+ docker-compose.prod.yml`)         |
| ---------------- | -------------------------- | ------------------------------------------ |
| Caddy            | HTTP `:80`, Caddyfile dev  | HTTPS `:443` Let's Encrypt, Caddyfile.prod |
| `restart`        | non                        | `unless-stopped` partout                   |
| Healthchecks     | partiels                   | api + mongo + postgres + neo4j + caddy     |
| `depends_on`     | basique                    | `condition: service_healthy`               |
| Resource limits  | aucune                     | mémoire + CPU cappés                       |
| Neo4j heap       | défaut (~4G)               | cappée à 1G                                |
| Rate limit login | 100 (dev)                  | 5 (prod)                                   |
| CORS             | localhost                  | `https://quartierconnect.fr` uniquement    |
| Réseau           | défaut                     | `quartierconnect_prod` nommé               |
| Logs Caddy       | stdout                     | JSON fichier + rotation 100Mo/10           |

### 18.4 Stratégie de backup

```mermaid
graph TB
    CRON["cron VPS<br/>2h du matin"] --> ALL[backup-all.sh]

    ALL --> M[backup-mongo.sh<br/>mongodump --gzip]
    ALL --> P[backup-postgres.sh<br/>pg_dumpall | gzip]
    ALL --> N[backup-neo4j.sh<br/>cold dump ~30s]
    ALL --> C{lundi ?}
    C -->|oui| CD[Caddy certs tar.gz]

    M & P & N & CD --> LOCAL["/var/backups<br/>rétention 7j"]
    LOCAL --> REMOTE["S3/Backblaze<br/>7j + 4 sem + 12 mois"]

    ALL -->|échec| DISC[Discord 🔴]

    style ALL fill:#16a34a,color:#fff
    style REMOTE fill:#1D4ED8,color:#fff
```
