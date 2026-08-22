'use client';

// DataTable column definitions for the Referral Programs and Referrals
// tables — split out of page.tsx to mirror the vendors/expenses/budgets list
// convention.

import { Badge } from '@/components/ui/base';
import { RowActionMenu, type RowAction } from '@/components/ui/action-menu';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { Referral, ReferralProgram, ReferralReward } from '@/lib/api/referrals';
import { format } from 'date-fns';

export const REWARD_TYPE_LABELS: Record<string, string> = {
  revenue_share: 'Revenue Share',
  fixed_monetary: 'Fixed Monetary',
  discount: 'Discount',
  gift_card: 'Gift Card',
  coupon: 'Coupon',
};

export const REFERRAL_STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'outline' | 'default'> = {
  active: 'success',
  pending: 'warning',
  expired: 'outline',
  revoked: 'error',
  converted: 'success',
  issued: 'default',
  redeemed: 'success',
  cancelled: 'error',
};

function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export interface ProgramColumnCallbacks {
  onEdit: (program: ReferralProgram) => void;
  onToggleActive: (program: ReferralProgram) => void;
  onDelete: (program: ReferralProgram) => void;
  /** Opens the shared program-detail modal (same one the Referrals table's Program column uses). */
  onViewDetails: (program: ReferralProgram) => void;
}

export function buildProgramColumns(cb: ProgramColumnCallbacks): DataTableColumn<ReferralProgram>[] {
  const actions: RowAction<ReferralProgram>[] = [
    { label: 'View Details', onClick: cb.onViewDetails },
    { label: 'Edit', onClick: cb.onEdit },
    { label: 'Deactivate', visible: (p) => p.is_active, onClick: cb.onToggleActive },
    { label: 'Activate', visible: (p) => !p.is_active, onClick: cb.onToggleActive },
    { label: 'Delete', destructive: true, onClick: cb.onDelete },
  ];
  return [
    {
      key: 'name', header: 'Name', primary: true, sortable: true, accessor: (p) => p.name,
      render: (p) => (
        <>
          <button
            type="button"
            onClick={() => cb.onViewDetails(p)}
            className="font-medium text-left hover:text-primary hover:underline transition-colors"
          >
            {p.name}
          </button>
          {p.description && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{p.description}</p>}
        </>
      ),
    },
    {
      key: 'reward_type', header: 'Reward Type', filterable: true,
      filterOptions: Object.entries(REWARD_TYPE_LABELS).map(([value, label]) => ({ value, label })),
      accessor: (p) => p.reward_type, render: (p) => <Badge variant="default">{REWARD_TYPE_LABELS[p.reward_type] || p.reward_type}</Badge>,
    },
    {
      key: 'is_active', header: 'Status', mobileAction: true, filterable: true,
      filterOptions: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }],
      accessor: (p) => String(p.is_active), render: (p) => <Badge variant={p.is_active ? 'success' : 'outline'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'created_at', header: 'Created', mobileHidden: true, sortable: true, cellClassName: 'text-muted-foreground text-xs',
      accessor: (p) => p.created_at, render: (p) => formatDate(p.created_at),
    },
    {
      key: 'actions', header: '', align: 'right', exportable: false,
      render: (p) => <RowActionMenu row={p} actions={actions} />,
    },
  ];
}

export interface ReferralColumnCallbacks {
  onIssueReward: (referral: Referral) => void;
  onViewRewards: (referral: Referral) => void;
  onConvert: (referral: Referral) => void;
  convertPending: boolean;
  onActivate: (referral: Referral) => void;
  onExpire: (referral: Referral) => void;
  onRevoke: (referral: Referral) => void;
  /** Opens the shared program-detail modal for this referral's program. */
  onViewProgram: (referral: Referral) => void;
}

