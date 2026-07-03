# Jeux d'essais

Deux jeux de données au format texte, importables dans les trois bases de
l'application (PostgreSQL, MongoDB, Neo4j) via un script unique :

| Jeu | Contenu |
|-----|---------|
| `jeu-demo/` | État complet de démonstration : comptes avec TOTP, 20 quartiers (arrondissements de Paris), services d'entraide, événements, votes, contrats signés (PDF inclus), messagerie, incidents, points, graphe social Neo4j. |
| `jeu-vide/` | Aucune donnée : remise à zéro des trois bases pour partir d'une application vierge. |

Taille totale : environ 1 Mo, uniquement des fichiers texte lisibles
(SQL, JSON, Cypher).

## Prérequis

1. La pile Docker de développement est démarrée :

   ```bash
   make dev
   ```

2. L'API a démarré au moins une fois : c'est elle qui applique les
   migrations PostgreSQL au boot et crée le schéma. Le script d'import le
   vérifie et refuse de continuer si aucune table n'existe.

## Import

Depuis la racine du dépôt :

```bash
./livrables/jeux-essais/import-dataset.sh jeu-demo   # jeu de démonstration
./livrables/jeux-essais/import-dataset.sh jeu-vide   # bases vides
```

Le script est idempotent (relançable à volonté) et procède toujours dans le
même ordre :

1. **Purge** des trois bases sans toucher aux schémas :
   `TRUNCATE` des tables PostgreSQL, `deleteMany` sur chaque collection
   MongoDB, `MATCH (n) DETACH DELETE n` côté Neo4j.
2. **Import** du jeu choisi : `psql` (transaction unique),
   `mongoimport --drop` collection par collection, `cypher-shell`.
3. **Bilan** : comptage final dans chaque base puis rappel des comptes de
   démonstration.

Après l'import, redémarrer l'API pour recréer les index MongoDB et vider
les caches :

```bash
docker compose -f docker/docker-compose.yml --env-file .env restart api
```

Les identifiants de connexion aux bases sont lus dans le `.env` à la racine
du dépôt, comme pour les autres scripts du projet.

## Comptes de démonstration (jeu-demo)

| Email | Mot de passe | Rôle | TOTP |
|-------|--------------|------|------|
| `alice@demo.fr` | `Demo1234!` | Modératrice | secret `JBSWY3DPEHPK3PXP` |
| `bob@demo.fr` | `Demo1234!` | Modérateur | secret `JBSWY3DPEHPK3PXP` |
| `admin@demo.fr` | `Demo1234!` | Administrateur | secret `JBSWY3DPEHPK3PXP` |

Le code TOTP à 6 chiffres se génère depuis le secret, par exemple :

```bash
oathtool -b --totp JBSWY3DPEHPK3PXP
```

## Contenu détaillé de `jeu-demo/`

### `postgres.sql`

Dump **données seules** (`pg_dump --data-only --column-inserts`) : 217
`INSERT` couvrant les utilisateurs (162), incidents (18), soldes de points
(14), transactions de points (21) et jetons révoqués (2).

Le schéma n'est volontairement **pas** inclus : il est créé et versionné par
les migrations que l'API applique à chaque démarrage (dossier
`api/drizzle/`). Le dump reste ainsi valable quelle que soit la version du
schéma, et l'import ne risque jamais d'écraser une migration.

### `mongo/`

Un fichier JSON par collection (`mongoexport --jsonArray --pretty`, format
Extended JSON), soit 20 collections : `users`, `conversations`, `messages`,
`services`, `events`, `contracts`, `servicebookings`, `serviceresponses`,
`communityvotes`, `votes`, `documents`, `documentaudits`, `neighborhoods`,
`ssotokens`, plus les six collections GridFS (`pdfs.files`, `pdfs.chunks`,
`avatars.files`, `avatars.chunks`, `messaging_files.files`,
`messaging_files.chunks`).

Les fichiers binaires (PDF de contrats, avatars, pièces jointes) sont
inclus dans les chunks GridFS, encodés en base64 : le jeu reste un fichier
texte tout en restaurant les documents à l'identique. Les collections vides
(`ssotokens`, `documentaudits`) contiennent `[]` et sont ignorées à
l'import.

### `neo4j.cypher`

219 nœuds (`User`, `Neighborhood`, `Service`, `Event`) et 42 relations
(`LIVES_IN`, `LOCATED_IN`, `HELD_IN`, `INTERESTED_IN`, `HELPED`) exprimés
en instructions `MERGE` idempotentes : rejouer le
fichier sur une base déjà peuplée ne crée aucun doublon. Les propriétés
(dates, points, identifiants croisés avec PostgreSQL et MongoDB) sont
conservées.
