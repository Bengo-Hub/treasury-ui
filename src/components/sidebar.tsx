'use client';

import { cn } from '@/lib/utils';
import { usePendingClosePeriods } from '@/hooks/use-ledger';
import { userHasPermission } from '@/lib/auth/permissions';
import { useBranding } from '@/providers/branding-provider';
import { useAuthStore } from '@/store/auth';
import { FeatureLock } from '@bengo-hub/shared-ui-lib/subscription';
import {
  ArrowLeftRight,
  Banknote,
  BookOpen,
  Briefcase,
  Calculator,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  DatabaseBackup,
  FileCheck,
  FileMinus,
  FilePlus,
  FileText,
  GitBranch,
  HandCoins,
  History,
  Landmark,
  LayoutDashboard,
  LogOut,
  PieChart,
  Receipt,
  Scale,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Target,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  X
} from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  active: boolean;
  /** Subscription feature code that unlocks this item (exempt tenants always pass). */
  feature?: string;
  /** Reminder count shown as a pill (e.g. periods waiting to be closed); hidden when 0. */
  badge?: number;
  /**
   * Sub-group this entry sits in inside its module. Consecutive children sharing a section form a
   * collapsible sub-group (a lone item renders as a plain link).
   */
  section?: string;
}

interface NavGroup {
  label: string;
  icon: React.ElementType;
  children: NavItem[];
  defaultOpen?: boolean;
  /** Subscription feature code that unlocks this whole group. */
  feature?: string;
}

type NavEntry = NavItem | NavGroup;

function isNavGroup(entry: NavEntry): entry is NavGroup {
  return 'children' in entry;
}

