'use client';

import { useAuthStore } from '@/store/auth';
import {
  Bell, BookOpen, ChevronDown, ExternalLink, Globe, LogOut, Menu, Package, Search,
  Settings, ShoppingCart, Tag, Truck, User, UserSquare, Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { ThemeToggle } from './theme-toggle';

import { userHasPermission } from '@/lib/auth/permissions';
import { useBranding } from '@/providers/branding-provider';
import { TenantFilter } from './tenant-filter';
import { OutletFilter } from './outlet-filter';

const POS_URL = process.env.NEXT_PUBLIC_POS_UI_URL ?? 'https://pos.codevertexitsolutions.com';
const INVENTORY_URL = process.env.NEXT_PUBLIC_INVENTORY_UI_URL ?? 'https://inventory.codevertexitsolutions.com';
const LOGISTICS_URL = process.env.NEXT_PUBLIC_LOGISTICS_UI_URL ?? 'https://logistics.codevertexitsolutions.com';
const MARKETFLOW_URL = process.env.NEXT_PUBLIC_MARKETFLOW_UI_URL ?? 'https://marketflow.codevertexitsolutions.com';
const ERP_URL = process.env.NEXT_PUBLIC_ERP_UI_URL ?? 'https://erp.codevertexitsolutions.com';
const ORDERING_URL = process.env.NEXT_PUBLIC_ORDERING_UI_URL ?? 'https://ordersapp.codevertexitsolutions.com';
const PRICING_URL = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_UI_URL ?? 'https://pricing.codevertexitsolutions.com';
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_UI_URL ?? 'https://accounts.codevertexitsolutions.com';

// Cross-service LINKS (never duplicated pages). Each target service enforces its own
// RBAC + subscription gating on arrival; `manageOnly` additionally hides admin-flavored
// shortcuts (ERP/Logistics/CRM/Subscriptions) from non-manager principals here.
const SERVICES = [
  { label: 'POS', href: (slug: string) => `${POS_URL}/${slug}`, Icon: ShoppingCart, manageOnly: false },
  { label: 'Inventory', href: (slug: string) => `${INVENTORY_URL}/${slug}`, Icon: Package, manageOnly: false },
  { label: 'Logistics', href: (slug: string) => `${LOGISTICS_URL}/${slug}`, Icon: Truck, manageOnly: true },
  { label: 'CRM (MarketFlow)', href: (slug: string) => `${MARKETFLOW_URL}/${slug}`, Icon: UserSquare, manageOnly: true },
  { label: 'ERP', href: (slug: string) => `${ERP_URL}/${slug}`, Icon: Users, manageOnly: true },
  { label: 'Online Store', href: (slug: string) => `${ORDERING_URL}/${slug}`, Icon: Globe, manageOnly: false },
  { label: 'Subscriptions', href: (slug: string) => `${PRICING_URL}/${slug}`, Icon: Tag, manageOnly: true },
  { label: 'Account Portal', href: (slug: string) => `${AUTH_URL}/${slug}`, Icon: BookOpen, manageOnly: false },
] as const;

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
  const profileRef = useRef<HTMLDivElement>(null);
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
  const services = SERVICES.filter((s) => !s.manageOnly || canManageLinks);

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
          <div className="relative" ref={profileRef}>
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
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setProfileOpen(false)} />
                {/* Responsive panel: wide enough for FULL service titles (never truncated),
                    caps to the viewport on phones and scrolls internally only when the list
                    outgrows the screen height. */}
                <div className="absolute right-0 top-full mt-2 z-50 w-80 max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-5rem)] overflow-y-auto rounded-2xl p-2 shadow-xl border border-border bg-popover">
                  <div className="mb-1 px-3 py-2">
                    <p className="text-sm font-bold text-foreground truncate">{name}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{role || 'Accountant'}</p>
                  </div>

                  <div className="h-px bg-border my-1" />

                  <div className="grid gap-0.5">
                    <Link
                      href={`/${orgSlug}/settings`}
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      Settings
                    </Link>
                  </div>

                  <div className="h-px bg-border my-1" />

                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 py-1">Services</p>
                  {/* Single column so every external-link title renders IN FULL — the old
                      two-column grid truncated CRM/Online Store/Subscriptions/Account Portal.
                      The panel itself scrolls when taller than the viewport. */}
                  <div className="grid gap-0.5">
                    {services.map(({ label, href, Icon }) => (
                      <a
                        key={label}
                        href={href(orgSlug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground transition-colors group"
                        title={`Open ${label}`}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                        <span className="flex-1 whitespace-nowrap">{label}</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-50 shrink-0" />
                      </a>
                    ))}
                  </div>

                  <div className="h-px bg-border my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      void logout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
