'use client';

/**
 * Cap Table — shows the umbrella "company" holder (compensation_model=dividend,
 * no parent_holder_id) and every registered shareholder rolling up under it
 * (parent_holder_id = the umbrella's id): share count, registered %, and
 * whether payout account details are on file (so an admin can see at a glance
 * who a declared dividend can actually be disbursed to).
 *
 * The percentage derivation mirrors equity-holder-form.tsx's Shareholding tab
 * EXACTLY (derive from share_count / the umbrella's total_issued_shares when
 * both are set, otherwise fall back to the holder's own typed percentage_share)
 * so this view can never disagree with what the Add/Edit Holder form shows.
 */

import { Badge, Card, CardContent, CardHeader } from '@/components/ui/base';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { EquityHolder } from '@/lib/api/equity';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, CheckCircle2, PieChart, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

/** The umbrella "company" holder(s): compensation_model=dividend with no parent_holder_id.
 *  Normally exactly one; defensive callers (this panel, the dividends panel) handle 0 or 2+. */
export function findDividendUmbrellas(holders: EquityHolder[]): EquityHolder[] {
    return holders.filter((h) => h.compensation_model === 'dividend' && !h.parent_holder_id);
}

/** Derives a shareholder's registered % exactly like equity-holder-form.tsx's
 *  Shareholding tab: from share_count / the umbrella's total_issued_shares when
 *  both are set, otherwise the holder's own typed percentage_share. */
export function deriveShareholderPercentage(holder: EquityHolder, umbrellaTotalIssuedShares?: number | null): number {
    if (holder.share_count && umbrellaTotalIssuedShares && umbrellaTotalIssuedShares > 0) {
        return Number(((holder.share_count / umbrellaTotalIssuedShares) * 100).toFixed(4));
    }
    return holder.percentage_share ?? 0;
}

/** Whether a holder has real payout account details on file for its configured
 *  payout method, vs. the empty `"{}"` placeholder every holder is created
 *  with. Checked per-method since each stores different keys — see
 *  equity-holder-form.tsx's buildPayoutDetails, the single source of truth for
 *  this JSON shape. */
export function hasPayoutDetailsOnFile(holder: EquityHolder): boolean {
    if (!holder.payout_account_details) return false;
    let details: Record<string, unknown>;
    try {
        details = typeof holder.payout_account_details === 'string'
            ? JSON.parse(holder.payout_account_details)
            : (holder.payout_account_details as unknown as Record<string, unknown>);
    } catch {
        return false;
    }
    const filled = (v: unknown) => typeof v === 'string' && v.trim() !== '';
    switch (holder.payout_method) {
        case 'paystack_transfer':
            return filled(details.account_number) && filled(details.bank_code);
        case 'bank':
            return filled(details.account_number) && filled(details.bank_name);
        case 'mpesa_paybill':
            return filled(details.paybill_number) && filled(details.account_number);
        case 'mpesa_till':
            return filled(details.till_number);
        default:
            return Object.keys(details).length > 0;
    }
}

// Small epsilon for float/rounding drift — matches the backend's own 100.0001
// tolerance in equity.go's cap-table integrity check, scaled to a display-level check.
const PCT_TOLERANCE = 0.05;

/** Column builder for the shareholder DataTable — colocated with this panel
 *  (rather than split into the route folder like holder-columns.tsx) since it's
 *  only ever used here, and this panel already owns the derivation helpers above. */
function buildCapTableColumns(umbrellaTotalIssuedShares?: number | null): DataTableColumn<EquityHolder>[] {
    return [
        {
            key: 'name',
            header: 'Shareholder',
            primary: true,
            sortable: true,
            accessor: (h) => h.name,
            render: (h) => (
                <div className="min-w-0">
                    <p className="font-medium truncate">{h.name}</p>
                    {h.email && <p className="text-xs text-muted-foreground truncate">{h.email}</p>}
                </div>
            ),
        },
        {
            key: 'share_count',
            header: 'Shares',
            align: 'right',
            sortable: true,
            cellClassName: 'font-mono tabular-nums',
            accessor: (h) => h.share_count ?? 0,
            render: (h) => (h.share_count != null ? h.share_count.toLocaleString() : '—'),
        },
        {
            key: 'percentage',
            header: 'Percentage',
            align: 'right',
            sortable: true,
            mobileAction: true,
            accessor: (h) => deriveShareholderPercentage(h, umbrellaTotalIssuedShares),
            render: (h) => {
                const pct = deriveShareholderPercentage(h, umbrellaTotalIssuedShares);
                return (
                    <span className="inline-flex items-center gap-1.5">
                        <span className="font-mono font-semibold">{pct.toFixed(2)}%</span>
                        {h.is_beneficial_owner && <Badge variant="secondary">BO</Badge>}
                    </span>
                );
            },
        },
        {
            key: 'payout_method',
            header: 'Payout Method',
            mobileHidden: true,
            accessor: (h) => h.payout_method ?? '',
            render: (h) => (
                <span className="text-xs text-muted-foreground capitalize">
                    {(h.payout_method || '—').replace(/_/g, ' ')}
                </span>
            ),
        },
        {
            key: 'payout_details',
            header: 'Payout Details',
            align: 'right',
            filterable: true,
            filterOptions: [
                { value: 'true', label: 'On file' },
                { value: 'false', label: 'Missing' },
            ],
            accessor: (h) => String(hasPayoutDetailsOnFile(h)),
            render: (h) =>
                hasPayoutDetailsOnFile(h) ? (
                    <Badge variant="success" className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> On file
                    </Badge>
                ) : (
                    <Badge variant="warning" className="inline-flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Missing
                    </Badge>
                ),
        },
    ];
}

