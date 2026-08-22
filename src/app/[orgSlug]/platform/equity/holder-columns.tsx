'use client';

// DataTable column definitions for the Equity Holders list — split out of
// page.tsx to mirror the referrals/entitlements list convention.

import { Badge } from '@/components/ui/base';
import { RowActionMenu, type RowAction } from '@/components/ui/action-menu';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { EquityHolder, HolderProjection } from '@/lib/api/equity';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * The four holder kinds an admin actually thinks in, derived from
 * compensation_model + parent_holder_id + holder_type. Raw enum text
 * ("equity_revenue_share", "shareholder") never reaches the table.
 */
export type HolderKind = 'umbrella' | 'company_shareholder' | 'royalty' | 'revenue_share';

export const HOLDER_KIND_LABELS: Record<HolderKind, string> = {
    umbrella: 'Umbrella (Company)',
    company_shareholder: 'Company Shareholder',
    royalty: 'Royalty',
    revenue_share: 'Revenue Share',
};

const HOLDER_KIND_VARIANT: Record<HolderKind, 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary'> = {
    umbrella: 'secondary',
    company_shareholder: 'secondary',
    royalty: 'warning',
    revenue_share: 'default',
};

export function holderKind(h: EquityHolder): HolderKind {
    if (h.compensation_model === 'dividend') {
        return h.parent_holder_id ? 'company_shareholder' : 'umbrella';
    }
    if (h.compensation_model === 'royalty' || h.holder_type === 'royalty') return 'royalty';
    return 'revenue_share';
}

/** Dividend holders are paid via a declared dividend, never the automatic revenue-share engine. */
export function isDividendHolder(h: EquityHolder): boolean {
    return h.compensation_model === 'dividend';
}

