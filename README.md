# QuartierConnect

Plateforme communautaire de quartier — ESGI 3AL2 · Étape 4 (95%)

> **Rendu final** : 19 juillet 2026 · **Enseignant** : Frédéric SANANES
> **v0.1.3** · **620 tests automatisés** · 7 conteneurs Docker · 3 bases de données · 4 surfaces

---

## Prérequis

- Docker + Docker Compose
- Make
- Node.js 20+ (pour le seed)
- Java 21 (pour le desktop)
- oathtool (`sudo apt install oathtool`) ou Google Authenticator

## Démarrage rapide

```bash
# 1. Configurer l'environnement
cp .env.example .env
# Éditer .env : POSTGRES_PASSWORD, MONGO_ROOT_PASSWORD, JWT_SECRET, NEO4J_AUTH

# 2. Lancer les 7 services Docker
make docker-up

# 3. Créer les comptes de démo + peupler Neo4j
make seed
```

| Surface               | URL                       |
| --------------------- | ------------------------- |
| **Client habitant**   | http://localhost          |
| **Admin back-office** | http://localhost/admin    |
| **API docs (Scalar)** | http://localhost/api/docs |
| **Neo4j Browser**     | http://localhost:7474     |

## Comptes démo

| Email         | Mot de passe | Rôle      | TOTP               |
| ------------- | ------------ | --------- | ------------------ |
| alice@demo.fr | Demo1234!    | resident  | `JBSWY3DPEHPK3PXP` |
| bob@demo.fr   | Demo1234!    | moderator | `JBSWY3DPEHPK3PXP` |
| admin@demo.fr | Demo1234!    | admin     | `JBSWY3DPEHPK3PXP` |

```bash
make totp
# Ou : oathtool --totp --base32 JBSWY3DPEHPK3PXP
```

## Développement local

```bash
make dev              # API + client + admin en parallèle (hot reload)
make dev-api          # API seule (port 5000)
make dev-client       # Client React (port 3000)
make dev-admin        # Admin React (port 3001)
make dev-desktop      # JavaFX (javafx:run)
```

## Tests

```bash
make test             # Unitaires API (236) + Web shared hooks (73) + Desktop (63) + DSL (21)
make test-cov         # + rapport coverage (stmts 95.7%, branches 86.1%)
make test-e2e         # E2E API Supertest (148) — nécessite Docker
make test-e2e-web     # E2E Playwright (79) — nécessite apps lancées
make validate         # Tout en séquence : lint + typecheck + tests + build
```

## Format

```bash
make format           # Formate les 4 composants (Prettier + Ruff)
make format-api       # API NestJS uniquement
make format-web       # Monorepo web uniquement
make format-desktop   # Desktop Java (compile -q)
make format-dsl       # DSL Python (ruff format)
```

## Build

```bash
make build            # Tous les composants
make build-desktop    # Fat JAR (~25 MB)
java -jar desktop-app/target/quartierconnect-desktop.jar
```

## Docker

```bash
make docker-up        # Démarrer
make docker-down      # Arrêter
make docker-reset     # Reset complet (⚠️ supprime volumes)
make docker-logs      # Logs temps réel
make status           # État des services
```

## Documentation

| Document                                               | Contenu                                                   |
| ------------------------------------------------------ | --------------------------------------------------------- |
| [docs/RAPPORT-TECHNIQUE.md](docs/RAPPORT-TECHNIQUE.md) | Rapport complet pour la soutenance — tous les algorithmes |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)           | Diagrammes Mermaid — modules, flux, sécurité              |
| [docs/DATABASE.md](docs/DATABASE.md)                   | Schémas PostgreSQL, MongoDB, Neo4j, SQLite                |
| [docs/SECURITY.md](docs/SECURITY.md)                   | Argon2id, TOTP, JWT, SSO, SHA-256, RGPD                   |
| [docs/TEST.md](docs/TEST.md)                           | Rapport QA — 620 tests, coverage, stratégie               |
| [docs/DSL.md](docs/DSL.md)                             | Micro-langage PLY — grammaire, pipeline, sécurité         |
| [docs/GUIDE-SOUTENANCE.md](docs/GUIDE-SOUTENANCE.md)   | Scénarios démo, questions/réponses, chiffres clés         |
| [docs/API.md](docs/API.md)                             | Référence complète des 50+ endpoints                      |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)               | Déploiement VPS + Caddy HTTPS                             |

## Stack

| Couche      | Technologie                                                                |
| ----------- | -------------------------------------------------------------------------- |
| **API**     | NestJS 11, TypeScript, Drizzle ORM, Mongoose, JWT HS256, argon2, speakeasy |
| **Client**  | React 19, TanStack Router/Query/Form, Shadcn/ui, Tailwind v4               |
| **Admin**   | React 19 (même stack), DSL editor, Mermaid                                 |
| **Desktop** | JavaFX 21, Maven Shade JAR, SQLite JDBC, java.net.http                     |
| **Bases**   | PostgreSQL 16, MongoDB 7, Neo4j 5, SQLite 3                                |
| **Proxy**   | Caddy 2 (HTTPS Let's Encrypt automatique)                                  |
| **CI/CD**   | GitHub Actions (lint + test + build), Turbo monorepo                       |
| **DSL**     | Python PLY + pythonia bridge                                               |
