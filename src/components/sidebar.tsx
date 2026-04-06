'use client';

import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import {
  BadgeDollarSign,
  Banknote,
  BookOpen,
  Briefcase,
  Calculator,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  FileText,
  Gift,
  Landmark,
  LayoutDashboard,
  LogOut,
  PieChart,
  Receipt,
  Settings,
  Shield,
  TrendingUp,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';
import { useBranding } from '@/providers/branding-provider';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  active: boolean;
}

interface NavGroup {
  label: string;
  icon: React.ElementType;
  children: NavItem[];
  defaultOpen?: boolean;
}

type NavEntry = NavItem | NavGroup;

function isNavGroup(entry: NavEntry): entry is NavGroup {
  return 'children' in entry;
}

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
  const isPlatformOwner = user?.isPlatformOwner || user?.isSuperUser || orgSlug === 'codevertex';

  const userName = (() => {
    if (!user) return 'Account';
    const u = user as { fullName?: string; name?: string; email?: string };
    return u.fullName ?? u.name ?? u.email?.split('@')[0] ?? 'Account';
  })();

  const userRole = (user as any)?.roles?.[0] || 'Accountant';

  const tenantNav: NavEntry[] = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: `/${orgSlug}`,
      active: pathname === `/${orgSlug}`,
    },
    {
      label: 'Money',
      icon: Banknote,
      children: [
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
          label: 'Expenses',
          icon: Receipt,
          href: `/${orgSlug}/expenses`,
          active: pathname.startsWith(`/${orgSlug}/expenses`),
        },
      ],
    },
    {
      label: 'Sales',
      icon: FileText,
      children: [
        {
          label: 'Invoices',
          icon: FileText,
          href: `/${orgSlug}/invoices`,
          active: pathname.startsWith(`/${orgSlug}/invoices`),
        },
        {
          label: 'Quotations',
          icon: ClipboardCheck,
          href: `/${orgSlug}/quotations`,
          active: pathname.startsWith(`/${orgSlug}/quotations`),
        },
        {
          label: 'Customers',
          icon: Users,
          href: `/${orgSlug}/customers`,
          active: pathname.startsWith(`/${orgSlug}/customers`),
        },
      ],
    },
    {
      label: 'Purchases',
      icon: Briefcase,
      children: [
        {
          label: 'Bills',
          icon: Briefcase,
          href: `/${orgSlug}/bills`,
          active: pathname.startsWith(`/${orgSlug}/bills`),
        },
        {
          label: 'Vendors',
          icon: Users,
          href: `/${orgSlug}/vendors`,
          active: pathname.startsWith(`/${orgSlug}/vendors`),
        },
      ],
    },
    {
      label: 'Accounting',
      icon: BookOpen,
      children: [
        {
          label: 'Chart of Accounts',
          icon: Landmark,
          href: `/${orgSlug}/ledger/accounts`,
          active: pathname.startsWith(`/${orgSlug}/ledger/accounts`),
        },
        {
          label: 'Journal Entries',
          icon: BookOpen,
          href: `/${orgSlug}/ledger/journals`,
          active: pathname.startsWith(`/${orgSlug}/ledger/journals`),
        },
        {
          label: 'Reconciliation',
          icon: ClipboardCheck,
          href: `/${orgSlug}/banking/reconciliation`,
          active: pathname.startsWith(`/${orgSlug}/banking`),
        },
      ],
    },
    {
      label: 'Reports',
      icon: PieChart,
      children: [
        {
          label: 'Financial Statements',
          icon: PieChart,
          href: `/${orgSlug}/reports`,
          active: pathname === `/${orgSlug}/reports`,
        },
        {
          label: 'Tax & Compliance',
          icon: Calculator,
          href: `/${orgSlug}/tax`,
          active: pathname.startsWith(`/${orgSlug}/tax`),
        },
        {
          label: 'Budgets',
          icon: TrendingUp,
          href: `/${orgSlug}/budgets`,
          active: pathname.startsWith(`/${orgSlug}/budgets`),
        },
      ],
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

  const platformNav: NavEntry[] = [
    {
      label: 'Analytics',
      icon: PieChart,
      href: `/${orgSlug}/platform/analytics`,
      active: pathname?.startsWith(`/${orgSlug}/platform/analytics`) ?? false,
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
      active: pathname?.startsWith(`/${orgSlug}/platform/payouts`) ?? false,
    },
    {
      label: 'Global Ledger',
      icon: Landmark,
      href: `/${orgSlug}/platform/ledger`,
      active: pathname?.startsWith(`/${orgSlug}/platform/ledger`) ?? false,
    },
    {
      label: 'Equity',
      icon: Wallet,
      href: `/${orgSlug}/platform/equity`,
      active: pathname?.startsWith(`/${orgSlug}/platform/equity`) ?? false,
    },
    {
      label: 'Referrals',
      icon: Gift,
      href: `/${orgSlug}/platform/referrals`,
      active: pathname?.startsWith(`/${orgSlug}/platform/referrals`) ?? false,
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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pt-2">
        <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Treasury
        </p>
        <NavList items={tenantNav} onItemClick={onClose} pathname={pathname} />

        {isPlatformOwner && (
          <>
            <div className="my-4 h-px bg-border mx-3" />
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Platform
            </p>
            <NavList items={platformNav} onItemClick={onClose} pathname={pathname} />
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

/* ------------------------------------------------------------------ */
/* Nav list renderer with collapsible groups                          */
/* ------------------------------------------------------------------ */

function NavList({
  items,
  onItemClick,
  pathname,
}: {
  items: NavEntry[];
  onItemClick?: () => void;
  pathname: string;
}) {
  return (
    <ul className="space-y-0.5">
      {items.map((entry) =>
        isNavGroup(entry) ? (
          <NavGroupItem key={entry.label} group={entry} onItemClick={onItemClick} pathname={pathname} />
        ) : (
          <NavLinkItem key={entry.href} item={entry} onItemClick={onItemClick} />
        )
      )}
    </ul>
  );
}

function NavLinkItem({ item, onItemClick }: { item: NavItem; onItemClick?: () => void }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        onClick={onItemClick}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
          item.active
            ? 'bg-primary/10 text-primary font-semibold'
            : 'text-foreground hover:bg-muted/50'
        )}
      >
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full transition-colors',
            item.active ? 'bg-primary/10 text-primary' : 'bg-transparent text-muted-foreground'
          )}
        >
          <Icon className="size-4.5" />
        </div>
        <span className="text-sm font-medium">{item.label}</span>
      </Link>
    </li>
  );
}

