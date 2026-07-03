# Référence de l'API QuartierConnect

API REST de la plateforme QuartierConnect, construite avec NestJS. Elle expose
**86 routes** réparties en 16 modules fonctionnels. Ce document constitue la
référence exhaustive des points d'accès ; une documentation interactive de type
Swagger est également servie en direct par l'application (voir plus bas).

- Version de l'API : `3.0`
- Serveurs déclarés : `http://localhost:5000` (accès direct), `http://localhost/api` (via le reverse proxy Caddy)

## Documentation interactive (Scalar)

L'application génère une spécification OpenAPI à partir des décorateurs des
contrôleurs (`@nestjs/swagger`) et l'expose via une interface interactive
**Scalar** accessible sur :

```
GET /docs
```

Le bundle Scalar est auto-hébergé (`/scalar/standalone.js`), sans dépendance à
un CDN externe. L'interface permet de parcourir chaque route, d'inspecter les
schémas de requête et de réponse, de renseigner un jeton via le bouton
**Authorize**, puis d'exécuter les appels directement depuis le navigateur.

## Authentification

Toutes les routes protégées reposent sur un **JWT Bearer** signé en **HS256**,
d'une durée de vie de **15 minutes**.

```
Authorization: Bearer <accessToken>
```

Cycle d'authentification :

1. Création de compte via `POST /auth/register` : le secret **TOTP** est renvoyé
   dans le champ `otpauthUrl`.
2. Connexion via `POST /auth/login` avec email + mot de passe + code TOTP à 6 chiffres.
3. Le `accessToken` renvoyé est utilisé dans l'en-tête `Authorization`.

