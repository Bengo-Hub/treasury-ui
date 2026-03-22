const SSO_BASE_URL = process.env.NEXT_PUBLIC_SSO_URL || 'https://sso.codevertexitsolutions.com';
const SSO_CLIENT_ID = process.env.NEXT_PUBLIC_SSO_CLIENT_ID || 'treasury-ui';

/** SSO auth/me URL — profile must be fetched from auth-api (SSO), not from treasury-api. */
export const SSO_ME_URL = `${SSO_BASE_URL}/api/v1/auth/me`;

export interface AuthorizeParams {
  codeChallenge: string;
  state: string;
  redirectUri: string;
  scope?: string;
  /** Pass explicitly so token is minted for this tenant (e.g. orgSlug from route). */
  tenant?: string;
}

export interface TokenExchangeParams {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

export function buildAuthorizeUrl({ codeChallenge, state, redirectUri, scope, tenant: tenantParam }: AuthorizeParams): string {
  const url = new URL('/api/v1/authorize', SSO_BASE_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', SSO_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scope || 'openid profile email offline_access');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');

  const tenant = tenantParam ?? (typeof window !== 'undefined' ? localStorage.getItem('tenantSlug') : null);
  if (tenant) {
    url.searchParams.set('tenant', tenant);
  }

  return url.toString();
}

export function buildLogoutUrl(postLogoutRedirectUri?: string): string {
  const url = new URL('/api/v1/auth/logout', SSO_BASE_URL);
  if (postLogoutRedirectUri) {
    url.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri);
  }
  return url.toString();
}

export async function exchangeCodeForTokens(params: TokenExchangeParams) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: SSO_CLIENT_ID,
    code_verifier: params.codeVerifier,
  });

  const response = await fetch(`${SSO_BASE_URL}/api/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error_description || errorData.error || 'Token exchange failed');
  }

  return response.json();
}

/**
 * Fetch current user profile (roles, permissions) from SSO auth-api.
 * Must call SSO, not treasury-api — treasury-api does not expose /auth/me.
 */
export async function fetchProfile(accessToken: string): Promise<{
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  organizationId: string;
  tenantId: string;
  tenantSlug: string;
  isPlatformOwner: boolean;
  isSuperUser: boolean;
}> {
  const res = await fetch(SSO_ME_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description || err.error || `Profile failed: ${res.status}`);
  }
  const data = await res.json();
  const slug = data.tenant_slug ?? data.tenant?.slug ?? '';
  const roles: string[] = data.roles ?? [];
  return {
    id: data.id ?? '',
    email: data.email ?? '',
    fullName: data.profile?.name ?? data.full_name ?? data.email ?? '',
    roles,
    permissions: data.permissions ?? [],
    organizationId: data.tenant_id ?? data.primary_tenant ?? '',
    tenantId: data.tenant_id ?? data.primary_tenant ?? '',
    tenantSlug: slug,
    isPlatformOwner: data.is_platform_owner === true || slug === 'codevertex',
    isSuperUser: roles.includes('superuser'),
  };
}
