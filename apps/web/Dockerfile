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

# Runtime stage — a plain static file server for the Vite build output. No Node app server is
# needed at runtime; this is a pure client-side SPA (react-router in browser/HTML5 mode).
FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g serve@14

COPY --from=builder /app/apps/web/dist ./dist

EXPOSE 4173
# -s enables SPA fallback (unknown paths serve index.html, so react-router's client-side routes
# work on a hard refresh/direct link) — required, since this app renders 100% of its routes
# client-side with no server-side route awareness. Binds to $PORT, not a hardcoded port — Railway
# assigns its own port per service and routes traffic there (confirmed live: it expected 8080,
# not this file's original hardcoded 4173, which would have made the deploy unreachable even on
# a successful build). Shell form (not exec-array) so ${PORT} actually expands. -p (plain port
# number), not -l/--listen — that flag wants a full URI with a scheme (tcp://host:port) and
# throws "Unknown --listen endpoint scheme (protocol): undefined" on a bare number, confirmed
# live via a real crashed deploy.
CMD serve -s dist -p ${PORT:-4173}
