import type { Page } from '@playwright/test';

// Explicit, absolute org-scoped path — sidesteps a real WHATWG URL-joining gotcha confirmed live
// in this suite: playwright.config.ts's baseURL already bakes in an org slug with NO trailing
// slash (e.g. "https://books.codevertexafrica.com/urban-loft"), so a relative page.goto('/reports')
// resolves against the ORIGIN (dropping the org slug entirely) and page.goto('reports') (no
// leading slash) resolves against the base's PARENT path (replacing the org slug, same result) —
// both land on the wrong, org-less URL. Building the full path explicitly avoids relying on either
// resolution rule.
const ORG_SLUG = process.env.E2E_ORG_SLUG || 'codevertex-demo';
export function orgUrl(path: string) {
  return `/${ORG_SLUG}${path}`;
}

// Real SSO login via the demo account. Locators/flow confirmed against auth-ui's OWN e2e suite
// (auth-service/auth-ui/e2e/docs-capture/lib/login.ts and docs/e2eTests/sso-login-flow-e2e.md) —
// that app IS accounts.codevertexafrica.com, so it's the most authoritative source for the login
// form's actual structure, rather than guessing from this app's side of the redirect.
const EMAIL = process.env.E2E_LOGIN_EMAIL || 'admin@demo.codevertexafrica.com';
const PASSWORD = process.env.E2E_LOGIN_PASSWORD || 'DemoAdmin2024!';
const SSO_HOST = 'accounts.codevertexafrica.com';

export async function ssoLogin(page: Page) {
  await page.goto('/');
  const onSSO = await page
    .waitForURL(new RegExp(SSO_HOST), { timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  if (!onSSO) {
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
    return;
  }

  // Confirmed live: the SSO portal's home page resolves an existing-session check client-side
  // before settling into its split marketing/login view — the email field can be present in the
  // DOM but not yet interactive (still behind that check) while this resolves. Give it a real
  // chance to settle before touching anything.
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

  // Belt-and-braces: if the email field still isn't there after networkidle, try clicking
  // through a "Log In" link — but every step here carries its own bounded timeout so a single
  // stuck action can never again silently eat the whole test budget the way an unbounded
  // .click()/.fill() did previously (that's what earlier "browser has been closed" failures
  // actually were: the outer test timeout killing a hung action, not a real error at that line).
  const emailField = page.getByRole('textbox', { name: /email/i }).first();
  const emailReady = await emailField
    .waitFor({ state: 'visible', timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  if (!emailReady) {
    await page
      .getByRole('link', { name: /^log in$/i })
      .first()
      .click({ timeout: 10_000 })
      .catch(() => {});
    await emailField.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  }
  await emailField.fill(EMAIL, { timeout: 15_000 });
  await page.getByRole('textbox', { name: /password/i }).fill(PASSWORD, { timeout: 10_000 });
  // Exact match: an unanchored /sign in/i also matches the "Sign in with passkey" button below
  // the divider (a real strict-mode violation, confirmed live).
  await page.getByRole('button', { name: 'Sign In', exact: true }).click({ timeout: 10_000 });

  // A successful password login with no registered WebAuthn credential shows a "Set up passkey"
  // interstitial (PasskeySetupNudge.tsx) BEFORE leaving /login — auth-ui's own suite documents
  // this as timing-variable and sometimes absent entirely. Race both outcomes so the common
  // no-nudge path isn't stuck waiting out a timeout for a modal that was never coming — this is
  // almost certainly what the earlier 60s-timeout failures in this suite actually were.
  const maybeLater = page.getByRole('button', { name: 'Maybe later' });
  const outcome = await Promise.race([
    maybeLater.waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'nudge' as const),
    page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 20_000 }).then(() => 'redirected' as const),
  ]).catch(() => null);
  if (outcome === 'nudge') {
    await maybeLater.click();
    await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 20_000 }).catch(() => {});
  }

  // Finally, the SSO callback redirects back to THIS app's own domain.
  await page.waitForURL(/books\.codevertexafrica\.com|books\.codevertexitsolutions\.com|localhost/, { timeout: 25_000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
}
