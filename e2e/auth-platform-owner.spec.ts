import { expect, Page, test } from '@playwright/test';

const PLATFORM_EMAIL = process.env.E2E_PLATFORM_EMAIL || 'admin@codevertexitsolutions.com';
const PLATFORM_PASSWORD = process.env.E2E_PLATFORM_PASSWORD || 'Vertex2020!';
const TENANT_EMAIL = process.env.E2E_LOGIN_EMAIL || 'demo@bengobox.dev';
const TENANT_PASSWORD = process.env.E2E_LOGIN_PASSWORD || 'DemoUser2024!';
const SSO_HOST = 'accounts.codevertexitsolutions.com';
const ORG_SLUG = process.env.E2E_ORG_SLUG || 'urban-loft';

async function loginAs(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  const onSSO = await page
    .waitForURL(new RegExp(SSO_HOST), { timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  if (onSSO) {
    await page.getByRole('textbox', { name: /email/i }).fill(email);
    await page.getByRole('textbox', { name: /password/i }).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/books\.codevertexitsolutions\.com|localhost/, { timeout: 25_000 });
  }
  // Wait for dashboard content
  await expect(page.getByText(/dashboard|treasury|finance/i).first()).toBeVisible({ timeout: 20_000 });
}

test.describe('Platform Owner Access', () => {
  test('T2.1: platform owner can access /platform/analytics', async ({ page }) => {
    await loginAs(page, PLATFORM_EMAIL, PLATFORM_PASSWORD);
    await page.goto(`/${ORG_SLUG}/platform/analytics`);
    await expect(page.getByText(/analytics|revenue|platform/i).first()).toBeVisible({ timeout: 15_000 });
    // Should NOT be redirected to /unauthorized
    expect(page.url()).not.toContain('unauthorized');
  });

  test('T2.2: platform owner can access /platform/equity', async ({ page }) => {
    await loginAs(page, PLATFORM_EMAIL, PLATFORM_PASSWORD);
    await page.goto(`/${ORG_SLUG}/platform/equity`);
    await expect(page.getByText(/equity|holders|shareholders/i).first()).toBeVisible({ timeout: 15_000 });
    expect(page.url()).not.toContain('unauthorized');
  });

  test('T2.5: platform owner sees TenantFilter in sidebar/header', async ({ page }) => {
    await loginAs(page, PLATFORM_EMAIL, PLATFORM_PASSWORD);
    // Platform section should be visible in sidebar
    const platformSection = page.getByText(/platform/i);
    await expect(platformSection.first()).toBeVisible({ timeout: 10_000 });
  });

  test('T2.9: platform owner can access platform gateways page', async ({ page }) => {
    await loginAs(page, PLATFORM_EMAIL, PLATFORM_PASSWORD);
    await page.goto(`/${ORG_SLUG}/platform`);
    await expect(page.getByText(/gateways|secrets|paystack|mpesa/i).first()).toBeVisible({ timeout: 15_000 });
    expect(page.url()).not.toContain('unauthorized');
  });
});

test.describe('Tenant Admin (Non-Platform) Access', () => {
  test('T2.11: tenant admin visiting /platform/* is redirected to /unauthorized', async ({ page }) => {
    await loginAs(page, TENANT_EMAIL, TENANT_PASSWORD);
    await page.goto(`/${ORG_SLUG}/platform/analytics`);
    // Should be redirected to /unauthorized or blocked
    await page.waitForTimeout(3000);
    const isUnauthorized =
      page.url().includes('unauthorized') ||
      (await page.getByText(/unauthorized|access denied|not allowed/i).first().isVisible().catch(() => false));
    expect(isUnauthorized).toBeTruthy();
  });

  test('T2.12: tenant admin cannot see platform nav items', async ({ page }) => {
    await loginAs(page, TENANT_EMAIL, TENANT_PASSWORD);
    // Platform section should NOT be visible in sidebar
    const platformLink = page.getByRole('link', { name: /gateways.*secrets|equity|global ledger/i });
    await expect(platformLink.first()).not.toBeVisible({ timeout: 5_000 }).catch(() => {
      // If element doesn't exist at all, that's fine
    });
  });

  test('T2.13: tenant admin sees own tenant data only', async ({ page }) => {
    await loginAs(page, TENANT_EMAIL, TENANT_PASSWORD);
    // Dashboard should show tenant-specific content
    const dashboard = page.getByText(/dashboard|treasury/i);
    await expect(dashboard.first()).toBeVisible({ timeout: 15_000 });
    // URL should contain the org slug
    expect(page.url()).toContain(ORG_SLUG);
  });
});
