import { defineConfig, devices } from '@playwright/test';

const defaultOrgSlug = process.env.E2E_ORG_SLUG || 'urban-loft';
const base = process.env.BASE_URL || 'https://books.codevertexafrica.com';

/**
 * Playwright E2E config for treasury-ui (tenant-scoped).
 * Set BASE_URL and E2E_ORG_SLUG to override. Local runs use headed browser unless CI=true.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  outputDir: 'test-results',
  use: {
    baseURL: `${base}/${defaultOrgSlug}`,
    headless: process.env.CI === 'true',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /docs-capture\/.*/,
    },
    // docs-capture logs in once (see e2e/docs-capture/auth.setup.ts) and every capture spec
    // reuses that saved session via storageState, instead of each spec driving its own full SSO
    // redirect round trip — repeating that in quick succession against the live SSO host proved
    // unreliable (see auth.setup.ts).
    {
      name: 'docs-capture-setup',
      testMatch: /docs-capture\/auth\.setup\.ts/,
    },
    {
      name: 'docs-capture',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/docs-capture/.auth/demo-tenant.json' },
      testMatch: /docs-capture\/.*\.spec\.ts/,
      dependencies: ['docs-capture-setup'],
    },
  ],
  timeout: 60_000,
});
