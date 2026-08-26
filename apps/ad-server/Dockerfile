# Build stage — installs deps, generates Prisma client, typechecks
FROM node:20-alpine AS builder
RUN corepack enable

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY apps/ad-server/package.json ./apps/ad-server/

RUN pnpm install --frozen-lockfile

# Copy full source
COPY . .

# Generate Prisma client and catch type errors at build time
RUN pnpm --filter "./packages/db" exec prisma generate
RUN pnpm --filter "./apps/ad-server" typecheck

# Runtime stage — tsx runs TypeScript source directly, handling the @project/db workspace package
FROM node:20-alpine AS runner
RUN corepack enable

WORKDIR /app
ENV NODE_ENV=production

# Copy only what ad-server needs at runtime — no packages/api-spec or apps/server, this is a
# genuinely separate deployable, not the main API server.
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/apps/ad-server/src ./apps/ad-server/src
COPY --from=builder /app/apps/ad-server/package.json ./apps/ad-server/

EXPOSE 3002
CMD ["node_modules/.bin/tsx", "apps/ad-server/src/index.ts"]
