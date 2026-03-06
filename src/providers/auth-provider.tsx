'use client';

import { useMe } from '@/hooks/useMe';
import { useAuthStore } from '@/store/auth';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

/** Uses TanStack Query (useMe) for auth GET /me with TTL; redirects unauthenticated to SSO, 401 to SSO, and platform routes without super_admin to unauthorized. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { status, initialize } = useAuthStore();
  const session = useAuthStore((s) => s.session);
  const { data: me, isLoading: meLoading, isError: meError } = useMe(!!session);
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;

  useEffect(() => {
    initialize();
  }, [initialize]);

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
    const hasAccess = me?.roles?.includes('super_admin');
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
