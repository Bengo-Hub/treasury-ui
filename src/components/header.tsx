'use client';

import { useAuthStore } from '@/store/auth';
import {
  Bell, ChevronDown, Menu, Search, Settings, User,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ThemeToggle } from './theme-toggle';

import { userHasPermission } from '@/lib/auth/permissions';
import { useBranding } from '@/providers/branding-provider';
import { useSubscription } from '@/hooks/use-subscription';
import { TenantFilter } from './tenant-filter';
import { OutletFilter } from './outlet-filter';
import { useVisibleServices, AppSwitcherGrid, type ServiceKey } from '@bengo-hub/shared-ui-lib/app-switcher';
import { AccountPanel } from '@bengo-hub/shared-ui-lib/account-panel';

// Cross-service LINKS (never duplicated pages). Each target service enforces its own
// RBAC + subscription gating on arrival. The canonical service list (labels/icons/coverage,
// including which are 'coming-soon') lives in shared-ui-lib's app-switcher so it no longer
// drifts between treasury/pos/inventory/etc.'s headers — see useVisibleServices below.
const SERVICE_URLS: Partial<Record<ServiceKey, string>> = {
  pos: process.env.NEXT_PUBLIC_POS_UI_URL ?? 'https://pos.codevertexafrica.com',
  inventory: process.env.NEXT_PUBLIC_INVENTORY_UI_URL ?? 'https://inventory.codevertexafrica.com',
  logistics: process.env.NEXT_PUBLIC_LOGISTICS_UI_URL ?? 'https://logistics.codevertexafrica.com',
  marketflow: process.env.NEXT_PUBLIC_MARKETFLOW_UI_URL ?? 'https://marketflow.codevertexafrica.com',
  erp: process.env.NEXT_PUBLIC_ERP_UI_URL ?? 'https://erp.codevertexafrica.com',
  ordering: process.env.NEXT_PUBLIC_ORDERING_UI_URL ?? 'https://ordering.codevertexafrica.com',
  subscriptions: process.env.NEXT_PUBLIC_SUBSCRIPTIONS_UI_URL ?? 'https://pricing.codevertexafrica.com',
  auth: process.env.NEXT_PUBLIC_AUTH_UI_URL ?? 'https://accounts.codevertexafrica.com',
  projects: process.env.NEXT_PUBLIC_PROJECTS_UI_URL ?? 'https://projects.codevertexafrica.com',
  afya: process.env.NEXT_PUBLIC_HOSPITAL_UI_URL ?? 'https://afya.codevertexafrica.com',
};

function displayName(user: { fullName?: string; name?: string; email?: string } | null): string {
  if (!user) return 'Account';
  return user.fullName ?? user.name ?? user.email?.split('@')[0] ?? 'Account';
}

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) || 'codevertex';
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const logout = useAuthStore((state) => state.logout);
  const { getServiceTitle } = useBranding();
  const [profileOpen, setProfileOpen] = useState(false);
  const isAuthenticated = !!user && status === 'authenticated';
  const name = displayName(user);
  const role = (user as any)?.roles?.[0] || (user as any)?.role;

  // Manager-flavored cross-service shortcuts (ERP/Logistics/CRM/Subscriptions) are hidden
  // from plain accountants; settings/config managers, tenant admins and platform owners see all.
  const canManageLinks =
    user?.isPlatformOwner ||
    (user as any)?.isSuperUser ||
    userHasPermission(user as Parameters<typeof userHasPermission>[0], [
      'treasury.ledger.manage',
      'treasury.banking.manage',
      'treasury.users.manage',
    ], 'or');
  // activeProducts is undefined while the subscription lookup is in flight/unknown — fails open
  // (shows everything) until it resolves, matching this codebase's existing "never block the UI
  // on a subscription-fetch failure" convention.
  const { activeProducts } = useSubscription();
  const services = useVisibleServices({ orgSlug, urls: SERVICE_URLS, canManageLinks: !!canManageLinks, activeServiceTags: activeProducts });

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3 flex-1">
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden inline-flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-4">
          <h1 className="text-base sm:text-lg font-bold text-foreground truncate max-w-40 sm:max-w-none">
            {getServiceTitle('Treasury')}
          </h1>
          <div className="hidden md:flex relative w-72 max-w-full group ml-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              placeholder="Search transactions, accounts..."
              className="w-full h-10 bg-muted/30 border border-border rounded-full py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
            />
          </div>
        </div>
        <TenantFilter className="hidden md:block" />
        <OutletFilter className="hidden md:block" />
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <button className="relative inline-flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background" />
        </button>

        <ThemeToggle />

        <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

        {isAuthenticated && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full hover:bg-muted p-1 pr-2 transition-colors"
              aria-expanded={profileOpen}
              aria-haspopup="true"
              aria-label="Open profile menu"
            >
              <div className="size-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shadow-sm">
                {name[0]?.toUpperCase() ?? <User className="h-4 w-4" />}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-foreground truncate max-w-30">{name}</p>
                <p className="text-[10px] font-medium text-muted-foreground capitalize">{role || 'Accountant'}</p>
              </div>
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 hidden sm:block ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            <AccountPanel
              open={profileOpen}
              onClose={() => setProfileOpen(false)}
              user={{ name, email: (user as any)?.email ?? '' }}
              onSignOut={() => {
                setProfileOpen(false);
                void logout();
              }}
            >
              <div className="flex flex-col gap-3">
                <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {role || 'Accountant'}
                </p>
                <Link
                  href={`/${orgSlug}/settings`}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
                >
                  <Settings className="h-4 w-4" /> Settings
                </Link>
                <AppSwitcherGrid services={services} onNavigate={() => setProfileOpen(false)} />
              </div>
            </AccountPanel>
          </div>
        )}
      </div>
    </header>
  );
}
