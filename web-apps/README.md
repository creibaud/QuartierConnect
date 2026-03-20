# Web Apps - QuartierConnect

Monorepo des applications web du projet QuartierConnect, géré avec [Turborepo](https://turbo.build/) et [pnpm workspaces](https://pnpm.io/workspaces).

## Stack technique

- **Monorepo** : Turborepo 2
- **Gestionnaire de paquets** : pnpm 9
- **Langage** : TypeScript 5
- **Framework UI** : React 19
- **Bundler** : Vite 7
- **Styles** : Tailwind CSS 4
- **Routing** : TanStack Router
- **Composants** : shadcn/ui (Radix UI)
- **Internationalisation** : Intlayer
- **Linting / Formatting** : ESLint + Prettier

## Structure

```text
web-apps/
├── apps/
│   ├── client/         # Application web cliente (residents)
│   └── back-office/    # Interface d'administration
├── packages/
│   └── ui/             # Bibliothèque de composants partagée
├── turbo.json
└── package.json
```

### Applications

#### `client` - Application cliente

Interface destinée aux habitants du quartier, accessible sur `localhost` en production.

#### `back-office` - Back-office

Interface d'administration accessible sur `admin.localhost` en production.

### Package partagé

#### `@workspace/ui`

Bibliothèque de composants React partagée entre les applications. Expose :

- `./components/*` - Composants UI (Button, etc.)
- `./hooks/*` - Hooks React partagés
- `./lib/*` - Utilitaires
- `./globals.css` - Styles globaux Tailwind

## Prérequis

- Node.js >= 20
- pnpm 9

## Installation

```bash
pnpm install
```

## Développement

```bash
# Toutes les apps en parallèle
pnpm dev

# Une app spécifique (depuis la racine du projet)
make dev-client       # App cliente uniquement
make dev-back-office  # Back-office uniquement
```

## Scripts disponibles

| Commande         | Description                                    |
| ---------------- | ---------------------------------------------- |
| `pnpm dev`       | Démarrer toutes les apps en mode développement |
| `pnpm build`     | Builder toutes les apps                        |
| `pnpm lint`      | Linter tous les packages                       |
| `pnpm format`    | Formatter tous les packages                    |
| `pnpm typecheck` | Vérifier les types TypeScript                  |

## Docker

Deux Dockerfiles sont fournis à la racine de ce dossier :

- `Dockerfile.client` - Image de production pour l'app cliente
- `Dockerfile.back-office` - Image de production pour le back-office

En production, les applications sont servies par Caddy via le `docker-compose.yml` racine.
