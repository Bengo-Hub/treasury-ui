'use client';

import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { AuthProvider } from '@/providers/auth-provider';
import { BrandingProvider, useBranding } from '@/providers/branding-provider';
import { SubscriptionEntitlementsProvider } from '@/providers/subscription-entitlements-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, type ReactNode } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Footer } from '@/components/footer';
import { SubscriptionBanner } from '@/components/subscription/subscription-banner';
import { VerifyEmailPrompt } from '@/components/auth/VerifyEmailPrompt';
import { TaxComplianceBanner } from '@/components/tax/tax-compliance-banner';
import { OfflineBar, PwaInstallPrompt } from '@bengo-hub/shared-ui-lib/offline';
import { MobileBottomNav, type MobileNavTab } from '@bengo-hub/shared-ui-lib/navigation';
import { LayoutDashboard, FileText, Users } from 'lucide-react';
import { requestAppPermissions } from '@/hooks/use-app-permissions';

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

/**
 * Client-side belt-and-suspenders for the tenant manifest link. The authoritative
 * link is emitted server-side via `generateMetadata` in this segment's layout.tsx
 * (so mobile install captures the correct tenant); this keeps it correct across
 * in-app (SPA) navigation between tenant scopes.
 */
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

/** Tenant-branded install prompt — MUST live inside BrandingProvider (unlike the old
 *  root-layout-mounted PWARegistration, whose useBranding() call always saw the no-provider
 *  fallback (`tenant: null`), so the prompt silently never showed real tenant name/logo). */
function TenantPwaInstallPrompt() {
  const { tenant } = useBranding();
  const tenantFirstWord = tenant?.orgName?.trim().split(/\s+/)[0];
  const appName = tenantFirstWord ? `${tenantFirstWord} Treasury` : 'Codevertex Treasury';
  return (
    <PwaInstallPrompt
      appName={appName}
      logoUrl={tenant?.logoUrl}
      tagline="Manage payments & finances from your home screen."
      dismissKey="tsy_pwa_install_dismissed_until"
      onInstalled={() => { void requestAppPermissions(); }}
    />
  );
}

export function OrgShell({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const pathname = usePathname() ?? '';
  const base = `/${orgSlug}`;

  const tabs: MobileNavTab[] = [
    { key: 'dashboard', label: 'Home', href: base, icon: LayoutDashboard, active: pathname === base },
    { key: 'invoices', label: 'Invoices', href: `${base}/invoices`, icon: FileText, active: pathname.startsWith(`${base}/invoices`) },
    { key: 'customers', label: 'Customers', href: `${base}/customers`, icon: Users, active: pathname.startsWith(`${base}/customers`) },
  ];

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrandingProvider>
          <SubscriptionEntitlementsProvider>
          <ManifestInjector />
          {/* Standard app shell. `fixed inset-0` (not h-screen) pins the shell to the true
              viewport rather than the layout viewport — mobile Safari's address-bar-inclusive
              100vh makes h-screen unreliable for a shell meant to feel like a native app
              (mirrors pos-ui's org-shell, the fleet reference for this fix). */}
          <div className="fixed inset-0 flex overflow-hidden bg-background">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <OfflineBar registerSW availableOffline={[]} disabledOffline={[]} />
              <Header onMenuClick={() => setSidebarOpen(true)} />
              <SubscriptionBanner />
              <VerifyEmailPrompt />
              <TaxComplianceBanner />
              <main className="flex-1 overflow-y-auto bg-accent/5">
                {/* Bottom padding on mobile clears the fixed bottom nav bar (hidden ≥ lg). */}
                <div className="min-h-full flex flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
                  <div className="flex-1">{children}</div>
                  <Footer />
                </div>
              </main>
            </div>
            <MobileBottomNav
              tabs={tabs}
              onOpenMore={() => setSidebarOpen(true)}
              LinkComponent={Link}
            />
          </div>
          <TenantPwaInstallPrompt />
          </SubscriptionEntitlementsProvider>
        </BrandingProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
