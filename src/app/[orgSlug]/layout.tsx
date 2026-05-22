'use client';

import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { AuthProvider } from '@/providers/auth-provider';
import { BrandingProvider } from '@/providers/branding-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { Footer } from '@/components/footer';
import { SubscriptionBanner } from '@/components/subscription/subscription-banner';
import { PWAUpdateBanner } from '@/components/pwa-update-banner';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,     // 5 min — most data is reference/moderate
        gcTime: 10 * 60 * 1000,        // 10 min garbage collection
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  });
}

function ManifestInjector() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string | undefined;
  useEffect(() => {
    if (!orgSlug) return;
    const href = `/${orgSlug}/manifest.webmanifest`;
    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    if (link.href !== new URL(href, window.location.href).href) {
      link.href = href;
    }
  }, [orgSlug]);
  return null;
}

export default function OrgLayout({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrandingProvider>
          <ManifestInjector />
          <PWAUpdateBanner />
          <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <Header onMenuClick={() => setSidebarOpen(true)} />
              <SubscriptionBanner />
              <main className="flex-1 overflow-y-auto bg-accent/5">
                <div className="min-h-full flex flex-col">
                  <div className="flex-1">{children}</div>
                  <Footer />
                </div>
              </main>
            </div>
          </div>
        </BrandingProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
