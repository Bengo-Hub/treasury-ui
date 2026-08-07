'use client';

import { apiClient } from '@/lib/api/client';
import { parseLimitInfo, subscriptionErrorMessage } from '@/lib/api/error-handler';
import { LimitReachedModal } from '@/components/subscription/limit-reached-modal';
import { useLimitModal } from '@/store/limit-modal';
import { useMe } from '@/hooks/useMe';
import { useAuthStore } from '@/store/auth';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { toast } from 'sonner';

const SUBSCRIBE_URL =
  process.env.NEXT_PUBLIC_SUBSCRIPTIONS_UI_URL || 'https://pricing.codevertexafrica.com';

/** Uses TanStack Query (useMe) for auth GET /me with TTL; redirects unauthenticated to SSO, 401 to SSO, and platform routes without superuser/platform-owner to unauthorized. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { status, initialize } = useAuthStore();
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const { data: me, isLoading: meLoading, isError: meError } = useMe(!!session);
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;
  const queryClient = useQueryClient();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Register 401 handler: clear all caches and redirect to SSO.
  // Skip during syncing/loading to avoid clearing session during JIT sync.
  // Also skip within 15s of authentication (tokens may still be propagating).
  // Note: the primary defense is token refresh in client.ts — this callback
  // only fires after refresh has already failed.
  useEffect(() => {
    apiClient.setOn401(() => {
      const { status, lastAuthenticatedAt } = useAuthStore.getState();
      if (status === 'syncing' || status === 'loading') return;
      if (lastAuthenticatedAt && Date.now() - lastAuthenticatedAt < 15_000) return;
      queryClient.clear();
      void logout();
    });
    apiClient.setOnLimitReached((data) => {
      const info = parseLimitInfo(data);
      if (info) useLimitModal.getState().show(info);
    });
    // Wire subscription 403 (feature lock / inactive plan) → toast with an upgrade action.
    // Previously unwired: treasury-api already returns the canonical structured 403 body, but
    // nothing surfaced it — a gated action just failed silently with no visible feedback.
    apiClient.setOnSubscription403((data) => {
      const message = subscriptionErrorMessage(data);
      // Mirrors LimitReachedModal's target: treasury-ui has no local billing page, so
      // "Upgrade plan" opens the subscriptions-ui subscribe flow in a new tab.
      const upgradeUrl = (data as any)?.upgrade_url || `${SUBSCRIBE_URL}/subscribe`;
      toast.error('Subscription limit reached', {
        description: message,
        duration: 8000,
        action: {
          label: 'Upgrade plan',
          onClick: () => window.open(upgradeUrl, '_blank', 'noopener,noreferrer'),
        },
      });
    });
    return () => {
      apiClient.setOn401(null);
      apiClient.setOnLimitReached(null);
      apiClient.setOnSubscription403(null);
    };
  }, [queryClient, logout]);

  useEffect(() => {
    if (status === 'idle' && !pathname?.includes('/auth')) {
      if (orgSlug) {
        useAuthStore.getState().redirectToSSO(orgSlug, window.location.href);
      }
    }
  }, [status, pathname, orgSlug]);

  useEffect(() => {
    if (meError && orgSlug && !pathname?.includes('/auth')) {
      // Skip SSO redirect for subscription 403 — user is authenticated, just lacks subscription
      const data = (meError as any)?.response?.data;
      if (data?.code === 'subscription_inactive' || data?.upgrade === true) return;
      useAuthStore.getState().redirectToSSO(orgSlug, window.location.href);
    }
  }, [meError, orgSlug, pathname]);

  useEffect(() => {
    const isPlatform = pathname?.includes('/platform');
    // isSuperUser / roles.includes('superuser') is a TENANT-scoped RBAC role ("full access
    // within my own tenant"), NOT a platform-wide flag — a tenant admin must never gain
    // /platform/* access through it. Only a genuine platform owner may pass.
    const hasAccess = me?.isPlatformOwner;
    if (status === 'authenticated' && me && isPlatform && !hasAccess) {
      router.replace(orgSlug ? `/${orgSlug}/unauthorized` : '/');
    }
  }, [status, me, pathname, orgSlug, router]);

  const loading = status === 'loading' || (status === 'authenticated' && meLoading);
  if (loading && !pathname?.includes('/auth')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Initializing session...</div>
      </div>
    );
  }

  return (
    <>
      {children}
      <LimitReachedModal />
    </>
  );
}
