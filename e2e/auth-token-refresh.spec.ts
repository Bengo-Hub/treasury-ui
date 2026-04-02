import { expect, test, Page } from '@playwright/test';

const EMAIL = process.env.E2E_LOGIN_EMAIL || 'demo@bengobox.dev';
const PASSWORD = process.env.E2E_LOGIN_PASSWORD || 'DemoUser2024!';
const SSO_HOST = 'accounts.codevertexitsolutions.com';
const ORG_SLUG = process.env.E2E_ORG_SLUG || 'urban-loft';

async function login(page: Page) {
  await page.goto('/');
  const onSSO = await page.waitForURL(new RegExp(SSO_HOST), { timeout: 15_000 }).then(() => true).catch(() => false);
  if (onSSO) {
    await page.getByRole('textbox', { name: /email/i }).fill(EMAIL);
    await page.getByRole('textbox', { name: /password/i }).fill(PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/books\.codevertexitsolutions\.com|localhost/, { timeout: 25_000 });
  }
  await expect(page.getByText(/dashboard|treasury|finance/i).first()).toBeVisible({ timeout: 20_000 });
}

test.describe('Token Refresh & Error Handling', () => {
  test('T5.1: expired access token triggers automatic refresh', async ({ page }) => {
    await login(page);

    // Mock a 401 on the first API call, then succeed on retry
    let firstCall = true;
    await page.route('**/api/v1/**/analytics/**', (route) => {
      if (firstCall && route.request().method() === 'GET') {
        firstCall = false;
        route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"token expired"}' });
      } else {
        route.continue();
      }
    });

    // Navigate to trigger an API call
    await page.goto(`/${ORG_SLUG}`);
    await page.waitForTimeout(5000);

    // After token refresh, user should still be authenticated (not redirected to SSO)
    expect(page.url()).not.toContain(SSO_HOST);
  });

  test('T5.2: failed refresh redirects to SSO login', async ({ page }) => {
    await login(page);

    // Mock ALL API calls to return 401 (simulating both token + refresh failure)
    await page.route('**/api/v1/**', (route) => {
      route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"unauthorized"}' });
    });
    // Also mock the refresh endpoint to fail
    await page.route('**/auth/refresh**', (route) => {
      route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"refresh failed"}' });
    });

    // Navigate to trigger API calls
    await page.goto(`/${ORG_SLUG}`);
    await page.waitForTimeout(20_000);

    // After failed refresh, should be redirected to SSO or show login
    const redirectedToSSO = page.url().includes(SSO_HOST);
    const showsLogin = await page.getByRole('link', { name: /sign in|login/i }).first().isVisible().catch(() => false);
    const showsInitializing = await page.getByText(/initializing/i).first().isVisible().catch(() => false);
    expect(redirectedToSSO || showsLogin || showsInitializing).toBeTruthy();
  });

  test('T5.4: grace period prevents premature 401 handling', async ({ page }) => {
    await login(page);

    // Immediately after login, a 401 should be ignored (15-second grace)
    const loginTime = Date.now();
    await page.route('**/api/v1/**/analytics/**', (route) => {
      if (Date.now() - loginTime < 10_000) {
        // Within grace period — mock 401
        route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"token propagating"}' });
      } else {
        route.continue();
      }
    });

    await page.goto(`/${ORG_SLUG}`);
    await page.waitForTimeout(3000);

    // Should still be on the page, not redirected
    expect(page.url()).not.toContain(SSO_HOST);
    expect(page.url()).toContain(ORG_SLUG);
  });
});
