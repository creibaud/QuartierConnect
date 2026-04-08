FROM node:22-alpine AS builder
RUN npm install -g pnpm
WORKDIR /app

# Workspace root config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json* tsconfig.json ./
COPY packages/ ./packages/

# App source
COPY apps/admin/ ./apps/admin/

# Install all workspace deps
RUN pnpm install --frozen-lockfile

# Build admin
RUN pnpm --filter admin run build

# --- Production image ---
FROM caddy:2-alpine
COPY --from=builder /app/apps/admin/dist /srv
COPY apps/admin/Caddyfile /etc/caddy/Caddyfile
EXPOSE 3001
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
