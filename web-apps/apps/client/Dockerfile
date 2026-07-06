FROM node:22-alpine AS builder
RUN npm install -g pnpm@9.15.9
WORKDIR /app

# Workspace root config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json* tsconfig.json ./
COPY packages/ ./packages/

# App source
COPY apps/client/ ./apps/client/

# Install all workspace deps
RUN pnpm install --frozen-lockfile

# Build client
RUN pnpm --filter client run build

# --- Production image ---
FROM caddy:2-alpine
COPY --from=builder /app/apps/client/dist /srv
COPY apps/client/Caddyfile /etc/caddy/Caddyfile
# Non-root: the port is > 1024 and caddy only writes under /data and
# /config (XDG dirs), so root brings nothing but risk.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /data /config
USER appuser
EXPOSE 3000
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
