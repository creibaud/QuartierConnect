FROM node:22-alpine AS builder
RUN npm install -g pnpm@9.15.9
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json* tsconfig.json ./
COPY packages/ ./packages/

COPY apps/admin/ ./apps/admin/

RUN pnpm install --frozen-lockfile

RUN pnpm --filter admin run build

FROM caddy:2-alpine
COPY --from=builder /app/apps/admin/dist /srv
COPY apps/admin/Caddyfile /etc/caddy/Caddyfile
# Non-root: the port is > 1024 and caddy only writes under /data and
# /config (XDG dirs), so root brings nothing but risk.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /data /config
USER appuser
EXPOSE 3001
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
