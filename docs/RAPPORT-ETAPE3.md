# Rapport de Projet — Étape 3
## QuartierConnect — *Connected Neighbours*

---

|                    |                                                                            |
| ------------------ | -------------------------------------------------------------------------- |
| **Groupe**         | 1 — 3AL2                                                                   |
| **Membres**        | Claudio REIBAUD · Andras SCHULLER · Mouhamadou N'DIAYE                     |
| **Enseignant**     | Frédéric SANANES                                                          |
| **Date de remise** | 31 mai 2026                                                                |
| **Réunion**        | 4 juin 2026                                                                |
| **Avancement**     | Étape 3 — 60 % réalisé (avance partielle sur certains points de l'Étape 4) |

---

## Table des matières

1. [Descriptif fonctionnel](#1-descriptif-fonctionnel)
2. [Cas d'utilisation](#2-cas-dutilisation)
3. [Modèle Conceptuel de Données](#3-modèle-conceptuel-de-données)
4. [Modélisation géographique du quartier](#4-modélisation-géographique-du-quartier)
5. [Architecture logicielle](#5-architecture-logicielle)
6. [Algorithmes complexes](#6-algorithmes-complexes)
7. [APIs et frameworks utilisés](#7-apis-et-frameworks-utilisés)
8. [Tests](#8-tests)
9. [Démonstration](#9-démonstration)

---

## 1. Descriptif fonctionnel

### 1.1 Rappel du projet

QuartierConnect est une plateforme collaborative destinée aux habitants d'un quartier résidentiel. Elle permet d'échanger des services valorisés par un système de points, de signer des documents numériques, de participer à des événements communautaires, de communiquer en temps réel et de voter sur la vie du quartier. Une application desktop JavaFX complète l'ensemble pour la gestion offline-first des incidents et des statistiques.

La plateforme reste accessible sur trois surfaces :

- **React Client** (port 3000) — interface habitant ;
- **React Admin** (port 3001) — back-office administrateur ;
- **Java Desktop** — application lourde JavaFX, fonctionnant hors-ligne via SQLite.

### 1.2 Objectif de l'Étape 3 (60 %)

L'Étape 2 (30 %) avait livré l'authentification complète, le SSO cross-surface et les CRUD backend sans interface. L'Étape 3 vise les **60 %** : exposer l'ensemble des modules métier via une **API complète documentée (Scalar)**, brancher **toutes les pages React sur des données réelles**, finaliser la **synchronisation bidirectionnelle** du client Java et livrer la **modélisation géographique du quartier** (outil de dessin de polygones).

### 1.3 État d'avancement

#### Cible Étape 3 — ✅ Complète

| Livrable (CDC §14.3)                                            | Statut                                  |
| --------------------------------------------------------------- | --------------------------------------- |
| ServicesModule + ContractsModule + PointsModule (ACID)          | ✅ Terminé                               |
| DocumentsModule (signature SHA-256, GridFS, audit)              | ✅ Terminé                               |
| SocialModule (Neo4j, recommandations)                           | ✅ Terminé                               |
| MessagingModule (WebSocket Socket.io)                           | ✅ Terminé                               |
| VotesModule + CommunityVotesModule (4 types, Strategy)          | ✅ Terminé                               |
| IncidentsModule (PostgreSQL, machine d'états)                   | ✅ Terminé                               |
| Modélisation géographique (GeoJSON + outil de dessin Leaflet)   | ✅ Terminé                               |
| React Client — toutes les pages avec données réelles            | ✅ Terminé                               |
| Java Desktop — sync offline/online LWW bidirectionnelle         | ✅ Terminé                               |
| Documentation API Scalar (`GET /api/docs`)                      | ✅ Terminé                               |
| Tests E2E (auth, services, contrats, points, neo4j, messagerie) | ✅ Terminé                               |
| Coverage ≥ 60 %                                                 | ✅ Dépassé (statements 95,7 %)           |

#### Avance partielle sur l'Étape 4

| Module                                          | Statut                                      |
| ----------------------------------------------- | ------------------------------------------- |
| DSL PLY (lex/yacc) + bridge pythonia            | ✅ Terminé — *consolidation tests prévue*    |
| Recommandations Neo4j (sync temps réel)         | ✅ Terminé — *affinage du scoring à venir*   |
| Export RGPD JSON                                | ✅ Terminé — *parcours suppression à finir*  |
| React Admin — vues de gestion                   | 🟡 Avancé — *vues principales livrées*      |

#### Reste à faire — Étape 4 (95 %)

| Module                                                | Cible   |
| ----------------------------------------------------- | ------- |
| React Admin — toutes les vues + statistiques réelles  | Étape 4 |
| Système de plugins Java + 4 plugins                   | Étape 4 |
| Système de thèmes Java + 3 thèmes                     | Étape 4 |
| i18n API FR/EN complet                                | Étape 4 |
| RGPD complet (accès, rectification, suppression)      | Étape 4 |

---

## 2. Cas d'utilisation

### 2.1 Diagramme général

```mermaid
graph TD
    Habitant([Habitant])
    Moderateur([Modérateur])
    Admin([Administrateur])

    Habitant --> UC_SVC[Publier / consulter un service]
    Habitant --> UC_PTS[Transférer des points]
    Habitant --> UC_CTR[Signer un contrat]
    Habitant --> UC_EVT[Participer à un événement]
    Habitant --> UC_MSG[Échanger des messages]
    Habitant --> UC_VOTE[Voter sur un scrutin]
    Habitant --> UC_RECO[Recevoir des recommandations]
    Habitant --> UC_INC[Signaler un incident]

    Moderateur --> UC_MOD[Modérer les incidents]

    Admin --> UC_DRAW[Dessiner un quartier sur la carte]
    Admin --> UC_USERS[Gérer les utilisateurs]
    Admin --> UC_DSL[Interroger via le DSL]
    Admin --> UC_JAVA[Gérer incidents et stats desktop]

    UC_CTR --> UC_TOTP[Vérifier le code TOTP]
    UC_RECO -.->|graphe| Neo4j[(Neo4j)]

    Moderateur -.->|hérite| Habitant
    Admin -.->|hérite| Moderateur
```

### 2.2 UC-07 — Transfert de points entre voisins

```mermaid
sequenceDiagram
    actor E as Expéditeur
    participant C as React Client
    participant A as API NestJS
    participant PG as PostgreSQL

    E->>C: Saisit destinataire + montant + note
    C->>A: POST /points/transfer { recipientId, amount, note }

    alt Expéditeur == Destinataire
        A-->>C: 400 SELF_TRANSFER
    end

    A->>PG: BEGIN TRANSACTION
    A->>PG: SELECT balance ... FOR UPDATE (verrou exclusif)
    PG-->>A: { balance: B }

    alt B - amount < -10
        A->>PG: ROLLBACK
        A-->>C: 400 INSUFFICIENT_BALANCE
    else Solde suffisant
        A->>PG: UPSERT sender (balance - amount)
        A->>PG: UPSERT recipient (balance + amount)
        A->>PG: INSERT points_transactions
        A->>PG: COMMIT
        A-->>C: 201 Created
    end
```

### 2.3 UC-08 — Signature d'un contrat (MFA obligatoire)

```mermaid
sequenceDiagram
    actor S as Signataire
    participant C as React Client
    participant A as API NestJS
    participant M as MongoDB

    S->>C: Ouvre le contrat à signer
    S->>C: Saisit son code TOTP
    C->>A: POST /contracts/:id/sign { totpCode }

    A->>A: totpService.verify(secret, totpCode)
    alt Code TOTP invalide
        A-->>C: 400 INVALID_TOTP
    end

    A->>A: hash = SHA-256(content + userId + timestamp)
    A->>M: $push signatures { userId, signedAt, hash }
    A->>A: allSigned ? status = 'signed' : 'pending_signature'
    A->>M: save()
    A-->>C: 200 — contrat mis à jour
```

### 2.4 UC-09 — Messagerie temps réel

```mermaid
sequenceDiagram
    actor A as Alice
    participant GW as MessagingGateway
    participant SVC as MessagingService
    participant M as MongoDB

    A->>GW: connect (handshake.auth.token = JWT)
    GW->>GW: jwt.verify → client.userId
    A->>GW: emit("join_conversation", convId)
    GW->>SVC: isParticipant(convId, aliceId)
    SVC-->>GW: true
    GW->>GW: socket.join("conversation:convId")

    A->>GW: emit("send_message", { convId, content })
    GW->>SVC: sendMessage(convId, aliceId, content)
    SVC->>M: INSERT message + UPDATE lastMessage
    GW->>GW: server.to("conversation:convId").emit("new_message")
    Note over GW: Tous les participants connectés sont notifiés
```

### 2.5 UC-10 — Scrutin communautaire pondéré

```mermaid
flowchart TD
    A([POST /community-votes/:id/cast]) --> B{Type de scrutin ?}
    B -->|binary / single_choice| C[1 choix retenu]
    B -->|multiple_choice| D[1 à N choix retenus]
    B -->|weighted| E[Poids 1-10 par option]
    C --> F[Enregistrer le bulletin dans casts]
    D --> F
    E --> F
    F --> G{Lecture des résultats}
    G --> H{endsAt dépassé ?}
    H -->|Oui| I[status = 'closed']
    H -->|Non| J[status = 'open']
    I --> K[Calcul : somme des poids ou comptage]
    J --> K
    K --> L{casts >= quorum ?}
    L -->|Oui| M[quorumReached = true]
    L -->|Non| N[quorumReached = false]
```

### 2.6 UC-11 — Recommandation sociale (Neo4j)

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant C as React Client
    participant A as API NestJS
    participant N as Neo4j

    U->>C: Ouvre le dashboard
    C->>A: GET /social/recommendations
    A->>N: MATCH (u:User)-[:LIVES_IN]->(n) ...
    Note over N: Services du quartier non utilisés<br/>+ événements à venir non rejoints
    N-->>A: [{ id, name, type, score, reason }]
    A-->>C: Liste triée par score DESC LIMIT 10
    C-->>U: Suggestions personnalisées
```

### 2.7 UC-12 — Définition géographique d'un quartier (admin)

```mermaid
sequenceDiagram
    actor Admin
    participant W as React Admin
    participant L as Leaflet DrawControl
    participant A as API NestJS
    participant M as MongoDB

    Admin->>W: Ouvre la fiche quartier (onglet carte)
    W->>L: Affiche les polygones existants
    Admin->>L: Trace un polygone (clics successifs)
    L-->>W: GeoJSON Polygon [[lng,lat], ...]
    W->>A: POST /neighborhoods { name, city, geometry }
    A->>M: $geoIntersects — détection de chevauchement
    alt Chevauche un quartier existant
        A-->>W: 409 Conflict (liste des quartiers en conflit)
    else Aucun chevauchement
        A->>M: INSERT neighborhood (index 2dsphere)
        A-->>W: 201 — quartier créé
    end
```

---

## 3. Modèle Conceptuel de Données

L'Étape 3 confirme la répartition tri-base : **PostgreSQL** pour les données transactionnelles (auth, incidents, points), **MongoDB** pour les documents flexibles et géospatiaux, **Neo4j** pour le graphe social, **SQLite** pour le cache offline desktop.

### 3.1 PostgreSQL — Données relationnelles

```mermaid
erDiagram
    users {
        UUID      id                 PK
        VARCHAR   email              "UNIQUE NOT NULL"
        VARCHAR   password_hash      "argon2id NOT NULL"
        VARCHAR   totp_secret        "base32 NOT NULL"
        VARCHAR   role               "resident|moderator|admin|banned"
        TEXT      refresh_token_hash "argon2id, nullable"
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    incidents {
        UUID      id               PK
        VARCHAR   title            "NOT NULL"
        TEXT      description
        VARCHAR   status           "open|in_progress|resolved"
        DOUBLE    lat              "nullable — géolocalisation"
        DOUBLE    lng              "nullable — géolocalisation"
        UUID      neighborhood_id  FK
        UUID      created_by       FK
        TIMESTAMP deleted_at       "soft-delete, nullable"
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    points_balances {
        UUID      id        PK
        UUID      user_id   FK "UNIQUE"
        INTEGER   balance   "DEFAULT 0, CHECK >= -10"
        TIMESTAMP updated_at
    }

    points_transactions {
        UUID      id           PK
        UUID      sender_id    FK
        UUID      recipient_id FK
        INTEGER   amount       "NOT NULL"
        TEXT      note
        TIMESTAMP created_at
    }

    users ||--|| points_balances     : "possède"
    users ||--o{ points_transactions : "envoie (sender)"
    users ||--o{ points_transactions : "reçoit (recipient)"
    users ||--o{ incidents           : "signale"
```

### 3.2 MongoDB — Documents flexibles et géospatiaux

```mermaid
erDiagram
    neighborhoods {
        ObjectId _id        PK
        String   name       "UNIQUE"
        String   city
        Object   geometry   "GeoJSON Polygon — index 2dsphere"
        String   createdBy
    }

    services {
        ObjectId _id        PK
        String   name
        String   category
        String   type       "free|paid"
        Object   location   "GeoJSON Point, nullable"
        String   neighborhoodId
        String   createdBy
    }

    events {
        ObjectId _id        PK
        String   title
        Date     eventDate
        String   address    "nullable"
        Object   location   "GeoJSON Point, nullable"
        String   neighborhoodId
    }

    contracts {
        ObjectId _id          PK
        String   title
        String   content
        String   contentHash  "SHA-256"
        Array    signatories  "userId[]"
        Array    signatures   "{ userId, signedAt, hash }[]"
        String   status       "draft|pending_signature|signed"
    }

    documents {
        ObjectId _id        PK
        ObjectId gridfsId   "FK GridFS — PDF / média"
        String   ownerId
        Array    auditTrail  "{ action, userId, at }[]"
    }

    conversations {
        ObjectId _id          PK
        Array    participants  "userId[]"
        Object   lastMessage
    }

    messages {
        ObjectId _id            PK
        ObjectId conversationId FK
        String   senderId
        String   type           "text|image|audio"
        String   content
        Date     createdAt
    }

    community_votes {
        ObjectId _id       PK
        String   voteType  "binary|single_choice|multiple_choice|weighted"
        Array    options
        Array    casts     "{ userId, choices[], weights{} }[]"
        Number   quorum
        Date     endsAt
        String   status    "open|closed"
    }

    ssotokens {
        ObjectId _id       PK
        String   token     "UUID v4, index UNIQUE"
        String   userId
        Date     expiresAt "TTL index"
        Date     usedAt    "null = disponible"
    }

    conversations ||--o{ messages : "contient"
```

> Les collections `contracts`, `events`, `messages` et les fichiers `documents` (PDF, vocaux, photos) sont stockés conformément au sujet sur MongoDB, avec **GridFS** pour les binaires volumineux.

### 3.3 Neo4j — Graphe social

```mermaid
graph LR
    User(["👤 User"])
    Neighborhood(["🏘 Neighborhood"])
    Service(["🔧 Service"])
    Event(["📅 Event"])

    User -->|LIVES_IN| Neighborhood
    Service -->|LOCATED_IN| Neighborhood
    Event -->|HELD_IN| Neighborhood
    User -->|USED| Service
    User -->|INTERESTED_IN / ATTENDING| Event
    User -->|HELPED| User
```

### 3.4 SQLite — Cache offline desktop

```mermaid
erDiagram
    incidents {
        TEXT    id          PK
        TEXT    remote_id   "id API, nullable tant que non synchronisé"
        TEXT    title       "NOT NULL"
        TEXT    description
        TEXT    status      "DEFAULT open"
        INTEGER is_dirty    "0=synchronisé, 1=à pousser"
        TEXT    created_at  "ISO 8601"
        TEXT    updated_at  "arbitre LWW"
    }

    session {
        INTEGER id            PK
        TEXT    access_token
        TEXT    refresh_token
        TEXT    email         "extrait du JWT pour affichage offline"
    }

    sync_log {
        INTEGER id        PK
        TEXT    synced_at "ISO 8601"
        INTEGER success   "1=OK, 0=échec"
    }
```

---

## 4. Modélisation géographique du quartier

La modélisation géographique est le livrable phare de l'Étape 3. Elle répond directement à l'exigence du sujet : *« permettre à l'administrateur de définir un quartier géographiquement, à l'aide d'un outil de dessin. Prévoir les problèmes de limites. »*

### 4.1 Composant carte partagé

Un composant `Map` mutualisé a été extrait dans `packages/ui` afin d'être réutilisé par le client et l'admin sans duplication :

```mermaid
graph TD
    Map["Map (core)<br/>react-leaflet + OpenStreetMap"]
    Draw["DrawControl<br/>leaflet-draw — dessin de polygones"]
    Cluster["MarkerCluster<br/>regroupement des marqueurs denses"]

    Map --> Draw
    Map --> Cluster

    Draw --> AdminN["Admin — fiche quartier<br/>tracer / éditer le polygone"]
    Cluster --> CliS["Client — services (vue carte)"]
    Cluster --> CliE["Client — événements (vue carte)"]
    Cluster --> CliI["Client — incidents (clic pour placer)"]
    Map --> Dash["Client — mini-carte du quartier (dashboard)"]
```

| Surface       | Page                | Usage de la carte                                       |
| ------------- | ------------------- | ------------------------------------------------------- |
| React Admin   | Quartiers           | Tracer / éditer un polygone, voir les quartiers voisins |
| React Admin   | Services, Incidents | Onglet carte + sélecteur de coordonnées                 |
| React Client  | Dashboard           | Mini-carte du quartier de l'habitant                    |
| React Client  | Services, Événements| Vue carte des annonces géolocalisées                    |
| React Client  | Incidents           | Clic sur la carte pour placer un signalement            |

### 4.2 Gestion des limites — détection de chevauchement

Chaque quartier est un **polygone GeoJSON** indexé `2dsphere` dans MongoDB. À la création comme à la modification, le service refuse tout polygone qui en chevaucherait un autre :

```typescript
// neighborhoods.service.ts
async assertNoOverlap(geometry: GeoJsonPolygon, excludeId?: string): Promise<void> {
  const overlapping = await this.neighborhoodModel.find({
    geometry: { $geoIntersects: { $geometry: geometry } }
  }).exec();

  const conflicts = overlapping.filter(n => n._id.toString() !== excludeId);
  if (conflicts.length > 0) {
    throw new ConflictException(
      `Le polygone chevauche ${conflicts.length} quartier(s) : ${conflicts.map(n => n.name).join(', ')}`
    );
  }
}
```

La requête `$geoIntersects` s'appuie sur l'algorithme géodésique natif de MongoDB et détecte tout recouvrement, même partiel. C'est la réponse aux « problèmes de limites » du sujet : aucun habitant ne peut appartenir à deux quartiers simultanément.

### 4.3 Données de démonstration

Le seed peuple plusieurs quartiers de **Paris** avec des polygones réels et des services / événements / incidents géolocalisés à l'intérieur, afin que les vues carte soient immédiatement parlantes lors de la soutenance.

---

## 5. Architecture logicielle

### 5.1 Architecture NestJS — modules de l'Étape 3

```mermaid
graph TD
    AppModule --> AuthModule
    AppModule --> UsersModule
    AppModule --> NeighborhoodsModule
    AppModule --> ServicesModule
    AppModule --> EventsModule
    AppModule --> IncidentsModule
    AppModule --> PointsModule
    AppModule --> ContractsModule
    AppModule --> DocumentsModule
    AppModule --> MessagingModule
    AppModule --> VotesModule
    AppModule --> CommunityVotesModule
    AppModule --> SocialModule
    AppModule --> DslModule

    PointsModule --> Drizzle["Drizzle ORM — PostgreSQL"]
    IncidentsModule --> Drizzle
    ContractsModule --> Mongoose["Mongoose — MongoDB"]
    DocumentsModule --> GridFS["GridFS"]
    NeighborhoodsModule --> Mongoose
    CommunityVotesModule --> Mongoose
    SocialModule --> Neo4j["neo4j-driver"]
    MessagingModule --> SocketIO["Socket.io Gateway"]
    DslModule --> Pythonia["pythonia → PLY"]
```

### 5.2 Infrastructure Docker — 7 conteneurs

```mermaid
graph TD
    Browser(["🌐 Navigateur"])
    Desktop(["🖥 Java Desktop"])

    Browser --> Caddy["Caddy :80/:443<br/>Reverse proxy + TLS"]
    Desktop -->|"SSO + REST"| API

    Caddy -->|"/api/*"| API["NestJS API :5000<br/>REST + WebSocket + DSL"]
    Caddy -->|"/admin/*"| Admin["React Admin :3001"]
    Caddy -->|"/*"| Client["React Client :3000"]

    API --> MongoDB[("MongoDB :27017<br/>quartiers · contrats · messages<br/>votes · documents GridFS · SSO")]
    API --> PostgreSQL[("PostgreSQL :5432<br/>users · incidents · points")]
    API --> Neo4j[("Neo4j :7474/:7687<br/>graphe social · recommandations")]
    Desktop --> SQLite[("SQLite local<br/>incidents · session · sync_log")]
```

### 5.3 Monorepo web — composant carte mutualisé

```mermaid
graph TD
    Root["web-apps/ — pnpm workspace + Turbo"]
    Root --> Client["apps/client — React 19 :3000"]
    Root --> AdminApp["apps/admin — React 19 :3001"]
    Root --> UI["packages/ui — Shadcn + Map/DrawControl/MarkerCluster"]
    Root --> Shared["packages/shared — api · auth · geo helpers · types"]

    Client --> UI
    Client --> Shared
    AdminApp --> UI
    AdminApp --> Shared
```

---

## 6. Algorithmes complexes

### 6.1 Transfert de points — Transaction ACID

**Problème :** deux transferts simultanés depuis le même compte pourraient tous deux passer la vérification de solde avant débit, produisant un solde sous le plancher de -10.

**Solution :** `SELECT ... FOR UPDATE` verrouille la ligne jusqu'au `COMMIT`.

```mermaid
sequenceDiagram
    participant A as API NestJS
    participant PG as PostgreSQL

    A->>PG: BEGIN
    A->>PG: SELECT balance FROM points_balances<br/>WHERE user_id = senderId FOR UPDATE
    Note over PG: Ligne verrouillée — tout transfert concurrent attend
    PG-->>A: { balance: B }
    alt B - amount < -10
        A->>PG: ROLLBACK
    else Solde suffisant
        A->>PG: UPSERT sender (- amount)
        A->>PG: UPSERT recipient (+ amount)
        A->>PG: INSERT points_transactions
        A->>PG: COMMIT
    end
```

> La contrainte `CHECK (balance >= -10)` au niveau PostgreSQL est un filet de sécurité indépendant du code applicatif.

### 6.2 Signature de contrat — SHA-256 + TOTP

**Principe :** chaque signataire prouve son identité via TOTP, puis sa signature scelle un hash combinant le contenu, son identité et l'horodatage. Le contrat passe à `signed` uniquement lorsque tous les signataires ont signé.

```mermaid
flowchart TD
    A[Signataire soumet totpCode] --> B{TOTP valide ?}
    B -->|Non| C[400 INVALID_TOTP]
    B -->|Oui| D{Déjà signé ?}
    D -->|Oui| E[400 ALREADY_SIGNED]
    D -->|Non| F[hash = SHA-256 content+userId+timestamp]
    F --> G[Ajouter la signature]
    G --> H{Tous ont signé ?}
    H -->|Oui| I[status = signed]
    H -->|Non| J[status = pending_signature]
```

### 6.3 Votes — Strategy Pattern

Les votes simples ont des modes distincts (`up/down` pour les incidents, `like/dislike` pour les services). Le **Strategy Pattern** isole chaque mode dans une classe, évitant une cascade de `switch` :

```mermaid
classDiagram
    class VoteStrategy {
        <<interface>>
        +allowedTypes() string[]
        +calculate(votes) VoteResult
    }
    class UpDownStrategy
    class LikeDislikeStrategy
    class VoteStrategyFactory {
        +getVoteStrategy(targetType) VoteStrategy
    }
    VoteStrategy <|.. UpDownStrategy
    VoteStrategy <|.. LikeDislikeStrategy
    VoteStrategyFactory --> VoteStrategy
```

Un même vote soumis deux fois s'annule (toggle off) ; un vote différent remplace l'ancien.

### 6.4 Recommandation sociale — traversal Cypher

**Pourquoi Neo4j ?** Une recommandation « services proches non encore utilisés + événements à venir du quartier » exigerait en SQL plusieurs jointures récursives. En Cypher, un seul `MATCH` suffit :

```cypher
MATCH (u:User {id: $userId})-[:LIVES_IN]->(n:Neighborhood)
OPTIONAL MATCH (n)<-[:LOCATED_IN]-(s:Service)
WHERE NOT (u)-[:USED]->(s)
RETURN s.id AS id, s.name AS name, 'service' AS type, 3 AS score,
       'Service in your neighborhood' AS reason
UNION
MATCH (u:User {id: $userId})-[:LIVES_IN]->(n:Neighborhood)
OPTIONAL MATCH (n)<-[:HELD_IN]-(e:Event)
WHERE NOT (u)-[:ATTENDING]->(e) AND e.date > datetime()
RETURN e.id AS id, e.name AS name, 'event' AS type, 2 AS score,
       'Upcoming event near you' AS reason
ORDER BY score DESC LIMIT 10
```

La synchronisation MongoDB → Neo4j est **fire-and-forget** (`void socialService.syncX()`) : elle ne bloque jamais la réponse HTTP, et un Neo4j indisponible est simplement journalisé.

### 6.5 Détection de chevauchement géospatial

Décrite en [§4.2](#42-gestion-des-limites--détection-de-chevauchement) : `$geoIntersects` sur index `2dsphere` rejette tout polygone recouvrant un quartier existant — c'est la gestion des limites exigée par le sujet.

### 6.6 Synchronisation desktop — Last-Write-Wins bidirectionnelle

L'Étape 2 ne poussait que les incidents créés hors-ligne. L'Étape 3 livre une synchronisation **bidirectionnelle** : selon l'horodatage `updated_at`, le client pousse (PUT) ou tire (GET) la version la plus récente.

```mermaid
flowchart TD
    A[SyncService — toutes les 30s] --> B[GET /health]
    B --> C{Réseau ?}
    C -->|Non| D[Attendre le prochain cycle]
    C -->|Oui| E[SELECT incidents WHERE is_dirty=1]
    E --> F{remote_id présent ?}
    F -->|Non — nouveau local| G[POST /incidents → récupère remote_id]
    F -->|Oui — mise à jour| H{updated_at local > API ?}
    H -->|Oui| I[PUT /incidents/:id — pousser]
    H -->|Non| J[GET /incidents/:id — tirer]
    G --> K[UPDATE SQLite is_dirty=0]
    I --> K
    J --> K
    K --> L[INSERT sync_log]
```

---

## 7. APIs et frameworks utilisés

### 7.1 Backend NestJS — nouveautés de l'Étape 3

| Bibliothèque       | Version | Rôle ajouté à l'Étape 3                                              |
| ------------------ | ------- | ------------------------------------------------------------------- |
| **Socket.io**      | —       | Messagerie temps réel — namespace `/messaging`, rooms par conversation |
| **neo4j-driver**   | 5       | Graphe social — sessions managées, requêtes Cypher de recommandation |
| **GridFS** (Mongo) | —       | Stockage des binaires de documents (PDF, photos, vocaux)            |
| **crypto** (Node)  | natif   | Hash SHA-256 du contenu des contrats et des signatures              |
| **pythonia**       | —       | Bridge Node.js ↔ Python pour exécuter le DSL PLY                    |

(Pour rappel Étape 2 : NestJS 11, Drizzle ORM, Mongoose, Passport-JWT, argon2, speakeasy, @nestjs/throttler, Zod.)

### 7.2 Frontend React — pages métier branchées sur des données réelles

> **Évolution majeure depuis l'Étape 2 :** toutes les pages métier sont désormais alimentées par l'API réelle via TanStack Query.

| Application          | Routes livrées                                                            |
| -------------------- | ------------------------------------------------------------------------- |
| React Client (:3000) | `/dashboard`, `/services`, `/events`, `/votes`, `/contracts`, `/incidents`, `/messages` |
| React Admin (:3001)  | `/users`, `/neighborhoods`, `/services`, `/events`, `/incidents`, `/community-votes`, `/dsl`, `/sso`, `/dashboard` |

| Bibliothèque         | Version | Rôle ajouté à l'Étape 3                                       |
| -------------------- | ------- | ------------------------------------------------------------- |
| **react-leaflet**    | —       | Carte interactive (composant `Map` partagé)                   |
| **leaflet-draw**     | —       | Dessin / édition de polygones de quartier (`DrawControl`)     |
| **leaflet.markercluster** | —  | Regroupement des marqueurs sur les vues denses (`MarkerCluster`) |
| **TanStack Query**   | 5       | Désormais utilisé sur toutes les pages (cache + invalidation) |

### 7.3 Java Desktop

| API / Bibliothèque                  | Rôle ajouté à l'Étape 3                                     |
| ----------------------------------- | ----------------------------------------------------------- |
| **StatisticsService**               | Statistiques live des participations depuis l'API           |
| **Session SQLite**                  | Reprise de session offline (tokens + email mis en cache)    |
| **Sync bidirectionnelle**           | PUT/GET selon arbitrage LWW sur `updated_at`                |

---

## 8. Tests

### 8.1 Bilan global

| Suite                       | Résultat | Outil                                        |
| --------------------------- | -------- | -------------------------------------------- |
| Tests unitaires API         | **261**  | Jest + ts-jest                               |
| Tests E2E API               | **149**  | Jest + Supertest (MongoDB + PostgreSQL réels) |
| Tests Desktop               | **139**  | JUnit 5 + Mockito                            |
| Tests Web (hooks partagés)  | **73**   | Vitest                                       |
| Tests E2E Web               | **87**   | Playwright (Chrome headless)                 |
| Tests DSL                   | **21**   | pytest                                       |
| **Total**                   | **~730** | —                                            |

**Couverture API :** statements **95,7 %**, branches **86,1 %** — bien au-delà du seuil Étape 3 (≥ 60 %).

### 8.2 Nouvelles suites E2E de l'Étape 3

| Fichier E2E                                    | Couvre                                            |
| ---------------------------------------------- | ------------------------------------------------- |
| `api/test/contracts.e2e-spec.ts`               | Création, signature TOTP, statut `signed`         |
| `api/test/points.e2e-spec.ts`                  | Transfert ACID, solde plancher, auto-transfert    |
| `api/test/neighborhoods.e2e-spec.ts`           | CRUD GeoJSON + chevauchement `$geoIntersects`     |
| `api/test/messaging-ws.e2e-spec.ts`            | WebSocket : auth JWT, `join`, `send_message`      |
| `api/test/modules.e2e-spec.ts`                 | Services, événements, votes communautaires        |
| `e2e/admin/neighborhoods-draw.spec.ts`         | Rendu carte + barre d'outils de dessin de polygone |
| `e2e/client/services-map.spec.ts`              | Vue carte côté client, marqueurs                  |
| `e2e/client/messages.spec.ts`                  | Page messagerie : garde `/login`, rendu authentifié |

### 8.3 Stratégie

```mermaid
graph TD
    T1["Unitaires API (Jest)<br/>Mock BDD — logique métier isolée"]
    T2["E2E API (Supertest)<br/>Bases réelles — zéro mock"]
    T3["E2E WebSocket<br/>Client Socket.io réel"]
    T4["Desktop (JUnit 5 + Mockito)<br/>Sync + auth + session"]
    T5["Web E2E (Playwright)<br/>Navigateur réel — carte, formulaires"]
    T6["DSL (pytest)<br/>Lexer / parser / sécurité"]

    T1 --> OK([Confiance unitaire])
    T2 --> OK2([Confiance intégration])
    T3 --> OK2
    T4 --> OK3([Confiance desktop])
    T5 --> OK4([Confiance UI])
    T6 --> OK5([Confiance DSL])
```

> **Principe des tests E2E API :** aucun mock sur les bases. Les tests utilisent MongoDB et PostgreSQL réels, peuplés via l'API dans un `beforeAll`.

### 8.4 Commandes

```bash
make test          # Unitaires API (261) + hooks web (73) + Desktop (139) + DSL (21)
make test-cov      # + rapport coverage (stmts 95,7 % / branches 86,1 %)
make test-e2e      # E2E API Supertest (149) — nécessite Docker
make test-e2e-web  # E2E Playwright (87) — nécessite les apps lancées
make validate      # lint + typecheck + tests + build, en séquence
```

---

## 9. Démonstration

### 9.1 Lancer la plateforme

```bash
cp .env.example .env      # renseigner les secrets
make docker-up            # 7 conteneurs
make seed                 # comptes démo + quartiers Paris + Neo4j
```

| Surface               | URL                       |
| --------------------- | ------------------------- |
| Client habitant       | http://localhost          |
| Admin back-office     | http://localhost/admin    |
| API docs (Scalar)     | http://localhost/api/docs |
| Neo4j Browser         | http://localhost:7474     |

### 9.2 Comptes de démonstration

| Email         | Mot de passe | Rôle      | TOTP               |
| ------------- | ------------ | --------- | ------------------ |
| alice@demo.fr | Demo1234!    | resident  | `JBSWY3DPEHPK3PXP` |
| bob@demo.fr   | Demo1234!    | moderator | `JBSWY3DPEHPK3PXP` |
| admin@demo.fr | Demo1234!    | admin     | `JBSWY3DPEHPK3PXP` |

```bash
make totp   # ou : oathtool --totp --base32 JBSWY3DPEHPK3PXP
```

### 9.3 Scénarios de démonstration prévus

| Point                    | Scénario                                                                   |
| ------------------------ | -------------------------------------------------------------------------- |
| Dessin de quartier       | Admin → fiche quartier → tracer un polygone → enregistrer                  |
| Gestion des limites      | Tracer un polygone qui chevauche un quartier existant → `409 Conflict`     |
| Transfert de points      | Alice → Bob, vérifier les soldes ; tenter un dépassement → `400`           |
| Signature de contrat     | Ouvrir un contrat, signer avec un mauvais TOTP (refus) puis le bon (signé) |
| Messagerie temps réel    | Deux navigateurs (Alice / Bob) → message instantané via WebSocket          |
| Recommandation Neo4j     | Dashboard d'Alice → services et événements suggérés de son quartier        |
| Scrutin pondéré          | Créer un scrutin `weighted`, voter, lire les résultats et le quorum        |
| Vue carte client         | Services / événements / incidents géolocalisés sur la carte                |
| Sync offline bidirect.   | `docker stop` API → créer un incident → relancer → vérifier la sync        |
| Documentation API        | Parcourir Scalar sur `/api/docs`                                           |

---

*Rapport de projet — QuartierConnect · Groupe 1 · 3AL2 · ESGI 2025-2026*
*Rendu Étape 3 — 31 mai 2026 — Enseignant : Frédéric SANANES*
