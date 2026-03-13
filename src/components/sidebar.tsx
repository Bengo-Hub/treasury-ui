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
  const session = useAuthStore((state) => state.session);
  const user = useAuthStore((state) => state.user);
  const { data: me } = useMe(!!session);
  const roles = me?.roles ?? user?.roles ?? [];
  const isSuperAdmin = roles.includes('super_admin');
  const isPlatformOwner = orgSlug === 'codevertex';
  const { tenant } = useBranding();

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

    <div className="space-y-4 py-6 flex flex-col h-full bg-brand-dark text-white border-r border-white/10 min-w-[280px]">
        <div className="px-6 py-4 flex flex-col h-full overflow-y-auto custom-scrollbar">
            <Link href={`/${orgSlug}`} onClick={onClose} className="flex items-center justify-center mb-10 transition-all hover:scale-105 duration-500">
                {tenant?.logoUrl ? (
                    <img src={tenant.logoUrl} alt={tenant.name} className="h-12 w-auto object-contain drop-shadow-2xl" />
                ) : (
                    <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                        <BadgeDollarSign className="text-white h-6 w-6" />
                    </div>
                )}
            </Link>

            <div className="space-y-1 mt-4">
                <div className="px-6 pb-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                        Treasury Operations
                    </p>
                </div>
                {routes.map((route) => {
                    const Icon = route.icon;
                    return (
                        <Link
                            key={route.href}
                            href={route.href}
                            onClick={onClose}
                            className={cn(
                                "group flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300",
                                route.active 
                                    ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" 
                                    : "text-white/50 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <Icon className={cn("h-5 w-5 transition-transform duration-300 group-hover:scale-110", route.active ? "text-white" : "group-hover:text-white")} />
                            <span className="font-bold text-xs uppercase tracking-widest">{route.label}</span>
                        </Link>
                    );
                })}

                {isPlatformOwner && (
                    <div className="mt-8 pt-8 border-t border-white/10">
                        <div className="px-6 mb-4 text-[10px] text-white/30 uppercase tracking-[0.2em] font-black">
                            Platform
                        </div>
                        <div className="space-y-1">
                            {platformRoutes.map((route) => {
                                const Icon = route.icon;
                                return (
                                    <Link
                                        key={route.label}
                                        href={route.href}
                                        onClick={onClose}
                                        className={cn(
                                            "group flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300",
                                            route.active 
                                                ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" 
                                                : "text-white/50 hover:bg-white/5 hover:text-white"
                                        )}
                                    >
                                        <Icon className={cn("h-5 w-5 transition-transform duration-300 group-hover:scale-110", route.active ? "text-white" : "group-hover:text-white")} />
                                        <span className="font-bold text-xs uppercase tracking-widest">{route.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="p-6 border-t border-white/10 mt-auto">
            <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/5 text-white/70">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-xs font-black text-primary uppercase shadow-inner">
                    {tenant?.name?.[0] || orgSlug?.[0]}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-black text-[10px] uppercase tracking-widest truncate">{tenant?.name || orgSlug}</span>
                    <span className="text-[9px] font-bold opacity-50 uppercase tracking-tighter">Finance Node</span>
                </div>
            </div>
        </div>
    </div>

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:z-auto lg:translate-x-0 lg:min-w-[280px]",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4 lg:hidden bg-brand-dark">
          <span className="text-sm font-bold text-brand-light">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-md text-brand-beige hover:bg-white/5 hover:text-white"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 py-6 flex flex-col h-full bg-brand-dark text-white border-r border-white/10 min-w-[280px]">
            <div className="px-6 py-4 flex flex-col h-full overflow-y-auto custom-scrollbar">
                <Link href={`/${orgSlug}`} onClick={onClose} className="flex items-center justify-center mb-10 transition-all hover:scale-105 duration-500">
                    {tenant?.logoUrl ? (
                        <img src={tenant.logoUrl} alt={tenant.name} className="h-12 w-auto object-contain drop-shadow-2xl" />
                    ) : (
                        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <BadgeDollarSign className="text-white h-6 w-6" />
                        </div>
                    )}
                </Link>

                <div className="space-y-1 mt-4">
                    <div className="px-6 pb-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                            Treasury Operations
                        </p>
                    </div>
                    {routes.map((route) => {
                        const Icon = route.icon;
                        return (
                            <Link
                                key={route.href}
                                href={route.href}
                                onClick={onClose}
                                className={cn(
                                    "group flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300",
                                    route.active 
                                        ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" 
                                        : "text-white/50 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <Icon className={cn("h-5 w-5 transition-transform duration-300 group-hover:scale-110", route.active ? "text-white" : "group-hover:text-white")} />
                                <span className="font-bold text-xs uppercase tracking-widest">{route.label}</span>
                            </Link>
                        );
                    })}

                    {isPlatformOwner && (
                        <div className="mt-8 pt-8 border-t border-white/10">
                            <div className="px-6 mb-4 text-[10px] text-white/30 uppercase tracking-[0.2em] font-black">
                                Platform
                            </div>
                            <div className="space-y-1">
                                {platformRoutes.map((route) => {
                                    const Icon = route.icon;
                                    return (
                                        <Link
                                            key={route.label}
                                            href={route.href}
                                            onClick={onClose}
                                            className={cn(
                                                "group flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300",
                                                route.active 
                                                    ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" 
                                                    : "text-white/50 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            <Icon className={cn("h-5 w-5 transition-transform duration-300 group-hover:scale-110", route.active ? "text-white" : "group-hover:text-white")} />
                                            <span className="font-bold text-xs uppercase tracking-widest">{route.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-6 border-t border-white/10 mt-auto">
                <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/5 text-white/70">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-xs font-black text-primary uppercase shadow-inner">
                        {tenant?.name?.[0] || orgSlug?.[0]}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-black text-[10px] uppercase tracking-widest truncate">{tenant?.name || orgSlug}</span>
                        <span className="text-[9px] font-bold opacity-50 uppercase tracking-tighter">Finance Node</span>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
