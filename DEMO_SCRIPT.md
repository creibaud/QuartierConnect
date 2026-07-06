# Script de démonstration — QuartierConnect

> Durée cible : **25 minutes** de démo (+ questions).
> Comptes : `alice@demo.fr` (résident), `bob@demo.fr` (modérateur),
> `admin@demo.fr` (admin) — mot de passe `Demo1234!`, code TOTP via `make totp`.
> Préparation : voir [DEMO_CHECKLIST.md](DEMO_CHECKLIST.md).

## 0. Introduction (0:00 → 2:00)

- Présenter la plateforme : 4 surfaces (client résident, back office admin,
  API REST, client lourd JavaFX), 3 bases (PostgreSQL, MongoDB, Neo4j), 9
  conteneurs Docker.
- Montrer `make status` dans un terminal : tous les services `Up (healthy)`.

## 1. Connexion démo avec MFA (2:00 → 4:00)

1. Ouvrir http://localhost → « Se connecter » avec `alice@demo.fr` / `Demo1234!`.
2. Générer le code TOTP dans le terminal : `make totp` — expliquer RFC 6238,
   anti-rejeu (le même code soumis deux fois est refusé).
3. Arriver sur le tableau de bord résident.

À souligner : Argon2id pour les mots de passe, JWT access 15 min + refresh 7 j
avec rotation, cookie `httpOnly`.

## 2. Parcours résident (4:00 → 14:00)

### 2.1 Services entre voisins + réservation (4:00 → 7:00)

1. Onglet « Services » : parcourir les annonces du quartier.
2. Créer une annonce (titre, catégorie, type gratuit/échange, adresse avec
   autocomplétion).
3. Réserver un créneau sur un service existant (onglet « Réservations ») —
   montrer la confirmation.

### 2.2 Points (7:00 → 8:30)

1. Onglet « Points » : solde d'Alice.
2. Transférer 10 points à Bob → solde mis à jour.
3. Expliquer : transaction PostgreSQL ACID avec verrou `FOR UPDATE`,
   découvert limité à −10 par contrainte `CHECK`.

### 2.3 Incidents (8:30 → 10:00)

1. Onglet « Incidents » : signaler un incident (catégorie, description,
   localisation sur la carte).
2. Montrer la machine à états (open → in_progress → resolved).

### 2.4 Messagerie temps réel (10:00 → 11:30)

1. Ouvrir une seconde fenêtre (navigation privée) connectée en Bob.
2. Alice envoie un message → il apparaît instantanément chez Bob (Socket.io,
   salons `conversation:{id}`, JWT vérifié à la connexion WebSocket).

### 2.5 Votes et événements (11:30 → 14:00)

1. Onglet « Votes » : participer à un sondage de quartier, montrer les
   résultats en direct.
2. Onglet « Événements » : s'inscrire à un événement.
3. Onglet « Recommandations » : suggestions issues du graphe Neo4j
   (services/événements du quartier) — optionnel : montrer le graphe dans
   Neo4j Browser (http://localhost:7474).

## 3. Parcours admin (14:00 → 18:00)

1. Ouvrir http://localhost/admin → connexion `admin@demo.fr` + TOTP.
2. Tableau de bord : statistiques de la plateforme.
3. Modération : incidents et signalements, changement de statut.
4. Quartiers : montrer le polygone GeoJSON sur la carte (tentative de
   chevauchement → erreur 409).
5. Console DSL :
   - `FIND incidents WHERE status = 'open' LIMIT 5` → résultats ;
   - `FIND passwords` → erreur « Unknown collection » (liste blanche) ;
   - `FIND services WHERE type = 'free' OR type = 'exchange'` → `$or` MongoDB.

## 4. Client lourd JavaFX — hors ligne et conflits (18:00 → 23:00)

1. Lancer `java -jar desktop-app/target/quartierconnect-desktop.jar`.
2. Connexion SSO depuis l'admin web (token à usage unique, TTL 5 min).
3. Couper l'API : `docker pause docker-api-1`.
4. Créer un incident dans le desktop → enregistré localement (SQLite).
5. Rétablir : `docker unpause docker-api-1` → synchronisation automatique,
   l'incident apparaît côté web.
6. Conflit : modifier le même incident côté web et côté desktop hors ligne,
   puis resynchroniser → résolution **Three-Way Merge**
   (ancêtre / local / distant) présentée à l'utilisateur.
7. Montrer l'onglet Plugins (thèmes, export, notifications, mode compact,
   packs de langue).

## 5. Preuves de qualité (23:00 → 25:00)

Dans un terminal visible :

```bash
make test        # tests unitaires API + Web + Desktop + DSL
```

Rappeler les chiffres : 87 endpoints REST, 16 modules NestJS,
1 100+ tests automatisés (unitaires + E2E Supertest + Playwright + JUnit +
pytest), couverture API ≥ 80 %.

## Plan B

- Si le TOTP est refusé : vérifier l'horloge, régénérer avec `make totp`.
- Si un service est KO : `make docker-logs`, puis `make docker-reset` +
  `make seed` (5 min) — pendant ce temps, présenter l'architecture
  (docs/ARCHITECTURE.md) ou la référence Scalar.
- Si le desktop ne se lance pas : montrer la vidéo/les captures du
  guide (docs/USER_GUIDE.md) et le code de `SyncService` / `ThreeWayMerger`.
- Démo entièrement locale : aucune dépendance réseau externe hors tuiles
  OpenStreetMap (prévoir un zoom déjà en cache si le réseau est instable).
