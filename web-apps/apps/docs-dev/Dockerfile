FROM node:22-alpine AS builder
RUN npm install -g pnpm@9.15.9
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json* tsconfig.json ./
COPY packages/ ./packages/

COPY apps/docs-dev/ ./apps/docs-dev/

RUN pnpm install --frozen-lockfile

# Build the static site (Next output: 'export' → apps/docs-dev/out)
RUN pnpm --filter docs-dev run build

FROM caddy:2-alpine
# basePath /dev → nest the export so requests for /dev/* resolve on disk
COPY --from=builder /app/apps/docs-dev/out /srv/dev
COPY apps/docs-dev/Caddyfile /etc/caddy/Caddyfile
# Non-root: the port is > 1024 and caddy only writes under /data and
# /config (XDG dirs), so root brings nothing but risk.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /data /config
USER appuser
EXPOSE 3003
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
