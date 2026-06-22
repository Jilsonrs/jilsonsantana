# ─── Stage 1: Build @jilson/core ──────────────────────────────────────────────
FROM node:20-alpine AS core-build
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
FROM node:20-alpine AS client-build
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
FROM node:20-alpine AS server-build
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

# Generate the Prisma client BEFORE building: server code imports @prisma/client,
# so tsc fails without the generated types. Workspace install hoists Prisma to the
# ROOT node_modules, so the client is generated to /app/node_modules/.prisma.
RUN npm --workspace server run db:generate
RUN npm --workspace server run build


# ─── Stage 4: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Prisma query engine runtime deps
RUN apk add --no-cache openssl libc6-compat

# Copy root package files (needed for workspace resolution)
COPY package.json package-lock.json ./
COPY core/package.json ./core/
COPY server/package.json ./server/
COPY client/package.json ./client/
COPY e2e/package.json ./e2e/

# Install only production deps for server (and core)
RUN npm ci --workspace server --omit=dev --ignore-scripts

# Copy built artifacts
COPY --from=core-build /app/core/dist ./core/dist
COPY --from=server-build /app/server/dist ./server/dist
# Generated Prisma client lives in the ROOT node_modules (workspace hoisting)
COPY --from=server-build /app/node_modules/.prisma ./node_modules/.prisma
COPY server/prisma ./server/prisma

# Client dist is served as static files from server/public
COPY --from=client-build /app/client/dist ./server/public

EXPOSE 3000
CMD ["node", "server/dist/index.js"]
