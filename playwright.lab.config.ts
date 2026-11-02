import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/lab',
  testMatch: '**/*.lab.ts',
  fullyParallel: true,
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 6000 },
  outputDir: 'lab-results',
  reporter: [
    ['list'],
    ['json', { outputFile: 'lab-results/results.json' }],
    ['html', { outputFolder: 'lab-playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4318',
    reducedMotion: 'no-preference',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: '360',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 360, height: 800 },
      },
    },
    {
      name: '390',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
    {
      name: '768',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
        browserName: 'webkit',
      },
    },
  ],
  webServer: {
    command: 'npm run lab:preview',
    url: 'http://127.0.0.1:4318/template-lab/',
    reuseExistingServer: !process.env.CI,
  },
});
