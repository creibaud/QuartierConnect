# QuartierConnect — Web apps

Turborepo (pnpm workspaces) holding the two React 19 front-ends and the shared
packages they build on.

```
apps/
  client/      Resident app          → http://localhost:3000 (dev) · http://localhost (prod)
  admin/       Admin back-office      → http://localhost:3001 (dev) · http://localhost/admin (prod)
packages/
  shared/      Hooks, auth, API client, types (shared by both apps)
  ui/          Shadcn/ui + Tailwind v4 component library
```

Stack: React 19, TanStack Router/Query/Form, Shadcn/ui, Tailwind v4, Vite, i18next (FR/EN).

## Run

```bash
# From the repo root (recommended) — the API/DBs come from Docker:
make docker-up
make dev                # client + admin in parallel (hot reload)
make dev-client         # client only  (:3000)
make dev-admin          # admin only   (:3001)

# Or from this folder with Turbo directly:
pnpm install
pnpm dev
```

## Build / lint / typecheck / test

```bash
make build-web          # Vite build of both apps → apps/*/dist
make lint-web           # ESLint via Turbo
make typecheck          # tsc --noEmit across the workspace
make test-web           # Vitest (shared hooks + ui components)
make test-e2e-web       # Playwright — needs make dev + make docker-up
```

## Adding shadcn/ui components

```bash
pnpm dlx shadcn@latest add button -c apps/client
```

Components land in `packages/ui/src/components` and are imported from the
`@workspace/ui` package:

```tsx
import { Button } from "@workspace/ui/components/button";
```