/*
 * Show-don't-hide subscription gating: entries with a `feature` code are ALWAYS rendered.
 * When the tenant's plan lacks the feature, the shared <FeatureLock mode="badge"> wraps the
 * entry with a locked chip and intercepts clicks (capture phase, so the inner Link never
 * navigates) to open an UpgradeDialog naming the unlocking tier. Module/permission filtering
 * (e.g. Audit History) is unchanged — only subscription-feature hiding was removed.
 */

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
  // isSuperUser is a TENANT-scoped role ("superuser within my own tenant"), not platform-wide
  // — must not unlock the Platform nav section for a tenant's own admin/superuser.
  const isPlatformOwner = user?.isPlatformOwner || orgSlug === 'codevertex';
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

  // Close reminder: periods that have ended but are still open.
  const { data: pendingClose } = usePendingClosePeriods(orgSlug, !!user);
  const periodsToClose = pendingClose?.count ?? 0;

  // Modules follow standard accounting software (QuickBooks, Xero, Zoho Books, Sage): Sales /
  // Receivables, Purchases / Payables, Banking, Accounting (general ledger), Tax, Reports. Inside
  // a module, items sharing a `section` form a collapsible sub-group, in the order the work flows.
  const tenantNav: NavEntry[] = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: `/${orgSlug}`,
      active: pathname === `/${orgSlug}`,
    },
    {
      label: 'Sales & Receivables',
      icon: FileText,
      // No module-level gate: tier 1 includes Quotations + Customers + Receipts, so gating the
      // whole module on invoice_generation (tier 2) would wrongly lock them. Each child carries
      // its own feature code per the use-case PowerSuite matrix.
      children: [
        {
          label: 'Customers',
          icon: Users,
          href: `/${orgSlug}/customers`,
          active: pathname.startsWith(`/${orgSlug}/customers`),
          feature: 'customer_management',
        },
        {
          section: 'Quotes & Orders',
          label: 'Quotations & Estimates',
          icon: ClipboardCheck,
          href: `/${orgSlug}/quotations`,
          active: pathname.startsWith(`/${orgSlug}/quotations`),
          feature: 'quotations',
        },
        {
          section: 'Quotes & Orders',
          label: 'Proforma Invoices',
          icon: FileCheck,
          href: `/${orgSlug}/proforma-invoices`,
          active: pathname.startsWith(`/${orgSlug}/proforma-invoices`),
          feature: 'invoice_generation',
        },
        {
          section: 'Quotes & Orders',
          label: 'Sales Orders',
          icon: ShoppingCart,
          href: `/${orgSlug}/sales-orders`,
          active: pathname.startsWith(`/${orgSlug}/sales-orders`),
          feature: 'invoice_generation',
        },
        {
          section: 'Invoicing',
          label: 'Sales Invoices',
          icon: FileText,
          href: `/${orgSlug}/invoices`,
          active: pathname.startsWith(`/${orgSlug}/invoices`),
          feature: 'invoice_generation',
        },
        {
          section: 'Invoicing',
          label: 'Credit Notes',
          icon: FileMinus,
          href: `/${orgSlug}/credit-notes`,
          active: pathname.startsWith(`/${orgSlug}/credit-notes`),
          feature: 'credit_notes',
        },
        {
          section: 'Invoicing',
          label: 'Delivery Notes',
          icon: Truck,
          href: `/${orgSlug}/delivery-challans`,
          active: pathname.startsWith(`/${orgSlug}/delivery-challans`),
        },
        {
          label: 'Customer Receipts',
          icon: HandCoins,
          href: `/${orgSlug}/payment-receipts`,
          active: pathname.startsWith(`/${orgSlug}/payment-receipts`),
        },
      ],
    },
    {
      label: 'Purchases & Payables',
      icon: Briefcase,
      children: [
        {
          label: 'Suppliers',
          icon: Users,
          href: `/${orgSlug}/vendors`,
          active: pathname.startsWith(`/${orgSlug}/vendors`),
          feature: 'vendor_management',
        },
        {
          section: 'Bills',
          label: 'Supplier Bills',
          icon: Briefcase,
          href: `/${orgSlug}/bills`,
          active: pathname.startsWith(`/${orgSlug}/bills`),
          feature: 'ap_tracking',
        },
        {
          section: 'Bills',
          label: 'Debit Notes',
          icon: FilePlus,
          href: `/${orgSlug}/debit-notes`,
          active: pathname.startsWith(`/${orgSlug}/debit-notes`),
          feature: 'ap_tracking',
        },
        {
          section: 'Expenses',
          label: 'Expenses',
          icon: Receipt,
          href: `/${orgSlug}/expenses`,
          // Exclude the categories sub-route so only one item is highlighted at a time.
          active:
            pathname.startsWith(`/${orgSlug}/expenses`) &&
            !pathname.startsWith(`/${orgSlug}/expenses/categories`),
        },
        {
          section: 'Expenses',
          label: 'Expense Categories',
          icon: Tags,
          href: `/${orgSlug}/expenses/categories`,
          active: pathname.startsWith(`/${orgSlug}/expenses/categories`),
        },
      ],
    },
    {
      label: 'Banking',
      icon: Landmark,
      children: [
        {
          label: 'Bank & Cash Accounts',
          icon: Landmark,
          href: `/${orgSlug}/banking/accounts`,
          active: pathname.startsWith(`/${orgSlug}/banking/accounts`),
        },
        {
          label: 'Bank Reconciliation',
          icon: ClipboardCheck,
          href: `/${orgSlug}/banking/reconciliation`,
          active: pathname.startsWith(`/${orgSlug}/banking/reconciliation`),
          feature: 'reconciliation',
        },
        {
          section: 'Payments',
          label: 'Payment Transactions',
          icon: ArrowLeftRight,
          href: `/${orgSlug}/transactions`,
          active: pathname.startsWith(`/${orgSlug}/transactions`),
        },
        {
          section: 'Payments',
          label: 'Settlements & Payouts',
          icon: Wallet,
          href: `/${orgSlug}/settlements`,
          active: pathname.startsWith(`/${orgSlug}/settlements`),
        },
      ],
    },
    {
      label: 'Accounting',
      icon: BookOpen,
      feature: 'ledger_posting',
      children: [
        {
          section: 'Books',
          label: 'Journal Entries',
          icon: BookOpen,
          href: `/${orgSlug}/ledger/journals`,
          active:
            pathname.startsWith(`/${orgSlug}/ledger/journals`) ||
            (pathname.startsWith(`/${orgSlug}/ledger/accounts`) && pathname !== `/${orgSlug}/ledger/accounts`),
        },
        {
          section: 'Books',
          label: 'Vouchers',
          icon: Receipt,
          href: `/${orgSlug}/ledger/vouchers`,
          active: pathname.startsWith(`/${orgSlug}/ledger/vouchers`),
          feature: 'vouchers',
        },
        {
          section: 'Books',
          label: 'General Ledger',
          icon: BookOpen,
          href: `/${orgSlug}/reports/general-ledger`,
          active: pathname.startsWith(`/${orgSlug}/reports/general-ledger`),
        },
        {
          section: 'Books',
          label: 'Trial Balance',
          icon: Scale,
          href: `/${orgSlug}/ledger/journals?view=trial-balance`,
          active: false,
        },
        {
          section: 'Setup',
          label: 'Chart of Accounts',
          icon: Landmark,
          href: `/${orgSlug}/accounts`,
          active: pathname.startsWith(`/${orgSlug}/accounts`),
        },
        {
          section: 'Setup',
          label: 'Account Mappings',
          icon: GitBranch,
          href: `/${orgSlug}/settings/gl-account-mappings`,
          active: pathname.startsWith(`/${orgSlug}/settings/gl-account-mappings`),
        },
        {
          section: 'Setup',
          label: 'Cost Centres',
          icon: Target,
          href: `/${orgSlug}/settings/cost-centers`,
          active: pathname.startsWith(`/${orgSlug}/settings/cost-centers`),
        },
        {
          section: 'Period Close',
          label: 'Accounting Periods',
          icon: CalendarRange,
          href: `/${orgSlug}/ledger/periods`,
          active: pathname.startsWith(`/${orgSlug}/ledger/periods`),
          badge: periodsToClose,
        },
        ...(canViewAudit
          ? [
              {
                section: 'Period Close',
                label: 'Audit Trail',
                icon: History,
                href: `/${orgSlug}/accounting/audit-history`,
                active: pathname.startsWith(`/${orgSlug}/accounting/audit-history`),
              },
            ]
          : []),
      ],
    },
    {
      label: 'Tax & Compliance',
      icon: Calculator,
      href: `/${orgSlug}/tax`,
      active: pathname.startsWith(`/${orgSlug}/tax`),
      feature: 'tax_codes',
    },
    {
      label: 'Reports & Planning',
      icon: PieChart,
      children: [
        {
          section: 'Reports',
          // Management view: performance, position, trends, ratios, recurring costs, forecast.
          label: 'Business Insights',
          icon: TrendingUp,
          href: `/${orgSlug}/reports/insights`,
          active: pathname.startsWith(`/${orgSlug}/reports/insights`),
        },
        {
          section: 'Reports',
          label: 'Financial Statements',
          icon: PieChart,
          href: `/${orgSlug}/reports`,
          active: pathname === `/${orgSlug}/reports`,
        },
        {
          section: 'Reports',
          label: 'Aged Receivables & Payables',
          icon: Landmark,
          href: `/${orgSlug}/reports/receivables-payables`,
          active: pathname.startsWith(`/${orgSlug}/reports/receivables-payables`),
        },
        {
          section: 'Reports',
          // Profit by cost centre or project, and every live budget's spend against time.
          label: 'Profitability & Budget Health',
          icon: Target,
          href: `/${orgSlug}/reports/profitability`,
          active: pathname.startsWith(`/${orgSlug}/reports/profitability`),
          feature: 'bi_reports',
        },
        {
          section: 'Planning',
          label: 'Budgets',
          icon: Target,
          href: `/${orgSlug}/budgets`,
          active: pathname.startsWith(`/${orgSlug}/budgets`),
          feature: 'budgeting',
        },
        {
          section: 'Planning',
          label: 'Cash Forecast',
          icon: TrendingUp,
          href: `/${orgSlug}/planning/cash-forecast`,
          active: pathname.startsWith(`/${orgSlug}/planning/cash-forecast`),
          feature: 'financial_planning',
        },
        {
          section: 'Planning',
          label: 'Rolling Forecast',
          icon: TrendingUp,
          href: `/${orgSlug}/planning/rolling-forecast`,
          active: pathname.startsWith(`/${orgSlug}/planning/rolling-forecast`),
          feature: 'financial_planning',
        },
      ],
    },
    {
      label: 'Approvals',
      icon: ShieldCheck,
      href: `/${orgSlug}/approvals`,
      active: pathname.startsWith(`/${orgSlug}/approvals`),
      feature: 'treasury_approvals',
    },
    {
      label: 'Administration',
      icon: Settings,
      children: [
        {
          label: 'Settings',
          icon: Settings,
          href: `/${orgSlug}/settings`,
          // Account mappings and cost centres live under /settings but belong to Accounting.
          active:
            pathname.startsWith(`/${orgSlug}/settings`) &&
            !pathname.startsWith(`/${orgSlug}/settings/gl-account-mappings`) &&
            !pathname.startsWith(`/${orgSlug}/settings/cost-centers`),
        },
        {
          label: 'Backups',
          icon: DatabaseBackup,
          href: `/${orgSlug}/backups`,
          active: pathname.startsWith(`/${orgSlug}/backups`),
        },
      ],
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
      {/* Close Button (mobile/tablet — sidebar is a drawer below lg, see the aside below) */}
      <div className="flex justify-end px-3 pt-2 lg:hidden">
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
          <NavList items={tenantNav} onItemClick={onClose} pathname={pathname} />
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
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      {/* Drawer below lg (was md) — the fleet convention (pos-ui, inventory-ui) gates the
          permanent-vs-drawer sidebar at lg:/1024px, and the shared bottom nav bar both this app
          and its siblings use is independently fixed at `lg:hidden` (shared-ui-lib) regardless of
          this component's own breakpoint. At md: this sidebar used to go permanent WHILE the
          bottom nav bar was still showing too (it doesn't hide until lg:) — a portrait tablet
          (768-1023px) got both a full-width static sidebar AND the fixed bottom nav simultaneously. */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:z-auto lg:translate-x-0',
          open ? 'translate-x-0 animate-in slide-in-from-left' : '-translate-x-full lg:translate-x-0',
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

/**
 * Wraps a nav entry in the shared FeatureLock (badge mode) when it carries a subscription
 * feature code. Unlocked/exempt tenants get the bare children back; locked ones see a tier
 * chip and a click-capture that opens the UpgradeDialog instead of navigating.
 */
function NavFeatureLock({ feature, children }: { feature?: string; children: React.ReactNode }) {
  if (!feature) return <>{children}</>;
  return (
    <FeatureLock feature={feature} mode="badge">
      {children}
    </FeatureLock>
  );
}

/** Reminder count pill on a nav entry; renders nothing for 0 or undefined. */
function NavBadge({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span
      className="ml-auto inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white"
      title={`${count} to review`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

function NavLinkItem({ item, onItemClick }: { item: NavItem; onItemClick?: () => void }) {
  const Icon = item.icon;
  return (
    <li>
      <NavFeatureLock feature={item.feature}>
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
        <NavBadge count={item.badge} />
      </Link>
      </NavFeatureLock>
    </li>
  );
}

/**
 * Expands itself when `active` turns true (navigation into it), adjusting state during render
 * rather than in an effect, so there is no extra render pass. Manual toggles are kept otherwise.
 */
function useAutoExpand(active: boolean, defaultOpen = false) {
  const [expanded, setExpanded] = useState(active || defaultOpen);
  const [prevActive, setPrevActive] = useState(active);
  if (active !== prevActive) {
    setPrevActive(active);
    if (active) setExpanded(true);
  }
  const toggle = useCallback(() => setExpanded((v) => !v), []);
  return [expanded, toggle] as const;
}

/** Height-agnostic open / close animation (grid rows 0fr to 1fr), for any number of children. */
function Collapse({ open, id, children }: { open: boolean; id: string; children: React.ReactNode }) {
  return (
    <div
      id={id}
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
      inert={!open}
    >
      <ul className="min-h-0 overflow-hidden">{children}</ul>
    </div>
  );
}

/** Consecutive children sharing a section, in order; items without a section stand alone. */
function sectionBlocks(children: NavItem[]): { section?: string; items: NavItem[] }[] {
  const blocks: { section?: string; items: NavItem[] }[] = [];
  for (const child of children) {
    const last = blocks[blocks.length - 1];
    if (child.section && last?.section === child.section) last.items.push(child);
    else blocks.push({ section: child.section, items: [child] });
  }
  return blocks;
}

function NavChildLink({ child, onItemClick, indent }: { child: NavItem; onItemClick?: () => void; indent: 'group' | 'section' }) {
  const ChildIcon = child.icon;
  return (
    <li>
      <NavFeatureLock feature={child.feature}>
        <Link
          href={child.href}
          onClick={onItemClick}
          aria-current={child.active ? 'page' : undefined}
          className={cn(
            'flex items-center gap-3 pr-3 py-2 rounded-xl transition-colors duration-200 text-sm',
            indent === 'group' ? 'pl-10' : 'pl-14',
            child.active
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-foreground/8',
          )}
        >
          <ChildIcon className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{child.label}</span>
          <NavBadge count={child.badge} />
        </Link>
      </NavFeatureLock>
    </li>
  );
}

/** A collapsible sub-group inside a module (e.g. Accounting > Period Close). */
function NavSection({ label, items, onItemClick }: { label: string; items: NavItem[]; onItemClick?: () => void }) {
  const hasActive = items.some((c) => c.active);
  const [expanded, toggle] = useAutoExpand(hasActive);
  const badge = items.reduce((n, c) => n + (c.badge ?? 0), 0);
  const id = `nav-section-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <li>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        aria-controls={id}
        className={cn(
          'flex w-full items-center gap-2 pl-10 pr-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-[0.1em] transition-colors',
          hasActive ? 'text-primary' : 'text-sidebar-foreground/40 hover:text-sidebar-foreground/70 hover:bg-sidebar-foreground/5',
        )}
      >
        <ChevronRight className={cn('size-3.5 shrink-0 transition-transform duration-200', expanded && 'rotate-90')} aria-hidden />
        <span className="flex-1 text-left truncate">{label}</span>
        {!expanded && <NavBadge count={badge} />}
      </button>
      <Collapse open={expanded} id={id}>
        {items.map((child) => (
          <NavChildLink key={child.href} child={child} onItemClick={onItemClick} indent="section" />
        ))}
      </Collapse>
    </li>
  );
}

function NavGroupItem({
  group,
  onItemClick,
  pathname: _pathname,
}: {
  group: NavGroup;
  onItemClick?: () => void;
  pathname: string;
}) {
  const hasActiveChild = group.children.some((c) => c.active);
  // A collapsed module carries its children's reminders so they are not hidden.
  const groupBadge = group.children.reduce((n, c) => n + (c.badge ?? 0), 0);
  const [expanded, toggle] = useAutoExpand(hasActiveChild, group.defaultOpen);
  const Icon = group.icon;
  const id = `nav-group-${group.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <li>
      <NavFeatureLock feature={group.feature}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          aria-controls={id}
          className={cn(
            'flex w-full items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 text-sm',
            hasActiveChild
              ? 'text-primary font-semibold'
              : 'text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-foreground/8 font-medium',
          )}
        >
          <div
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full transition-colors',
              hasActiveChild ? 'bg-primary/10 text-primary' : 'bg-transparent text-sidebar-foreground/40',
            )}
          >
            <Icon className="size-4.5" aria-hidden />
          </div>
          <span className="flex-1 text-left truncate">{group.label}</span>
          {!expanded && <NavBadge count={groupBadge} />}
          <ChevronDown
            className={cn('size-4 text-sidebar-foreground/25 transition-transform duration-200', expanded && 'rotate-180')}
            aria-hidden
          />
        </button>
      </NavFeatureLock>

      <Collapse open={expanded} id={id}>
        {sectionBlocks(group.children).map((block) =>
          block.section && block.items.length > 1 ? (
            <NavSection key={block.section} label={block.section} items={block.items} onItemClick={onItemClick} />
          ) : (
            block.items.map((child) => (
              <NavChildLink key={child.href} child={child} onItemClick={onItemClick} indent="group" />
            ))
          ),
        )}
      </Collapse>
    </li>
  );
}
