# Build stage — installs deps, generates Prisma client, typechecks
FROM node:20-alpine AS builder
RUN corepack enable

WORKDIR /app

# Copy workspace manifests first for layer caching. Every workspace package apps/server depends
# on needs its package.json present here — confirmed live: when packages/embed-contract/package.json
# was missing from this layer, `pnpm install --frozen-lockfile` did not create a working
# apps/server/node_modules/@project/embed-contract symlink (despite the lockfile listing it and
# the install step itself reporting success), so the runtime container hit MODULE_NOT_FOUND for
# it even though the real package.json/src were both already being copied into the runtime image.
# Copying page-renderer's manifest here additionally fixes a typecheck-time failure: its own deps
# (@prisma/client, @project/db) must be resolvable at install time or `tsc` fails downstream with
# "Cannot find module '@prisma/client'" inside packages/page-renderer/src.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY packages/ad-renderer/package.json ./packages/ad-renderer/
COPY packages/page-renderer/package.json ./packages/page-renderer/
COPY packages/embed-contract/package.json ./packages/embed-contract/
COPY apps/server/package.json ./apps/server/

RUN pnpm install --frozen-lockfile

# Copy full source
COPY . .

# Generate Prisma client and catch type errors at build time
RUN pnpm --filter "./packages/db" exec prisma generate
RUN pnpm --filter "./apps/server" typecheck

# Runtime stage — tsx runs TypeScript source directly, same as apps/ad-server: @project/db's
# package.json points `main` straight at its .ts source with no build step of its own, so a
# tsc-compiled dist/index.js would crash on its first `require('@project/db')` (confirmed live,
# not by inspection — see CLAUDE.md "Production Ops"). tsx's on-the-fly transpilation handles
# that .ts import fine, exactly like `pnpm dev` already does locally.
FROM node:20-alpine AS runner
RUN corepack enable
# Prisma's engine-selection probe runs again at runtime (not just at `prisma generate` time) to
# decide which pre-generated engine binary to load, and it mis-detects OpenSSL the same way on a
# bare alpine image with no openssl CLI/libs present — defaulting to "openssl-1.1.x" and trying
# to load a binary that needs libssl.so.1.1, which doesn't exist here. Installing openssl (giving
# the probe real OpenSSL 3.x to detect) fixes what schema.prisma's binaryTargets alone couldn't:
# that only controls which files get *generated*, not which one gets *selected* at runtime.
# Confirmed live: this exact crash still happened after the binaryTargets fix, until this line
# was added.
RUN apk add --no-cache openssl

WORKDIR /app
ENV NODE_ENV=production
# Durable media files: attach a Railway volume at /data/uploads and set UPLOAD_DIR=/data/uploads.
# Default without that is ./uploads, which is ephemeral across deploys.

# Needs packages/api-spec too (unlike ad-server) — index.ts reads openapi.yaml from it directly
# at startup, both to drive fastify-openapi-glue's spec-based routing and for the /docs UI.
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/packages/api-spec ./packages/api-spec
# page-renderer and server both import @project/ad-renderer. Its package points directly at
# TypeScript source, so the workspace symlink installed in node_modules needs this runtime target.
COPY --from=builder /app/packages/ad-renderer/src ./packages/ad-renderer/src
COPY --from=builder /app/packages/ad-renderer/package.json ./packages/ad-renderer/
# Several services import specific dependency-free subpaths off @project/sdk directly (e.g.
# AdRunService.ts's validateAdvertisement, ContactService.ts's importContactSchema) rather than
# the package's root export (which pulls in React/react-query — see packages/sdk/package.json's
# #exports map). node_modules/@project/sdk is a symlink into packages/sdk, so without this the
# symlink target is missing at runtime and any such import crashes with MODULE_NOT_FOUND —
# confirmed live, not by inspection: found via a real Railway healthcheck failure after this
# Dockerfile had otherwise never copied packages/sdk at all.
COPY --from=builder /app/packages/sdk/src ./packages/sdk/src
COPY --from=builder /app/packages/sdk/package.json ./packages/sdk/
# LandingPageService.ts/LandingPageRenderService.ts/LandingPageSubmissionService.ts/
# provisionDefaultPage.ts import @project/page-renderer directly. Same shape of bug as
# @project/sdk above: its package.json#main points straight at .ts source with no build step, so
# the node_modules symlink needs the real directory copied in or it's MODULE_NOT_FOUND at
# runtime — confirmed live via apps/ad-server hitting the identical crash for this same package.
COPY --from=builder /app/packages/page-renderer/src ./packages/page-renderer/src
COPY --from=builder /app/packages/page-renderer/package.json ./packages/page-renderer/
# AdvertisementService.ts imports @project/embed-contract directly — same no-build-step shape as
# the packages above, so it needs the same runtime copy. This copy alone was NOT sufficient on
# its own, though — see the pre-install manifest comment above for the other half of the fix.
COPY --from=builder /app/packages/embed-contract/src ./packages/embed-contract/src
COPY --from=builder /app/packages/embed-contract/package.json ./packages/embed-contract/
COPY --from=builder /app/apps/server/src ./apps/server/src
COPY --from=builder /app/apps/server/package.json ./apps/server/

EXPOSE 3001
CMD ["node_modules/.bin/tsx", "apps/server/src/index.ts"]
