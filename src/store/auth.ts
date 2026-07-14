import { apiClient } from '@/lib/api/client';
import { buildAuthorizeUrl, buildLogoutUrl, exchangeCodeForTokens, fetchProfile, revokeServerSession } from '@/lib/auth/api';
import {
    generateCodeChallenge,
    generateCodeVerifier,
    generateState,
    getVerifier,
    removeVerifier,
    storeState,
    storeVerifier
} from '@/lib/auth/pkce';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  organizationId: string;
  tenantId: string;
  tenantSlug: string;
  isPlatformOwner?: boolean;
  isSuperUser?: boolean;
  email_verification?: import('@bengo-hub/shared-ui-lib/auth').EmailVerificationState;
}

interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

interface AuthState {
  status: 'idle' | 'loading' | 'authenticated' | 'error' | 'syncing' | 'subscription_required';
  user: UserProfile | null;
  session: Session | null;
  error: string | null;
  lastAuthenticatedAt: number | null;

  /** Subscription info fetched lazily after login (undefined = not started, null = loading). */
  subscriptionInfo: Record<string, unknown> | null | undefined;
  setSubscriptionInfo: (info: Record<string, unknown> | null) => void;

  initialize: () => Promise<void>;
  redirectToSSO: (orgSlug: string, returnTo?: string) => Promise<void>;
  handleSSOCallback: (orgSlug: string, code: string, callbackUrl: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      subscriptionInfo: undefined,
      setSubscriptionInfo: (info: Record<string, unknown> | null) => set({ subscriptionInfo: info }),
      user: null,
      session: null,
      error: null,
      lastAuthenticatedAt: null,

      initialize: async () => {
        const { session, user } = get();
        if (!session) {
          set({ status: 'idle' });
          return;
        }

        apiClient.setAccessToken(session.accessToken);

        // Hydrate from storage if user profile exists and token hasn't expired.
        if (user && session.expiresAt) {
          const expiresAt = new Date(session.expiresAt).getTime();
          if (Date.now() < expiresAt - 60_000) {
            apiClient.setTenantContext(user.tenantId || null, user.tenantSlug || null);
            apiClient.setPlatformOwner(user.isPlatformOwner || user.tenantSlug === 'codevertex');
            set({ status: 'authenticated', lastAuthenticatedAt: Date.now() });
            return;
          }
        }

        set({ status: 'loading' });

        try {
          const freshUser = await fetchProfile(session.accessToken);
          apiClient.setTenantContext(freshUser.tenantId || null, freshUser.tenantSlug || null);
          apiClient.setPlatformOwner(freshUser.isPlatformOwner || freshUser.tenantSlug === 'codevertex');
          set({ user: freshUser, status: 'authenticated', lastAuthenticatedAt: Date.now() });
        } catch {
          set({ status: 'idle', session: null, user: null });
        }
      },

      redirectToSSO: async (orgSlug: string, returnTo?: string) => {
        set({ status: 'loading', error: null });
        try {
          const verifier = generateCodeVerifier();
          const challenge = await generateCodeChallenge(verifier);
          const state = generateState();

          storeVerifier(verifier);
          storeState(state);

          if (returnTo && typeof window !== 'undefined') {
            sessionStorage.setItem('sso_return_to', returnTo);
          }

          const callbackUrl = `${window.location.origin}/${orgSlug}/auth/callback`;
          const authorizeUrl = buildAuthorizeUrl({
            codeChallenge: challenge,
            state,
            redirectUri: callbackUrl,
            tenant: orgSlug,
          });

          window.location.href = authorizeUrl;
        } catch {
          set({ status: 'error', error: 'Failed to start sign-in' });
        }
      },

      handleSSOCallback: async (orgSlug: string, code: string, callbackUrl: string) => {
        set({ status: 'syncing', error: null });
        const verifier = getVerifier();

        if (!verifier) {
          set({ status: 'error', error: 'Session expired' });
          return;
        }

        try {
          const tokens = await exchangeCodeForTokens({
            code,
            codeVerifier: verifier,
            redirectUri: callbackUrl,
          });

          removeVerifier();
          const session: Session = {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || '',
            expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          };

          apiClient.setAccessToken(session.accessToken);
          set({ session });

          let attempts = 0;
          while (attempts < 5) {
            try {
              const user = await fetchProfile(session.accessToken);
              apiClient.setTenantContext(user.tenantId || null, user.tenantSlug || null);
          apiClient.setPlatformOwner(user.isPlatformOwner || user.tenantSlug === 'codevertex');
              set({ user, status: 'authenticated', lastAuthenticatedAt: Date.now() });
              return;
            } catch {
              attempts++;
              await new Promise(r => setTimeout(r, 1500));
            }
          }

          set({ status: 'authenticated', lastAuthenticatedAt: Date.now() });
        } catch {
          set({ status: 'error', error: 'Sign-in failed' });
        }
      },

      logout: async () => {
        // Capture the working org BEFORE clearing any state/storage, so re-login
        // targets the SAME organisation rather than a default one: URL path first
        // (every tenant page is /{orgSlug}/...), then the signed-in profile.
        // Never a hardcoded tenant.
        let slug = '';
        if (typeof window !== 'undefined') {
          const first = window.location.pathname.split('/').filter(Boolean)[0] ?? '';
          if (first && first !== 'auth') slug = first;
        }
        slug = slug || get().user?.tenantSlug || '';

        // Revoke the backend session (Redis session_token keys + DB sessions)
        // while the access token is still available.
        const token = get().session?.accessToken;
        await revokeServerSession(token);

        set({ status: 'idle', user: null, session: null, subscriptionInfo: undefined, lastAuthenticatedAt: null });
        apiClient.setAccessToken(null);
        if (typeof window !== 'undefined') {
          try { localStorage.removeItem('tenantId'); } catch { /* no-op */ }
          try { localStorage.removeItem('tenantSlug'); } catch { /* no-op */ }
          try { localStorage.removeItem('treasury-auth-storage'); } catch { /* no-op */ }
          try { sessionStorage.clear(); } catch { /* no-op */ }
          // Land on the tenant app root: arriving there unauthenticated re-triggers
          // SSO with tenant=<slug>, so the login screen shows the RIGHT organisation.
          window.location.href = slug
            ? buildLogoutUrl(`${window.location.origin}/${slug}`)
            : buildLogoutUrl(`https://accounts.codevertexitsolutions.com/login?return_to=${encodeURIComponent(window.location.origin)}`);
        }
      },

      fetchUser: async () => {
        const { session } = get();
        if (!session?.accessToken) return;
        try {
          const user = await fetchProfile(session.accessToken);
          apiClient.setTenantContext(user.tenantId || null, user.tenantSlug || null);
          apiClient.setPlatformOwner(user.isPlatformOwner || user.tenantSlug === 'codevertex');
          set({ user });
        } catch (error) {
          console.error('Fetch user failed:', error);
        }
      },
    }),
    {
      name: 'treasury-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        session: state.session,
        user: state.user,
      }),
    }
  )
);
