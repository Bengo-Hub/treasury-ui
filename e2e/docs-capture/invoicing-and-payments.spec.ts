import { test, expect } from '@playwright/test';
import { orgUrl } from './lib/auth';
import { screenshotWithCallouts } from './lib/annotate';
import { assetPath } from './lib/paths';

// Screenshots for docs/user-guide/treasury/invoicing-and-payments.md. Not a regression suite —
// read-only navigation through real invoice data, nothing submitted or changed. Auth comes from
// the shared SSO session saved by auth.setup.ts. Run the whole project so setup runs first:
//   E2E_ORG_SLUG=codevertex-demo npx playwright test --project=docs-capture e2e/docs-capture/invoicing-and-payments.spec.ts --reporter=list

const OUT = (name: string) => assetPath('invoicing-and-payments', name);

test('invoices list', async ({ page }) => {
  await page.goto(orgUrl('/invoices'));
  const heading = page.getByText('Invoices').first();
  await expect(heading).toBeVisible({ timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 6_000 }).catch(() => {});

  // Target a real invoice row by its own visible invoice-number text (INV-YYMMDD-NNNNNN) rather
  // than assuming a plain <table><tbody><tr> structure.
  const firstInvoiceRow = page.getByText(/^INV-\d{6}-\d+$/).first();

  await screenshotWithCallouts(page, OUT('01-invoices-list.png'), [
    { locator: heading, number: 1 },
  ]);

  const hasInvoice = await firstInvoiceRow.isVisible({ timeout: 8_000 }).catch(() => false);
  test.skip(!hasInvoice, 'No invoices exist for this tenant to open a detail view from.');

  // Confirmed in source (page.tsx's row-actions config): the row itself isn't clickable to
  // navigate — opening the detail view goes through the row's own "Row actions" menu and its
  // "View Details" item, not a direct row/cell click.
  const invoiceRow = firstInvoiceRow.locator('xpath=ancestor::tr[1]');
  await invoiceRow.getByRole('button', { name: 'Row actions' }).click({ timeout: 8_000 });
  await page.getByRole('menuitem', { name: 'View Details' }).click({ timeout: 8_000 });
  await page.waitForURL(/\/invoices\/.+/, { timeout: 8_000 });
  await page.waitForLoadState('networkidle', { timeout: 6_000 }).catch(() => {});
  await page.waitForTimeout(500);

  const viewButton = page.getByRole('button', { name: 'View' });
  const pdfButton = page.getByRole('button', { name: 'PDF' });
  const viewVisible = await viewButton.isVisible({ timeout: 5_000 }).catch(() => false);

  await screenshotWithCallouts(page, OUT('02-invoice-detail.png'), viewVisible
    ? [
        { locator: viewButton, number: 1, color: '#16a34a' },
        { locator: pdfButton, number: 2 },
      ]
    : []);
});
