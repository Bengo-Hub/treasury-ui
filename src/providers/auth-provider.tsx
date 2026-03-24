'use client';

import { apiClient } from '@/lib/api/client';
import { useMe } from '@/hooks/useMe';
import { useAuthStore } from '@/store/auth';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

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

  // Register 401 handler: clear all caches and redirect to SSO
  useEffect(() => {
    apiClient.setOn401(() => {
      queryClient.clear();
      void logout();
    });
    return () => apiClient.setOn401(null);
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
      useAuthStore.getState().redirectToSSO(orgSlug, window.location.href);
    }
  }, [meError, orgSlug, pathname]);

  useEffect(() => {
    const isPlatform = pathname?.includes('/platform');
    const hasAccess = me?.isPlatformOwner || me?.isSuperUser || me?.roles?.includes('superuser');
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

  return <>{children}</>;
}
