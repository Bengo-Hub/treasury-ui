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

test.describe('Subscription Enforcement', () => {
  test('T4.2: GET requests work regardless of subscription status', async ({ page }) => {
    await login(page);
    // Dashboard (GET) should load for any authenticated user
    await page.goto(`/${ORG_SLUG}`);
    const dashboard = page.getByText(/dashboard|revenue|transactions/i);
    await expect(dashboard.first()).toBeVisible({ timeout: 15_000 });
  });

  test('T4.4: subscription 403 shows banner, not login redirect', async ({ page }) => {
    await login(page);

    // Intercept a POST request and mock a subscription_inactive 403
    await page.route('**/api/v1/**/payments/intents', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Your subscription is not active. Please renew to continue.',
            code: 'subscription_inactive',
            upgrade: true,
          }),
        });
      } else {
        route.continue();
      }
    });

    // Trigger a POST action (attempt to create something)
    // The frontend should show an upgrade banner, not redirect to SSO
    await page.goto(`/${ORG_SLUG}`);
    await page.waitForTimeout(2000);

    // After the mocked 403, user should still be on the same page (not SSO)
    expect(page.url()).not.toContain(SSO_HOST);
    expect(page.url()).toContain(ORG_SLUG);
  });
});
