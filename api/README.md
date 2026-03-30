# API - QuartierConnect

API REST du projet QuartierConnect, construite avec [NestJS](https://nestjs.com/) et TypeScript.

## Stack technique

- **Framework** : NestJS 11
- **Runtime** : Node.js
- **Langage** : TypeScript 5
- **Gestionnaire de paquets** : pnpm
- **Tests** : Jest (unitaires + e2e)
- **Linting / Formatting** : ESLint + Prettier

## Structure

```text
api/
├── src/
│   ├── main.ts               # Point d'entrée, bootstrap NestJS
│   ├── app.module.ts         # Module racine
│   ├── app.controller.ts     # Contrôleur racine
│   └── app.service.ts        # Service racine
├── test/
│   └── app.e2e-spec.ts       # Tests end-to-end
├── Dockerfile
└── nest-cli.json
```

## Bases de données

L'API se connecte aux trois bases de données définies dans le `docker-compose.yml` :

| Variable         | Description                   |
| ---------------- | ----------------------------- |
| `DATABASE_URL`   | URL de connexion PostgreSQL   |
| `MONGODB_URL`    | URL de connexion MongoDB      |
| `NEO4J_URL`      | URL bolt Neo4j                |
| `NEO4J_USERNAME` | Utilisateur Neo4j             |
| `NEO4J_PASSWORD` | Mot de passe Neo4j            |
| `PORT`           | Port d'écoute (défaut : 3000) |

## Développement local

### Prérequis

- Node.js >= 20
- pnpm
- Bases de données démarrées (`make db-up` depuis la racine)

### Installation

```bash
pnpm install
```

### Démarrer en mode watch

```bash
pnpm start:dev
```

L'API est accessible sur `http://localhost:3000`.

## Scripts disponibles

| Commande                        | Description                      |
| ------------------------------- | -------------------------------- |
| `pnpm start`                    | Démarrer l'API                   |
| `pnpm start:dev`                | Démarrer en mode watch           |
| `pnpm start:debug`              | Démarrer en mode debug + watch   |
| `pnpm start:prod`               | Démarrer depuis le build compilé |
| `pnpm build`                    | Compiler le projet               |
| `pnpm test`                     | Lancer les tests unitaires       |
| `pnpm test:cov`                 | Tests unitaires avec couverture  |
| `pnpm test:e2e`                 | Tests end-to-end                 |
| `pnpm format`                   | Formater et linter le code       |
| `pnpm lint`                     | Linter le code                   |
| `pnpm outbox:process`           | Traiter un batch Outbox          |
| `pnpm outbox:requeue <eventId>` | Rejouer un dead-letter           |

## Docker

L'image Docker est construite depuis le `Dockerfile` présent dans ce dossier. En production, l'API est accessible via le reverse proxy Caddy à l'adresse `api.localhost`.

```bash
# Depuis la racine du projet
make build    # Construire l'image
make up       # Démarrer tous les services
make logs-api # Suivre les logs de l'API
```

## Runbook Outbox

Le runbook de replay Outbox est disponible dans [docs/OUTBOX_REPLAY_RUNBOOK.md](../docs/OUTBOX_REPLAY_RUNBOOK.md).

Le worker Outbox continu est active par defaut dans l'API et traite periodiquement les evenements pending/failed.

Endpoint admin manuel:

- `POST /v1/admin/outbox/run`
- `POST /v1/admin/outbox/run?limit=10`

Variables de configuration associees:

- `OUTBOX_CONTINUOUS_ENABLED` (`true`/`false`)
- `OUTBOX_POLL_INTERVAL_MS` (par defaut: `5000`)
- `OUTBOX_BATCH_LIMIT` (par defaut: `50`)
