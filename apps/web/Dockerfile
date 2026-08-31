# Build stage — installs deps, typechecks, builds the static Vite bundle
FROM node:20-alpine AS builder
RUN corepack enable

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/sdk/package.json ./packages/sdk/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

# Copy full source
COPY . .

# Vite inlines import.meta.env.VITE_* into the built JS at BUILD time, not runtime — the
# deployed bundle must be built with the real API URL already baked in, or a browser loading it
# would try to call localhost:3001. Pass this as a Railway build-time variable
# (RAILWAY_BUILD_ARGS or a service variable referenced in railway.json's build.args once set).
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN pnpm --filter "./apps/web" typecheck
RUN pnpm --filter "./apps/web" build

# Runtime stage — serves the static Vite build (SPA fallback to index.html on unknown paths,
# same reasoning as the old `serve -s` setup: this app renders 100% of its routes client-side)
# and proxies a handful of public/tracking paths down to the server service over Railway's
# private network — see apps/web/server/index.js and apps/server/src/lib/urls.ts's
# PUBLIC_BASE_URL split for why those specific paths must live on this domain.
FROM node:20-alpine AS runner
WORKDIR /app

COPY apps/web/server/package.json ./server/package.json
RUN npm install --prefix ./server --omit=dev

COPY apps/web/server/index.js ./server/index.js
COPY --from=builder /app/apps/web/dist ./dist

EXPOSE 4173
# Reads $PORT itself (process.env.PORT) — Railway assigns its own port per service (confirmed
# live: it expected 8080, not this file's original hardcoded 4173). Exec form works fine here
# since there's no shell variable to expand — the old `serve -s dist -p ${PORT:-4173}` needed
# shell form specifically for that expansion.
CMD ["node", "server/index.js"]
