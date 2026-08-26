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
# Prisma's engine-selection probe runs again at runtime to decide which pre-generated engine
# binary to load, and mis-detects OpenSSL on a bare alpine image with no openssl CLI/libs present
# — defaulting to "openssl-1.1.x" and trying to load a binary needing libssl.so.1.1, which doesn't
# exist here. See apps/server/Dockerfile for the full explanation — same fix, same shared
# @project/db dependency.
RUN apk add --no-cache openssl

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
# Unlike apps/web (a static server with no fixed port signal, which needed an explicit ${PORT}
# bind — see that Dockerfile), Railway infers this service's target port from EXPOSE above, and
# the app itself defaults AD_SERVER_PORT to 3002 when unset — confirmed consistent, no PORT env
# var needed here.
CMD ["node_modules/.bin/tsx", "apps/ad-server/src/index.ts"]
