'use client';

/**
 * Dividend Declarations — the Declare → Approve → Pay flow against
 * treasury-api's dividends.go, scoped to the umbrella "company" holder (see
 * equity-cap-table.tsx for how the umbrella is found).
 *
 * There is no dry-run/preview endpoint on the backend: the available-for-
 * distribution ceiling breakdown (cumulative net profit, already declared,
 * accrued non-dividend obligations) is only ever returned as a side effect of
 * actually declaring (POST .../dividends) — never by GET/list. So this UI does
 * NOT pretend to show a live ceiling before the admin submits; it explains that
 * up front, then surfaces the real number from the declare call's own success
 * or rejection response. See lib/api/dividends.ts's file doc for the full
 * reasoning (this is a real backend gap, deliberately not re-derived client-side
 * per the accounting-ceiling authority it represents).
 */

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { RowActionMenu, type RowAction } from '@/components/ui/action-menu';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { findDividendUmbrellas } from './equity-cap-table';
import type { EquityHolder } from '@/lib/api/equity';
import type { DividendDeclaration, DividendPayResponse } from '@/lib/api/dividends';
import {
    backendErrorMessage,
    useApproveDividendDeclaration,
    useCancelDividendDeclaration,
    useDeclareDividend,
    useDividendDeclaration,
    useDividendDeclarations,
    usePayDividendDeclaration,
} from '@/hooks/use-dividends';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle2, Info, Landmark, Loader2, Plus, Users } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

const STATUS_VARIANT: Record<DividendDeclaration['status'], 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary'> = {
    draft: 'outline',
    approved: 'warning',
    paid: 'success',
    cancelled: 'error',
};

