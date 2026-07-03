# Jeu vide

Ce jeu d'essai remet les trois bases à zéro, sans aucune donnée. Il ne
contient volontairement aucun fichier d'import : l'application recrée
elle-même tout ce dont elle a besoin.

## Pourquoi aucun fichier n'est nécessaire

| Base | Création du schéma |
|------|--------------------|
| PostgreSQL | Les migrations sont appliquées automatiquement au démarrage de l'API (dossier `api/drizzle/`). Le script d'import ne touche pas au schéma : il vide seulement les tables (`TRUNCATE`). |
| MongoDB | Les collections (et les buckets GridFS `pdfs`, `avatars`, `messaging_files`) sont créées à la volée par l'API à la première écriture. Les index sont recréés au démarrage de l'API. |
| Neo4j | La base ne définit aucune contrainte ni index applicatif (vérifié avec `SHOW CONSTRAINTS`) : il n'y a donc rien à rejouer. Les nœuds et relations sont créés par l'API au fil de l'utilisation. |

## Utilisation

Depuis la racine du dépôt, avec la pile Docker démarrée :

```bash
./livrables/jeux-essais/import-dataset.sh jeu-vide
```

Le script purge les trois bases (`TRUNCATE`, `deleteMany`, `DETACH DELETE`)
et s'arrête là. On obtient une application vierge : premier compte à créer
depuis l'écran d'inscription.
