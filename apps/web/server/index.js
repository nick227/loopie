// Runtime for the `web` Railway service. Two jobs, one process, one public domain
// (loopie.up.railway.app):
//
//   1. Serve the static Vite SPA build (dashboard).
//   2. Proxy the handful of PUBLIC/tracking paths that `apps/server` actually renders/handles
//      — hosted landing pages (/p/{slug}), tracked-click redirects (/r/...), and the public
//      submit/form-start actions embedded in rendered landing-page HTML — over Railway's
//      private network, so they resolve on this same public domain instead of the server
//      service's own separate Railway domain.
//
// See apps/server/src/lib/urls.ts's PUBLIC_BASE_URL / PUBLIC_SERVER_URL split for the other
// half of this: only the paths listed below actually need to live on this domain (a
// fetch()-driven form submit needs same-origin to avoid CORS; a <script>/<img> tag does not).
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PORT = process.env.PORT || 4173
const SERVER_TARGET = process.env.INTERNAL_SERVER_URL

const app = express()

const PROXIED_PATTERNS = [/^\/p\//, /^\/r\//, /^\/landing-pages\/[^/]+\/(submissions|form-start)$/]

if (SERVER_TARGET) {
  // Mounted with no path prefix (app.use(middleware), not app.use('/p', middleware)) so Express
  // never strips part of the path before we see it — pathFilter alone decides whether to proxy
  // (with the full original path forwarded upstream) or call next() into the static/SPA
  // fallback below.
  app.use(
    createProxyMiddleware({
      target: SERVER_TARGET,
      changeOrigin: true,
      pathFilter: (pathname) => PROXIED_PATTERNS.some((re) => re.test(pathname)),
    }),
  )
} else {
  console.error(
    'INTERNAL_SERVER_URL is not set — /p, /r, and landing-page submission routes will 404.',
  )
}

const dist = path.join(__dirname, '..', 'dist')
app.use(express.static(dist))
// SPA fallback — react-router handles every other route entirely client-side.
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))

app.listen(PORT, () => console.log(`web runtime listening on ${PORT}`))
