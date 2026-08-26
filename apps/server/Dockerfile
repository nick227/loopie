# Build stage — installs deps, generates Prisma client, typechecks
FROM node:20-alpine AS builder
RUN corepack enable

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
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

WORKDIR /app
ENV NODE_ENV=production

# Needs packages/api-spec too (unlike ad-server) — index.ts reads openapi.yaml from it directly
# at startup, both to drive fastify-openapi-glue's spec-based routing and for the /docs UI.
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/packages/api-spec ./packages/api-spec
COPY --from=builder /app/apps/server/src ./apps/server/src
COPY --from=builder /app/apps/server/package.json ./apps/server/

EXPOSE 3001
CMD ["node_modules/.bin/tsx", "apps/server/src/index.ts"]
