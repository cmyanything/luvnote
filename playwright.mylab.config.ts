import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/lab',
  testMatch: '**/*.mylab.ts',
  fullyParallel: true,
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 8000 },
  outputDir: 'test-results/mylab',
  reporter: [['list'], ['json', { outputFile: 'test-results/mylab/results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:4319',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: '360', use: { viewport: { width: 360, height: 800 } } },
    { name: '390', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
    { name: 'webkit', use: { ...devices['iPhone 13'], browserName: 'webkit' } },
  ],
  webServer: {
    command: 'npm run preview -- --port 4319 --strictPort',
    url: 'http://127.0.0.1:4319/mylab/',
    reuseExistingServer: false,
  },
});
