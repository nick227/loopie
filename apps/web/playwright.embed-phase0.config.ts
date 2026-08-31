import { defineConfig, devices } from '@playwright/test'

const hostPort = Number(process.env.EMBED_PHASE0_HOST_PORT ?? 4177)
const runtimePort = Number(process.env.EMBED_PHASE0_RUNTIME_PORT ?? 4178)

export default defineConfig({
  testDir: './e2e',
  testMatch: 'embed-phase0.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 30_000,

  use: {
    baseURL: `http://127.0.0.1:${hostPort}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  webServer: {
    command: 'pnpm exec tsx e2e/fixtures/embed-phase0-server.ts',
    url: `http://127.0.0.1:${runtimePort}/health`,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      EMBED_PHASE0_HOST_PORT: String(hostPort),
      EMBED_PHASE0_RUNTIME_PORT: String(runtimePort),
    },
  },
})
