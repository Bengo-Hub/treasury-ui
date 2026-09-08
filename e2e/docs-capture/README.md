# docs-capture

Playwright specs that take annotated screenshots for the Treasury section of the shared-docs user
guide (`shared-docs/docs/user-guide/treasury/`). These are not a regression suite — read-only
navigation through real data, nothing is submitted or changed.

This app has no PIN login (unlike inventory-ui) — `lib/auth.ts`'s `ssoLogin` drives a real SSO
form submission with the platform's demo account, the same credentials and flow already proven in
`e2e/auth-login-logout.spec.ts`. `orgUrl()` then builds an explicit, absolute org-scoped path for
navigation — confirmed live: this app's `playwright.config.ts` bakes an org slug into `baseURL`
with no trailing slash, so a plain relative `page.goto('/reports')` or `page.goto('reports')` both
land on the wrong URL (WHATWG relative-URL-resolution rules drop or replace the slug either way);
building the full path explicitly sidesteps that entirely.

Login itself happens **once per run**, not once per spec. `auth.setup.ts` runs first (it's its own
Playwright project, `docs-capture-setup`, that the `docs-capture` project depends on), signs in
via `ssoLogin`, and saves the session to `.auth/demo-tenant.json`; every spec in this folder then
reuses that saved session via `storageState`. Driving the full SSO redirect round trip separately
for every spec, against the live SSO host, proved unreliable in practice (the redirect back to
this app's own domain didn't always complete) — logging in once avoids repeating it.

## Re-running this

The guide's screenshots go stale whenever the Reports or Invoices pages change layout. Re-run the
relevant spec and re-publish shared-docs. Always target the `docs-capture` project so setup runs
first:

```
pnpm docs:capture
# or a single file:
npx playwright test --project=docs-capture-setup --project=docs-capture e2e/docs-capture/reports.spec.ts --headed
```

`E2E_LOGIN_EMAIL`/`E2E_LOGIN_PASSWORD` default to the platform's demo account
(`admin@demo.codevertexafrica.com`). `E2E_ORG_SLUG` picks which tenant's data the screenshots show
— defaults to `codevertex-demo` (the shared demo tenant this account actually belongs to).

Screenshots are written straight into the sibling `shared-docs` repo
(`docs/user-guide/treasury/assets/`) — there's no copy step, so both repos need to be checked out
side by side (already the case for this monorepo-of-repos layout).