const kes = (v: number | undefined) =>
    `KES ${Number(v ?? 0).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;

const FREQUENCY_LABELS: Record<string, string> = {
    manual: 'Manual',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    annually: 'Annually',
};

export interface HolderColumnCallbacks {
    onOpen: (holder: EquityHolder) => void;
    onHistory: (holder: EquityHolder) => void;
    onEntitlements: (holder: EquityHolder) => void;
    onDocuments: (holder: EquityHolder) => void;
    onTriggerPayout: (holder: EquityHolder) => void;
    onEdit: (holder: EquityHolder) => void;
    onPortalLink: (holder: EquityHolder) => void;
    /** Holder id currently mid-payout, so its Pay Now entry disables. */
    payingHolderId?: string | null;
    /** Holder id currently minting a portal link. */
    linkingHolderId?: string | null;
}

export interface HolderColumnOptions {
    /** Projections keyed by holder id, from GetEquitySummary. */
    projections: Map<string, HolderProjection>;
    /** Resolves a tenant UUID to its display name (platform tenant directory). */
    resolveTenantName: (tenantId: string) => string | undefined;
    cb: HolderColumnCallbacks;
}

export function buildHolderColumns({ projections, resolveTenantName, cb }: HolderColumnOptions): DataTableColumn<EquityHolder>[] {
    const actions: RowAction<EquityHolder>[] = [
        { label: 'Payout History', onClick: cb.onHistory },
        // Entitlements are the ONLY earnings config for non-dividend holders;
        // dividend holders don't use them at all, so the entry is hidden there.
        { label: 'Entitlements', visible: (h) => !isDividendHolder(h), onClick: cb.onEntitlements },
        { label: 'Documents', onClick: cb.onDocuments },
        { label: 'Pay Now', disabled: (h) => cb.payingHolderId === h.id, onClick: cb.onTriggerPayout },
        { label: 'Edit', onClick: cb.onEdit },
        { label: 'Copy Portal Link', disabled: (h) => cb.linkingHolderId === h.id, onClick: cb.onPortalLink },
    ];

    /** Linked tenants, preferring backend-resolved names over local resolution. */
    const tenantNames = (h: EquityHolder): string[] => {
        const ids = h.linked_tenant_ids ?? [];
        if (h.linked_tenant_names?.length) return h.linked_tenant_names;
        return ids.map((id) => resolveTenantName(id) ?? `${id.slice(0, 8)}…`);
    };

    return [
        {
            key: 'name',
            header: 'Holder',
            primary: true,
            sortable: true,
            accessor: (h) => h.name,
            render: (h) => (
                <div className="flex items-center gap-2 min-w-0">
                    {h.is_active
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" aria-label="Active" />
                        : <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" aria-label="Inactive" />}
                    <div className="min-w-0">
                        <button
                            type="button"
                            onClick={() => cb.onOpen(h)}
                            className="font-medium text-left hover:text-primary hover:underline transition-colors truncate max-w-[200px] block"
                        >
                            {h.name}
                        </button>
                        {h.email && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{h.email}</p>}
                    </div>
                </div>
            ),
        },
        {
            key: 'kind',
            header: 'Type',
            filterable: true,
            filterOptions: (Object.keys(HOLDER_KIND_LABELS) as HolderKind[]).map((value) => ({
                value,
                label: HOLDER_KIND_LABELS[value],
            })),
            accessor: (h) => holderKind(h),
            render: (h) => {
                const kind = holderKind(h);
                return (
                    <div className="space-y-0.5">
                        <Badge variant={HOLDER_KIND_VARIANT[kind]}>{HOLDER_KIND_LABELS[kind]}</Badge>
                        {isDividendHolder(h) && (
                            <p className="text-[10px] text-muted-foreground">Paid by dividend declaration</p>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'share',
            header: 'Share',
            align: 'right',
            sortable: true,
            // Dividend holders carry a real registered %; for everyone else the
            // effective share comes from the allocation engine's projection.
            accessor: (h) => Number(projections.get(h.id)?.percentage_share ?? h.percentage_share ?? 0),
            render: (h) => {
                const pct = Number(projections.get(h.id)?.percentage_share ?? h.percentage_share ?? 0);
                if (isDividendHolder(h)) {
                    const shares = h.share_count;
                    const issued = h.total_issued_shares;
                    return (
                        <div className="text-right">
                            <p className="font-mono font-semibold text-xs">{pct}%</p>
                            {shares != null && shares > 0 && (
                                <p className="text-[10px] text-muted-foreground tabular-nums">
                                    {shares.toLocaleString()}{issued ? ` / ${issued.toLocaleString()}` : ''} shares
                                </p>
                            )}
                        </div>
                    );
                }
                return (
                    <div className="text-right">
                        <p className="font-mono font-semibold text-xs">{pct ? `${pct}%` : '—'}</p>
                        <p className="text-[10px] text-muted-foreground">via entitlements</p>
                    </div>
                );
            },
        },
        {
            key: 'linked_tenants',
            header: 'Linked Tenants',
            mobileHidden: true,
            accessor: (h) => tenantNames(h).join(', '),
            render: (h) => {
                const names = tenantNames(h);
                if (names.length === 0) return <span className="text-xs text-muted-foreground">All tenants</span>;
                return (
                    <span className="flex flex-wrap items-center gap-1" title={names.join(', ')}>
                        {names.slice(0, 2).map((n, i) => (
                            <span key={`${n}-${i}`} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold max-w-[120px] truncate">
                                {n}
                            </span>
                        ))}
                        {names.length > 2 && (
                            <span className="text-[10px] text-muted-foreground font-semibold">+{names.length - 2}</span>
                        )}
                    </span>
                );
            },
        },
        {
            key: 'accrued_since_last_payout',
            header: (
                <span title="Cumulative balance since this holder's last payout (or since they were set up, if never paid) — independent of the date range below. This is what their NEXT scheduled/manual payout will be based on.">
                    Accrued
                </span>
            ),
            align: 'right',
            sortable: true,
            cellClassName: 'tabular-nums text-xs',
            accessor: (h) => Number(projections.get(h.id)?.accrued_since_last_payout ?? 0),
            render: (h) => {
                const p = projections.get(h.id);
                if (p?.accrued_since_last_payout == null) return <span className="text-muted-foreground">—</span>;
                const accrued = Number(p.accrued_since_last_payout);
                return (
                    <span
                        className="font-semibold"
                        title={accrued > 0 ? 'Owed to this holder as of today — will be paid out once it clears the platform payout threshold, on their configured schedule.' : "No revenue attributable to this holder since their last payout — not an error if their linked tenant(s) had no qualifying activity in that window."}
                    >
                        {kes(p.accrued_since_last_payout)}
                    </span>
                );
            },
        },
        {
            key: 'projected_amount',
            header: (
                <span title="Net-of-tax allocation for the date range selected above ONLY — a narrower window than Accrued. KES 0.00 here does not mean broken: it can simply mean no qualifying revenue fell inside this specific range even though the Accrued balance (a different, wider window) is non-zero.">
                    This Period
                </span>
            ),
            align: 'right',
            sortable: true,
            cellClassName: 'tabular-nums text-xs font-bold',
            accessor: (h) => Number(projections.get(h.id)?.projected_amount ?? 0),
            render: (h) => {
                const p = projections.get(h.id);
                const projected = Number(p?.projected_amount ?? 0);
                const accrued = Number(p?.accrued_since_last_payout ?? 0);
                if (projected === 0 && accrued > 0) {
                    return (
                        <span title="Nothing new in this specific date range — see the Accrued column for their real outstanding balance.">
                            <span>{kes(p?.projected_amount)}</span>
                            <span className="block text-[10px] font-normal text-muted-foreground normal-case">see Accrued</span>
                        </span>
                    );
                }
                return <span>{kes(p?.projected_amount)}</span>;
            },
        },
        {
            key: 'payout_frequency',
            header: 'Frequency',
            mobileHidden: true,
            filterable: true,
            filterOptions: Object.entries(FREQUENCY_LABELS).map(([value, label]) => ({ value, label })),
            accessor: (h) => h.payout_frequency ?? 'manual',
            render: (h) => (
                <span className="text-xs text-muted-foreground">
                    {FREQUENCY_LABELS[h.payout_frequency ?? 'manual'] ?? h.payout_frequency}
                </span>
            ),
        },
        {
            key: 'is_active',
            header: 'Status',
            mobileAction: true,
            filterable: true,
            filterOptions: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }],
            accessor: (h) => String(h.is_active),
            render: (h) => <Badge variant={h.is_active ? 'success' : 'outline'}>{h.is_active ? 'Active' : 'Inactive'}</Badge>,
        },
        {
            key: 'actions',
            header: '',
            align: 'right',
            exportable: false,
            render: (h) => <RowActionMenu row={h} actions={actions} />,
        },
    ];
}
