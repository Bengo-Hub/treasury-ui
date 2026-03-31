'use client';

import { apiClient } from '@/lib/api/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/** Context that tracks whether the parent has sent the auth token via postMessage. */
const EmbedAuthContext = createContext<{ ready: boolean }>({ ready: false });

export function useEmbedAuth() {
  return useContext(EmbedAuthContext);
}

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
 *
 * Exposes `useEmbedAuth()` so child pages can delay API calls
 * until the token has arrived (prevents 401 race condition).
 */
function EmbedContent({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const tenant = searchParams?.get('tenant') ?? '';
  const [ready, setReady] = useState(false);

  // Listen for auth token from parent iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'treasury:auth' && event.data?.token) {
        apiClient.setAccessToken(event.data.token);
        setReady(true);
      }
    };
    window.addEventListener('message', handler);

    // If no token arrives within 5s, proceed anyway (graceful fallback)
    const timeout = setTimeout(() => setReady(true), 5_000);

    return () => {
      window.removeEventListener('message', handler);
      clearTimeout(timeout);
    };
  }, []);

  // Set tenant context for API calls
  useEffect(() => {
    if (tenant) {
      apiClient.setTenantContext(null, tenant);
    }
  }, [tenant]);

  return (
    <EmbedAuthContext.Provider value={{ ready }}>
      {children}
    </EmbedAuthContext.Provider>
  );
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