export function buildReferralColumns(programs: ReferralProgram[], cb: ReferralColumnCallbacks): DataTableColumn<Referral>[] {
  const programOf = (r: Referral) => programs.find((p) => p.id === r.program_id);
  // Mirrors the backend's 400 guard: an equity referral (type_b, or already linked to an
  // equity holder) is paid via the equity-holder allocation, not the Issue Reward action.
  const isEquityReferral = (r: Referral) => programOf(r)?.referral_type === 'type_b' || !!r.equity_holder_id;
  const canConvert = (r: Referral) => programOf(r)?.referral_type === 'type_b' && r.status === 'active' && !r.equity_holder_id;

  const actions: RowAction<Referral>[] = [
    { label: 'View Program', onClick: cb.onViewProgram },
    { label: 'Activate', onClick: cb.onActivate },
    { label: 'Expire', onClick: cb.onExpire },
    { label: 'Revoke', destructive: true, onClick: cb.onRevoke },
    { label: 'Issue Reward', visible: (r) => !isEquityReferral(r), onClick: cb.onIssueReward },
    { label: 'View Rewards', onClick: cb.onViewRewards },
    { label: 'Convert to Equity →', visible: canConvert, disabled: () => cb.convertPending, onClick: cb.onConvert },
  ];

  return [
    { key: 'referral_code', header: 'Referral Code', primary: true, sortable: true, cellClassName: 'font-mono text-xs', accessor: (r) => r.referral_code },
    {
      key: 'referrer', header: 'Referrer', mobileHidden: true, cellClassName: 'text-xs text-muted-foreground truncate max-w-[140px]',
      accessor: (r) => r.referrer_name || r.referrer_tenant_id || '',
      render: (r) => (r.referrer_name ? <span title={r.referrer_email}>{r.referrer_name} <span className="text-[10px] opacity-60">(external)</span></span> : <span>{r.referrer_tenant_name || r.referrer_tenant_id}</span>),
    },
    {
      key: 'referred_tenant_id', header: 'Referred', mobileHidden: true, cellClassName: 'text-xs truncate max-w-[160px]',
      // Never show the bare UUID when a resolved tenant name is available.
      accessor: (r) => r.referred_tenant_name || r.referred_tenant_id,
      render: (r) => <span title={r.referred_tenant_id}>{r.referred_tenant_name || <span className="font-mono text-muted-foreground">{r.referred_tenant_id}</span>}</span>,
    },
    {
      key: 'program', header: 'Program',
      // Prefer the loaded program, then the referral's own resolved program_name;
      // the raw UUID is the last resort.
      accessor: (r) => programOf(r)?.name || r.program_name || r.program_id,
      render: (r) => (
        <button
          type="button"
          onClick={() => cb.onViewProgram(r)}
          className="text-left font-medium hover:text-primary hover:underline transition-colors truncate max-w-[180px] block"
          title="View program details"
        >
          {programOf(r)?.name || r.program_name || <span className="font-mono text-xs text-muted-foreground">{r.program_id}</span>}
        </button>
      ),
    },
    {
      key: 'status', header: 'Status', mobileAction: true, filterable: true,
      filterOptions: Object.keys(REFERRAL_STATUS_VARIANT).map((value) => ({ value })),
      accessor: (r) => r.status, render: (r) => <Badge variant={REFERRAL_STATUS_VARIANT[r.status] || 'outline'}>{r.status}</Badge>,
    },
    {
      key: 'created_at', header: 'Date', mobileHidden: true, sortable: true, cellClassName: 'text-muted-foreground text-xs',
      accessor: (r) => r.created_at, render: (r) => formatDate(r.created_at),
    },
    {
      key: 'actions', header: '', align: 'right', exportable: false,
      render: (r) => <RowActionMenu row={r} actions={actions} />,
    },
  ];
}

/**
 * Slim referral columns for the Rewards tab, where each row expands to that
 * referral's reward table (DataTable's `renderExpanded`) instead of the old
 * hand-rolled accordion.
 */
