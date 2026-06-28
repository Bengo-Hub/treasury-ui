'use client';

import { cn } from '@/lib/utils';
import { userHasPermission } from '@/lib/auth/permissions';
import { useBranding } from '@/providers/branding-provider';
import { useAuthStore } from '@/store/auth';
import { useSubscription } from '@/hooks/use-subscription';
import {
  Banknote,
  BookOpen,
  Briefcase,
  Calculator,
  CalendarRange,
  ChevronDown,
  ClipboardCheck,
  DatabaseBackup,
  FileCheck,
  FileMinus,
  FilePlus,
  FileText,
  Landmark,
  LayoutDashboard,
  LogOut,
  PieChart,
  Receipt,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Target,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  X
} from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  active: boolean;
  /** Subscription feature code required to see this item (exempt tenants always pass). */
  feature?: string;
}

interface NavGroup {
  label: string;
  icon: React.ElementType;
  children: NavItem[];
  defaultOpen?: boolean;
  /** Subscription feature code required to see this whole group. */
  feature?: string;
}

type NavEntry = NavItem | NavGroup;

function isNavGroup(entry: NavEntry): entry is NavGroup {
  return 'children' in entry;
}

/**
 * filterNavByFeature drops nav entries the tenant's plan doesn't include, mirroring the
 * treasury-api feature gates (invoice_generation, ledger_posting, ar/ap_tracking,
 * reconciliation, tax_codes). Exempt tenants pass everything (hasFeature handles that). A
 * group is hidden once all its children are filtered out.
 */
