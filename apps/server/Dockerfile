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

# The runtime stage below is a fresh `FROM`, not derived from this builder's filesystem beyond
# the explicit COPY --from lines further down — a browser Playwright downloaded here (outside
# node_modules, e.g. ~/.cache/ms-playwright) would never reach the runtime image anyway. Skip it
# here purely so the build doesn't spend time/bandwidth fetching a browser that gets thrown away;
# the runtime stage installs Alpine's own Chromium instead (musl-compatible; Playwright's bundled
# download assumes glibc and doesn't reliably run on Alpine — see htmlCaptureBrowser.ts's comment).
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
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

# Headless Chromium for PageThumbnailService/adCreativeCapture's real-browser HTML->PNG capture
# (Playwright). Alpine ships its own musl-built Chromium via apk — Playwright's own downloaded
# binary assumes glibc and is not reliably usable here, which is exactly why the builder stage
# skips that download entirely.
#
# Ask apk itself where the binary actually landed (`apk info -L`, the package's real file list)
# instead of guessing a name via `command -v` — confirmed live that the guess-based version
# silently produced a *broken* symlink: /bin/sh here is BusyBox ash, and per POSIX a bare variable
# assignment's exit status is 0 regardless of whether the command substitution inside it failed,
# so `command -v chromium || command -v chromium-browser` both failing never tripped the `&&`
# chain — it just quietly set an empty path, which `ln -sf` then happily "symlinked" anyway. The
# final `[ -e ... ]` now makes a bad resolution fail the *build*, not a production deploy.
RUN apk add --no-cache chromium nss freetype freetype-dev harfbuzz ca-certificates ttf-freefont && \
    CHROMIUM_BIN="/$(apk info -L chromium | grep -E 'bin/chromium(-browser)?$' | head -1)" && \
    [ "$CHROMIUM_BIN" != "/" ] && \
    echo "Resolved Alpine chromium binary: $CHROMIUM_BIN" && \
    ls -la "$CHROMIUM_BIN" && \
    ln -sf "$CHROMIUM_BIN" /usr/bin/chromium-browser && \
    ls -la /usr/bin/chromium-browser && \
    [ -f /usr/bin/chromium-browser ]
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

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
# Same MODULE_NOT_FOUND shape as every @project/* fix above, but for a real npm dependency this
# time: pnpm never hoists `playwright` to the root /app/node_modules copied above — it's only
# resolvable via the symlink at apps/server/node_modules/playwright (into the root .pnpm store),
# which nothing was copying. Confirmed live: htmlCaptureBrowser.ts's `await import('playwright')`
# threw ERR_MODULE_NOT_FOUND in production the moment this pass's boot-time thumbnail regen
# became the first runtime code path to ever actually exercise it (previously only reachable via
# the local-only regen script). Tiny (~176K, mostly symlinks) — safe to copy wholesale rather than
# enumerate which specific dependency needs it.
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules

EXPOSE 3001
# Applies any pending migration before the app starts serving — the only place this project's
# deploy pipeline ever ran a real DB sync against production was by hand, until this line. Same
# invocation pattern the builder stage above already proves works (`pnpm --filter "./packages/db"
# exec prisma generate`), just `generate` swapped for `migrate deploy`; `packages/db/node_modules`
# is already present in this runtime image via the COPY above, no new copy needed. Shell form so
# migrate deploy can run first, but `exec` hands PID 1 to tsx afterward so SIGTERM/graceful
# shutdown (index.ts's own SIGINT/SIGTERM handlers) still reach the real process directly, exactly
# as the previous exec-form CMD did. If migrate deploy fails, this exits non-zero and the container
# never starts — Railway's restartPolicyType/healthcheck then keep the previous version serving
# instead of cutting over to a broken one. Safe under concurrent starts (this service, ad-server,
# or multiple replicas of either) via Prisma's own advisory locking — see
# docs/deploy/database-migrations.md.
CMD ["sh", "-c", "pnpm --filter \"./packages/db\" exec prisma migrate deploy && exec node_modules/.bin/tsx apps/server/src/index.ts"]
