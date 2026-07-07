# Script de démonstration — QuartierConnect (prod OVH)

> Démonstration sur la **production en ligne** : **https://quartierconnect.duckdns.org**.
> Durée cible : **25 minutes** (+ questions).
> Comptes : `alice@demo.fr` (résident), `bob@demo.fr` (modérateur),
> `admin@demo.fr` (admin) — mot de passe `Demo1234!`, code TOTP via l'application
> d'authentification. Préparation : voir [DEMO_CHECKLIST.md](DEMO_CHECKLIST.md).

## 0. Introduction (0:00 → 2:00)

- Présenter la plateforme : **4 surfaces** — application résident (React),
  back-office admin (React), API REST (NestJS), client lourd (JavaFX) — et
  **3 bases** polyglottes (PostgreSQL, MongoDB, Neo4j).
- Souligner que **tout est en ligne** : déployé sur OVH derrière Caddy (HTTPS
  automatique), 9 conteneurs Docker, livré en continu par GitHub Actions.
- Ouvrir `https://quartierconnect.duckdns.org/api/health` → `status:"ok"`.

## 1. Connexion démo avec MFA (2:00 → 4:00)

1. Ouvrir `https://quartierconnect.duckdns.org` → « Se connecter » avec
   `alice@demo.fr` / `Demo1234!`.
2. Saisir le **code TOTP** depuis l'application d'authentification — expliquer
   RFC 6238 et l'**anti-rejeu** (le même code soumis deux fois est refusé).
3. Arriver sur le tableau de bord résident.

À souligner : **Argon2id** pour les mots de passe, **JWT** access 15 min +
refresh avec rotation stricte (verrou `FOR UPDATE`, révocation par `jti`).

## 2. Parcours résident (4:00 → 14:00)

### 2.1 Services entre voisins + réservation + contrat (4:00 → 7:30)

1. Onglet « Services » : parcourir les annonces du quartier.
2. Créer une annonce (titre, **catégorie** contrôlée, type gratuit / échange /
   payant, adresse avec **autocomplétion + géocodage**).
3. Réserver un service payant → un **contrat** est généré ; le montrer, puis
   **signer avec le code TOTP** (signature électronique horodatée + hash) et
   récupérer le **PDF**.

À souligner : la signature est **atomique** et le règlement en points a lieu
**avant** de figer le contrat — impossible d'avoir un contrat signé sans
paiement, ni d'annuler une réservation déjà payée.

### 2.2 Points (7:30 → 9:00)

1. Onglet « Points » : solde d'Alice.
2. Transférer 10 points à Bob (recherche par email) → solde mis à jour.
3. Expliquer : **transaction PostgreSQL ACID**, verrou des deux soldes dans un
   **ordre déterministe** (pas d'interblocage sur transferts croisés), découvert
   limité à −10 par contrainte `CHECK`.

### 2.3 Incidents + confidentialité (9:00 → 10:30)

1. Onglet « Incidents » : signaler un incident (catégorie, description,
   **localisation sur la carte**).
2. Montrer la machine à états (open → in_progress → resolved).
3. Souligner la **confidentialité par catégorie** : un signalement de modération
   n'est visible que de son auteur et des modérateurs — pas des autres résidents.

### 2.4 Messagerie temps réel (10:30 → 12:00)

1. Ouvrir une seconde fenêtre (navigation privée) connectée en Bob.
2. Alice envoie un message → il apparaît **instantanément** chez Bob (Socket.io,
   salons `conversation:{id}`, JWT vérifié à la connexion WebSocket).
3. Souligner l'**accusé de réception** : un envoi qui échoue est signalé et le
   texte est conservé (pas de perte silencieuse).

### 2.5 Votes, événements, recommandations (12:00 → 14:00)

1. Onglet « Votes » : participer à un sondage de quartier, résultats en direct
   (les votes **anonymes** ne divulguent pas qui a voté quoi).
2. Onglet « Événements » : s'inscrire à un événement.
3. Onglet « Recommandations » : suggestions issues du **graphe Neo4j**
   (services / événements / voisins du quartier).

## 3. Parcours admin (14:00 → 18:00)

1. Ouvrir `https://quartierconnect.duckdns.org/admin` → connexion
   `admin@demo.fr` + TOTP.
2. Tableau de bord : statistiques de la plateforme.
3. **Modération** : incidents et signalements (filtre par catégorie), changement
   de statut. Recherche d'utilisateurs **côté serveur** (email / rôle).
4. **Quartiers** : polygone GeoJSON sur la carte (tentative de chevauchement →
   erreur `409`).
5. **Console DSL** (langage de requête maison, moteur Python PLY) :
   - `FIND incidents WHERE status = 'open' LIMIT 5` → résultats ;
   - `FIND passwords` → « Unknown collection » (liste blanche stricte) ;
   - `FIND services WHERE type = 'free' OR type = 'exchange'` → `$or` MongoDB ;
   - Souligner : `LIKE` est une recherche **littérale échappée** (anti-ReDoS), le
     plafond de résultats est appliqué, et un **modérateur est borné à son
     quartier**.

## 4. Client lourd JavaFX — hors ligne et conflits (18:00 → 23:00)

> Installeur de la release `v1.0.3` (deb / dmg / msi), connecté à la prod.

1. Lancer l'application desktop.
2. **Connexion SSO** depuis l'admin web (flux PKCE, token à usage unique, TTL
   court, callback en boucle locale).
3. Couper le **Wi-Fi du poste** (pas la prod).
4. Créer un incident dans le desktop → enregistré **localement (SQLite)**.
5. Rétablir le réseau → **synchronisation automatique** ; l'incident remonte
   côté web. Le pull d'incidents est **paginé** (aucune perte au-delà de 100).
6. **Conflit** : modifier le même incident côté web et côté desktop hors ligne,
   puis resynchroniser → résolution **Three-Way Merge** (ancêtre / local /
   distant) présentée à l'utilisateur.
7. Montrer l'onglet **Plugins** (thèmes, export, notifications, mode compact,
   packs de langue).

## 5. Preuves de qualité (23:00 → 25:00)

- Montrer l'onglet **Actions** de GitHub : le workflow **CI** (lint, typecheck,
  tests unitaires, build) et le workflow **E2E complet** au vert, ainsi que le
  **déploiement** `main` en prod réussi.
- Rappeler les chiffres : **86 routes REST / 16 modules NestJS**, **~1 300 tests
  automatisés** (unitaires API + E2E Supertest + Playwright + JUnit/TestFX +
  pytest), couverture API élevée, **3 bases** et **livraison continue** vers OVH.

## Plan B

- **TOTP refusé** : vérifier l'horloge du poste, régénérer un code
  (`oathtool -b --totp <secret>`) ; au besoin refaire le ré-enrôlement (voir
  checklist).
- **Prod momentanément indisponible** : montrer les **captures/vidéo de secours**,
  la référence API **Scalar**, et le code (signature de contrat, `SyncService` /
  `ThreeWayMerger`).
- **Desktop KO** : présenter la **vidéo de secours** du parcours hors-ligne +
  conflit et le code de synchronisation.
- **Réseau instable** : partage de connexion mobile ; les tuiles de carte se
  mettent en cache après un premier zoom.
