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

test.describe('RBAC Permission-Gated UI', () => {
  test('T3.1: authenticated user can view dashboard', async ({ page }) => {
    await login(page);
    await page.goto(`/${ORG_SLUG}`);
    const dashboard = page.getByText(/dashboard|revenue|transactions/i);
    await expect(dashboard.first()).toBeVisible({ timeout: 15_000 });
  });

  test('T3.2: authenticated user can view transactions page', async ({ page }) => {
    await login(page);
    await page.goto(`/${ORG_SLUG}/transactions`);
    const content = page.getByText(/transactions|payment|amount/i);
    await expect(content.first()).toBeVisible({ timeout: 15_000 });
  });

  test('T3.3: authenticated user can view settlements page', async ({ page }) => {
    await login(page);
    await page.goto(`/${ORG_SLUG}/settlements`);
    // Should show settlements content or empty state
    const content = page.getByText(/settlement|payout|no.*settlement/i);
    await expect(content.first()).toBeVisible({ timeout: 15_000 });
  });

  test('T3.4: authenticated user can view gateways page', async ({ page }) => {
    await login(page);
    await page.goto(`/${ORG_SLUG}/gateways`);
    const content = page.getByText(/gateway|paystack|mpesa|payment method/i);
    await expect(content.first()).toBeVisible({ timeout: 15_000 });
  });

  test('T3.10: sidebar renders navigation groups', async ({ page }) => {
    await login(page);
    // Verify sidebar has the expected group structure
    const sidebar = page.locator('aside').or(page.locator('nav'));
    await expect(sidebar.first()).toBeVisible({ timeout: 10_000 });

    // Check for Treasury section header
    const treasuryHeader = page.getByText('Treasury', { exact: false });
    await expect(treasuryHeader.first()).toBeVisible();

    // Check for Dashboard link
    const dashboardLink = page.getByRole('link', { name: /dashboard/i });
    await expect(dashboardLink.first()).toBeVisible();
  });

  test('T3.11: collapsible menu groups expand on click', async ({ page }) => {
    await login(page);
    // Find a group button (e.g., "Money", "Sales", "Accounting")
    const groupButton = page.getByRole('button', { name: /money|sales|accounting|purchases|reports/i }).first();
    if (await groupButton.isVisible()) {
      await groupButton.click();
      // After clicking, sub-items should be visible
      await page.waitForTimeout(300); // animation
      const subItem = page.getByRole('link', { name: /transactions|invoices|chart of accounts|bills|financial statements/i }).first();
      await expect(subItem).toBeVisible({ timeout: 5_000 });
    }
  });
});
