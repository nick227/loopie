# ad-server

A standalone deployable service — not a route group inside `apps/server`. It exists so first-party
ad serving (impressions, click redirects, embeds — a public, extremely latency-sensitive traffic
path) can scale, deploy, and fail independently from account management, campaign CRUD, and
landing-page editing, which all stay in `apps/server`.

It shares the canonical database (`@project/db`) with `apps/server` — same `AdUnit`, `Deployment`,
`AttributionEvent`, `Lead`, `Sale` tables — but is a separate Railway service with its own health
check, environment configuration, and process. See [the data model](../../docs/architecture/00-unified-data-model.md) and the AdUnit
section of `packages/db/prisma/schema.prisma` for why AdUnit is a distinct model from Deployment.

## Deliberately not contract-first

Unlike `apps/server`, this service does **not** route through `packages/api-spec/openapi.yaml` /
`fastify-openapi-glue`. Its routes serve public traffic and are consumed by
embed snippets and tracking pixels — not by the LOOPIE web app's typed SDK. Wiring a second glue
pipeline for these routes would add machinery without a consumer that benefits from it. Routes are
registered directly in `src/routes.ts`.

## Routes

Reviewed against `src/routes.ts` and `src/index.ts` on 2026-09-13. The AdUnit endpoints below are the compatibility serving path; the service also handles Advertisement embeds and the publisher runtime.

| Route                          | Purpose                                                                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /health`                  | Liveness check                                                                                                                                                        |
| `GET /serve/:adUnitId`         | JSON creative payload for custom embed rendering                                                                                                                      |
| `GET /embed/:adUnitId`         | Self-contained HTML snippet, suitable for an `<iframe>`                                                                                                               |
| `GET /impression/:adUnitId`    | Tracking-pixel pattern (`<img src="...">`) — increments `AdUnit.impressions`, no per-event row (see schema comment)                                                   |
| `GET /click/:adUnitId?sid=...` | Records an `AttributionEvent`, increments `AdUnit.clicks`, 302s to the destination (landing page if set, else `destinationUrl`, else the campaign's `destinationUrl`) |

### Advertisement and publisher runtime

| Route                                 | Purpose                                                                |
| ------------------------------------- | ---------------------------------------------------------------------- |
| `GET /ads/:advertisementId/embed`     | Internal Advertisement iframe rendering                                |
| `GET /v1.js`                          | Publisher loader script                                                |
| `POST /v1/embeds/:publicId/authorize` | Origin authorization and bootstrap metadata                            |
| `GET /e/:publicId`                    | Publisher iframe rendering with a bootstrap token                      |
| `POST /v1/embed-instances/redeem`     | Placeholder acknowledgement; not a completed redemption implementation |
| `POST /v1/embed-events`               | Handles `ad_impression` and `page_viewed` events                       |
| `GET /v1/embed/:publicId/click`       | Records publisher click and redirects                                  |
| `POST /v1/embed/:publicId/submit`     | Form submission; requires `instanceId`                                 |

See `EmbedServingService.ts` and the shared `@project/embed-contract` package for authorization, rendering, and attribution behavior. Public CORS does not replace the embed authorization checks.

## Env

See `.env.example` at the repo root: `DATABASE_URL` (shared with `apps/server`), `AD_SERVER_PORT`,
`PRIMARY_APP_URL` (used to build hosted landing-page redirect URLs).

## Local dev

`pnpm dev` at the repo root starts every `apps/*` package in parallel, ad-server included, on
`AD_SERVER_PORT`, falling back to `PORT`, then `3002`. Run it standalone with `pnpm --filter ad-server dev`.

## Railway deployment

`Dockerfile` and `railway.json` live in this directory (not the repo root) so ad-server is a
second, independent service inside the same Railway project as `apps/server` — not a redeploy of
the same image. In the Railway dashboard, when creating the ad-server service: point its build
config at this directory (Config-as-code path `apps/ad-server/railway.json`), link the same MySQL
service `apps/server` uses so `DATABASE_URL` is shared, and set `AD_SERVER_PORT`, `PRIMARY_APP_URL`
(the deployed `apps/server` URL), and `AD_SERVER_URL` (this service's own deployed URL — needed by
`apps/server`'s `AdUnitService` to build `serveUrl`). Both services have their own `Dockerfile` and `railway.json`. Build from the repository root so shared workspace packages are available; select the appropriate service Dockerfile/config path. Both container start commands run `prisma migrate deploy` before `tsx`. See [migration policy](../../docs/deploy/database-migrations.md). These are checked-in deployment settings, not a confirmation of current production health.

Main server's `apps/server/src/index.ts` sets no CORS restriction issue here since ad-server has
its own `@fastify/cors` registration with `origin: true` (open) — required because its routes are
embedded on arbitrary third-party pages, unlike the main app which only talks to the LOOPIE web
frontend.
