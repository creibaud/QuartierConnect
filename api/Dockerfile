FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 py3-pip
RUN npm install -g pnpm
COPY api/package.json api/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY api/ .
COPY dsl/ ./dsl/
RUN pip3 install --break-system-packages ply>=3.11
RUN pnpm run build

FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache python3 py3-pip
RUN pip3 install --break-system-packages ply>=3.11
RUN npm install -g pnpm
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dsl ./dsl
COPY --from=builder /app/package.json ./
ENV PYTHONPATH=/app
USER appuser
CMD ["node", "dist/main"]
