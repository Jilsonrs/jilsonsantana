# ─── Stage 1: Build @jilson/core ──────────────────────────────────────────────
FROM node:24-alpine AS core-build
WORKDIR /app

# Copy workspace root manifests
COPY package.json package-lock.json tsconfig.base.json ./
COPY core/package.json ./core/

# Stub out other workspaces so npm ci resolves the graph without their files
COPY server/package.json ./server/
COPY client/package.json ./client/
COPY e2e/package.json ./e2e/

RUN npm ci --workspace core --ignore-scripts

COPY core/ ./core/
RUN npm --workspace core run build


# ─── Stage 2: Build client ────────────────────────────────────────────────────
FROM node:24-alpine AS client-build
WORKDIR /app

COPY package.json package-lock.json ./
COPY core/package.json ./core/
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY e2e/package.json ./e2e/

RUN npm ci --workspace client --ignore-scripts

# Copy built core so @jilson/core resolves from the local workspace
COPY --from=core-build /app/core/dist ./core/dist
COPY core/package.json ./core/

COPY client/ ./client/
RUN npm --workspace client run build


# ─── Stage 3: Build server ────────────────────────────────────────────────────
FROM node:24-alpine AS server-build
WORKDIR /app

# Prisma needs OpenSSL (+ libc6-compat on alpine) to detect and run its engine
RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json tsconfig.base.json ./
COPY core/package.json ./core/
COPY server/package.json ./server/
COPY client/package.json ./client/
COPY e2e/package.json ./e2e/

RUN npm ci --workspace server --ignore-scripts

COPY --from=core-build /app/core/dist ./core/dist
COPY core/package.json ./core/

COPY server/ ./server/

# Generate the Prisma client BEFORE building: the server imports it (via lib/prisma.ts),
# so tsc fails without it. Since Prisma 7 (26/10/2026) the client is generated INTO the
# code (server/src/generated/prisma) and compiled by tsc with the rest, into server/dist.
RUN npm --workspace server run db:generate
RUN npm --workspace server run build


# ─── Stage 4: Production image ────────────────────────────────────────────────
FROM node:24-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# O motor das migrations do Prisma (o job das migrations usa esta mesma imagem). O site não usa
# mais motor nenhum desde o Prisma 7: ele fala com o banco pelo `pg`.
RUN apk add --no-cache openssl libc6-compat

# Copy root package files (needed for workspace resolution)
COPY package.json package-lock.json ./
COPY core/package.json ./core/
COPY server/package.json ./server/
COPY client/package.json ./client/
COPY e2e/package.json ./e2e/

# Install only production deps for server (and core)
RUN npm ci --workspace server --omit=dev --ignore-scripts

# O motor das migrations do Prisma baixado AQUI, na montagem da imagem (o `--ignore-scripts` acima
# o deixa de fora): sem isto, o job das migrations o baixava a cada publicação, já com o endereço do
# banco de produção no ambiente (revisão de segurança, 26/10/2026). O `version` é o que o baixa.
# `--no-install`: o `prisma` daqui é o 7 instalado; sem ele, falha, em vez de baixar o mais novo.
RUN CHECKPOINT_DISABLE=1 npx --no-install prisma version

# Copy built artifacts
COPY --from=core-build /app/core/dist ./core/dist
COPY --from=server-build /app/server/dist ./server/dist
# O esquema, as migrations e a configuração do Prisma 7, para o job das migrations
# (`prisma migrate deploy --config server/prisma.config.ts`, no deploy.yml).
COPY server/prisma ./server/prisma
COPY server/prisma.config.ts ./server/prisma.config.ts

# Client dist is served as static files from server/public
COPY --from=client-build /app/client/dist ./server/public

EXPOSE 3000
CMD ["node", "server/dist/index.js"]
