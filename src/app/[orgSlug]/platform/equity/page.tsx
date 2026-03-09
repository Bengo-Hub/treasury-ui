'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import {
    useCreateEquityHolder,
    useEquityHolders,
    useEquitySummary,
    useHolderPayouts,
    useTriggerEquityPayout,
    useUpdateEquityHolder,
} from '@/hooks/use-equity';
import { useMe } from '@/hooks/useMe';
import type { CreateEquityHolderRequest, EquityHolder, EquityPayout } from '@/lib/api/equity';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    AlertCircle,
    ArrowRight,
    Calendar,
    CheckCircle2,
    DollarSign,
    Loader2,
    MoreVertical,
    PieChart,
    Plus,
    RefreshCcw,
    Shield,
    TrendingUp,
    Users,
    Wallet,
    X
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

export default function EquityManagementPage() {
    const { data: user } = useMe();
    const router = useRouter();
    const params = useParams();
    const orgSlug = params?.orgSlug as string;

    const [dateRange, setDateRange] = useState({
        from: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
        to: format(new Date(), 'yyyy-MM-dd'),
    });
    const [showAddHolder, setShowAddHolder] = useState(false);
    const [editingHolder, setEditingHolder] = useState<EquityHolder | null>(null);
    const [historyHolderId, setHistoryHolderId] = useState<string | null>(null);

    const { data: holdersData, isLoading: loadingHolders } = useEquityHolders();
    const { data: summaryData, isLoading: loadingSummary } = useEquitySummary(dateRange.from, dateRange.to);
    const triggerPayout = useTriggerEquityPayout();
    const createHolder = useCreateEquityHolder();
    const updateHolder = useUpdateEquityHolder();

    const holders = holdersData?.holders ?? [];
    const summary = summaryData;

    const isSuperAdmin = user?.roles?.includes('super_admin');

    if (!isSuperAdmin) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
                <Users className="h-12 w-12 text-muted-foreground opacity-20" />
                <h2 className="text-xl font-bold">Access Restricted</h2>
                <p className="text-muted-foreground text-sm">Equity management is only available to platform administrators.</p>
                <Button variant="outline" onClick={() => router.push(`/${orgSlug}`)}>Go Back</Button>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">Equity & Royalties</Badge>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                        Platform Equity Management
                    </h1>
                    <p className="text-muted-foreground mt-1 max-w-2xl">
                        Manage shareholders and royalty holders, monitor revenue allocations, and trigger automated payouts via Paystack.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="gap-2">
                        <Calendar className="h-4 w-4" />
                        Last 30 Days
                    </Button>
                    <Button className="gap-2 shadow-xl shadow-primary/20" onClick={() => setShowAddHolder(true)}>
                        <Plus className="h-4 w-4" />
                        Add Holder
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Gross Revenue"
                    value={`KES ${summary?.financial_summary.gross_revenue.toLocaleString() ?? '0'}`}
                    subtext="Across all services"
                    icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
                    loading={loadingSummary}
                />
                <StatsCard
                    title="Net Profit"
                    value={`KES ${summary?.financial_summary.net_profit.toLocaleString() ?? '0'}`}
                    subtext="After taxes & expenses"
                    icon={<DollarSign className="h-5 w-5 text-green-500" />}
                    loading={loadingSummary}
                />
                <StatsCard
                    title="Total Allocated"
                    value={`KES ${summary?.total_allocated.toLocaleString() ?? '0'}`}
                    subtext={`${((summary?.total_allocated ?? 0) / (summary?.financial_summary.net_profit || 1) * 100).toFixed(1)}% of profit`}
                    icon={<PieChart className="h-5 w-5 text-purple-500" />}
                    loading={loadingSummary}
                />
                <StatsCard
                    title="Active Holders"
                    value={holders.length.toString()}
                    subtext={`${holders.filter(h => h.holder_type === 'shareholder').length} Internal / ${holders.filter(h => h.holder_type === 'royalty').length} Royalty`}
                    icon={<Users className="h-5 w-5 text-orange-500" />}
                    loading={loadingHolders}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Holders List */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-none shadow-xl shadow-black/5 bg-gradient-to-b from-card to-card/50">
                        <CardHeader className="flex flex-row items-center justify-between bg-transparent border-none py-6 px-8">
                            <h3 className="text-xl font-bold flex items-center gap-3">
                                <Users className="h-5 w-5 text-primary" />
                                Equity Holders
                            </h3>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search holders..."
                                        className="h-9 w-64 rounded-full bg-accent/30 border-none px-4 text-xs focus:ring-1 focus:ring-primary/20 outline-none"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loadingHolders ? (
                                <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                                    <Loader2 className="h-8 w-8 animate-spin opacity-20" />
                                    <p className="text-sm">Loading holders...</p>
                                </div>
                            ) : holders.length === 0 ? (
                                <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                                    <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center opacity-30">
                                        <Users className="h-6 w-6" />
                                    </div>
                                    <p className="text-sm">No equity holders found.</p>
                                    <Button variant="outline" size="sm" onClick={() => setShowAddHolder(true)}>Create First Holder</Button>
                                </div>
                            ) : (
                                <div className="divide-y divide-border/50">
                                    {holders.map((holder) => (
                                        <HolderRow
                                            key={holder.id}
                                            holder={holder}
                                            projection={summary?.holders.find(p => p.holder_id === holder.id)}
                                            onTriggerPayout={() => {
                                                triggerPayout.mutate({
                                                    holderId: holder.id,
                                                    data: {
                                                        period_start: dateRange.from,
                                                        period_end: dateRange.to,
                                                    }
                                                });
                                            }}
                                            onEdit={() => setEditingHolder(holder)}
                                            onHistory={() => setHistoryHolderId(holder.id)}
                                            isTriggering={triggerPayout.isPending && triggerPayout.variables?.holderId === holder.id}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {showAddHolder && (
                        <HolderFormModal
                            title="Add holder"
                            initial={null}
                            onClose={() => setShowAddHolder(false)}
                            onSubmit={async (data) => {
                                await createHolder.mutateAsync(data);
                                setShowAddHolder(false);
                            }}
                            isSubmitting={createHolder.isPending}
                        />
                    )}
                    {editingHolder && (
                        <HolderFormModal
                            title="Edit holder"
                            initial={editingHolder}
                            onClose={() => setEditingHolder(null)}
                            onSubmit={async (data) => {
                                await updateHolder.mutateAsync({ id: editingHolder.id, data });
                                setEditingHolder(null);
                            }}
                            isSubmitting={updateHolder.isPending}
                        />
                    )}
                    {historyHolderId && (
                        <PayoutHistoryModal
                            holderId={historyHolderId}
                            holderName={holders.find(h => h.id === historyHolderId)?.name ?? 'Holder'}
                            onClose={() => setHistoryHolderId(null)}
                        />
                    )}
                </div>

                {/* Sidebar Projections & Config */}
                <div className="space-y-6">
                    <Card className="border-none shadow-xl shadow-black/5 bg-primary/5">
                        <CardHeader className="bg-transparent border-none">
                            <h3 className="font-bold flex items-center gap-2">
                                <RefreshCcw className="h-4 w-4 text-primary" />
                                Next Payout Projection
                            </h3>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-0 text-sm">
                            <div className="flex justify-between items-center p-3 rounded-xl bg-background/50 border border-border/50">
                                <span className="text-muted-foreground">Cycle Status</span>
                                <Badge variant="success" className="animate-pulse">Active</Badge>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl bg-background/50 border border-border/50">
                                <span className="text-muted-foreground">Next Auto-Run</span>
                                <span className="font-mono font-bold">2026-04-01</span>
                            </div>
                            <p className="text-xs text-muted-foreground px-1 leading-relaxed">
                                Profit is calculated from `{dateRange.from}` to `{dateRange.to}`. Payouts are triggered automatically if threshold is met.
                            </p>
                            <Button variant="outline" className="w-full bg-card shadow-sm hover:shadow-md transition-all border-none font-bold text-xs" onClick={() => router.push(`/${orgSlug}/platform`)}>
                                Configure Frequency <ArrowRight className="h-3 w-3 ml-2" />
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl shadow-black/5">
                        <CardHeader className="bg-transparent border-none">
                            <h3 className="font-bold flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-primary" />
                                Paystack Balance
                            </h3>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-0">
                            <div className="p-4 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20">
                                <p className="text-xs opacity-70 mb-1">Available for Payouts</p>
                                <p className="text-3xl font-black">KES 1,240,500</p>
                            </div>
                            <Button variant="ghost" className="w-full text-xs text-muted-foreground h-8" onClick={() => window.open('https://dashboard.paystack.com', '_blank')}>
                                View on Paystack <ExternalLink className="h-3 w-3 ml-2" />
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function StatsCard({ title, value, subtext, icon, loading }: { title: string, value: string, subtext: string, icon: ReactNode, loading?: boolean }) {
    return (
        <Card className="border-none shadow-lg shadow-black/5 overflow-hidden group">
            <CardContent className="p-6 relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    {icon}
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
                {loading ? (
                    <div className="h-8 w-24 bg-accent/50 animate-pulse rounded-md" />
                ) : (
                    <h4 className="text-2xl font-black tracking-tight">{value}</h4>
                )}
                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                    {subtext}
                </p>
            </CardContent>
        </Card>
    );
}

function HolderRow({
    holder,
    projection,
    onTriggerPayout,
    onEdit,
    onHistory,
    isTriggering,
}: {
    holder: EquityHolder;
    projection: { projected_amount?: number } | undefined;
    onTriggerPayout: () => void;
    onEdit: () => void;
    onHistory: () => void;
    isTriggering?: boolean;
}) {
    return (
        <div className="group flex flex-col sm:flex-row sm:items-center justify-between py-6 px-8 hover:bg-accent/5 transition-all">
            <div className="flex items-center gap-4 mb-4 sm:mb-0">
                <div className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center border border-border shadow-sm group-hover:scale-105 transition-transform",
                    holder.holder_type === 'shareholder' ? "bg-primary/5 text-primary" : "bg-orange-500/5 text-orange-500"
                )}>
                    {holder.holder_type === 'shareholder' ? <Shield className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                </div>
                <div>
                    <h4 className="font-bold text-sm flex items-center gap-2">
                        {holder.name}
                        {holder.is_active ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <AlertCircle className="h-3 w-3 text-red-500" />}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-mono font-medium">{holder.percentage_share}% Share</span>
                        <span className="h-1 w-1 rounded-full bg-border" />
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{holder.holder_type}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-8">
                <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Projected Payout</p>
                    <p className="text-sm font-black">
                        KES {projection?.projected_amount.toLocaleString() ?? '0'}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-[11px] font-bold border-none bg-accent/30 hover:bg-accent/50 transition-colors"
                        onClick={onHistory}
                    >
                        History
                    </Button>
                    <Button
                        size="sm"
                        className="h-8 text-[11px] font-bold px-4 gap-2 shadow-lg shadow-primary/10"
                        onClick={onTriggerPayout}
                        disabled={isTriggering}
                    >
                        {isTriggering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DollarSign className="h-3.5 w-3.5" />}
                        Pay Now
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onEdit}>
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function HolderFormModal({
    title,
    initial,
    onClose,
    onSubmit,
    isSubmitting,
}: {
    title: string;
    initial: EquityHolder | null;
    onClose: () => void;
    onSubmit: (data: CreateEquityHolderRequest) => Promise<void>;
    isSubmitting: boolean;
}) {
    const [name, setName] = useState(initial?.name ?? '');
    const [holderType, setHolderType] = useState<'shareholder' | 'royalty'>(initial?.holder_type ?? 'shareholder');
    const [email, setEmail] = useState(initial?.email ?? '');
    const [percentageShare, setPercentageShare] = useState(initial?.percentage_share ?? 0);
    const [sourceServices, setSourceServices] = useState((initial?.source_services ?? []).join(', '));
    const [payoutMethod, setPayoutMethod] = useState(initial?.payout_method ?? 'paystack_transfer');
    const [payoutAccountDetails, setPayoutAccountDetails] = useState(
        typeof initial?.payout_account_details === 'string' && initial.payout_account_details
            ? initial.payout_account_details
            : '{}'
    );
    const [payoutThreshold, setPayoutThreshold] = useState(initial?.payout_threshold ?? 0);
    const [payoutFrequency, setPayoutFrequency] = useState<'manual' | 'monthly' | 'quarterly'>(initial?.payout_frequency ?? 'monthly');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const sourceList = sourceServices ? sourceServices.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
        await onSubmit({
            name,
            holder_type: holderType,
            email: email || undefined,
            percentage_share: percentageShare,
            source_services: sourceList?.length ? sourceList : undefined,
            payout_method: payoutMethod,
            payout_account_details: payoutAccountDetails || '{}',
            payout_threshold: payoutThreshold,
            payout_frequency: payoutFrequency,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-xl border border-border max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">{title}</h3>
                    <button type="button" onClick={onClose} className="p-1 rounded hover:bg-accent">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Name</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
                        <select
                            value={holderType}
                            onChange={(e) => setHolderType(e.target.value as 'shareholder' | 'royalty')}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        >
                            <option value="shareholder">Shareholder</option>
                            <option value="royalty">Royalty</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">% share</label>
                        <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            value={percentageShare || ''}
                            onChange={(e) => setPercentageShare(parseFloat(e.target.value) || 0)}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Source services (comma-separated)</label>
                        <input
                            value={sourceServices}
                            onChange={(e) => setSourceServices(e.target.value)}
                            placeholder="e.g. ordering, subscriptions"
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Payout method</label>
                        <input
                            value={payoutMethod}
                            onChange={(e) => setPayoutMethod(e.target.value)}
                            placeholder="paystack_transfer"
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Payout account details (JSON)</label>
                        <textarea
                            value={payoutAccountDetails}
                            onChange={(e) => setPayoutAccountDetails(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Payout threshold</label>
                        <input
                            type="number"
                            min={0}
                            value={payoutThreshold || ''}
                            onChange={(e) => setPayoutThreshold(parseFloat(e.target.value) || 0)}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Payout frequency</label>
                        <select
                            value={payoutFrequency}
                            onChange={(e) => setPayoutFrequency(e.target.value as 'manual' | 'monthly' | 'quarterly')}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        >
                            <option value="manual">Manual</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                        </select>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {initial ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function PayoutHistoryModal({ holderId, holderName, onClose }: { holderId: string; holderName: string; onClose: () => void }) {
    const { data, isLoading } = useHolderPayouts(holderId);
    const payouts = data?.payouts ?? [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-xl border border-border max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="text-lg font-bold">Payout history — {holderName}</h3>
                    <button type="button" onClick={onClose} className="p-1 rounded hover:bg-accent">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                        </div>
                    ) : payouts.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">No payouts yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {payouts.map((p: EquityPayout) => (
                                <div key={p.id} className="rounded-lg border border-border p-3 text-sm">
                                    <div className="flex justify-between items-start gap-2">
                                        <span className="font-mono text-xs text-muted-foreground">
                                            {p.period_start} → {p.period_end}
                                        </span>
                                        <Badge variant={p.status === 'completed' ? 'success' : p.status === 'failed' ? 'error' : 'outline'}>{p.status}</Badge>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-4">
                                        <span>Amount: KES {(Number((p as any).payout_amount) || Number((p as any).net_payout) || 0).toLocaleString()}</span>
                                        {p.provider_reference && <span className="text-muted-foreground font-mono text-xs">{p.provider_reference}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ExternalLink({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
        </svg>
    );
}
