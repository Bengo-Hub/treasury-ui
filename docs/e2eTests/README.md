# Treasury UI E2E Tests

Playwright E2E tests for treasury-ui (tenant-scoped). Run against production base URL by default.

## Prerequisites

```bash
pnpm install
npx playwright install
```

## Run

```bash
pnpm test:e2e
```

Local runs open the browser (headed). Set `CI=true` for headless. Env vars:

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | Treasury UI origin | `https://books.codevertexitsolutions.com` |
| `E2E_ORG_SLUG` | Tenant slug | `urban-loft` |
| `E2E_LOGIN_EMAIL` | SSO login email | `demo@bengobox.dev` |
| `E2E_LOGIN_PASSWORD` | SSO login password | (set in env) |

Artifacts: `playwright-report/`, `test-results/` (gitignored).
