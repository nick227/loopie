/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // Share the repository-root .env with the backend; only VITE_ values reach the browser.
  envDir: path.resolve(__dirname, '../..'),
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Mirrors apps/web/server/index.js's PROXIED_PATTERNS — the production `web` service proxies
    // these same public/tracking paths to `apps/server` over Railway's private network so they
    // resolve on one public domain (PUBLIC_APP_URL). Without an equivalent here, local dev's
    // PUBLIC_APP_URL=http://localhost:5173 (apps/server/src/lib/urls.ts's PUBLIC_BASE_URL) bakes
    // that origin into every rendered page's form-submit action, and Vite's dev server has no
    // route for it — the fetch() falls through to the SPA's index.html, and the client script's
    // `res.json()` throws "Unexpected end of JSON input" on the HTML response. Found live via
    // e2e/landing-page-hosted-submission.spec.ts, which failed on this before this fix.
    proxy: {
      '^/p/.*': { target: 'http://localhost:3001', changeOrigin: true },
      '^/r/.*': { target: 'http://localhost:3001', changeOrigin: true },
      '^/landing-pages/[^/]+/(submissions|form-start)$': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '^/river/posts/[^/]+(/(click|visit-profile))?$': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './setupTests.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
