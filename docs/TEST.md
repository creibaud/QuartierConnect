# Stratégie et résultats de tests

Ce document décrit la stratégie de tests de QuartierConnect, les suites mises en
place sur chacun des composants (API NestJS, applications web React, client lourd
JavaFX, DSL Python) et la manière de les exécuter.

## 1. Approche

La stratégie suit le modèle classique de la **pyramide de tests** : une large base
de tests unitaires rapides, une couche intermédiaire de tests d'intégration et de
tests end-to-end de l'API, et un sommet plus réduit de tests end-to-end pilotant les
interfaces réelles dans un navigateur.

Chaque test respecte les principes **F.I.R.S.T.** :

- **Fast** — les tests unitaires s'exécutent en mémoire, sans dépendance réseau.
- **Independent** — chaque cas est isolé (bases réinitialisées, comptes générés à la
  volée, absence d'ordre implicite entre les tests).
- **Repeatable** — un même test produit le même résultat dans n'importe quel
  environnement (les codes TOTP sont calculés à partir du secret, pas figés).
- **Self-validating** — chaque test se termine par des assertions explicites, sans
  interprétation manuelle du résultat.
- **Timely** — les tests accompagnent le code produit et sont exécutés en continu.

Les trois **environnements de tests** attendus sont couverts :

| Environnement | Ce qui est vérifié | Suites concernées |
|---------------|--------------------|-------------------|
| Unitaire | Logique métier isolée, fonctions pures, services mockés | API (Jest), Web (Vitest), Desktop (JUnit), DSL (pytest) |
| Intégration | Composants réels branchés entre eux (bases de données, dépôts) | API e2e (bases réelles), Desktop (SQLite embarquée réelle) |
| End-to-end | Parcours complet via HTTP ou via le navigateur | API e2e (Supertest), Web e2e (Playwright) |

## 2. Récapitulatif

| Suite | Outil | Tests | Fichiers | Cible make |
|-------|-------|-------|----------|------------|
| API — unitaires | Jest | 527 | 46 `.spec.ts` | `make test-api` |
| API — end-to-end | Jest + Supertest | 173 | 13 `.e2e-spec.ts` | `make test-e2e` |
| Web — unitaires | Vitest | 147 | packages `shared` + `ui` | `make test-web` |
| Web — end-to-end | Playwright | 94 | 21 fichiers (`web-apps/e2e`) | `make test-e2e-web` |
| Desktop — unitaires/intégration | JUnit 5 | 158 | 21 classes | `make test-desktop` |
| DSL — unitaires | pytest | 21 | `dsl/tests` | `make test-dsl` |
| **Total** | | **1120** | | `make test` (unitaires) |

La cible `make test` enchaîne les tests unitaires des quatre composants (API, Web,
Desktop, DSL). Les tests end-to-end, qui nécessitent des services démarrés, disposent
de cibles dédiées (`make test-e2e`, `make test-e2e-web`). La cible `make validate`
exécute l'ensemble en séquence (lint, typecheck, tests unitaires + couverture, e2e
API, e2e Web, desktop, DSL, puis build de production).

## 3. Tests de l'API (NestJS)

### 3.1 Unitaires — Jest (527 tests, 46 fichiers)