export function buildRewardsByReferralColumns(
  programs: ReferralProgram[],
  onViewProgram: (referral: Referral) => void,
): DataTableColumn<Referral>[] {
  const programOf = (r: Referral) => programs.find((p) => p.id === r.program_id);
  return [
    { key: 'referral_code', header: 'Referral Code', primary: true, sortable: true, cellClassName: 'font-mono text-xs', accessor: (r) => r.referral_code },
    {
      key: 'program', header: 'Program',
      accessor: (r) => programOf(r)?.name || r.program_name || r.program_id,
      render: (r) => (
        <button
          type="button"
          onClick={() => onViewProgram(r)}
          className="text-left text-xs font-medium hover:text-primary hover:underline transition-colors"
        >
          {programOf(r)?.name || r.program_name || 'Unknown program'}
        </button>
      ),
    },
    {
      key: 'referred_tenant_id', header: 'Referred', mobileHidden: true, cellClassName: 'text-xs truncate max-w-[160px]',
      accessor: (r) => r.referred_tenant_name || r.referred_tenant_id,
      render: (r) => r.referred_tenant_name || <span className="font-mono text-muted-foreground">{r.referred_tenant_id}</span>,
    },
    {
      key: 'status', header: 'Status', mobileAction: true, filterable: true,
      filterOptions: Object.keys(REFERRAL_STATUS_VARIANT).map((value) => ({ value })),
      accessor: (r) => r.status, render: (r) => <Badge variant={REFERRAL_STATUS_VARIANT[r.status] || 'outline'}>{r.status}</Badge>,
    },
    {
      key: 'created_at', header: 'Date', mobileHidden: true, sortable: true, cellClassName: 'text-muted-foreground text-xs',
      accessor: (r) => r.created_at, render: (r) => formatDate(r.created_at),
    },
  ];
}

/**
 * Columns for a referral's issued rewards. Shared by the Rewards tab's expanded
 * rows and the "View Rewards" dialog so both render the same table rather than
 * one bespoke <table> each.
 */
export function buildRewardColumns(): DataTableColumn<ReferralReward>[] {
  return [
    {
      key: 'reward_type', header: 'Type', primary: true, filterable: true,
      filterOptions: Object.entries(REWARD_TYPE_LABELS).map(([value, label]) => ({ value, label })),
      accessor: (r) => r.reward_type,
      render: (r) => <Badge variant="default">{REWARD_TYPE_LABELS[r.reward_type] || r.reward_type}</Badge>,
    },
    {
      key: 'amount', header: 'Amount', align: 'right', sortable: true, cellClassName: 'tabular-nums font-medium',
      accessor: (r) => (r.amount != null ? parseFloat(r.amount) : 0),
      render: (r) => (r.amount ? `${r.currency} ${r.amount}` : '—'),
    },
    {
      key: 'status', header: 'Status', mobileAction: true, filterable: true,
      filterOptions: Object.keys(REFERRAL_STATUS_VARIANT).map((value) => ({ value })),
      accessor: (r) => r.status,
      render: (r) => <Badge variant={REFERRAL_STATUS_VARIANT[r.status] || 'outline'}>{r.status}</Badge>,
    },
    {
      key: 'description', header: 'Description', mobileHidden: true,
      cellClassName: 'text-xs text-muted-foreground truncate max-w-[200px]',
      accessor: (r) => r.description ?? '',
    },
    {
      key: 'issued_at', header: 'Issued', mobileHidden: true, sortable: true, cellClassName: 'text-muted-foreground text-xs',
      accessor: (r) => r.issued_at ?? '', render: (r) => (r.issued_at ? formatDate(r.issued_at) : '—'),
    },
    {
      key: 'redeemed_at', header: 'Redeemed', mobileHidden: true, sortable: true, cellClassName: 'text-muted-foreground text-xs',
      accessor: (r) => r.redeemed_at ?? '', render: (r) => (r.redeemed_at ? formatDate(r.redeemed_at) : '—'),
    },
  ];
}
