'use client';

import { apiClient } from '@/lib/api/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  });
}

/**
 * Minimal layout for embed mode — no sidebar, header, or footer.
 * Receives auth token from parent window via postMessage.
 * Tenant slug comes from ?tenant= query parameter.
 */
function EmbedContent({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const tenant = searchParams?.get('tenant') ?? '';

  // Listen for auth token from parent iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'treasury:auth' && event.data?.token) {
        apiClient.setAccessToken(event.data.token);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Set tenant context for API calls
  useEffect(() => {
    if (tenant) {
      apiClient.setTenantContext(null, tenant);
    }
  }, [tenant]);

  return <>{children}</>;
}

export default function EmbedLayout({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div className="p-4 text-muted-foreground">Loading...</div>}>
        <EmbedContent>
          <div className="min-h-screen bg-background p-4">
            {children}
          </div>
        </EmbedContent>
      </Suspense>
    </QueryClientProvider>
  );
}
