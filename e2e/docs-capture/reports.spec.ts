import { test, expect } from '@playwright/test';
import { orgUrl } from './lib/auth';
import { screenshotWithCallouts } from './lib/annotate';
import { assetPath } from './lib/paths';

// Screenshots for docs/user-guide/treasury/reports.md. Not a regression suite — read-only report
// views, nothing submitted. Auth comes from the shared SSO session saved by auth.setup.ts. Run
// the whole project so setup runs first:
//   E2E_ORG_SLUG=codevertex-demo npx playwright test --project=docs-capture e2e/docs-capture/reports.spec.ts --reporter=list

const OUT = (name: string) => assetPath('reports', name);

test('period picker and Profit & Loss (full statement)', async ({ page }) => {
  await page.goto(orgUrl('/reports'));
  const heading = page.getByRole('heading', { name: 'Financial Reports' });
  await expect(heading).toBeVisible({ timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 6_000 }).catch(() => {});

  const plTab = page.getByRole('tab', { name: 'Profit & Loss' });
  await expect(plTab).toBeVisible({ timeout: 10_000 });
  const summaryTab = page.getByRole('tab', { name: 'P&L Summary' });

  await screenshotWithCallouts(page, OUT('01-period-picker-and-tabs.png'), [
    { locator: plTab, number: 1 },
    { locator: summaryTab, number: 2 },
  ]);
});

test('Profit & Loss summary with GL reconciliation', async ({ page }) => {
  await page.goto(orgUrl('/reports'));
  await expect(page.getByRole('heading', { name: 'Financial Reports' })).toBeVisible({ timeout: 15_000 });

  await page.getByRole('tab', { name: 'P&L Summary' }).click();
  await page.waitForLoadState('networkidle', { timeout: 6_000 }).catch(() => {});
  await page.waitForTimeout(800);

  const reconciliation = page.getByText(/reconcil/i).first();
  const hasData = await reconciliation.isVisible({ timeout: 8_000 }).catch(() => false);
  test.skip(!hasData, 'No P&L summary data rendered for this tenant/period to screenshot.');

  await screenshotWithCallouts(page, OUT('02-pl-summary-reconciliation.png'), [
    { locator: reconciliation, number: 1 },
  ]);
});

test('Cash Flow', async ({ page }) => {
  await page.goto(orgUrl('/reports'));
  await expect(page.getByRole('heading', { name: 'Financial Reports' })).toBeVisible({ timeout: 15_000 });

  await page.getByRole('tab', { name: 'Cash Flow' }).click();
  await page.waitForLoadState('networkidle', { timeout: 6_000 }).catch(() => {});
  await page.waitForTimeout(800);

  await screenshotWithCallouts(page, OUT('03-cash-flow.png'), []);
});