Le jeton d'accès (15 min) est accompagné d'un **refresh token** de 7 jours,
déposé dans un cookie `qc_rt` **httpOnly** (`SameSite=strict`, `Secure` en
production). Le renouvellement se fait via `POST /auth/refresh` (rotation du
refresh token : l'ancien est invalidé à chaque échange). À la déconnexion, le
hash du refresh token est effacé en base et le jeton d'accès courant est
révoqué via une liste de JTI bloqués.

### MFA TOTP sur les actions sensibles

Un code **TOTP** (30 s de validité, 6 chiffres) est exigé, en plus de la
session, pour les opérations suivantes :

| Action | Route |
|--------|-------|
| Connexion | `POST /auth/login` |
| Signature d'un contrat | `POST /contracts/:id/sign` |
| Changement de mot de passe | `PATCH /users/me/password` |
| Changement d'email | `PATCH /users/me/email` |
| Changement de téléphone | `PATCH /users/me/phone` |
| Suppression du compte | `DELETE /users/me` |

La connexion est limitée à **5 tentatives par 15 minutes** ; le renouvellement
de jeton à **10 par minute**.

## Rôles et autorisations

Hiérarchie des rôles : `resident` → `moderator` → `admin`, plus l'état `banned`.

| Rôle | Périmètre |
|------|-----------|
| Public | Aucune authentification requise |
| Authentifié | Tout compte connecté (résident, modérateur ou administrateur) |
| moderator / admin | Modération (statut d'incident, suppression, DSL) |
| admin | Administration complète (utilisateurs, quartiers, statistiques) |

La colonne « Rôle requis » des tableaux ci-dessous reflète les gardes
(`JwtAuthGuard`, `RolesGuard`, décorateur `@Roles`) réellement appliqués sur
chaque route.

## Conventions

- **Pagination** : les endpoints de liste acceptent `?page=1&limit=20`
  (limite maximale : 100).
- **Formats d'identifiants** : PostgreSQL utilise des UUID ; MongoDB utilise des
  `ObjectId`.
- **Réponses d'erreur** : codes HTTP standards, avec un code applicatif dans le
  corps le cas échéant (par ex. `EMAIL_ALREADY_EXISTS`, `TOKEN_REVOKED`).

---

## Module `auth` — Authentification (6 routes)

| Méthode | Chemin | Rôle requis | Description |
|---------|--------|-------------|-------------|
| POST | `/auth/register` | Public | Création de compte et génération du secret TOTP |
| POST | `/auth/login` | Public | Connexion (email + mot de passe + code TOTP à 6 chiffres) ; limité à 5 essais / 15 min |
| POST | `/auth/sso/generate` | Authentifié | Étape 1/2 : génère un jeton SSO à usage unique (TTL 5 min) |
| POST | `/auth/sso/exchange` | Public | Étape 2/2 : échange le jeton SSO contre une paire JWT |
| POST | `/auth/refresh` | Public | Rotation du refresh token → nouvelle paire JWT (cookie `qc_rt` ou corps) |
| POST | `/auth/logout` | Authentifié | Déconnexion : révocation serveur du refresh token et du JWT courant |

Le SSO à jeton unique sert notamment à ouvrir une session sur le client lourd
JavaFX (`surface: "java-desktop"`) sans re-saisir les identifiants. Le paramètre
optionnel `state` (protection CSRF de type PKCE) est vérifié lors de l'échange.

## Module `users` — Utilisateurs et avatars (7 routes)

| Méthode | Chemin | Rôle requis | Description |
|---------|--------|-------------|-------------|
| GET | `/users` | admin | Liste paginée des utilisateurs (champs sensibles exclus) |
| PATCH | `/users/:id/role` | admin | Change le rôle d'un utilisateur (resident, moderator, admin, banned) |
| GET | `/users/search` | Authentifié | Recherche d'utilisateurs par email (max 10, exclut l'appelant) |
| GET | `/users/neighbors` | Authentifié | Liste des voisins du quartier de l'appelant (max 20, par nom) |
| POST | `/users/me/avatar` | Authentifié | Téléverse mon avatar (GridFS, max 5 Mo, image uniquement) |
| DELETE | `/users/me/avatar` | Authentifié | Supprime mon avatar |
| GET | `/users/avatar/:fileId` | Public | Sert une image d'avatar (GridFS, en cache 24 h) |

Le bannissement mémorise le rôle courant (`previousRole`) afin de le restaurer
lors d'une réactivation.

## Module `users/me` — Profil de l'utilisateur courant (10 routes)

| Méthode | Chemin | Rôle requis | Description |
|---------|--------|-------------|-------------|
| GET | `/users/me/profile` | Authentifié | Consulte mon profil |
| PATCH | `/users/me/profile` | Authentifié | Met à jour mon profil (prénom, nom) |
| PATCH | `/users/me/password` | Authentifié + TOTP | Change mon mot de passe (mot de passe actuel + code TOTP) |
| PATCH | `/users/me/email` | Authentifié + TOTP | Change mon email (propagé PostgreSQL/MongoDB/Neo4j ; ré-authentification requise) |
| PATCH | `/users/me/phone` | Authentifié + TOTP | Change mon numéro de téléphone (E.164) |
| DELETE | `/users/me` | Authentifié + TOTP | Supprime/anonymise mon compte (RGPD art. 17) |
| GET | `/users/me/export` | Authentifié | Exporte mes données personnelles (RGPD art. 20) |
| POST | `/users/me/address` | Authentifié | Soumet mon adresse et déclenche l'affectation à un quartier |
| GET | `/users/me/location` | Authentifié | Mes coordonnées et le détail de mon quartier |
| GET | `/users/me/neighborhood-status` | Authentifié | Statut adresse/quartier (utilisé par le portail d'accès) |

La suppression de compte remplace l'email par un hash irréversible et efface le
`passwordHash`, le `totpSecret` et le refresh token dans les trois bases.

## Module `bookings` — Réservations de services payants (6 routes)

| Méthode | Chemin | Rôle requis | Description |
|---------|--------|-------------|-------------|
| POST | `/bookings` | Authentifié | Demande une réservation sur un service payant |
| GET | `/bookings` | Authentifié | Mes réservations (en tant qu'initiateur ou propriétaire du service) |
| GET | `/bookings/:id` | Authentifié | Détail d'une réservation (parties prenantes uniquement) |
| POST | `/bookings/:id/accept` | Authentifié | Le propriétaire accepte — génère le contrat |
| POST | `/bookings/:id/decline` | Authentifié | Le propriétaire refuse une demande en attente |
| POST | `/bookings/:id/cancel` | Authentifié | Annule une réservation |

## Module `community-votes` — Votes communautaires (6 routes)

| Méthode | Chemin | Rôle requis | Description |
|---------|--------|-------------|-------------|
| POST | `/community-votes` | Authentifié | Crée un vote (BINARY, SINGLE_CHOICE, MULTIPLE_CHOICE, WEIGHTED) |
| GET | `/community-votes` | Authentifié | Liste paginée des votes communautaires |
| GET | `/community-votes/:id` | Authentifié | Détail d'un vote |
| POST | `/community-votes/:id/cast` | Authentifié | Enregistre un vote (choix + poids éventuels) |
| GET | `/community-votes/:id/results` | Authentifié | Résultats agrégés du vote |
| POST | `/community-votes/:id/close` | Authentifié (créateur ou admin) | Clôture le vote |

## Module `contracts` — Contrats et signature électronique (7 routes)

| Méthode | Chemin | Rôle requis | Description |
|---------|--------|-------------|-------------|
| GET | `/contracts` | Authentifié | Liste mes contrats (créés ou à signer) |
| GET | `/contracts/:id` | Authentifié | Détail d'un contrat (créateur ou signataire uniquement) |
| GET | `/contracts/:id/pdf` | Authentifié | Télécharge le PDF du contrat (consultation auditée) |
| GET | `/contracts/:id/audit` | Authentifié | Journal d'audit immuable du document |
| POST | `/contracts` | Authentifié | Crée un contrat (hash SHA-256 calculé automatiquement) |
| POST | `/contracts/import` | Authentifié | Importe un PDF avec zones de signature/paraphe (max 10 Mo) |
| POST | `/contracts/:id/sign` | Authentifié + TOTP | Signe un contrat avec validation TOTP |

Un contrat importé (jusqu'à 4 signataires) est archivé comme version initiale
immuable ; le statut passe à `fully_signed` lorsque tous les signataires ont
signé.

## Module `dsl` — Langage de requête dédié (1 route)

| Méthode | Chemin | Rôle requis | Description |
|---------|--------|-------------|-------------|
| POST | `/dsl/query` | moderator / admin | Compile et exécute une requête DSL via le moteur Python (PLY, in-process via pythonia) |

## Module `events` — Événements de quartier (6 routes)

| Méthode | Chemin | Rôle requis | Description |
|---------|--------|-------------|-------------|
| GET | `/events` | Public | Liste des événements (filtrable par catégorie et date) |
| GET | `/events/:id` | Public | Détail d'un événement |
| POST | `/events` | Authentifié | Crée un événement (`createdBy` issu du JWT) |
| POST | `/events/:id/interest` | Authentifié | Marque un intérêt/participation (mise à jour Mongo + relation Neo4j) |
| PATCH | `/events/:id` | Authentifié | Met à jour un événement |
| DELETE | `/events/:id` | Authentifié | Supprime un événement |

## Module `geocoding` — Géocodage d'adresses (1 route)

| Méthode | Chemin | Rôle requis | Description |
|---------|--------|-------------|-------------|
| GET | `/geocoding/search` | Authentifié | Autocomplétion d'adresses (proxy Nominatim) |

Cette route sert de proxy vers l'**API externe Nominatim** (OpenStreetMap). Les
résultats sont doucement biaisés vers le quartier de l'appelant (~5 km autour de
son domicile) et sa langue préférée, sans jamais restreindre la recherche. La
requête `q` doit contenir au moins 3 caractères.

## Module `incidents` — Signalements d'incidents (6 routes)

| Méthode | Chemin | Rôle requis | Description |
|---------|--------|-------------|-------------|
| GET | `/incidents` | Authentifié | Liste paginée des incidents non supprimés (résidents et modérateurs limités à leur quartier) |
| GET | `/incidents/:id` | Authentifié | Détail d'un incident |
| POST | `/incidents` | Authentifié | Crée un incident (statut initial `open`) |
| PATCH | `/incidents/:id/status` | moderator / admin | Change le statut (machine à états stricte : open → in_progress → resolved) |
| DELETE | `/incidents/:id` | moderator / admin | Suppression logique (`deleted_at = NOW()`) |
| POST | `/incidents/sync` | Authentifié | Synchronisation en masse depuis le client lourd JavaFX (upsert) |

La synchronisation applique une règle de propriété : un résident ne peut
remonter que ses propres incidents, un modérateur ou un administrateur ceux de
n'importe qui. Les éléments non appliqués sont retournés dans `skippedIds`.

## Module `messaging` — Messagerie (6 routes)

| Méthode | Chemin | Rôle requis | Description |
|---------|--------|-------------|-------------|
| GET | `/messaging/conversations` | Authentifié | Liste mes conversations |
| POST | `/messaging/conversations` | Authentifié | Crée une conversation (1-1 ou groupe) |
| POST | `/messaging/conversations/with/:userId` | Authentifié | Trouve ou crée une conversation 1-1 avec un utilisateur (idempotent) |
| GET | `/messaging/conversations/:id/messages` | Authentifié | Historique paginé des messages |
| POST | `/messaging/conversations/:id/upload` | Authentifié | Envoie un fichier (GridFS, max 10 Mo ; audio max 5 Mo) |
| GET | `/messaging/files/:fileId` | Authentifié | Télécharge un fichier de conversation (participants uniquement) |

## Module `neighborhoods` — Quartiers (6 routes)

| Méthode | Chemin | Rôle requis | Description |
|---------|--------|-------------|-------------|
| GET | `/neighborhoods` | Public | Liste paginée des quartiers |
| GET | `/neighborhoods/uncovered-addresses` | admin | Résidents en attente non couverts par un quartier |
| GET | `/neighborhoods/:id` | Public | Détail d'un quartier |
| POST | `/neighborhoods` | admin | Crée un quartier (polygone GeoJSON ; contrôle de chevauchement `$geoIntersects`) |
| PATCH | `/neighborhoods/:id` | admin | Met à jour un quartier |
| DELETE | `/neighborhoods/:id` | admin | Supprime un quartier |

La création d'un quartier réaffecte automatiquement les résidents en attente
dont l'adresse tombe dans le nouveau polygone.

## Module `points` — Points d'entraide (3 routes)

| Méthode | Chemin | Rôle requis | Description |
|---------|--------|-------------|-------------|
| GET | `/points/balance` | Authentifié | Consulte mon solde de points (initialisation à 0 si absent) |
| GET | `/points/history` | Authentifié | Historique paginé des transactions (envoyées et reçues) |
| POST | `/points/transfer` | Authentifié | Transfère des points à un autre utilisateur (transaction ACID) |

Le transfert est atomique (PostgreSQL) : débit de l'émetteur et crédit du
destinataire dans la même transaction ; échec si le solde est insuffisant.

## Module `services` — Annonces de services entre voisins (9 routes)

| Méthode | Chemin | Rôle requis | Description |
|---------|--------|-------------|-------------|
| GET | `/services` | Authentifié | Liste des annonces du quartier (filtrable par catégorie, type, direction) |
| GET | `/services/mine` | Authentifié | Mes annonces enrichies de leurs répondants |
| GET | `/services/responded` | Authentifié | Annonces auxquelles j'ai répondu |
| GET | `/services/:id` | Public | Détail d'une annonce |
| POST | `/services` | Authentifié | Crée une annonce de service |
| PATCH | `/services/:id` | Authentifié (propriétaire ou admin) | Met à jour une annonce |
| POST | `/services/:id/respond` | Authentifié | Répond à une annonce (idempotent) |
| DELETE | `/services/:id/respond` | Authentifié | Retire ma réponse à une annonce |
| DELETE | `/services/:id` | Authentifié (propriétaire ou admin) | Supprime une annonce |

Les types de service sont `free`, `paid`, `exchange` ; les directions `offer`
et `request`. Les résidents et modérateurs sont limités à leur propre quartier,
seuls les administrateurs listent l'ensemble.

## Module `votes` — Votes sur les contenus (2 routes)

| Méthode | Chemin | Rôle requis | Description |
|---------|--------|-------------|-------------|
| POST | `/votes` | Authentifié | Vote (poser / basculer / changer) — LikeDislike pour services/événements, UpDown pour incidents/commentaires |
| GET | `/votes/score` | Authentifié | Score agrégé d'une cible (`targetId`, `targetType`) |

## Module `app` — Système et recommandations (4 routes)

| Méthode | Chemin | Rôle requis | Description |
|---------|--------|-------------|-------------|
| GET | `/health` | Public | Contrôle de santé du serveur (interrogé toutes les 30 s par le service de synchronisation Java) |
| GET | `/stats` | admin | Statistiques agrégées (PostgreSQL + MongoDB) |
| GET | `/recommendations` | Authentifié | Recommandations personnalisées de services et d'événements (graphe Neo4j) |
| POST | `/social/interest` | Authentifié | Enregistre un intérêt pour un événement (**déprécié** — utiliser `POST /events/:id/interest`) |

Chaque compteur de `/stats` est isolé dans son propre `try/catch` : une valeur
peut être `null` si une base est temporairement indisponible. De même, les
recommandations renvoient un tableau vide si Neo4j est indisponible.

---

## Récapitulatif

| Module | Routes |
|--------|--------|
| auth | 6 |
| users | 7 |
| users/me | 10 |
| bookings | 6 |
| community-votes | 6 |
| contracts | 7 |
| dsl | 1 |
| events | 6 |
| geocoding | 1 |
| incidents | 6 |
| messaging | 6 |
| neighborhoods | 6 |
| points | 3 |
| services | 9 |
| votes | 2 |
| app (système + recommandations) | 4 |
| **Total** | **86** |
