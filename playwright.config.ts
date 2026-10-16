import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['planner.spec.ts', 'streets.spec.ts'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: './test-results/planner-e2e',
  reporter: [
    ['list'],
    ['json', { outputFile: './test-results/planner-e2e-results.json' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:5179',
    channel: 'chrome',
    viewport: { width: 1440, height: 1000 },
    locale: 'en-GB',
    timezoneId: 'Asia/Kolkata',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5179 --strictPort',
    url: 'http://127.0.0.1:5179/',
    reuseExistingServer: true,
  },
})