'use client';

import { useMe } from '@/hooks/useMe';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import {
  BadgeDollarSign,
  Banknote,
  CreditCard,
  Landmark,
  LayoutDashboard,
  PieChart,
  Settings,
  Shield,
  Wallet
} from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const session = useAuthStore((state) => state.session);
  const user = useAuthStore((state) => state.user);
  const { data: me } = useMe(!!session);
  const roles = me?.roles ?? user?.roles ?? [];
  const isSuperAdmin = roles.includes('super_admin');
  const isPlatformOwner = orgSlug === 'codevertex';

  // Tenant dashboard: transactions, settlements, gateways, accounts, settings
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

  // Platform dashboard: gateways & integration secrets, equity (superuser only)
  const platformRoutes = [
    {
      label: 'Analytics',
      icon: PieChart,
      href: `/${orgSlug}/platform/analytics`,
      active: pathname?.startsWith(`/${orgSlug}/platform/analytics`),
    },
    {
      label: 'Gateways & secrets',
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

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-card border-r border-border min-w-[240px]">
      <div className="px-3 py-2 flex-1">
        <Link href={`/${orgSlug}`} className="flex items-center pl-3 mb-14">
          <div className="relative w-8 h-8 mr-3 bg-primary rounded-lg flex items-center justify-center">
            <BadgeDollarSign className="text-primary-foreground h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Treasury</h1>
        </Link>
        <div className="space-y-1">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:bg-accent/50 rounded-lg transition",
                route.active ? "bg-accent text-foreground" : "text-muted-foreground"
              )}
            >
              <div className="flex items-center flex-1">
                <route.icon className={cn("h-5 w-5 mr-3", route.active ? "text-primary" : "text-muted-foreground")} />
                {route.label}
              </div>
            </Link>
          ))}
        </div>

        {isPlatformOwner && (
          <div className="mt-8">
            <div className="px-3 mb-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              Platform
            </div>
            <div className="space-y-1">
              {platformRoutes.map((route) => (
                <Link
                  key={route.label}
                  href={route.href}
                  className={cn(
                    "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:bg-accent/50 rounded-lg transition",
                    route.active ? "bg-accent text-foreground" : "text-muted-foreground"
                  )}
                >
                  <div className="flex items-center flex-1">
                    <route.icon className={cn("h-5 w-5 mr-3", route.active ? "text-primary" : "text-muted-foreground")} />
                    {route.label}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-border">
        <div className="p-3 text-xs text-muted-foreground uppercase tracking-widest font-semibold">
          Organization
        </div>
        <div className="flex items-center px-3 py-2 gap-3 text-sm font-medium">
          <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary capitalize">
            {orgSlug?.[0]}
          </div>
          <span className="capitalize">{orgSlug?.replace('-', ' ')}</span>
        </div>
      </div>
    </div>
  );
}
