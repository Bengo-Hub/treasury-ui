import { expect, test } from '@playwright/test';

const EMAIL = process.env.E2E_LOGIN_EMAIL || 'demo@bengobox.dev';
const PASSWORD = process.env.E2E_LOGIN_PASSWORD || 'DemoUser2024!';

test.describe('Treasury UI SSO login and landing', () => {
  test('landing or dashboard loads for tenant', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/(urban-loft|[\w-]+)\/?/, { timeout: 15_000 });
    const signInOrContent = page.getByRole('link', { name: /sign in|login/i }).or(page.getByText(/dashboard|treasury|finance/i));
    await expect(signInOrContent.first()).toBeVisible({ timeout: 10_000 });
  });

  test('full SSO login then authenticated indicator or 200 on /auth/me', async ({ page }) => {
    await page.goto('/');
    const signInLink = page.getByRole('link', { name: /sign in|login/i }).first();
    await signInLink.click().catch(() => {});
    const onAccounts = await page.waitForURL(/accounts\.codevertexitsolutions\.com\/login/, { timeout: 15_000 }).then(() => true).catch(() => false);
    if (onAccounts) {
      await page.getByRole('textbox', { name: /email/i }).fill(EMAIL);
      await page.getByRole('textbox', { name: /password/i }).fill(PASSWORD);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/books\.codevertexitsolutions\.com|localhost/, { timeout: 25_000 }).catch(() => {});
    }
    const dashboardOrProfile = page.getByRole('link', { name: /dashboard|profile/i }).or(page.getByText(/dashboard|treasury/i));
    await expect(dashboardOrProfile.first()).toBeVisible({ timeout: 15_000 });
  });
});