function kes(v: string | number | undefined): string {
    return `KES ${Number(v ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d?: string): string {
    if (!d) return '—';
    try {
        return format(new Date(d), 'MMM d, yyyy');
    } catch {
        return d;
    }
}

// ─── Declarations DataTable columns ──────────────────────────────────────────

interface DividendColumnCallbacks {
    onView: (decl: DividendDeclaration) => void;
    onApprove: (decl: DividendDeclaration) => void;
    onPay: (decl: DividendDeclaration) => void;
    onCancel: (decl: DividendDeclaration) => void;
    approvingId?: string | null;
    payingId?: string | null;
    cancellingId?: string | null;
}

function buildDividendColumns(cb: DividendColumnCallbacks): DataTableColumn<DividendDeclaration>[] {
    // State-transition rules mirrored EXACTLY from dividends.go's own handlers:
    //  - Approve: only a draft (ApproveDividendDeclaration 409s on anything else).
    //  - Pay: approved OR already-paid — paid is allowed so a partially-failed
    //    disbursement (e.g. one shareholder missing a recipient_code) can be
    //    retried; PayDividendDeclaration is idempotent per (declaration, shareholder).
    //  - Cancel: draft or approved only — never a paid declaration.
    const actions: RowAction<DividendDeclaration>[] = [
        { label: 'View Details', onClick: cb.onView },
        {
            label: 'Approve',
            visible: (d) => d.status === 'draft',
            disabled: (d) => cb.approvingId === d.id,
            onClick: cb.onApprove,
        },
        {
            label: 'Pay',
            visible: (d) => d.status === 'approved' || d.status === 'paid',
            disabled: (d) => cb.payingId === d.id,
            onClick: cb.onPay,
        },
        {
            label: 'Cancel Declaration',
            destructive: true,
            visible: (d) => d.status === 'draft' || d.status === 'approved',
            disabled: (d) => cb.cancellingId === d.id,
            onClick: cb.onCancel,
        },
    ];

    return [
        {
            key: 'period',
            header: 'Period',
            primary: true,
            sortable: true,
            accessor: (d) => d.period_end,
            render: (d) => (
                <button
                    type="button"
                    onClick={() => cb.onView(d)}
                    className="text-left hover:text-primary hover:underline transition-colors"
                >
                    <p className="font-medium">{formatDate(d.period_start)} → {formatDate(d.period_end)}</p>
                    {d.notes && <p className="text-xs text-muted-foreground truncate max-w-[220px]">{d.notes}</p>}
                </button>
            ),
        },
        {
            key: 'declared_payout_amount',
            header: 'Declared Payout',
            align: 'right',
            sortable: true,
            cellClassName: 'font-mono font-semibold',
            accessor: (d) => Number(d.declared_payout_amount),
            render: (d) => kes(d.declared_payout_amount),
        },
        {
            key: 'declared_retained_amount',
            header: 'Retained',
            align: 'right',
            mobileHidden: true,
            cellClassName: 'font-mono text-xs text-muted-foreground',
            accessor: (d) => Number(d.declared_retained_amount),
            render: (d) => kes(d.declared_retained_amount),
        },
        {
            key: 'status',
            header: 'Status',
            mobileAction: true,
            filterable: true,
            filterOptions: [
                { value: 'draft', label: 'Draft' },
                { value: 'approved', label: 'Approved' },
                { value: 'paid', label: 'Paid' },
                { value: 'cancelled', label: 'Cancelled' },
            ],
            accessor: (d) => d.status,
            render: (d) => <Badge variant={STATUS_VARIANT[d.status]}>{d.status}</Badge>,
        },
        {
            key: 'created_at',
            header: 'Declared On',
            mobileHidden: true,
            sortable: true,
            cellClassName: 'text-xs text-muted-foreground',
            accessor: (d) => d.created_at,
            render: (d) => formatDate(d.created_at),
        },
        {
            key: 'actions',
            header: '',
            align: 'right',
            exportable: false,
            render: (d) => <RowActionMenu row={d} actions={actions} />,
        },
    ];
}

// ─── Shared breakdown (financials + per-shareholder lines) ──────────────────

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: 'primary' }) {
    return (
        <div className={cn('rounded-xl border p-3', tone === 'primary' ? 'border-primary/20 bg-primary/5' : 'border-border/60 bg-card')}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className={cn('text-sm font-black mt-1', tone === 'primary' && 'text-primary')}>{value}</p>
        </div>
    );
}

/** Renders a declaration's financial breakdown + per-shareholder gross/tax/net
 *  lines. Used both for a just-declared result (which carries the live ceiling
 *  fields) and a past declaration fetched via GET (which never does — those
 *  three fields are `omitempty` on every endpoint except the declare response
 *  itself; see lib/api/dividends.ts). A plain table, not the shared DataTable —
 *  matching this page's own precedent (see page.tsx's PreviewPayoutModal) for a
 *  small, non-paginated breakdown embedded in a modal. */
function DeclarationBreakdown({ decl }: { decl: DividendDeclaration }) {
    const hasLiveCeiling = decl.available_for_distribution != null;
    const items = decl.shareholder_line_items ?? [];

    return (
        <div className="space-y-4">
            {hasLiveCeiling ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <MiniStat label="Cumulative Net Profit" value={kes(decl.cumulative_net_profit)} />
                    <MiniStat label="Accrued Referral Obligations" value={kes(decl.accrued_referral_obligations)} />
                    <MiniStat label="Available for Distribution" value={kes(decl.available_for_distribution)} tone="primary" />
                    <MiniStat label="Retained" value={kes(decl.declared_retained_amount)} />
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    <MiniStat label="Declared Payout" value={kes(decl.declared_payout_amount)} />
                    <MiniStat label="Retained" value={kes(decl.declared_retained_amount)} />
                </div>
            )}

            <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Per-Shareholder Breakdown ({items.length})
                </p>
                {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active shareholders to distribute to.</p>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-border/60">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/60 bg-accent/10 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    <th className="px-3 py-2">Shareholder</th>
                                    <th className="px-3 py-2 text-right">%</th>
                                    <th className="px-3 py-2 text-right">Gross</th>
                                    <th className="px-3 py-2 text-right">Tax Withheld</th>
                                    <th className="px-3 py-2 text-right">Net</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {items.map((it) => (
                                    <tr key={it.holder_id}>
                                        <td className="px-3 py-2">{it.name}</td>
                                        <td className="px-3 py-2 text-right font-mono">{Number(it.percentage_share).toFixed(2)}%</td>
                                        <td className="px-3 py-2 text-right font-mono">{kes(it.gross)}</td>
                                        <td className="px-3 py-2 text-right font-mono text-muted-foreground">{kes(it.tax_withheld)}</td>
                                        <td className="px-3 py-2 text-right font-mono font-semibold">{kes(it.net)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Declare Dividend modal ───────────────────────────────────────────────────

function DeclareDividendModal({
    umbrellaId,
    umbrellaName,
    onClose,
}: {
    umbrellaId: string;
    umbrellaName: string;
    onClose: () => void;
}) {
    const declare = useDeclareDividend(umbrellaId);
    const [periodStart, setPeriodStart] = useState('');
    const [periodEnd, setPeriodEnd] = useState('');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [result, setResult] = useState<DividendDeclaration | null>(null);

    const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm';

    const amountNum = parseFloat(amount);
    const amountValid = amount.trim() !== '' && !Number.isNaN(amountNum) && amountNum >= 0;
    const datesValid = !!periodStart && !!periodEnd && periodEnd > periodStart;
    const canSubmit = amountValid && datesValid && !declare.isPending;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        try {
            const decl = await declare.mutateAsync({
                period_start: periodStart,
                period_end: periodEnd,
                declared_payout_amount: amount,
                notes: notes || undefined,
            });
            setResult(decl);
        } catch {
            // Surfaced via declare.isError below (inline) + the hook's own toast.
        }
    };

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent
                title={result ? 'Dividend Declared' : `Declare Dividend — ${umbrellaName}`}
                onClose={onClose}
                className="max-w-2xl"
            >
                {result ? (
                    <div className="space-y-4">
                        <div className="flex items-start gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-700 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>
                                Declared as a <strong>draft</strong> for {formatDate(result.period_start)} → {formatDate(result.period_end)}.
                                Nothing has been paid — approve it once the board resolution is ready, then pay it.
                            </span>
                        </div>
                        <DeclarationBreakdown decl={result} />
                        <div className="flex justify-end pt-2 border-t border-border">
                            <Button onClick={onClose}>Done</Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10 text-sm">
                            <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                            <span className="text-muted-foreground">
                                The available-for-distribution ceiling (cumulative net profit, less amounts already
                                declared and amounts already earned but unpaid by referral/royalty holders) is
                                computed by the backend on submit — it is the real accounting authority and is not
                                re-derived here. If your amount exceeds it, the exact breakdown is shown below so you
                                can adjust and resubmit. Declaring only creates a cancellable draft; nothing is paid yet.
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Period Start" required>
                                <input
                                    type="date"
                                    value={periodStart}
                                    onChange={(e) => setPeriodStart(e.target.value)}
                                    className={inputClass}
                                    required
                                />
                            </FormField>
                            <FormField
                                label="Period End"
                                required
                                error={periodStart && periodEnd && periodEnd <= periodStart ? 'Must be after period start.' : undefined}
                            >
                                <input
                                    type="date"
                                    value={periodEnd}
                                    onChange={(e) => setPeriodEnd(e.target.value)}
                                    className={inputClass}
                                    required
                                />
                            </FormField>
                        </div>

                        <FormField
                            label="Declared Payout Amount (KES)"
                            required
                            description="Total distributed to shareholders pro-rata by their registered %. Rejected if it exceeds the available-for-distribution ceiling."
                        >
                            <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className={inputClass}
                                placeholder="e.g. 500000.00"
                                required
                            />
                        </FormField>

                        <FormField label="Notes" description="Optional — e.g. board resolution reference.">
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className={cn(inputClass, 'min-h-20')}
                            />
                        </FormField>

                        {declare.isError && (
                            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                <span>{backendErrorMessage(declare.error, 'Failed to declare dividend')}</span>
                            </div>
                        )}

                        <div className="flex gap-2 justify-end pt-2 border-t border-border">
                            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                            <Button type="submit" disabled={!canSubmit}>
                                {declare.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Declare
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}

// ─── Declaration detail / drill-in modal ─────────────────────────────────────

function DeclarationDetailModal({
    umbrellaId,
    declarationId,
    onClose,
    onApprove,
    onPay,
    onCancel,
    approvingId,
    payingId,
    cancellingId,
    payResult,
}: {
    umbrellaId: string;
    declarationId: string;
    onClose: () => void;
    onApprove: (decl: DividendDeclaration) => void;
    onPay: (decl: DividendDeclaration) => void;
    onCancel: (decl: DividendDeclaration) => void;
    approvingId?: string | null;
    payingId?: string | null;
    cancellingId?: string | null;
    /** The most recent Pay call's result, if it was for THIS declaration — shown
     *  so the admin can see exactly who was paid vs. skipped (and why), not just
     *  the aggregate toast count. */
    payResult?: DividendPayResponse | null;
}) {
    const { data: decl, isLoading, isError } = useDividendDeclaration(umbrellaId, declarationId);

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent title="Dividend Declaration" onClose={onClose} className="max-w-2xl">
                {isLoading ? (
                    <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground text-sm">
                        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                    </div>
                ) : isError || !decl ? (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" /> Failed to load this declaration. Check your connection and try again.
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <p className="text-sm font-semibold">{formatDate(decl.period_start)} → {formatDate(decl.period_end)}</p>
                                {decl.notes && <p className="text-xs text-muted-foreground mt-0.5">{decl.notes}</p>}
                            </div>
                            <Badge variant={STATUS_VARIANT[decl.status]}>{decl.status}</Badge>
                        </div>

                        <DeclarationBreakdown decl={decl} />

                        <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-border">
                            {decl.status === 'draft' && (
                                <Button variant="outline" onClick={() => onApprove(decl)} disabled={approvingId === decl.id}>
                                    {approvingId === decl.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Approve
                                </Button>
                            )}
                            {(decl.status === 'approved' || decl.status === 'paid') && (
                                <Button onClick={() => onPay(decl)} disabled={payingId === decl.id}>
                                    {payingId === decl.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    {decl.status === 'paid' ? 'Retry Pay' : 'Pay'}
                                </Button>
                            )}
                            {(decl.status === 'draft' || decl.status === 'approved') && (
                                <Button
                                    variant="outline"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => onCancel(decl)}
                                    disabled={cancellingId === decl.id}
                                >
                                    {cancellingId === decl.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Cancel Declaration
                                </Button>
                            )}
                            <Button variant="outline" onClick={onClose}>Close</Button>
                        </div>

                        {payResult && payResult.declaration_id === decl.id && (
                            <div className="space-y-2 pt-2 border-t border-border">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Last Pay Attempt — Per-Shareholder Result
                                </p>
                                <div className="rounded-lg border border-border/60 divide-y divide-border/50">
                                    {payResult.results.map((r) => (
                                        <div key={r.holder_id} className="flex items-center justify-between px-3 py-2 text-sm">
                                            <span className="font-medium truncate">{r.name}</span>
                                            <span className="flex items-center gap-2 shrink-0">
                                                <span className="font-mono text-xs">{kes(r.net)}</span>
                                                {r.skipped ? (
                                                    <Badge variant="warning" className="text-[10px]">{r.skipped}</Badge>
                                                ) : (
                                                    <Badge variant="success" className="text-[10px]">{r.status ?? 'ok'}</Badge>
                                                )}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function DividendsPanel({
    holders,
    loadingHolders,
    holdersError,
}: {
    holders: EquityHolder[];
    loadingHolders?: boolean;
    holdersError?: boolean;
}) {
    const umbrellas = useMemo(() => findDividendUmbrellas(holders), [holders]);
    const [selectedUmbrellaId, setSelectedUmbrellaId] = useState('');
    const umbrella = umbrellas.find((h) => h.id === selectedUmbrellaId) ?? umbrellas[0];

    const [showDeclare, setShowDeclare] = useState(false);
    const [viewDeclarationId, setViewDeclarationId] = useState<string | null>(null);

    const { data, isLoading, isError } = useDividendDeclarations(umbrella?.id ?? '');
    const declarations = data?.declarations ?? [];

    const approve = useApproveDividendDeclaration(umbrella?.id ?? '');
    const pay = usePayDividendDeclaration(umbrella?.id ?? '');
    const cancel = useCancelDividendDeclaration(umbrella?.id ?? '');

    const approvingId = approve.isPending ? approve.variables ?? null : null;
    const payingId = pay.isPending ? pay.variables ?? null : null;
    const cancellingId = cancel.isPending ? cancel.variables ?? null : null;

    const columns = useMemo(
        () =>
            buildDividendColumns({
                onView: (d) => setViewDeclarationId(d.id),
                onApprove: (d) => approve.mutate(d.id),
                onPay: (d) => pay.mutate(d.id),
                onCancel: (d) => cancel.mutate(d.id),
                approvingId,
                payingId,
                cancellingId,
            }),
        [approve, pay, cancel, approvingId, payingId, cancellingId],
    );

    if (!loadingHolders && !holdersError && umbrellas.length === 0) {
        return (
            <Card className="border-none shadow-xl shadow-black/5">
                <CardHeader className="bg-transparent border-none">
                    <h3 className="text-xl font-bold flex items-center gap-3">
                        <Landmark className="h-5 w-5 text-primary" /> Dividend Declarations
                    </h3>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
                        <Users className="h-10 w-10 opacity-20" />
                        <p className="text-sm font-medium">No umbrella company holder configured yet.</p>
                        <p className="text-xs max-w-md">
                            Dividends can only be declared against an umbrella holder — see the Cap Table above for
                            how to set one up.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-xl shadow-black/5">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-transparent border-none">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-3">
                        <Landmark className="h-5 w-5 text-primary" /> Dividend Declarations
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                        Declare → Approve → Pay dividends to {umbrella?.name ?? 'the umbrella company'}&apos;s registered shareholders.
                    </p>
                </div>
                <div className="flex items-center gap-2">
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
                    <Button className="gap-2" onClick={() => setShowDeclare(true)} disabled={!umbrella}>
                        <Plus className="h-4 w-4" /> Declare Dividend
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="px-2 pb-2">
                    <DataTable
                        columns={columns}
                        rows={declarations}
                        rowKey={(d) => d.id}
                        loading={isLoading}
                        loadingRows={4}
                        error={isError}
                        storageKey="dividend-declarations-table"
                        pageSize={10}
                        pageSizeOptions={[10, 25, 50]}
                        emptyState={
                            <div className="text-muted-foreground flex flex-col items-center gap-3 py-6">
                                <Landmark className="h-8 w-8 opacity-20" />
                                <p className="text-sm">No dividends declared yet.</p>
                                {umbrella && (
                                    <Button variant="outline" size="sm" onClick={() => setShowDeclare(true)}>
                                        Declare the first one
                                    </Button>
                                )}
                            </div>
                        }
                    />
                </div>
            </CardContent>

            {showDeclare && umbrella && (
                <DeclareDividendModal
                    umbrellaId={umbrella.id}
                    umbrellaName={umbrella.name}
                    onClose={() => setShowDeclare(false)}
                />
            )}
            {viewDeclarationId && umbrella && (
                <DeclarationDetailModal
                    umbrellaId={umbrella.id}
                    declarationId={viewDeclarationId}
                    onClose={() => setViewDeclarationId(null)}
                    onApprove={(d) => approve.mutate(d.id)}
                    onPay={(d) => pay.mutate(d.id)}
                    onCancel={(d) => cancel.mutate(d.id)}
                    approvingId={approvingId}
                    payingId={payingId}
                    cancellingId={cancellingId}
                    payResult={pay.data}
                />
            )}
        </Card>
    );
}
