'use client';

import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import {
  BadgeDollarSign,
  Banknote,
  CreditCard,
  Landmark,
  LayoutDashboard,
  LogOut,
  PieChart,
  Settings,
  Shield,
  User,
  Wallet,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useBranding } from '@/providers/branding-provider';

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { tenant, getServiceTitle } = useBranding();
  const isPlatformOwner = orgSlug === 'codevertex';

  const userName = (() => {
    if (!user) return 'Account';
    const u = user as { fullName?: string; name?: string; email?: string };
    return u.fullName ?? u.name ?? u.email?.split('@')[0] ?? 'Account';
  })();

  const userRole = (user as any)?.roles?.[0] || 'Accountant';

  const routes = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: `/${orgSlug}`,
      active: pathname === `/${orgSlug}`,
    },
    {
      label: 'Transactions',
      icon: Banknote,
      href: `/${orgSlug}/transactions`,
      active: pathname.startsWith(`/${orgSlug}/transactions`),
    },
    {
      label: 'Settlements',
      icon: Wallet,
      href: `/${orgSlug}/settlements`,
      active: pathname.startsWith(`/${orgSlug}/settlements`),
    },
    {
      label: 'Gateways',
      icon: CreditCard,
      href: `/${orgSlug}/gateways`,
      active: pathname.startsWith(`/${orgSlug}/gateways`),
    },
    {
      label: 'Accounts',
      icon: Landmark,
      href: `/${orgSlug}/accounts`,
      active: pathname.startsWith(`/${orgSlug}/accounts`),
    },
    {
      label: 'Settings',
      icon: Settings,
      href: `/${orgSlug}/settings`,
      active: pathname.startsWith(`/${orgSlug}/settings`),
    },
  ];

  const platformRoutes = [
    {
      label: 'Analytics',
      icon: PieChart,
      href: `/${orgSlug}/platform/analytics`,
      active: pathname?.startsWith(`/${orgSlug}/platform/analytics`),
    },
    {
      label: 'Gateways & Secrets',
      icon: Shield,
      href: `/${orgSlug}/platform`,
      active: pathname === `/${orgSlug}/platform`,
    },
    {
      label: 'Settlements',
      icon: Banknote,
      href: `/${orgSlug}/platform/payouts`,
      active: pathname?.startsWith(`/${orgSlug}/platform/payouts`),
    },
    {
      label: 'Global Ledger',
      icon: Landmark,
      href: `/${orgSlug}/platform/ledger`,
      active: pathname?.startsWith(`/${orgSlug}/platform/ledger`),
    },
    {
      label: 'Equity',
      icon: Wallet,
      href: `/${orgSlug}/platform/equity`,
      active: pathname?.startsWith(`/${orgSlug}/platform/equity`),
    },
  ];

  const menuLogo = tenant?.logoUrl;

  const content = (
    <div className="flex flex-col h-full bg-background border-r border-border">
      {/* Close Button & Logo */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <Link href={`/${orgSlug}`} onClick={onClose} className="flex items-center gap-2">
          {menuLogo ? (
            <div className="size-10 overflow-hidden rounded-lg">
              <img src={menuLogo} alt={tenant?.name} className="size-full object-cover" />
            </div>
          ) : (
            <div className="size-10 rounded-lg bg-primary flex items-center justify-center shadow-lg">
              <BadgeDollarSign className="text-primary-foreground h-5 w-5" />
            </div>
          )}
          <span className="text-sm font-bold text-foreground">
            {getServiceTitle('Treasury')}
          </span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-full p-2 hover:bg-muted md:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Profile Section */}
      {user && (
        <div className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary-dark overflow-hidden">
              <User className="size-6 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-bold text-foreground">{userName}</h2>
              <p className="text-xs font-medium text-muted-foreground capitalize">{userRole}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pt-2">
        <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Treasury
        </p>
        <ul className="space-y-0.5">
          {routes.map((route) => {
            const Icon = route.icon;
            return (
              <li key={route.href}>
                <Link
                  href={route.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                    route.active
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-foreground hover:bg-muted/50'
                  )}
                >
                  <div
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-full transition-colors',
                      route.active
                        ? 'bg-primary/10 text-primary'
                        : 'bg-transparent text-muted-foreground'
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <span className="text-sm font-medium">{route.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {isPlatformOwner && (
          <>
            <div className="my-4 h-px bg-border mx-3" />
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Platform
            </p>
            <ul className="space-y-0.5">
              {platformRoutes.map((route) => {
                const Icon = route.icon;
                return (
                  <li key={route.href}>
                    <Link
                      href={route.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                        route.active
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-foreground hover:bg-muted/50'
                      )}
                    >
                      <div
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-full transition-colors',
                          route.active
                            ? 'bg-primary/10 text-primary'
                            : 'bg-transparent text-muted-foreground'
                        )}
                      >
                        <Icon className="size-5" />
                      </div>
                      <span className="text-sm font-medium">{route.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </nav>

      {/* Footer: Org Info + Sign Out */}
      <div className="border-t border-border px-5 py-4 mt-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-foreground uppercase">
              {tenant?.name?.[0] || orgSlug?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{tenant?.name || orgSlug}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Finance Node</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col transition-transform duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:z-auto md:translate-x-0',
          open ? 'translate-x-0 animate-in slide-in-from-left' : '-translate-x-full md:translate-x-0',
        )}
      >
        {content}
      </aside>
    </>
  );
}
