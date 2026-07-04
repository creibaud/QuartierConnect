FROM node:22-alpine AS builder
RUN npm install -g pnpm@9.15.9
WORKDIR /app

# Workspace root config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json* tsconfig.json ./
COPY packages/ ./packages/

# App source
COPY apps/docs-dev/ ./apps/docs-dev/

# Install all workspace deps
RUN pnpm install --frozen-lockfile

# Build the static site (Next output: 'export' → apps/docs-dev/out)
RUN pnpm --filter docs-dev run build

# --- Static production image ---
FROM caddy:2-alpine
# basePath /dev → nest the export so requests for /dev/* resolve on disk
COPY --from=builder /app/apps/docs-dev/out /srv/dev
COPY apps/docs-dev/Caddyfile /etc/caddy/Caddyfile
EXPOSE 3003
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
