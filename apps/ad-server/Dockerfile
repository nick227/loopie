# Build stage — installs deps, generates Prisma client, typechecks
FROM node:20-alpine AS builder
RUN corepack enable

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY packages/ad-renderer/package.json ./packages/ad-renderer/
COPY packages/page-renderer/package.json ./packages/page-renderer/
COPY apps/ad-server/package.json ./apps/ad-server/

RUN pnpm install --frozen-lockfile

# Copy full source
COPY . .

# Generate Prisma client and catch type errors at build time. Uses tsconfig.build.json (excludes
# src/__tests__), not the plain `pnpm typecheck` script — several test files reach directly into
# apps/server/src (shared embed-serving logic, see e.g. __tests__/embedServing.test.ts), and this
# minimal build context only installs deps for packages/db + apps/ad-server, not apps/server or
# its own deps (@project/page-renderer, @project/embed-contract). Those cross-app test imports
# typecheck fine in CI/local dev (full monorepo installed) — confirmed live via a Railway build
# failure that a local `pnpm --filter ad-server typecheck` couldn't reproduce.
RUN pnpm --filter "./packages/db" exec prisma generate
RUN pnpm --filter "./apps/ad-server" exec tsc --noEmit -p tsconfig.build.json

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
#
# packages/page-renderer is required too: EmbedServingService.ts imports @project/page-renderer
# directly, and (like @project/db/@project/sdk) its package.json#main points straight at .ts
# source with no build step — node_modules/@project/page-renderer is a pnpm symlink into
# packages/page-renderer, so without copying the real directory here the symlink target is
# missing at runtime and the import crashes with MODULE_NOT_FOUND. Confirmed live via a Railway
# healthcheck failure (the process crash-looped before ever binding to PORT).
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/packages/ad-renderer/src ./packages/ad-renderer/src
COPY --from=builder /app/packages/ad-renderer/package.json ./packages/ad-renderer/
COPY --from=builder /app/packages/page-renderer/src ./packages/page-renderer/src
COPY --from=builder /app/packages/page-renderer/package.json ./packages/page-renderer/
COPY --from=builder /app/apps/ad-server/src ./apps/ad-server/src
COPY --from=builder /app/apps/ad-server/package.json ./apps/ad-server/

EXPOSE 3002
# Correction, found live: Railway's healthcheck probes PORT regardless of EXPOSE — the earlier
# assumption here (that EXPOSE alone was enough, no PORT needed) was wrong; the app now
# prioritizes process.env.PORT (see index.ts).
CMD ["node_modules/.bin/tsx", "apps/ad-server/src/index.ts"]