export function CapTableCard({
    holders,
    loading,
    error,
}: {
    holders: EquityHolder[];
    loading?: boolean;
    error?: boolean;
}) {
    const umbrellas = useMemo(() => findDividendUmbrellas(holders), [holders]);
    const [selectedUmbrellaId, setSelectedUmbrellaId] = useState('');
    const umbrella = umbrellas.find((h) => h.id === selectedUmbrellaId) ?? umbrellas[0];

    const shareholders = useMemo(
        () =>
            umbrella
                ? holders.filter((h) => h.compensation_model === 'dividend' && h.parent_holder_id === umbrella.id)
                : [],
        [holders, umbrella],
    );

    const totalPct = useMemo(
        () => shareholders.reduce((sum, h) => sum + deriveShareholderPercentage(h, umbrella?.total_issued_shares), 0),
        [shareholders, umbrella],
    );
    const pctBalanced = shareholders.length === 0 || Math.abs(totalPct - 100) <= PCT_TOLERANCE;
    const withPayoutDetails = shareholders.filter(hasPayoutDetailsOnFile).length;

    const columns = useMemo(() => buildCapTableColumns(umbrella?.total_issued_shares), [umbrella?.total_issued_shares]);

    if (umbrellas.length === 0 && !loading && !error) {
        return (
            <Card className="border-none shadow-xl shadow-black/5">
                <CardHeader className="bg-transparent border-none">
                    <h3 className="text-xl font-bold flex items-center gap-3">
                        <PieChart className="h-5 w-5 text-primary" /> Cap Table
                    </h3>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
                        <Users className="h-10 w-10 opacity-20" />
                        <p className="text-sm font-medium">No umbrella company holder configured yet.</p>
                        <p className="text-xs max-w-md">
                            Add a holder with compensation model &ldquo;Dividend&rdquo; and leave the umbrella
                            selector blank — that holder represents the company itself. Registered shareholders then
                            roll up under it from the Holders tab.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-xl shadow-black/5">
            <CardHeader className="bg-transparent border-none flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-3">
                        <PieChart className="h-5 w-5 text-primary" /> Cap Table
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                        {umbrella ? <>Registered shareholding under <strong>{umbrella.name}</strong>.</> : 'Registered shareholding.'}
                    </p>
                </div>
                {umbrellas.length > 1 && (
                    <select
                        value={umbrella?.id ?? ''}
                        onChange={(e) => setSelectedUmbrellaId(e.target.value)}
                        className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    >
                        {umbrellas.map((u) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {umbrellas.length > 1 && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 text-sm text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>
                            {umbrellas.length} umbrella holders found (compensation_model=dividend with no parent) —
                            this should not normally happen. Showing <strong>{umbrella?.name}</strong>; pick another
                            from the dropdown above.
                        </span>
                    </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <SummaryTile
                        label="Total Issued Shares"
                        value={umbrella?.total_issued_shares ? umbrella.total_issued_shares.toLocaleString() : '—'}
                    />
                    <SummaryTile label="Registered Shareholders" value={String(shareholders.length)} />
                    <SummaryTile
                        label="Sum of % Shares"
                        value={`${totalPct.toFixed(2)}%`}
                        tone={pctBalanced ? 'default' : 'warning'}
                    />
                    <SummaryTile
                        label="Payout Details on File"
                        value={`${withPayoutDetails}/${shareholders.length}`}
                        tone={shareholders.length > 0 && withPayoutDetails < shareholders.length ? 'warning' : 'default'}
                    />
                </div>

                {!pctBalanced && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 text-sm text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>
                            Registered shareholding sums to {totalPct.toFixed(2)}%, not 100% — the cap table may be
                            incomplete, or a shareholder&apos;s share count / percentage needs correcting.
                        </span>
                    </div>
                )}

                <DataTable
                    columns={columns}
                    rows={shareholders}
                    rowKey={(h) => h.id}
                    loading={loading}
                    loadingRows={3}
                    error={error}
                    storageKey="dividend-cap-table"
                    emptyState={
                        <div className="text-muted-foreground flex flex-col items-center gap-2 py-4">
                            <Users className="h-8 w-8 opacity-20" />
                            <p className="text-sm">No registered shareholders under this umbrella yet.</p>
                        </div>
                    }
                />
            </CardContent>
        </Card>
    );
}

function SummaryTile({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'warning' }) {
    return (
        <div
            className={cn(
                'rounded-xl border p-3',
                tone === 'warning' ? 'border-amber-500/20 bg-amber-500/5' : 'border-border/60 bg-card',
            )}
        >
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                {tone === 'warning' && <AlertCircle className="h-3 w-3" />}
                {label}
            </p>
            <p className={cn('text-lg font-black mt-1', tone === 'warning' && 'text-amber-600 dark:text-amber-400')}>
                {value}
            </p>
        </div>
    );
}
