# ─── Stage 1: Build @jilson/core ──────────────────────────────────────────────
FROM node:20-alpine AS core-build
WORKDIR /app

# Copy workspace root manifests
COPY package.json package-lock.json ./
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

COPY package.json package-lock.json ./
COPY core/package.json ./core/
COPY server/package.json ./server/
COPY client/package.json ./client/
COPY e2e/package.json ./e2e/

RUN npm ci --workspace server --ignore-scripts

COPY --from=core-build /app/core/dist ./core/dist
COPY core/package.json ./core/

COPY server/ ./server/
RUN npm --workspace server run build

# Generate Prisma client
RUN npm --workspace server run db:generate


# ─── Stage 4: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

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
COPY --from=server-build /app/server/node_modules/.prisma ./server/node_modules/.prisma
COPY server/prisma ./server/prisma

# Client dist is served as static files from server/public
COPY --from=client-build /app/client/dist ./server/public

EXPOSE 3000
CMD ["node", "server/dist/index.js"]