function NavGroupItem({
  group,
  onItemClick,
  pathname,
}: {
  group: NavGroup;
  onItemClick?: () => void;
  pathname: string;
}) {
  const hasActiveChild = group.children.some((c) => c.active);
  const [expanded, setExpanded] = useState(hasActiveChild || (group.defaultOpen ?? false));

  // Auto-expand when a child becomes active via navigation
  useEffect(() => {
    if (hasActiveChild) setExpanded(true);
  }, [hasActiveChild]);

  const toggle = useCallback(() => setExpanded((v) => !v), []);

  const Icon = group.icon;

  return (
    <li>
      <button
        type="button"
        onClick={toggle}
        className={cn(
          'flex w-full items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
          hasActiveChild
            ? 'text-primary font-semibold'
            : 'text-foreground hover:bg-muted/50'
        )}
      >
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full transition-colors',
            hasActiveChild ? 'bg-primary/10 text-primary' : 'bg-transparent text-muted-foreground'
          )}
        >
          <Icon className="size-4.5" />
        </div>
        <span className="flex-1 text-left text-sm font-medium">{group.label}</span>
        <ChevronDown
          className={cn(
            'size-4 text-muted-foreground transition-transform duration-200',
            expanded && 'rotate-180'
          )}
        />
      </button>

      <ul
        className={cn(
          'overflow-hidden transition-all duration-200',
          expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        {group.children.map((child) => {
          const ChildIcon = child.icon;
          return (
            <li key={child.href}>
              <Link
                href={child.href}
                onClick={onItemClick}
                className={cn(
                  'flex items-center gap-3 pl-10 pr-3 py-2 rounded-xl transition-colors',
                  child.active
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
              >
                <ChildIcon className="size-4 shrink-0" />
                <span className="text-sm">{child.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </li>
  );
}