Les tests unitaires couvrent la logique métier des 16 modules, avec les dépendances
externes (bases de données, passerelles) remplacées par des doublures. Ils sont
répartis entre contrôleurs (validation d'entrée, gardes, mapping de réponse) et
services (règles métier).

Domaines couverts, entre autres :

- **Authentification** — `auth.service.spec.ts`, `token.service.spec.ts`,
  `totp.service.spec.ts` : hachage du mot de passe, génération et vérification du
  secret TOTP, émission et rotation des JWT.
- **Contrats et points** — `contracts.service.spec.ts` (le fichier le plus fourni),
  `points.service.spec.ts`, `points-settlement.spec.ts` : cycle de vie des contrats
  d'entraide et règlement des transactions de points.
- **Messagerie temps réel** — `messaging.gateway.spec.ts`,
  `messaging.service.spec.ts`, `notifications.listener.spec.ts` : passerelle
  WebSocket, envoi de messages et notifications.
- **Services de quartier** — `services.controller.spec.ts`,
  `bookings.service.spec.ts` : offres de services et réservations.
- **RGPD** — `gdpr-export.service.spec.ts` : export des données personnelles.
- **DSL** — `dsl.service.spec.ts`, `dsl.controller.spec.ts` : validation et exécution
  des requêtes du langage dédié.
- **Utilitaires** — `phone.util.spec.ts`, `geocoding.service.spec.ts`.

Exécution :

```bash
make test-api          # tests unitaires seuls
make test-cov          # tests + rapport de couverture (seuils : stmts 80 %, branches 75 %)
```

Le rapport de couverture est généré dans `api/coverage/lcov-report/index.html`.

### 3.2 End-to-end — Supertest (173 tests, 13 fichiers)

Les tests end-to-end de l'API démarrent l'application NestJS complète et émettent de
vraies requêtes HTTP via Supertest, contre des bases de données réelles (MongoDB et
PostgreSQL). Ils valident donc l'intégration bout en bout : routage, validation,
persistance et sérialisation des réponses.

Fichiers principaux : `api.e2e-spec.ts`, `auth.e2e-spec.ts`, `modules.e2e-spec.ts`,
`contracts.e2e-spec.ts`, `contracts-import.e2e-spec.ts`, `messaging-ws.e2e-spec.ts`,
`bookings.e2e-spec.ts`, `points.e2e-spec.ts`, `neighborhoods.e2e-spec.ts`,
`services.e2e-spec.ts`, `social.e2e-spec.ts`, `rgpd.e2e-spec.ts`, `app.e2e-spec.ts`.

Le flux critique d'authentification est vérifié dans `auth.e2e-spec.ts`, qui
enregistre deux comptes distincts (un compte principal et un compte jetable) et
couvre :

- inscription avec renvoi de l'`otpauthUrl` (le secret TOTP n'est jamais exposé
  directement dans le corps de la réponse) ;
- refus de l'inscription sans consentement RGPD (`400`) et sur email déjà pris (`409`) ;
- connexion valide (mot de passe + code TOTP calculé côté test) retournant la paire de
  jetons JWT (`200`) ;
