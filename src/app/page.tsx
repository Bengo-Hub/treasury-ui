'use client';

import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const ACCOUNTS_URL = process.env.NEXT_PUBLIC_AUTH_UI_URL || 'https://accounts.codevertexitsolutions.com';

/**
 * Bare-root landing. There is no tenant in the URL here, so route to the
 * last-known tenant from the persisted auth store rather than a hardcoded
 * default — bouncing everyone to /codevertex started SSO for the WRONG
 * organisation for every non-platform user. When nothing is remembered,
 * hand off to the accounts portal (organisation picker) instead of guessing.
 */
export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    const slug = useAuthStore.getState().user?.tenantSlug ?? '';
    if (slug) {
      router.replace(`/${slug}`);
    } else {
      window.location.href = ACCOUNTS_URL;
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Loading…</div>
    </div>
  );
}
