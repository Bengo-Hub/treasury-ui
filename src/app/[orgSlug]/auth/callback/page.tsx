'use client';

import { useAuthStore } from '@/store/auth';
import { SSOCallbackError } from '@bengo-hub/shared-ui-lib/auth';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

// Module-level guard so callback runs only once (avoids React Strict Mode double-mount consuming PKCE verifier twice)
let callbackInvoked = false;

// The stored return URL was captured BEFORE the SSO hop. If the user switched
// organisation mid-login, its slug is stale — re-point the first path segment
// at the org the token was actually issued for. Cross-origin values are dropped.
function sanitizedReturnTo(raw: string | null, orgSlug: string): string | null {
  if (!raw) return null;
  try {
    const url = raw.startsWith('http') ? new URL(raw) : new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    const segments = url.pathname.split('/');
    if (segments[1] && segments[1] !== orgSlug) segments[1] = orgSlug;
    return segments.join('/') + url.search + url.hash;
  } catch {
    return null;
  }
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const code = searchParams?.get('code');
  const error = searchParams?.get('error');
  const errorDescription = searchParams?.get('error_description');
  const { handleSSOCallback, redirectToSSO, status, error: authError } = useAuthStore();

  useEffect(() => {
    if (!code || !orgSlug || callbackInvoked) return;
    callbackInvoked = true;
    const callbackUrl = `${window.location.origin}/${orgSlug}/auth/callback`;
    handleSSOCallback(orgSlug, code, callbackUrl);
  }, [code, orgSlug, handleSSOCallback]);

  useEffect(() => {
    if (status === 'authenticated') {
      const returnTo = sanitizedReturnTo(sessionStorage.getItem('sso_return_to'), orgSlug);
      sessionStorage.removeItem('sso_return_to');
      router.replace(returnTo || `/${orgSlug}`);
    }
  }, [status, orgSlug, router]);

  if (error || authError) {
    // Shared error card: wrong-organisation copy for access_denied/membership
    // errors, generic otherwise. "Sign in again" restarts the SSO flow (fresh
    // PKCE + authorize); /authorize now routes wrong-org users through the
    // accounts organisation picker, so the retry genuinely recovers them.
    // Treasury never persists a remembered tenant slug, so no rescue button.
    return (
      <SSOCallbackError
        error={error}
        errorDescription={errorDescription ?? authError}
        orgSlug={orgSlug}
        onRetry={() => redirectToSSO(orgSlug)}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h1 className="text-xl font-medium">Completing Sign-in...</h1>
        <p className="text-muted-foreground">Syncing your profile and permissions.</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}
