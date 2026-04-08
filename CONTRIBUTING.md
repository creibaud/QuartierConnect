# Contributing — QuartierConnect

Projet ESGI 3AL2 · Frédéric SANANES · Rendu final 19 juillet 2026

---

## Prérequis

- Docker + Docker Compose
- Node.js 20+ · pnpm 9+
- Java 21 · Maven (via `./mvnw`)
- Python 3.12+ · uv
- Make

```bash
make install        # pnpm install (api + web) + uv sync (dsl)
make docker-up      # 7 services : Caddy, API, Client, Admin, MongoDB, PostgreSQL, Neo4j
make seed           # comptes démo + graphe Neo4j
```

---

## Branches

| Branche      | Rôle                                         |
| ------------ | -------------------------------------------- |
| `main`       | Production — merge uniquement via PR validée |
| `master`     | Développement courant                        |
| `feat/<nom>` | Nouvelle fonctionnalité                      |
| `fix/<nom>`  | Correction de bug                            |
| `docs/<nom>` | Documentation uniquement                     |

Créer une branche depuis `master` :

```bash
git checkout master && git pull
git checkout -b feat/ma-fonctionnalite
```

---

## Workflow

1. **Coder** dans la bonne surface (voir tableau ci-dessous)
2. **Valider** avant tout commit : `make validate-fast`
3. **Committer** avec un message conventionnel
4. **Ouvrir une PR** vers `master` — `main` uniquement pour les releases

### Surfaces et répertoires

| Surface                | Répertoire                  | Langage                 |
| ---------------------- | --------------------------- | ----------------------- |
| API REST               | `api/`                      | TypeScript / NestJS     |
| Client habitant        | `web-apps/apps/client/`     | React / TanStack Router |
| Back-office admin      | `web-apps/apps/admin/`      | React / TanStack Router |
| Composants UI partagés | `web-apps/packages/ui/`     | React                   |
| Utilitaires partagés   | `web-apps/packages/shared/` | TypeScript              |
| Application desktop    | `desktop-app/`              | Java 21 / JavaFX        |
| DSL de requêtes        | `dsl/`                      | Python / PLY            |

---

## Validation obligatoire

Toutes les vérifications suivantes doivent passer avant de pousser.

```bash
make validate-fast      # lint + typecheck + tests unitaires (sans build)
make validate           # pipeline CI complète (lint + typecheck + tests + coverage + build)
```

### Détail des seuils

| Vérification  | Commande            | Seuil                                                  |
| ------------- | ------------------- | ------------------------------------------------------ |
| Lint API      | `make lint-api`     | zéro erreur                                            |
| Lint Web      | `make lint-web`     | zéro erreur                                            |
| Lint Desktop  | `make lint-desktop` | compilation sans erreur                                |
| Lint DSL      | `make lint-dsl`     | zéro erreur Ruff                                       |
| Typecheck     | `make typecheck`    | zéro erreur TypeScript                                 |
| Tests API     | `make test-cov`     | statements 80%, branches 75%, functions 80%, lines 80% |
| Tests Desktop | `make test-desktop` | tous les tests JUnit passent                           |
| Tests DSL     | `make test-dsl`     | tous les tests pytest passent                          |
| Tests E2E     | `make test-e2e`     | nécessite `make docker-up`                             |

---

## Conventions de commit

Format : `type(scope): description courte`

| Type       | Quand l'utiliser                             |
| ---------- | -------------------------------------------- |
| `feat`     | Nouvelle fonctionnalité                      |
| `fix`      | Correction de bug                            |
| `refactor` | Refactoring sans changement de comportement  |
| `test`     | Ajout ou correction de tests                 |
| `docs`     | Documentation uniquement                     |
| `chore`    | Mise à jour de dépendances, config, Makefile |
| `style`    | Formatage, espaces (sans logique)            |

Exemples :

```
feat(api): add PATCH /incidents/:id/status endpoint
fix(client): correct TOTP field focus on login step 2
test(api): add coverage for votes toggle logic
docs: update API.md with new DSL endpoint
```

---

## Règles de code

- **Zéro `console.log`** dans le code de production
- **Zéro `TODO`** dans le code commité
- **Zéro commentaire inline** expliquant du code évident
- Ne jamais éditer `routeTree.gen.ts` manuellement (auto-généré par `pnpm dev`)
- Mots de passe : **argon2** uniquement (pas bcrypt)
- Points de fidélité : transactions **PostgreSQL ACID** uniquement (jamais MongoDB)

### Tests — ce qui est attendu

- Chaque nouvel endpoint API → au moins 1 test unitaire dans le controller
- Chaque nouveau fichier de logique → fichier de test correspondant :
  - API : `.spec.ts` dans le même répertoire
  - Desktop : `.java` dans `src/test/java/`
  - DSL : `test_*.py` dans `dsl/tests/`

---

## Développement par surface

### API NestJS

```bash
make dev-api            # hot reload sur :5000
make test-watch         # Jest en mode watch
make lint-api
make test-cov           # coverage report dans api/coverage/
```

### Web (client + admin)

```bash
make dev-client         # Vite :3000
make dev-admin          # Vite :3001
cd web-apps && pnpm run typecheck
make lint-web
```

### Desktop JavaFX

```bash
make dev-desktop        # javafx:run
make test-desktop       # JUnit 5 via Maven Surefire
make build-desktop      # fat JAR → desktop-app/target/quartierconnect-desktop.jar
```

### DSL Python

```bash
make lint-dsl           # Ruff
make test-dsl           # pytest
make build-dsl          # vérification syntaxe ast.parse
```

---

## Composants UI Shadcn

Les composants sont installés dans `web-apps/packages/ui/src/components/`.

```bash
cd web-apps/apps/client
pnpm dlx shadcn@latest add <composant>
```

---

## Comptes démo

| Email         | Mot de passe | Rôle      |
| ------------- | ------------ | --------- |
| alice@demo.fr | Demo1234!    | resident  |
| bob@demo.fr   | Demo1234!    | moderator |
| admin@demo.fr | Demo1234!    | admin     |

TOTP secret commun : `JBSWY3DPEHPK3PXP`

```bash
make totp
# ou : oathtool --totp --base32 JBSWY3DPEHPK3PXP
```