- rejet d'un mauvais mot de passe (`401`) et d'un mauvais code TOTP (`401`) ;
- limitation de débit après 5 tentatives échouées (`429`) ;
- rafraîchissement du jeton d'accès et rejet d'un jeton de rafraîchissement révoqué ;
- parcours SSO (génération, échange, rejet d'un jeton déjà consommé) utilisé par le
  client lourd ;
- rejet d'un jeton d'accès expiré sur un endpoint protégé.

Exécution (nécessite les bases de données Docker démarrées) :

```bash
make docker-up
make test-e2e
```

## 4. Tests des applications web (React)

### 4.1 Unitaires — Vitest (147 tests)

Les tests Vitest portent sur le code mutualisé du monorepo, dans les paquets
`@workspace/shared` et `@workspace/ui`, partagés par le client et l'admin :

- **Fonctions pures et utilitaires** (`packages/shared/src/lib`) : `geo.test.ts`
  (calculs géographiques), `phone.test.ts` (validation de téléphone),
  `pricing.test.ts` (tarification), `contract-import.test.ts` (import de contrats).
- **Hooks de données** (`packages/shared/src/lib/hooks/__tests__`) : hooks React Query
  pour les incidents, services, réservations, événements, points, votes, messagerie,
  quartiers, statistiques, recommandations, contrats, profil et administration des
  utilisateurs.
- **Composants d'interface** (`packages/ui/src/components`) : `map.test.tsx` et
  `map-legend.test.tsx` pour la carte et sa légende.

Exécution :

```bash
make test-web
```

### 4.2 End-to-end — Playwright (94 tests, 21 fichiers)

Les tests Playwright pilotent le client (`:3000`) et l'admin (`:3001`) dans un
navigateur réel, contre l'API (`:5000`). Ils sont répartis entre `web-apps/e2e/client`
(11 fichiers) et `web-apps/e2e/admin` (9 fichiers), plus une baseline de refonte.

Le parcours critique **connexion + TOTP** est couvert côté client dans `login.spec.ts` :

- redirection d'un utilisateur non authentifié vers `/login` ;
- affichage de l'étape TOTP après saisie d'identifiants valides ;
- message d'erreur sur mauvais mot de passe ;
- connexion complète (mot de passe puis code TOTP à 6 chiffres généré dynamiquement à
  partir du secret) menant un utilisateur fraîchement inscrit vers l'onboarding
  d'adresse.

Le code TOTP est recalculé en direct (implémentation RFC 6238 sans dépendance externe
dans `web-apps/e2e/helpers/auth.ts`), ce qui garantit la reproductibilité des tests.
Le fichier `register.spec.ts` couvre le parcours d'inscription complet jusqu'à la
confirmation du QR code TOTP puis l'onboarding d'adresse. Côté admin, `dsl.spec.ts`
couvre l'éditeur du langage dédié, `neighborhoods-draw.spec.ts` le tracé des périmètres
de quartier sur la carte, et les autres fichiers les écrans de gestion (utilisateurs,
incidents, événements, services).

Exécution (client + admin + API doivent tourner) :

```bash
make dev          # dans un terminal : bases + API + client + admin
make test-e2e-web # dans un autre terminal
```

## 5. Tests du client lourd (JavaFX)

### JUnit 5 — Maven Surefire (158 tests, 21 classes)

Le client lourd est un logiciel **offline-first** : il fonctionne sans connexion et se
synchronise avec l'API lorsque le réseau est disponible. Les tests JUnit couvrent à la
fois la logique de services et l'intégration avec la base **SQLite embarquée** réelle.

Domaines couverts :

- **Persistance locale** — `IncidentRepositoryTest`, `SQLiteSessionTest` : lecture et
  écriture des incidents et de la session dans SQLite.
- **Synchronisation hors ligne** — `SyncServiceTest` (démarrage/arrêt idempotents,
  écoute des changements d'incidents, extraction des identifiants ignorés d'une réponse
  de synchronisation, tolérance aux corps malformés) et `ThreeWayMergerTest` qui vérifie
  la fusion à trois voies entre l'état de base, l'état local et l'état distant :
  conservation des modifications locales quand elles seules changent, adoption des
  modifications distantes sinon, gestion d'une base absente et des incidents résolus.
- **Authentification hors ligne** — `AuthServiceOfflineTest`, `TokenVaultTest`,
  `AuthServiceTest`, `SsoCallbackServerTest` : reprise de session à partir des jetons
  mis en cache (accès valide, accès expiré mais rafraîchissement présent, absence de
  jeton), détection des jetons expirés ou malformés, repli sur l'email mis en cache, et
  parcours SSO d'ouverture de session.
- **Résilience réseau** — `ApiServiceOfflineTest` : le service détecte correctement une
  API injoignable (hôte inexistant, port fermé) sans lever d'exception.
- **Services fonctionnels** — `ContractsServiceTest`, `EventsServiceTest`,
  `NeighborhoodsServiceTest`, `StatisticsServiceTest`, `UpdateServiceTest`,
  `UninstallServiceTest`.
- **Interface, plugins et divers** — `ToastManagerTest`, `PluginRegistryTest`,
  `ThemePluginTest`, `I18nTest` (internationalisation), `HostOsTest`,
  `ApiIntegrationTest`.

Exécution :

```bash
make test-desktop
```

## 6. Tests du DSL (Python)

### pytest (21 tests)

Le langage dédié de requêtes (utilisé par l'éditeur admin) est testé à deux niveaux
dans `dsl/tests` :

- **Analyse lexicale** (`test_lexer.py`) : reconnaissance des mots-clés (`FIND`,
  `WHERE`, `LIMIT`) insensible à la casse, littéraux chaîne, entiers et flottants,
  opérateurs de comparaison (`=`, `!=`, `>`, `>=`, `<`, `<=`), et rejet des caractères
  illégaux.
- **Compilation** (`test_compiler.py`) : traduction d'une requête en structure exécutable
  (`FIND`/`COUNT`, filtres `WHERE` simples et combinés avec `AND`, clause `LIMIT`).

Exécution :

```bash
make test-dsl
```

## 7. Intégration continue

Les suites sont exécutées automatiquement en intégration continue sur les branches
`main` et `develop` ainsi que sur les pull requests. La cible `make validate` reproduit
localement l'intégralité du pipeline (lint des 4 composants, typecheck TypeScript, tests
unitaires API avec couverture, e2e API, e2e Web, desktop, DSL, puis build de
production), ce qui permet de valider une contribution dans les mêmes conditions que la
CI avant de la pousser.
