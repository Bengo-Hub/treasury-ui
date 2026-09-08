import { test as setup } from '@playwright/test';
import { ssoLogin } from './lib/auth';
import { AUTH_FILE } from './lib/paths';

// Runs once per suite (see playwright.config.ts's "docs-capture-setup" project) and saves the
// logged-in session to disk. Every docs-capture spec then reuses that saved state instead of
// each one driving its own full SSO round trip: doing the real OAuth redirect dance repeatedly
// in quick succession against the live SSO host turned out to be genuinely unreliable (the
// redirect back to this app's own domain sometimes never completed), and cutting it down to one
// login per run sidesteps that instead of trying to out-wait it.
setup('authenticate via SSO', async ({ page }) => {
  // This is now the only spec in the suite that does a real SSO round trip, so it can afford a
  // longer budget than the shared 60s default — the summed bounded waits inside ssoLogin
  // legitimately need more room under a slow real login than a single spec ever did.
  setup.setTimeout(120_000);
  await ssoLogin(page);
  await page.context().storageState({ path: AUTH_FILE });
});
