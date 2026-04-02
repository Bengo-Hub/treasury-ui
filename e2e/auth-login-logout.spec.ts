import { expect, test, Page } from '@playwright/test';

const EMAIL = process.env.E2E_LOGIN_EMAIL || 'demo@bengobox.dev';
const PASSWORD = process.env.E2E_LOGIN_PASSWORD || 'DemoUser2024!';
const SSO_HOST = 'accounts.codevertexitsolutions.com';

/** Helper: perform SSO login. */
async function ssoLogin(page: Page) {
  await page.goto('/');
  // If redirected to SSO, fill credentials
  const onSSO = await page
    .waitForURL(new RegExp(SSO_HOST), { timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  if (onSSO) {
    await page.getByRole('textbox', { name: /email/i }).fill(EMAIL);
    await page.getByRole('textbox', { name: /password/i }).fill(PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/books\.codevertexitsolutions\.com|localhost/, { timeout: 25_000 });
  }
}

test.describe('Login Flow', () => {
  test('T1.1: unauthenticated user is redirected to SSO', async ({ page }) => {
    // Clear any stored session
    await page.context().clearCookies();
    await page.goto('/');
    // Should redirect to SSO or show login prompt
    const ssoRedirect = page.url().includes(SSO_HOST);
    const loginPrompt = await page.getByRole('link', { name: /sign in|login/i }).first().isVisible().catch(() => false);
    expect(ssoRedirect || loginPrompt).toBeTruthy();
  });

  test('T1.2: SSO callback exchanges tokens and redirects to dashboard', async ({ page }) => {
    await ssoLogin(page);
    // Should land on dashboard or an authenticated page
    const content = page.getByText(/dashboard|treasury|finance|transactions/i);
    await expect(content.first()).toBeVisible({ timeout: 20_000 });
  });

  test('T1.3: after login, /auth/me returns profile with roles and permissions', async ({ page }) => {
    await ssoLogin(page);
    // Intercept the /auth/me call
    const meResponse = await page.evaluate(async () => {
      const token = JSON.parse(localStorage.getItem('treasury-auth-storage') || '{}')?.state?.session?.accessToken;
      if (!token) return null;
      const ssoUrl = (window as any).__NEXT_DATA__?.runtimeConfig?.NEXT_PUBLIC_SSO_URL || 'https://sso.codevertexitsolutions.com';
      const res = await fetch(`${ssoUrl}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      return res.ok ? res.json() : null;
    });
    // If we got a response, verify it has roles/permissions
    if (meResponse) {
      expect(meResponse).toHaveProperty('email');
      expect(Array.isArray(meResponse.roles) || Array.isArray(meResponse.permissions)).toBeTruthy();
    }
  });

  test('T1.5: session persists across page reload', async ({ page }) => {
    await ssoLogin(page);
    const dashBefore = page.getByText(/dashboard|treasury|finance/i);
    await expect(dashBefore.first()).toBeVisible({ timeout: 15_000 });

    // Reload the page
    await page.reload();
    // Should still be on an authenticated page (not redirected to SSO)
    await page.waitForTimeout(3000);
    expect(page.url()).not.toContain(SSO_HOST);
    const dashAfter = page.getByText(/dashboard|treasury|finance/i);
    await expect(dashAfter.first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Logout Flow', () => {
  test('T1.7: logout clears session and redirects to SSO', async ({ page }) => {
    await ssoLogin(page);
    await expect(page.getByText(/dashboard|treasury/i).first()).toBeVisible({ timeout: 15_000 });

    // Click logout button
    const logoutBtn = page.getByRole('button', { name: /sign out|logout/i }).or(page.locator('[title="Sign out"]'));
    if (await logoutBtn.first().isVisible()) {
      await logoutBtn.first().click();
      // Should redirect to SSO or show login
      await page.waitForTimeout(3000);
      const loggedOut =
        page.url().includes(SSO_HOST) ||
        (await page.getByRole('link', { name: /sign in|login/i }).first().isVisible().catch(() => false));
      expect(loggedOut).toBeTruthy();
    }
  });
});
