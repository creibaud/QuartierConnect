# QuartierConnect

Plateforme communautaire de quartier permettant aux habitants de se connecter, partager des informations et interagir avec leur environnement local.

## Architecture

Le projet est composé de quatre modules principaux :

```text
QuartierConnect/
├── api/            # API REST (NestJS / TypeScript)
├── desktop-app/    # Application desktop (JavaFX / Java 25)
├── dsl/            # Langage de domaine spécifique (Python / PLY)
├── web-apps/       # Applications web (React / Turborepo)
└── docker-compose.yml
```

### Infrastructure

L'ensemble des services est orchestré via Docker Compose et exposé par un reverse proxy [Caddy](https://caddyserver.com/) :

| URL               | Service      |
|-------------------|--------------|
| `localhost`       | App cliente  |
| `admin.localhost` | Back-office  |
| `api.localhost`   | API NestJS   |

#### Bases de données

| Base          | Usage                          | Port  |
|---------------|--------------------------------|-------|
| PostgreSQL 17 | Données relationnelles         | 5432  |
| MongoDB 8     | Données documentaires          | 27017 |
| Neo4j 5       | Graphe de relations sociales   | 7474 / 7687 |

## Prérequis

- [Docker](https://www.docker.com/) et Docker Compose
- [Make](https://www.gnu.org/software/make/)
- [Node.js](https://nodejs.org/) >= 20 et [pnpm](https://pnpm.io/) (développement local)
- [Java 21](https://openjdk.org/) et [Maven](https://maven.apache.org/) (desktop uniquement)
- [Python 3.12+](https://www.python.org/) et [uv](https://docs.astral.sh/uv/) (DSL uniquement)

## Démarrage rapide

### Configuration

Copier le fichier d'environnement et l'adapter si nécessaire :

```bash
cp .env.example .env
```

### Avec Docker

```bash
make up       # Démarrer tous les services
make down     # Arrêter tous les services
make logs     # Suivre les logs
```

### Développement local

```bash
make install          # Installer les dépendances (API + web-apps)

make dev-api          # API en mode watch
make dev-client       # App cliente en mode dev
make dev-back-office  # Back-office en mode dev
make dev-desktop      # Application desktop JavaFX
```

### Bases de données uniquement

```bash
make db-up      # Démarrer uniquement PostgreSQL, MongoDB et Neo4j
make db-reset   # Réinitialiser toutes les données (destructif)
```

## Tests

```bash
make test              # Lancer tous les tests

make test-api          # Tests unitaires de l'API
make test-api-cov      # Tests API avec couverture
make test-api-e2e      # Tests end-to-end de l'API

make test-desktop      # Tests desktop (Maven)

make test-dsl          # Tests du DSL avec couverture
make test-dsl-watch    # Tests DSL en mode watch
```

## Formatage

```bash
make format              # Formater tout le code

make format-api          # API (Prettier + ESLint)
make format-web          # Web apps (Prettier + ESLint)
make format-dsl          # DSL (Ruff)
make format-desktop      # Desktop (Spotless / Maven)
```

> `format-desktop` nécessite le plugin [Spotless](https://github.com/diffplug/spotless/tree/main/plugin-maven) dans `desktop-app/pom.xml`.

## Shells de débogage

```bash
make shell-api       # Shell dans le conteneur API
make shell-postgres  # Shell psql
make shell-mongodb   # Shell mongosh
make shell-neo4j     # Shell cypher-shell
```

## Commandes Make disponibles

```bash
make help   # Afficher toutes les commandes disponibles
```

## Documentation des modules

- [API](./api/README.md) - NestJS REST API
- [Application desktop](./desktop-app/README.md) - JavaFX desktop app
- [DSL](./dsl/README.md) - Domain Specific Language Python
- [Web apps](./web-apps/README.md) - Monorepo React (client + back-office)
