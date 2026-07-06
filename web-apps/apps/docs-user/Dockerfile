FROM node:22-alpine AS builder
RUN npm install -g pnpm@9.15.9
WORKDIR /app

# Workspace root config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json* tsconfig.json ./
COPY packages/ ./packages/

# App source
COPY apps/docs-user/ ./apps/docs-user/

# Install all workspace deps
RUN pnpm install --frozen-lockfile

# Build the static site (Next output: 'export' → apps/docs-user/out)
RUN pnpm --filter docs-user run build

# --- Static production image ---
FROM caddy:2-alpine
# basePath /aide → nest the export so requests for /aide/* resolve on disk
COPY --from=builder /app/apps/docs-user/out /srv/aide
COPY apps/docs-user/Caddyfile /etc/caddy/Caddyfile
# Non-root: the port is > 1024 and caddy only writes under /data and
# /config (XDG dirs), so root brings nothing but risk.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /data /config
USER appuser
EXPOSE 3002
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