function filterNavByFeature(entries: NavEntry[], hasFeature: (code: string) => boolean): NavEntry[] {
  const out: NavEntry[] = [];
  for (const e of entries) {
    if (isNavGroup(e)) {
      if (e.feature && !hasFeature(e.feature)) continue;
      const children = e.children.filter((c) => !c.feature || hasFeature(c.feature));
      if (children.length === 0) continue;
      out.push({ ...e, children });
    } else if (!e.feature || hasFeature(e.feature)) {
      out.push(e);
    }
  }
  return out;
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
  const { hasFeature } = useSubscription();
  const isPlatformOwner = user?.isPlatformOwner || user?.isSuperUser || orgSlug === 'codevertex';
  // Audit History shows the ledger audit trail — gate on ledger view/manage (matches the backend
  // route gate). Platform owners always see it.
  const canViewAudit =
    isPlatformOwner ||
    userHasPermission(user as Parameters<typeof userHasPermission>[0], [
      'treasury.ledger.view',
      'treasury.ledger.manage',
    ], 'or');

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
      label: 'Transactions',
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
      label: 'Sales & Invoicing',
      icon: FileText,
      feature: 'invoice_generation',
      children: [
        {
          label: 'Invoices',
          icon: FileText,
          href: `/${orgSlug}/invoices`,
          active: pathname.startsWith(`/${orgSlug}/invoices`),
        },
        {
          label: 'Quotations & Estimates',
          icon: ClipboardCheck,
          href: `/${orgSlug}/quotations`,
          active: pathname.startsWith(`/${orgSlug}/quotations`),
        },
        {
          label: 'Proforma Invoices',
          icon: FileCheck,
          href: `/${orgSlug}/proforma-invoices`,
          active: pathname.startsWith(`/${orgSlug}/proforma-invoices`),
        },
        {
          label: 'Credit Notes',
          icon: FileMinus,
          href: `/${orgSlug}/credit-notes`,
          active: pathname.startsWith(`/${orgSlug}/credit-notes`),
        },
        {
          label: 'Sales Orders',
          icon: ShoppingCart,
          href: `/${orgSlug}/sales-orders`,
          active: pathname.startsWith(`/${orgSlug}/sales-orders`),
        },
        {
          label: 'Payment Receipts',
          icon: Banknote,
          href: `/${orgSlug}/payment-receipts`,
          active: pathname.startsWith(`/${orgSlug}/payment-receipts`),
        },
        {
          label: 'Delivery Challans',
          icon: Truck,
          href: `/${orgSlug}/delivery-challans`,
          active: pathname.startsWith(`/${orgSlug}/delivery-challans`),
        },
        {
          label: 'Customers',
          icon: Users,
          href: `/${orgSlug}/customers`,
          active: pathname.startsWith(`/${orgSlug}/customers`),
          feature: 'customer_management',
        },
      ],
    },
    {
      label: 'Purchases & Payables',
      icon: Briefcase,
      feature: 'ap_tracking',
      children: [
        {
          label: 'Purchases & Bills',
          icon: Briefcase,
          href: `/${orgSlug}/bills`,
          active: pathname.startsWith(`/${orgSlug}/bills`),
        },
        {
          label: 'Suppliers & Vendors',
          icon: Users,
          href: `/${orgSlug}/vendors`,
          active: pathname.startsWith(`/${orgSlug}/vendors`),
          feature: 'vendor_management',
        },
        {
          label: 'Debit Notes',
          icon: FilePlus,
          href: `/${orgSlug}/debit-notes`,
          active: pathname.startsWith(`/${orgSlug}/debit-notes`),
        },
      ],
    },
    {
      label: 'Accounting',
      icon: BookOpen,
      feature: 'ledger_posting',
      children: [
        {
          label: 'Chart of Accounts',
          icon: Landmark,
          href: `/${orgSlug}/accounts`,
          active: pathname.startsWith(`/${orgSlug}/accounts`),
        },
        {
          label: 'Journal Entries',
          icon: BookOpen,
          href: `/${orgSlug}/ledger/journals`,
          active:
            pathname.startsWith(`/${orgSlug}/ledger/journals`) ||
            (pathname.startsWith(`/${orgSlug}/ledger/accounts`) && pathname !== `/${orgSlug}/ledger/accounts`),
        },
        {
          label: 'Vouchers',
          icon: Receipt,
          href: `/${orgSlug}/ledger/vouchers`,
          active: pathname.startsWith(`/${orgSlug}/ledger/vouchers`),
        },
        {
          label: 'Trial Balance',
          icon: Calculator,
          href: `/${orgSlug}/ledger/journals?view=trial-balance`,
          active: false,
        },
        {
          label: 'General Ledger',
          icon: BookOpen,
          href: `/${orgSlug}/reports/general-ledger`,
          active: pathname.startsWith(`/${orgSlug}/reports/general-ledger`),
        },
        {
          label: 'Accounting Periods',
          icon: CalendarRange,
          href: `/${orgSlug}/ledger/periods`,
          active: pathname.startsWith(`/${orgSlug}/ledger/periods`),
        },
        {
          label: 'Cost Centers',
          icon: Target,
          href: `/${orgSlug}/settings/cost-centers`,
          active: pathname.startsWith(`/${orgSlug}/settings/cost-centers`),
        },
        {
          label: 'Reconciliation',
          icon: ClipboardCheck,
          href: `/${orgSlug}/banking/reconciliation`,
          active: pathname.startsWith(`/${orgSlug}/banking`),
          feature: 'reconciliation',
        },
        ...(canViewAudit
          ? [
              {
                label: 'Audit History',
                icon: ShieldCheck,
                href: `/${orgSlug}/accounting/audit-history`,
                active: pathname.startsWith(`/${orgSlug}/accounting/audit-history`),
              },
            ]
          : []),
      ],
    },
    {
      label: 'Reports & Compliance',
      icon: PieChart,
      children: [
        {
          label: 'Financial Statements',
          icon: PieChart,
          href: `/${orgSlug}/reports`,
          active: pathname === `/${orgSlug}/reports`,
        },
        {
          label: 'Receivables & Payables',
          icon: Landmark,
          href: `/${orgSlug}/reports/receivables-payables`,
          active: pathname.startsWith(`/${orgSlug}/reports/receivables-payables`),
        },
        {
          label: 'Tax & Compliance',
          icon: Calculator,
          href: `/${orgSlug}/tax`,
          active: pathname.startsWith(`/${orgSlug}/tax`),
          feature: 'tax_codes',
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
      label: 'Backups',
      icon: DatabaseBackup,
      href: `/${orgSlug}/backups`,
      active: pathname.startsWith(`/${orgSlug}/backups`),
    },
    {
      label: 'Approvals',
      icon: ShieldCheck,
      href: `/${orgSlug}/approvals`,
      active: pathname.startsWith(`/${orgSlug}/approvals`),
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
      // Referrals + Agreements + the global payout schedule now live as tabs inside Equity.
      label: 'Equity & Referrals',
      icon: Wallet,
      href: `/${orgSlug}/platform/equity`,
      active: pathname?.startsWith(`/${orgSlug}/platform/equity`) ?? false,
    },
    {
      label: 'Audit Log',
      icon: ClipboardCheck,
      href: `/${orgSlug}/platform/audit`,
      active: pathname?.startsWith(`/${orgSlug}/platform/audit`) ?? false,
    },
  ];

  const menuLogo = tenant?.logoUrl;

  const content = (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* Logo / tenant — 72px header band, mirrors pos-ui/inventory-ui pattern */}
      <div className="border-b border-sidebar-border shrink-0 overflow-hidden" style={{ height: '72px' }}>
        {menuLogo ? (
          <div className="flex items-center h-full px-3 py-2">
            <img
              src={menuLogo}
              alt={tenant?.name ?? orgSlug}
              className="h-full w-auto max-w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 h-full px-4">
            <div className="size-10 shrink-0 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="text-sm font-bold text-primary-foreground">
                {(tenant?.name ?? getServiceTitle('Treasury')).slice(0, 2).toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-bold text-sidebar-foreground truncate">
              {tenant?.name ?? getServiceTitle('Treasury')}
            </span>
          </div>
        )}
      </div>
      {/* Close Button (mobile) */}
      <div className="flex justify-end px-3 pt-2 md:hidden">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-full p-2 hover:bg-muted"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-hide">
        <div>
          <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/25">
            Treasury
          </p>
          <NavList items={filterNavByFeature(tenantNav, hasFeature)} onItemClick={onClose} pathname={pathname} />
        </div>

        {isPlatformOwner && (
          <div>
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/25">
              Platform
            </p>
            <NavList items={platformNav} onItemClick={onClose} pathname={pathname} />
          </div>
        )}
      </nav>

      {/* Footer: Org Info + Sign Out */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-sidebar-foreground/5">
          <div className="size-8 rounded-lg bg-primary/25 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary uppercase">
              {(tenant?.name || orgSlug)?.[0] ?? 'T'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">{userName}</p>
            <p className="text-[10px] text-sidebar-foreground/40 mt-0.5">{userRole}</p>
          </div>
          <button
            onClick={() => logout()}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-sidebar-foreground/35 hover:text-rose-400 hover:bg-sidebar-foreground/8 transition-colors"
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
          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm',
          item.active
            ? 'bg-primary/10 text-primary font-semibold'
            : 'text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-foreground/8 font-medium'
        )}
      >
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full transition-colors',
            item.active ? 'bg-primary/10 text-primary' : 'bg-transparent text-sidebar-foreground/40'
          )}
        >
          <Icon className="size-4.5" />
        </div>
        <span className="truncate">{item.label}</span>
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
          'flex w-full items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm',
          hasActiveChild
            ? 'text-primary font-semibold'
            : 'text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-foreground/8 font-medium'
        )}
      >
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full transition-colors',
            hasActiveChild ? 'bg-primary/10 text-primary' : 'bg-transparent text-sidebar-foreground/40'
          )}
        >
          <Icon className="size-4.5" />
        </div>
        <span className="flex-1 text-left truncate">{group.label}</span>
        <ChevronDown
          className={cn(
            'size-4 text-sidebar-foreground/25 transition-transform duration-200',
            expanded && 'rotate-180'
          )}
        />
      </button>

      <ul
        className={cn(
          'overflow-hidden transition-all duration-200',
          expanded ? 'max-h-160 opacity-100' : 'max-h-0 opacity-0'
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
                  'flex items-center gap-3 pl-10 pr-3 py-2 rounded-xl transition-all duration-200 text-sm',
                  child.active
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-sidebar-foreground/45 hover:text-sidebar-foreground hover:bg-sidebar-foreground/8'
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
