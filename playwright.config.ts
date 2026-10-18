import { defineConfig } from '@playwright/test'

const port = Number(process.env.PLAYWRIGHT_PORT ?? 5181)

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['planner.spec.ts', 'streets.spec.ts', 'festival.spec.ts', 'previews.spec.ts', 'theme.spec.ts', 'trip.spec.ts'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: './test-results/planner-e2e',
  reporter: [
    ['list'],
    ['json', { outputFile: './test-results/planner-e2e-results.json' }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    channel: 'chrome',
    viewport: { width: 1440, height: 1000 },
    locale: 'en-GB',
    timezoneId: 'Asia/Kolkata',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: true,
  },
})