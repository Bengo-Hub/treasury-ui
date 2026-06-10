'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { MultiSelect } from '@/components/ui/multi-select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    useCreateEquityHolder,
    useEquityHolders,
    useEquitySchedule,
    useEquitySummary,
    useHolderPayouts,
    useRunEquityPayout,
    useTriggerEquityPayout,
    useUpdateEquityHolder,
    useUpdateEquitySchedule,
} from '@/hooks/use-equity';
import { useEquityApplications, useUpdateEquityApplication } from '@/hooks/use-equity-applications';
import type { EquityApplication } from '@/lib/api/equity-applications';
import ReferralsPanel from '../referrals/page';
import {
    useCreateEntitlement,
    useDeactivateEntitlement,
    useEquityEntitlements,
    useGeneratePortalLink,
} from '@/hooks/use-equity-entitlements';
import { useBanks, usePlatformBalance, useResolveAccount } from '@/hooks/use-gateways';
import { useMe } from '@/hooks/useMe';
import { usePlatformTenants } from '@/hooks/use-platform-tenants';
import { useReferrals } from '@/hooks/use-referrals';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import type { CreateEquityHolderRequest, EquityHolder, EquityPayout, EquityPayoutSchedule, RunPayoutResult } from '@/lib/api/equity';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    AlertCircle,
    ArrowRight,
    Calendar,
    CheckCircle2,
    DollarSign,
    Info,
    Link2,
    Loader2,
    MoreVertical,
    PieChart,
    Plus,
    RefreshCcw,
    Shield,
    TrendingUp,
    Users,
    Wallet,
    X,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';

const SERVICE_OPTIONS = [
    { value: 'ordering', label: 'Ordering (Food/Delivery)' },
    { value: 'subscriptions', label: 'Subscriptions' },
    { value: 'pos', label: 'Point of Sale (POS)' },
    { value: 'logistics', label: 'Logistics / Dispatch' },
    { value: 'inventory', label: 'Inventory Management' },
    { value: 'treasury', label: 'Treasury (Finance)' },
    { value: 'cafe', label: 'Cafe & Hospitality' },
    { value: 'isp_billing', label: 'ISP Billing' },
    { value: 'marketflow', label: 'MarketFlow (AI Marketing)' },
    { value: 'notifications', label: 'Notifications Service' },
    { value: 'projects', label: 'Projects & Invoicing' },
    { value: 'erp', label: 'ERP / Accounting' },
    { value: 'truload', label: 'Axle Load' },
    { value: 'auth', label: 'Auth & Identity' },
    { value: 'codevertex-website', label: 'Codevertex Website (Digitika)' },
];

const PAYOUT_METHODS = [
    { value: 'paystack_transfer', label: 'Paystack Transfer' },
    { value: 'bank', label: 'Bank Transfer (Manual)' },
    { value: 'mpesa_paybill', label: 'M-Pesa Paybill' },
    { value: 'mpesa_till', label: 'M-Pesa Till' },
];

const RECIPIENT_TYPES = [
    { value: 'nuban', label: 'NUBAN (Nigeria)' },
    { value: 'kepss', label: 'KEPSS (Kenya)' },
    { value: 'ghipss', label: 'GHIPSS (Ghana)' },
    { value: 'basa', label: 'BASA (South Africa)' },
    { value: 'mobile_money', label: 'Mobile Money' },
    { value: 'mobile_money_business', label: 'Mobile Money Business' },
];

const CURRENCY_OPTIONS = ['KES', 'NGN', 'GHS', 'ZAR'] as const;

const currencyToCountry: Record<string, string> = {
    KES: 'kenya',
    NGN: 'nigeria',
    GHS: 'ghana',
    ZAR: 'south-africa',
};

export default function EquityManagementPage() {
    const { data: user } = useMe();
    const router = useRouter();
    const params = useParams();
    const orgSlug = params?.orgSlug as string;

    const [dateRange, setDateRange] = useState(() => {
        const to = new Date();
        const from = new Date(to);
        from.setDate(from.getDate() - 30);
        return { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') };
    });
    const [activeTab, setActiveTab] = useState('holders');
    const [showRunPayout, setShowRunPayout] = useState(false);
    const [showAddHolder, setShowAddHolder] = useState(false);
    const [editingHolder, setEditingHolder] = useState<EquityHolder | null>(null);
    const [historyHolderId, setHistoryHolderId] = useState<string | null>(null);
    const [entitlementsHolderId, setEntitlementsHolderId] = useState<string | null>(null);
    const [freqConfigHolder, setFreqConfigHolder] = useState<EquityHolder | null>(null);
    const generatePortalLink = useGeneratePortalLink();

    const { data: holdersData, isLoading: loadingHolders, isError: holdersError } = useEquityHolders();
    const { data: summaryData, isLoading: loadingSummary } = useEquitySummary(dateRange.from, dateRange.to);
    const { data: balanceData, isLoading: loadingBalance } = usePlatformBalance();
    const triggerPayout = useTriggerEquityPayout();
    const createHolder = useCreateEquityHolder();
    const updateHolder = useUpdateEquityHolder();

    const holders = holdersData?.holders ?? [];
    const summary = summaryData;
    const paystackBalance = balanceData ? Number(balanceData.balance) : null;
    const paystackCurrency = balanceData?.currency ?? 'KES';

    const isSuperAdmin = user?.isPlatformOwner || user?.isSuperUser;

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
        <div className="p-4 sm:p-6 md:p-6 space-y-6">
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
                    <Button variant="outline" className="gap-2" onClick={() => {
                        const to = new Date();
                        const from = new Date(to);
                        from.setDate(from.getDate() - 30);
                        setDateRange({ from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') });
                    }}>
                        <Calendar className="h-4 w-4" />
                        Last 30 Days
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => {
                        const to = new Date();
                        const from = new Date(to.getFullYear(), to.getMonth(), 1);
                        setDateRange({ from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') });
                    }}>
                        This Month
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => setShowRunPayout(true)}>
                        <RefreshCcw className="h-4 w-4" />
                        Run Payout
                    </Button>
                    <Button className="gap-2 shadow-xl shadow-primary/20" onClick={() => setShowAddHolder(true)}>
                        <Plus className="h-4 w-4" />
                        Add Holder
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="flex flex-wrap gap-1">
                    <TabsTrigger value="holders">Holders</TabsTrigger>
                    <TabsTrigger value="referrals">Referrals &amp; Programs</TabsTrigger>
                    <TabsTrigger value="schedule">Payout Schedule</TabsTrigger>
                    <TabsTrigger value="agreements">Agreements</TabsTrigger>
                </TabsList>

                <TabsContent value="holders" className="space-y-6 mt-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Gross Revenue"
                    value={`KES ${Number(summary?.financial_summary.gross_revenue ?? 0).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`}
                    subtext="Across all services"
                    icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
                    loading={loadingSummary}
                />
                <StatsCard
                    title="Net Profit"
                    value={`KES ${Number(summary?.financial_summary.net_profit ?? 0).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`}
                    subtext="After expenses"
                    icon={<DollarSign className="h-5 w-5 text-green-500" />}
                    loading={loadingSummary}
                />
                <StatsCard
                    title="Total Allocated"
                    value={`KES ${Number(summary?.total_allocated ?? 0).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`}
                    subtext={`${((Number(summary?.total_allocated ?? 0)) / (Number(summary?.financial_summary.net_profit) || 1) * 100).toFixed(1)}% of profit`}
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
                            ) : holdersError ? (
                                <div className="p-8">
                                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                        Failed to load equity holders. Check your connection and try again.
                                    </div>
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
                                            onEntitlements={() => setEntitlementsHolderId(holder.id)}
                                            onPortalLink={() => generatePortalLink.mutate(holder.id)}
                                            onOpen={() => router.push(`/${orgSlug}/platform/equity/${holder.id}`)}
                                            isTriggering={triggerPayout.isPending && triggerPayout.variables?.holderId === holder.id}
                                            isGeneratingLink={generatePortalLink.isPending && generatePortalLink.variables === holder.id}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <HolderFormModal
                        title="Add holder"
                        open={showAddHolder}
                        initial={null}
                        onClose={() => setShowAddHolder(false)}
                        onSubmit={async (data) => {
                            await createHolder.mutateAsync(data);
                            setShowAddHolder(false);
                        }}
                        isSubmitting={createHolder.isPending}
                    />
                    <HolderFormModal
                        title="Edit holder"
                        open={!!editingHolder}
                        initial={editingHolder}
                        onClose={() => setEditingHolder(null)}
                        onSubmit={async (data) => {
                            if (!editingHolder) return;
                            await updateHolder.mutateAsync({ id: editingHolder.id, data });
                            setEditingHolder(null);
                        }}
                        isSubmitting={updateHolder.isPending}
                    />
                    {historyHolderId && (
                        <PayoutHistoryModal
                            holderId={historyHolderId}
                            holderName={holders.find(h => h.id === historyHolderId)?.name ?? 'Holder'}
                            onClose={() => setHistoryHolderId(null)}
                        />
                    )}
                    {entitlementsHolderId && (
                        <EntitlementsModal
                            holderId={entitlementsHolderId}
                            holderName={holders.find(h => h.id === entitlementsHolderId)?.name ?? 'Holder'}
                            onClose={() => setEntitlementsHolderId(null)}
                        />
                    )}
                </div>

                {freqConfigHolder && (
                    <FrequencyConfigModal
                        holder={freqConfigHolder}
                        onClose={() => setFreqConfigHolder(null)}
                        onSubmit={async (data) => {
                            await updateHolder.mutateAsync({ id: freqConfigHolder.id, data });
                            setFreqConfigHolder(null);
                        }}
                        isSubmitting={updateHolder.isPending}
                    />
                )}

                {/* Sidebar — Paystack balance (the payout-schedule projection lives in the Payout Schedule tab) */}
                <div className="space-y-6">
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
                                {loadingBalance ? (
                                    <div className="h-9 w-40 bg-primary-foreground/10 animate-pulse rounded-md" />
                                ) : paystackBalance !== null ? (
                                    <p className="text-3xl font-black">{paystackCurrency} {paystackBalance.toLocaleString()}</p>
                                ) : (
                                    <p className="text-sm opacity-70">Unable to fetch balance</p>
                                )}
                            </div>
                            <Button variant="ghost" className="w-full text-xs text-muted-foreground h-8" onClick={() => window.open('https://dashboard.paystack.com', '_blank')}>
                                View on Paystack <ExternalLink className="h-3 w-3 ml-2" />
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
                </TabsContent>

                <TabsContent value="referrals" className="mt-6">
                    <ReferralsPanel />
                </TabsContent>

                <TabsContent value="schedule" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        <GlobalPayoutScheduleCard />
                        <NextPayoutProjectionCard
                            holders={holders}
                            schedule={summary?.payout_schedule}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="agreements" className="mt-6">
                    <AgreementsPanel holders={holders} />
                </TabsContent>
            </Tabs>

            {showRunPayout && (
                <RunPayoutModal
                    defaultRange={dateRange}
                    onClose={() => setShowRunPayout(false)}
                />
            )}
        </div>
    );
}

/** Compute the next auto-run date from the single platform-wide payout frequency. */
function nextRunDateForFrequency(frequency: string, fyEndMonth = 12): string {
    const now = new Date();
    if (frequency === 'manual') return 'Manual';
    if (frequency === 'monthly') {
        return format(new Date(now.getFullYear(), now.getMonth() + 1, 1), 'yyyy-MM-dd');
    }
    if (frequency === 'quarterly') {
        const nextQuarterMonth = (Math.floor(now.getMonth() / 3) + 1) * 3;
        const next = nextQuarterMonth > 11
            ? new Date(now.getFullYear() + 1, nextQuarterMonth - 12, 1)
            : new Date(now.getFullYear(), nextQuarterMonth, 1);
        return format(next, 'yyyy-MM-dd');
    }
    if (frequency === 'annually') {
        const fyYear = now.getMonth() < fyEndMonth - 1 ? now.getFullYear() : now.getFullYear() + 1;
        return format(new Date(fyYear, fyEndMonth - 1, 1), 'yyyy-MM-dd');
    }
    return '-';
}

function NextPayoutProjectionCard({
    holders,
    schedule,
    onConfigure,
}: {
    holders: EquityHolder[];
    schedule?: EquityPayoutSchedule;
    onConfigure?: () => void;
}) {
    // The cadence is now a single platform-wide schedule that applies to every holder.
    const frequency = schedule?.frequency ?? 'manual';
    const nextDate = nextRunDateForFrequency(frequency, schedule?.financial_year_end_month ?? 12);
    const hasActiveHolders = holders.some(h => h.is_active);

    return (
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
                    {hasActiveHolders ? (
                        <Badge variant="success" className="animate-pulse">Active</Badge>
                    ) : (
                        <Badge variant="outline">No Active Holders</Badge>
                    )}
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-background/50 border border-border/50">
                    <span className="text-muted-foreground">Frequency</span>
                    <span className="font-mono font-bold text-xs uppercase">{frequency}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-background/50 border border-border/50">
                    <span className="text-muted-foreground">Next Auto-Run</span>
                    <span className="font-mono font-bold">{nextDate}</span>
                </div>
                <p className="text-xs text-muted-foreground px-1 leading-relaxed">
                    One platform-wide schedule governs all holders. Payouts are triggered automatically when the threshold is met.
                </p>
                {onConfigure && (
                    <Button variant="outline" className="w-full bg-card shadow-sm hover:shadow-md transition-all border-none font-bold text-xs" onClick={onConfigure}>
                        Configure Schedule <ArrowRight className="h-3 w-3 ml-2" />
                    </Button>
                )}
            </CardContent>
        </Card>
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
    onEntitlements,
    onPortalLink,
    onOpen,
    isTriggering,
    isGeneratingLink,
}: {
    holder: EquityHolder;
    projection: { projected_amount?: number } | undefined;
    onTriggerPayout: () => void;
    onEdit: () => void;
    onHistory: () => void;
    onEntitlements: () => void;
    onPortalLink: () => void;
    onOpen: () => void;
    isTriggering?: boolean;
    isGeneratingLink?: boolean;
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
                        <button type="button" onClick={onOpen} className="hover:text-primary hover:underline transition-colors text-left">
                            {holder.name}
                        </button>
                        {holder.is_active ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <AlertCircle className="h-3 w-3 text-red-500" />}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs font-mono font-medium">{holder.percentage_share}% Share</span>
                        <span className="h-1 w-1 rounded-full bg-border" />
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{holder.holder_type}</span>
                        {holder.linked_tenant_ids && holder.linked_tenant_ids.length > 0 && (
                            <>
                                <span className="h-1 w-1 rounded-full bg-border" />
                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                                    {holder.linked_tenant_ids.length} tenant{holder.linked_tenant_ids.length !== 1 ? 's' : ''}
                                </span>
                            </>
                        )}
                        {holder.source_services && holder.source_services.length > 0 && (
                            <>
                                <span className="h-1 w-1 rounded-full bg-border" />
                                <span className="text-[10px] text-muted-foreground">{holder.source_services.join(', ')}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-8">
                <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Projected Payout</p>
                    <p className="text-sm font-black">
                        KES {Number(projection?.projected_amount ?? 0).toLocaleString('en-KE', { maximumFractionDigits: 2 })}
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
                        variant="outline"
                        size="sm"
                        className="h-8 text-[11px] font-bold border-none bg-accent/30 hover:bg-accent/50 transition-colors"
                        onClick={onEntitlements}
                    >
                        Entitlements
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 border-none bg-accent/30 hover:bg-accent/50 transition-colors"
                        onClick={onPortalLink}
                        disabled={isGeneratingLink}
                        title="Copy portal link"
                    >
                        {isGeneratingLink ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
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
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onEdit} aria-label="Edit holder">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function HolderFormModal({
    title,
    open,
    initial,
    onClose,
    onSubmit,
    isSubmitting,
}: {
    title: string;
    open: boolean;
    initial: EquityHolder | null;
    onClose: () => void;
    onSubmit: (data: CreateEquityHolderRequest) => Promise<void>;
    isSubmitting: boolean;
}) {
    const params = useParams();
    const orgSlug = params?.orgSlug as string;
    const { tenantPathId } = useResolvedTenant();
    const tenantSlug = tenantPathId || orgSlug;

    const [activeTab, setActiveTab] = useState('basic');
    const [name, setName] = useState(initial?.name ?? '');
    const [holderType, setHolderType] = useState<'shareholder' | 'royalty'>(initial?.holder_type ?? 'shareholder');
    const [email, setEmail] = useState(initial?.email ?? '');
    const [percentageShare, setPercentageShare] = useState(initial?.percentage_share ?? 0);
    const [payoutFrequency, setPayoutFrequency] = useState<'manual' | 'monthly' | 'quarterly' | 'annually'>(initial?.payout_frequency ?? 'monthly');
    const [payoutScheduleDay, setPayoutScheduleDay] = useState(initial?.payout_schedule_day ?? 0);
    const [financialYearEndMonth, setFinancialYearEndMonth] = useState(initial?.financial_year_end_month ?? 12);
    const [closeOfBooksDay, setCloseOfBooksDay] = useState(initial?.close_of_books_day ?? 0);

    // Tab 2: Services
    const [selectedServices, setSelectedServices] = useState<string[]>(initial?.source_services ?? []);
    const [linkedTenantIds, setLinkedTenantIds] = useState<string[]>(initial?.linked_tenant_ids ?? []);
    const [referralId, setReferralId] = useState(initial?.referral_id ?? '');

    // Referral and tenant selects
    const { data: referralsData, isLoading: loadingReferrals } = useReferrals();
    const referrals = referralsData?.referrals ?? [];
    const { data: platformTenants, isLoading: loadingTenants } = usePlatformTenants();

    // Tab 3: Payout Method
    const [payoutMethod, setPayoutMethod] = useState(initial?.payout_method ?? 'paystack_transfer');
    const [payoutThreshold, setPayoutThreshold] = useState(initial?.payout_threshold ?? 1000);

    // Paystack transfer fields
    const [recipientType, setRecipientType] = useState('nuban');
    const [payoutCurrency, setPayoutCurrency] = useState('NGN');
    const [bankCode, setBankCode] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');

    // Bank fields
    const [bankName, setBankName] = useState('');
    const [manualBankCode, setManualBankCode] = useState('');
    const [manualAccountNumber, setManualAccountNumber] = useState('');
    const [manualAccountName, setManualAccountName] = useState('');

    // M-Pesa fields
    const [paybillNumber, setPaybillNumber] = useState('');
    const [mpesaAccountNumber, setMpesaAccountNumber] = useState('');
    const [tillNumber, setTillNumber] = useState('');

    // Bank resolution
    const bankCountry = currencyToCountry[payoutCurrency] || '';
    const { data: banksData, isLoading: loadingBanks } = useBanks(tenantSlug, bankCountry);
    const banks: { name: string; code: string }[] = (banksData as any)?.data ?? (banksData as any)?.banks ?? [];
    const resolveAccountMutation = useResolveAccount(tenantSlug);
    const [verifiedName, setVerifiedName] = useState<string | null>(null);
    const [verifyError, setVerifyError] = useState<string | null>(null);
    const [verifyNote, setVerifyNote] = useState<string | null>(null);

    // Hydrate ALL fields when initial changes (edit mode) or reset to defaults (create mode)
    useEffect(() => {
        // Always reset tab and bank resolution state
        setActiveTab('basic');
        setVerifiedName(null);
        setVerifyError(null);

        if (initial) {
            // Sync basic fields
            setName(initial.name ?? '');
            setHolderType(initial.holder_type ?? 'shareholder');
            setEmail(initial.email ?? '');
            setPercentageShare(initial.percentage_share ?? 0);
            setPayoutFrequency(initial.payout_frequency ?? 'monthly');
            setSelectedServices(initial.source_services ?? []);
            setLinkedTenantIds(initial.linked_tenant_ids ?? []);
            setReferralId(initial.referral_id ?? '');
            setPayoutMethod(initial.payout_method ?? 'paystack_transfer');
            setPayoutThreshold(initial.payout_threshold ?? 1000);
            setPayoutScheduleDay(initial.payout_schedule_day ?? 0);
            setFinancialYearEndMonth(initial.financial_year_end_month ?? 12);
            setCloseOfBooksDay(initial.close_of_books_day ?? 0);

            // Hydrate payout account details
            if (initial.payout_account_details) {
                try {
                    const details = typeof initial.payout_account_details === 'string'
                        ? JSON.parse(initial.payout_account_details)
                        : initial.payout_account_details;
                    const method = initial.payout_method ?? 'paystack_transfer';
                    if (method === 'paystack_transfer') {
                        setRecipientType(details.recipient_type ?? 'nuban');
                        setPayoutCurrency(details.currency ?? 'NGN');
                        setBankCode(details.bank_code ?? '');
                        setAccountNumber(details.account_number ?? '');
                        setAccountName(details.account_name ?? '');
                    } else if (method === 'bank') {
                        setBankName(details.bank_name ?? '');
                        setManualBankCode(details.bank_code ?? '');
                        setManualAccountNumber(details.account_number ?? '');
                        setManualAccountName(details.account_name ?? '');
                    } else if (method === 'mpesa_paybill') {
                        setPaybillNumber(details.paybill_number ?? '');
                        setMpesaAccountNumber(details.account_number ?? '');
                    } else if (method === 'mpesa_till') {
                        setTillNumber(details.till_number ?? '');
                    }
                } catch {
                    // ignore parse errors
                }
            } else {
                // No payout details — reset payout fields to defaults
                setRecipientType('nuban');
                setPayoutCurrency('NGN');
                setBankCode('');
                setAccountNumber('');
                setAccountName('');
                setBankName('');
                setManualBankCode('');
                setManualAccountNumber('');
                setManualAccountName('');
                setPaybillNumber('');
                setMpesaAccountNumber('');
                setTillNumber('');
            }
        } else {
            // Create mode — reset all to defaults
            setName('');
            setHolderType('shareholder');
            setEmail('');
            setPercentageShare(0);
            setPayoutFrequency('monthly');
            setPayoutScheduleDay(0);
            setFinancialYearEndMonth(12);
            setCloseOfBooksDay(0);
            setSelectedServices([]);
            setLinkedTenantIds([]);
            setReferralId('');
            setPayoutMethod('paystack_transfer');
            setPayoutThreshold(1000);
            setRecipientType('nuban');
            setPayoutCurrency('NGN');
            setBankCode('');
            setAccountNumber('');
            setAccountName('');
            setBankName('');
            setManualBankCode('');
            setManualAccountNumber('');
            setManualAccountName('');
            setPaybillNumber('');
            setMpesaAccountNumber('');
            setTillNumber('');
        }
    }, [initial]);

    const buildPayoutDetails = (): string => {
        if (payoutMethod === 'paystack_transfer') {
            return JSON.stringify({
                recipient_type: recipientType,
                currency: payoutCurrency,
                bank_code: bankCode,
                account_number: accountNumber,
                account_name: accountName || verifiedName || '',
            });
        }
        if (payoutMethod === 'bank') {
            return JSON.stringify({
                bank_name: bankName,
                bank_code: manualBankCode,
                account_number: manualAccountNumber,
                account_name: manualAccountName,
            });
        }
        if (payoutMethod === 'mpesa_paybill') {
            return JSON.stringify({
                paybill_number: paybillNumber,
                account_number: mpesaAccountNumber,
            });
        }
        if (payoutMethod === 'mpesa_till') {
            return JSON.stringify({ till_number: tillNumber });
        }
        return '{}';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit({
            name,
            holder_type: holderType,
            email: email || undefined,
            percentage_share: percentageShare,
            source_services: selectedServices.length > 0 ? selectedServices : undefined,
            linked_tenant_ids: linkedTenantIds.length > 0 ? linkedTenantIds : undefined,
            referral_id: referralId || undefined,
            payout_method: payoutMethod,
            payout_account_details: buildPayoutDetails(),
            payout_threshold: payoutThreshold,
            payout_frequency: payoutFrequency,
            payout_schedule_day: payoutScheduleDay,
            financial_year_end_month: financialYearEndMonth,
            close_of_books_day: closeOfBooksDay,
        });
    };

    const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm';
    const selectClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm';

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent title={title} onClose={onClose} className="max-w-lg">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="w-full mb-4">
                            <TabsTrigger value="basic">Basic Info</TabsTrigger>
                            <TabsTrigger value="services">Services</TabsTrigger>
                            <TabsTrigger value="payout">Payout Method</TabsTrigger>
                        </TabsList>

                        {/* Tab 1: Basic Info */}
                        <TabsContent value="basic" className="space-y-4">
                            <FormField label="Name" required>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={inputClass}
                                    required
                                />
                            </FormField>
                            <FormField label="Holder Type">
                                <select
                                    value={holderType}
                                    onChange={(e) => setHolderType(e.target.value as 'shareholder' | 'royalty')}
                                    className={selectClass}
                                >
                                    <option value="shareholder">Shareholder</option>
                                    <option value="royalty">Royalty</option>
                                </select>
                            </FormField>
                            <FormField label="Email">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={inputClass}
                                />
                            </FormField>
                            <FormField label="Percentage Share" required>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={0.01}
                                    value={percentageShare || ''}
                                    onChange={(e) => setPercentageShare(parseFloat(e.target.value) || 0)}
                                    className={inputClass}
                                    required
                                />
                            </FormField>
                            <FormField label="Payout Frequency">
                                <select
                                    value={payoutFrequency}
                                    onChange={(e) => setPayoutFrequency(e.target.value as 'manual' | 'monthly' | 'quarterly' | 'annually')}
                                    className={selectClass}
                                >
                                    <option value="manual">Manual</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="annually">Annually (Financial Year-End)</option>
                                </select>
                            </FormField>
                            {payoutFrequency !== 'manual' && (
                                <div className="space-y-4 rounded-lg border border-border p-4">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payout Schedule Config</p>
                                    {payoutFrequency === 'monthly' && (
                                        <FormField label="Day of Month" description="Day when payout is calculated (1-28). 0 = last day.">
                                            <input
                                                type="number"
                                                min={0}
                                                max={28}
                                                value={payoutScheduleDay || ''}
                                                onChange={(e) => setPayoutScheduleDay(parseInt(e.target.value) || 0)}
                                                className={inputClass}
                                                placeholder="0 = last day of month"
                                            />
                                        </FormField>
                                    )}
                                    <FormField label="Financial Year-End Month" description="Month when the financial year ends (used for annual payouts and defaults).">
                                        <select
                                            value={financialYearEndMonth}
                                            onChange={(e) => setFinancialYearEndMonth(parseInt(e.target.value))}
                                            className={selectClass}
                                        >
                                            {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                                                <option key={i + 1} value={i + 1}>{m}</option>
                                            ))}
                                        </select>
                                    </FormField>
                                    <FormField label="Close of Books Day" description="Day of month when books close. 0 = last day of the month.">
                                        <input
                                            type="number"
                                            min={0}
                                            max={28}
                                            value={closeOfBooksDay || ''}
                                            onChange={(e) => setCloseOfBooksDay(parseInt(e.target.value) || 0)}
                                            className={inputClass}
                                            placeholder="0 = last day of month"
                                        />
                                    </FormField>
                                </div>
                            )}
                        </TabsContent>

                        {/* Tab 2: Services */}
                        <TabsContent value="services" className="space-y-4">
                            <FormField label="Source Services" description="Select which services this holder earns from. Leave empty to earn from all services.">
                                <MultiSelect
                                    options={SERVICE_OPTIONS}
                                    value={selectedServices}
                                    onChange={setSelectedServices}
                                    placeholder="Select services..."
                                />
                            </FormField>
                            {selectedServices.length === 0 && (
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 text-sm text-blue-600 dark:text-blue-400">
                                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span>All services (default for shareholders)</span>
                                </div>
                            )}

                            <div className="border-t border-border pt-4 space-y-4">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Referral Scope (Optional)</p>
                                <FormField
                                    label="Referral"
                                    description="Link this holder to a referral programme. Earnings are then scoped to tenants who came via that referral."
                                >
                                    {loadingReferrals ? (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading referrals...
                                        </div>
                                    ) : (
                                        <select
                                            value={referralId}
                                            onChange={(e) => setReferralId(e.target.value)}
                                            className={selectClass}
                                        >
                                            <option value="">None</option>
                                            {referrals.map((r) => (
                                                <option key={r.id} value={r.id}>
                                                    {r.referral_code} — {r.referred_tenant_id.slice(0, 8)}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </FormField>
                                <FormField
                                    label="Linked Tenants"
                                    description="Restrict earnings to specific referred tenants. Select one or more tenants from the list."
                                >
                                    {loadingTenants ? (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading tenants...
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="max-h-40 overflow-y-auto rounded-lg border border-input bg-background p-2 space-y-1">
                                                {(platformTenants ?? []).length === 0 ? (
                                                    <p className="text-xs text-muted-foreground px-1 py-1">No tenants available.</p>
                                                ) : (
                                                    (platformTenants ?? []).map((t) => {
                                                        const checked = linkedTenantIds.includes(t.id);
                                                        return (
                                                            <label
                                                                key={t.id}
                                                                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/40 cursor-pointer text-sm"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    onChange={() => {
                                                                        if (checked) {
                                                                            setLinkedTenantIds(linkedTenantIds.filter((id) => id !== t.id));
                                                                        } else {
                                                                            setLinkedTenantIds([...linkedTenantIds, t.id]);
                                                                        }
                                                                    }}
                                                                    className="accent-primary"
                                                                />
                                                                <span className="font-medium">{t.name || t.slug}</span>
                                                                <span className="text-xs text-muted-foreground font-mono ml-auto">{t.slug}</span>
                                                            </label>
                                                        );
                                                    })
                                                )}
                                            </div>
                                            {linkedTenantIds.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {linkedTenantIds.map((tid) => {
                                                        const tenant = (platformTenants ?? []).find((t) => t.id === tid);
                                                        return (
                                                            <span
                                                                key={tid}
                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                                                            >
                                                                {tenant ? (tenant.name || tenant.slug) : tid.slice(0, 8) + '…'}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setLinkedTenantIds(linkedTenantIds.filter((t) => t !== tid))}
                                                                    className="ml-0.5 hover:text-destructive"
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </button>
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {linkedTenantIds.length === 0 && (
                                                <p className="text-xs text-muted-foreground">No tenants linked — holder earns from all tenants.</p>
                                            )}
                                        </div>
                                    )}
                                </FormField>
                            </div>
                        </TabsContent>

                        {/* Tab 3: Payout Method */}
                        <TabsContent value="payout" className="space-y-4">
                            <FormField label="Payout Method">
                                <select
                                    value={payoutMethod}
                                    onChange={(e) => setPayoutMethod(e.target.value)}
                                    className={selectClass}
                                >
                                    {PAYOUT_METHODS.map((m) => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </FormField>

                            {/* Paystack Transfer Fields */}
                            {payoutMethod === 'paystack_transfer' && (
                                <div className="space-y-4 rounded-lg border border-border p-4">
                                    <FormField label="Recipient Type">
                                        <select
                                            value={recipientType}
                                            onChange={(e) => setRecipientType(e.target.value)}
                                            className={selectClass}
                                        >
                                            {RECIPIENT_TYPES.map((r) => (
                                                <option key={r.value} value={r.value}>{r.label}</option>
                                            ))}
                                        </select>
                                    </FormField>
                                    <FormField label="Currency">
                                        <select
                                            value={payoutCurrency}
                                            onChange={(e) => {
                                                setPayoutCurrency(e.target.value);
                                                setBankCode('');
                                                setAccountName('');
                                                setVerifiedName(null);
                                                setVerifyError(null);
                                            }}
                                            className={selectClass}
                                        >
                                            {CURRENCY_OPTIONS.map((c) => (
                                                <option key={c} value={c}>{c} ({currencyToCountry[c]})</option>
                                            ))}
                                        </select>
                                    </FormField>
                                    <FormField label="Bank">
                                        {loadingBanks ? (
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading banks...
                                            </div>
                                        ) : (
                                            <select
                                                value={bankCode}
                                                onChange={(e) => {
                                                    setBankCode(e.target.value);
                                                    setVerifiedName(null);
                                                    setVerifyError(null);
                                                }}
                                                className={selectClass}
                                            >
                                                <option value="">Select bank...</option>
                                                {banks.map((b) => (
                                                    <option key={b.code} value={b.code}>{b.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </FormField>
                                    <FormField label="Account Number">
                                        <div className="flex gap-2">
                                            <input
                                                value={accountNumber}
                                                onChange={(e) => {
                                                    setAccountNumber(e.target.value);
                                                    setVerifiedName(null);
                                                    setVerifyError(null);
                                                }}
                                                className={cn(inputClass, 'flex-1')}
                                                placeholder="Enter account number"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="shrink-0"
                                                disabled={!bankCode || !accountNumber || resolveAccountMutation.isPending}
                                                onClick={() => {
                                                    setVerifyError(null);
                                                    setVerifyNote(null);
                                                    resolveAccountMutation.mutate(
                                                        { accountNumber, bankCode },
                                                        {
                                                            onSuccess: (data: any) => {
                                                                const payload = data?.data ?? data;
                                                                // Mobile money (M-Pesa) can't be name-resolved by Paystack — enter the name manually.
                                                                if (payload?.resolvable === false || !payload?.account_name) {
                                                                    setVerifiedName(null);
                                                                    setVerifyNote(payload?.message || 'Mobile money can’t be auto-verified — enter the account holder name manually.');
                                                                    return;
                                                                }
                                                                setVerifiedName(payload.account_name);
                                                                setAccountName(payload.account_name);
                                                            },
                                                            onError: (err: any) => {
                                                                setVerifyError(err?.response?.data?.message || err?.message || 'Verification failed');
                                                            },
                                                        },
                                                    );
                                                }}
                                            >
                                                {resolveAccountMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Verify'}
                                            </Button>
                                        </div>
                                    </FormField>
                                    {verifiedName && (
                                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                                            <CheckCircle2 className="h-4 w-4" />
                                            {verifiedName}
                                        </div>
                                    )}
                                    {verifyNote && (
                                        <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                                            <Info className="h-4 w-4" />
                                            {verifyNote}
                                        </div>
                                    )}
                                    {verifyError && (
                                        <div className="flex items-center gap-2 text-sm text-destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            {verifyError}
                                        </div>
                                    )}
                                    <FormField label="Account Name" description="Auto-filled on verification, or enter manually.">
                                        <input
                                            value={accountName}
                                            onChange={(e) => setAccountName(e.target.value)}
                                            className={inputClass}
                                            placeholder="Account holder name"
                                        />
                                    </FormField>
                                </div>
                            )}

                            {/* Bank (manual) Fields */}
                            {payoutMethod === 'bank' && (
                                <div className="space-y-4 rounded-lg border border-border p-4">
                                    <FormField label="Bank Name">
                                        <input value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputClass} placeholder="e.g. Equity Bank" />
                                    </FormField>
                                    <FormField label="Bank Code">
                                        <input value={manualBankCode} onChange={(e) => setManualBankCode(e.target.value)} className={inputClass} placeholder="e.g. 068" />
                                    </FormField>
                                    <FormField label="Account Number">
                                        <input value={manualAccountNumber} onChange={(e) => setManualAccountNumber(e.target.value)} className={inputClass} />
                                    </FormField>
                                    <FormField label="Account Name">
                                        <input value={manualAccountName} onChange={(e) => setManualAccountName(e.target.value)} className={inputClass} />
                                    </FormField>
                                </div>
                            )}

                            {/* M-Pesa Paybill Fields */}
                            {payoutMethod === 'mpesa_paybill' && (
                                <div className="space-y-4 rounded-lg border border-border p-4">
                                    <FormField label="Paybill Number">
                                        <input value={paybillNumber} onChange={(e) => setPaybillNumber(e.target.value)} className={inputClass} placeholder="e.g. 888880" />
                                    </FormField>
                                    <FormField label="Account Number">
                                        <input value={mpesaAccountNumber} onChange={(e) => setMpesaAccountNumber(e.target.value)} className={inputClass} placeholder="Account number" />
                                    </FormField>
                                </div>
                            )}

                            {/* M-Pesa Till Fields */}
                            {payoutMethod === 'mpesa_till' && (
                                <div className="space-y-4 rounded-lg border border-border p-4">
                                    <FormField label="Till Number">
                                        <input value={tillNumber} onChange={(e) => setTillNumber(e.target.value)} className={inputClass} placeholder="e.g. 5199900" />
                                    </FormField>
                                </div>
                            )}

                            <FormField label="Payout Threshold" description="Minimum amount before a payout is triggered.">
                                <input
                                    type="number"
                                    min={0}
                                    value={payoutThreshold || ''}
                                    onChange={(e) => setPayoutThreshold(parseFloat(e.target.value) || 0)}
                                    className={inputClass}
                                />
                            </FormField>
                        </TabsContent>
                    </Tabs>

                    <div className="flex gap-2 justify-end pt-2 border-t border-border">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {initial ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function PayoutHistoryModal({ holderId, holderName, onClose }: { holderId: string; holderName: string; onClose: () => void }) {
    const { data, isLoading, isError } = useHolderPayouts(holderId);
    const payouts = data?.payouts ?? [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-xl border border-border max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="text-lg font-bold">Payout history — {holderName}</h3>
                    <button type="button" onClick={onClose} className="p-1 rounded hover:bg-accent" aria-label="Close">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                        </div>
                    ) : isError ? (
                        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            Failed to load payout history. Check your connection and try again.
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

function EntitlementsModal({ holderId, holderName, onClose }: { holderId: string; holderName: string; onClose: () => void }) {
    const { data, isLoading, isError } = useEquityEntitlements(holderId);
    const createEntitlement = useCreateEntitlement(holderId);
    const deactivateEntitlement = useDeactivateEntitlement(holderId);
    const entitlements = data?.entitlements ?? [];

    const [showForm, setShowForm] = useState(false);
    const [serviceId, setServiceId] = useState('');
    const [equityPct, setEquityPct] = useState('');
    const [vestingStart, setVestingStart] = useState('');
    const [vestingEnd, setVestingEnd] = useState('');
    const [cliffMonths, setCliffMonths] = useState('0');
    const [vestingType, setVestingType] = useState<'cliff' | 'graded'>('cliff');

    const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm';

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        await createEntitlement.mutateAsync({
            service_id: serviceId,
            equity_pct: parseFloat(equityPct),
            vesting_start: vestingStart,
            vesting_end: vestingEnd || null,
            cliff_months: parseInt(cliffMonths) || 0,
            vesting_type: vestingType,
        });
        setShowForm(false);
        setServiceId(''); setEquityPct(''); setVestingStart(''); setVestingEnd(''); setCliffMonths('0');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-xl border border-border max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div>
                        <h3 className="text-lg font-bold">Entitlements — {holderName}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Per-service equity stakes with vesting schedules</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" className="h-8 gap-2 text-xs" onClick={() => setShowForm(true)}>
                            <Plus className="h-3.5 w-3.5" /> Add
                        </Button>
                        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-accent" aria-label="Close">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {showForm && (
                    <form onSubmit={handleCreate} className="p-4 border-b border-border space-y-3 bg-accent/5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">New Entitlement</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium mb-1 block">Service ID</label>
                                <select value={serviceId} onChange={e => setServiceId(e.target.value)} className={inputClass} required>
                                    <option value="">Select service...</option>
                                    <option value="*">* (All Services)</option>
                                    {SERVICE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block">Equity %</label>
                                <input type="number" min="0.01" max="100" step="0.01" value={equityPct} onChange={e => setEquityPct(e.target.value)} className={inputClass} required placeholder="e.g. 2.5" />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block">Vesting Start</label>
                                <input type="date" value={vestingStart} onChange={e => setVestingStart(e.target.value)} className={inputClass} required />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block">Vesting End (optional)</label>
                                <input type="date" value={vestingEnd} onChange={e => setVestingEnd(e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block">Cliff Months</label>
                                <input type="number" min="0" value={cliffMonths} onChange={e => setCliffMonths(e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block">Vesting Type</label>
                                <select value={vestingType} onChange={e => setVestingType(e.target.value as 'cliff' | 'graded')} className={inputClass}>
                                    <option value="cliff">Cliff</option>
                                    <option value="graded">Graded (Linear)</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                            <Button type="submit" size="sm" disabled={createEntitlement.isPending}>
                                {createEntitlement.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save
                            </Button>
                        </div>
                    </form>
                )}

                <div className="p-4 overflow-y-auto flex-1">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                        </div>
                    ) : isError ? (
                        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            Failed to load entitlements. Check your connection and try again.
                        </div>
                    ) : entitlements.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            <p className="text-sm">No entitlements defined.</p>
                            <p className="text-xs mt-1">Legacy % share will be used as fallback.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs text-muted-foreground border-b border-border">
                                    <th className="text-left py-2 font-medium">Service</th>
                                    <th className="text-right py-2 font-medium">Equity %</th>
                                    <th className="text-right py-2 font-medium">Vesting</th>
                                    <th className="text-right py-2 font-medium">Status</th>
                                    <th className="py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {entitlements.map(e => (
                                    <tr key={e.id} className="border-b border-border/50 last:border-0">
                                        <td className="py-3 font-mono text-xs">{e.service_id}</td>
                                        <td className="py-3 text-right font-bold">{parseFloat(e.equity_pct).toFixed(2)}%</td>
                                        <td className="py-3 text-right text-xs text-muted-foreground">
                                            {e.vesting_type} {e.cliff_months > 0 ? `(${e.cliff_months}m cliff)` : ''}
                                        </td>
                                        <td className="py-3 text-right">
                                            <Badge variant={e.is_active ? 'success' : 'outline'}>{e.is_active ? 'Active' : 'Inactive'}</Badge>
                                        </td>
                                        <td className="py-3 text-right">
                                            {e.is_active && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs text-destructive hover:text-destructive"
                                                    onClick={() => deactivateEntitlement.mutate(e.id)}
                                                    disabled={deactivateEntitlement.isPending}
                                                >
                                                    Deactivate
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Frequency Config Modal ───────────────────────────────────────────────────

function FrequencyConfigModal({
    holder,
    onClose,
    onSubmit,
    isSubmitting,
}: {
    holder: EquityHolder;
    onClose: () => void;
    onSubmit: (data: Partial<CreateEquityHolderRequest>) => Promise<void>;
    isSubmitting: boolean;
}) {
    const [payoutFrequency, setPayoutFrequency] = useState<'manual' | 'monthly' | 'quarterly' | 'annually'>(holder.payout_frequency ?? 'monthly');
    const [payoutScheduleDay, setPayoutScheduleDay] = useState(holder.payout_schedule_day ?? 0);
    const [financialYearEndMonth, setFinancialYearEndMonth] = useState(holder.financial_year_end_month ?? 12);
    const [closeOfBooksDay, setCloseOfBooksDay] = useState(holder.close_of_books_day ?? 0);

    const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm';
    const selectClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit({
            payout_frequency: payoutFrequency,
            payout_schedule_day: payoutScheduleDay,
            financial_year_end_month: financialYearEndMonth,
            close_of_books_day: closeOfBooksDay,
        });
    };

    return (
        <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent title={`Payout Schedule — ${holder.name}`} onClose={onClose} className="max-w-md">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <p className="text-sm text-muted-foreground">
                        Configure when and how often payouts are calculated and disbursed for this holder.
                    </p>

                    <FormField label="Payout Frequency">
                        <select
                            value={payoutFrequency}
                            onChange={(e) => setPayoutFrequency(e.target.value as 'manual' | 'monthly' | 'quarterly' | 'annually')}
                            className={selectClass}
                        >
                            <option value="manual">Manual (trigger only)</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="annually">Annually (Financial Year-End)</option>
                        </select>
                    </FormField>

                    {payoutFrequency !== 'manual' && (
                        <div className="space-y-4 rounded-lg border border-border p-4 bg-accent/5">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Schedule Details</p>

                            {payoutFrequency === 'monthly' && (
                                <FormField label="Day of Month" description="Day when payout is triggered (1–28). 0 = last day of month.">
                                    <input
                                        type="number"
                                        min={0}
                                        max={28}
                                        value={payoutScheduleDay || ''}
                                        onChange={(e) => setPayoutScheduleDay(parseInt(e.target.value) || 0)}
                                        className={inputClass}
                                        placeholder="0 = last day"
                                    />
                                </FormField>
                            )}

                            <FormField label="Financial Year-End Month" description="Month when the financial year closes (used for annual payouts).">
                                <select
                                    value={financialYearEndMonth}
                                    onChange={(e) => setFinancialYearEndMonth(parseInt(e.target.value))}
                                    className={selectClass}
                                >
                                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                                        <option key={i + 1} value={i + 1}>{m}</option>
                                    ))}
                                </select>
                            </FormField>

                            <FormField label="Close of Books Day" description="Day of month when books close for the period. 0 = last day.">
                                <input
                                    type="number"
                                    min={0}
                                    max={28}
                                    value={closeOfBooksDay || ''}
                                    onChange={(e) => setCloseOfBooksDay(parseInt(e.target.value) || 0)}
                                    className={inputClass}
                                    placeholder="0 = last day"
                                />
                            </FormField>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Save Schedule
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function ExternalLink({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
        </svg>
    );
}

/**
 * GlobalPayoutScheduleCard edits the single, platform-wide payout schedule that governs
 * ALL equity holders (replacing the old per-holder frequency config).
 */
function GlobalPayoutScheduleCard() {
    const { data, isLoading } = useEquitySchedule();
    const updateSchedule = useUpdateEquitySchedule();
    const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm';

    const [form, setForm] = useState<EquityPayoutSchedule>({
        frequency: 'manual',
        schedule_day: 1,
        financial_year_end_month: 12,
        close_of_books_day: 0,
        payout_threshold: 0,
    });

    useEffect(() => {
        if (data?.schedule) setForm(data.schedule);
    }, [data?.schedule]);

    const set = <K extends keyof EquityPayoutSchedule>(key: K, value: EquityPayoutSchedule[K]) =>
        setForm((f) => ({ ...f, [key]: value }));

    return (
        <Card className="border-none shadow-xl shadow-black/5 max-w-2xl">
            <CardHeader className="bg-transparent border-none">
                <h3 className="text-xl font-bold flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    Global Payout Schedule
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    A single cadence applied to every equity holder. Individual holders no longer carry their own frequency.
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading schedule...
                    </div>
                ) : (
                    <form
                        className="space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            updateSchedule.mutate(form);
                        }}
                    >
                        <FormField label="Frequency" description="How often payouts are automatically run for all holders.">
                            <select className={inputClass} value={form.frequency} onChange={(e) => set('frequency', e.target.value as EquityPayoutSchedule['frequency'])}>
                                <option value="manual">Manual (no auto-run)</option>
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                                <option value="annually">Annually</option>
                            </select>
                        </FormField>

                        {(form.frequency === 'monthly' || form.frequency === 'quarterly') && (
                            <FormField label="Schedule Day" description="Day of month (1-28) for monthly; month-of-quarter (1-3) for quarterly.">
                                <input type="number" min={0} max={28} value={form.schedule_day || ''} onChange={(e) => set('schedule_day', parseInt(e.target.value) || 0)} className={inputClass} />
                            </FormField>
                        )}

                        {form.frequency === 'annually' && (
                            <FormField label="Financial Year-End Month" description="Month (1-12) the financial year ends. 12 = December.">
                                <input type="number" min={1} max={12} value={form.financial_year_end_month || ''} onChange={(e) => set('financial_year_end_month', parseInt(e.target.value) || 12)} className={inputClass} />
                            </FormField>
                        )}

                        <FormField label="Close of Books Day" description="Day of month when books close for the period. 0 = last day.">
                            <input type="number" min={0} max={28} value={form.close_of_books_day || ''} onChange={(e) => set('close_of_books_day', parseInt(e.target.value) || 0)} className={inputClass} placeholder="0 = last day" />
                        </FormField>

                        <FormField label="Payout Threshold (KES)" description="Minimum net allocation before a holder is paid in an auto-run. 0 = always pay.">
                            <input type="number" min={0} value={form.payout_threshold || ''} onChange={(e) => set('payout_threshold', parseFloat(e.target.value) || 0)} className={inputClass} placeholder="0 = no threshold" />
                        </FormField>

                        <div className="pt-2">
                            <Button type="submit" disabled={updateSchedule.isPending}>
                                {updateSchedule.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Save Schedule (applies to all holders)
                            </Button>
                        </div>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * AgreementsPanel surfaces the legal/onboarding posture of each holder: whether they were
 * onboarded through the auth-service application workflow (KYC + signed EPA) or quick-added,
 * plus the KRA tax treatment that governs their payouts.
 */
function AgreementsPanel({ holders }: { holders: EquityHolder[] }) {
    const treatmentLabel = (h: EquityHolder) => {
        const t = h.payout_tax_treatment && h.payout_tax_treatment !== 'auto'
            ? h.payout_tax_treatment
            : (h.holder_type === 'royalty' ? 'royalty' : 'dividend');
        const residency = h.tax_residency === 'non_resident' ? 'Non-resident' : 'Resident';
        return `${t} · ${residency}`;
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <Card className="border-none shadow-xl shadow-black/5 bg-primary/5">
                <CardContent className="p-6 space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" /> Onboarding Flow
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        {['Apply', 'KYC', 'EPA e-signature', 'Approval', 'Treasury holder provisioned'].map((step, i, arr) => (
                            <span key={step} className="flex items-center gap-2">
                                <span className="px-3 py-1.5 rounded-lg bg-background border border-border/60 shadow-sm">{step}</span>
                                {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-primary shrink-0" />}
                            </span>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Quick-add (internal / founders) bypasses this workflow.
                    </p>
                </CardContent>
            </Card>

            <ApplicationsAdminCard />

            <Card className="border-none shadow-xl shadow-black/5">
                <CardHeader className="bg-transparent border-none">
                    <h3 className="font-bold">Holder Onboarding &amp; Tax Status</h3>
                </CardHeader>
                <CardContent className="p-0">
                    {holders.length === 0 ? (
                        <p className="p-6 text-sm text-muted-foreground">No holders yet.</p>
                    ) : (
                        <div className="divide-y divide-border/50">
                            {holders.map((h) => (
                                <div key={h.id} className="flex items-center justify-between px-6 py-4">
                                    <div>
                                        <p className="font-semibold text-sm">{h.name}</p>
                                        <p className="text-xs text-muted-foreground">{treatmentLabel(h)} · KRA withholding applied at payout</p>
                                    </div>
                                    {h.application_id ? (
                                        <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> EPA onboarded</Badge>
                                    ) : (
                                        <Badge variant="outline" className="gap-1"><AlertCircle className="h-3 w-3" /> Quick-add (internal)</Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

/**
 * RunPayoutModal runs a payout for ALL active holders over a period. It always previews via a
 * dry run first (computes net-of-WHT amounts + skip reasons) before allowing execution.
 */
function RunPayoutModal({
    defaultRange,
    onClose,
}: {
    defaultRange: { from: string; to: string };
    onClose: () => void;
}) {
    const runPayout = useRunEquityPayout();
    const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm';
    const [range, setRange] = useState(defaultRange);
    const [preview, setPreview] = useState<RunPayoutResult[] | null>(null);
    const [previewed, setPreviewed] = useState(false);

    const run = async (dryRun: boolean) => {
        const res = await runPayout.mutateAsync({ period_start: range.from, period_end: range.to, dry_run: dryRun });
        setPreview(res.results);
        setPreviewed(dryRun);
        if (!dryRun) {
            // After a real run, refresh the preview to reflect new statuses, then close shortly.
            setTimeout(onClose, 1200);
        }
    };

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent title="Run Equity Payout" onClose={onClose} className="max-w-2xl">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Period Start">
                            <input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} className={inputClass} />
                        </FormField>
                        <FormField label="Period End">
                            <input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className={inputClass} />
                        </FormField>
                    </div>

                    {preview && (
                        <div className="rounded-lg border border-border/60 max-h-72 overflow-y-auto divide-y divide-border/50">
                            {preview.length === 0 ? (
                                <p className="p-4 text-sm text-muted-foreground">No holders / no allocation for this period.</p>
                            ) : preview.map((r) => (
                                <div key={r.holder_id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                                    <span className="font-medium">{r.holder_name}</span>
                                    <span className="flex items-center gap-2">
                                        <span className="font-mono">KES {r.amount}</span>
                                        {r.skipped
                                            ? <Badge variant="outline" className="text-[10px]">{r.skipped}</Badge>
                                            : <Badge variant="success" className="text-[10px]">{r.status ?? 'ok'}</Badge>}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-3 pt-1">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => run(true)} disabled={runPayout.isPending}>
                            {runPayout.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Preview (dry run)
                        </Button>
                        <Button
                            type="button"
                            className="flex-1"
                            onClick={() => run(false)}
                            disabled={runPayout.isPending || !previewed || (preview?.every((r) => !!r.skipped) ?? true)}
                            title={!previewed ? 'Preview first' : ''}
                        >
                            Execute Payout
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Execution disburses real Paystack transfers to every eligible holder for the selected period. Preview first.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}

const APP_STATUS_FLOW: Record<string, { next?: string; label: string }> = {
    pending: { next: 'kyc_pending', label: 'Start KYC' },
    kyc_pending: { next: 'kyc_approved', label: 'Mark KYC approved' },
    kyc_approved: { next: 'epa_pending', label: 'Request EPA' },
    epa_pending: { next: 'approved', label: 'Approve' },
    approved: { label: 'Approved' },
    rejected: { label: 'Rejected' },
};

/**
 * ApplicationsAdminCard drives the auth-service equity-holder application workflow
 * (apply → KYC → EPA → approval) from the treasury admin UI.
 */
function ApplicationsAdminCard() {
    const { data: apps, isLoading, isError } = useEquityApplications();
    const updateApp = useUpdateEquityApplication();

    const advance = (a: EquityApplication) => {
        const next = APP_STATUS_FLOW[a.status]?.next;
        if (next) updateApp.mutate({ id: a.id, data: { status: next as EquityApplication['status'] } });
    };

    return (
        <Card className="border-none shadow-xl shadow-black/5">
            <CardHeader className="bg-transparent border-none flex flex-row items-center justify-between">
                <h3 className="font-bold">Equity Applications</h3>
                <Badge variant="outline" className="text-[10px]">auth-service workflow</Badge>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading applications...</div>
                ) : isError ? (
                    <p className="p-6 text-sm text-muted-foreground">Couldn&apos;t load applications (auth-service admin scope required).</p>
                ) : !apps || apps.length === 0 ? (
                    <p className="p-6 text-sm text-muted-foreground">No equity applications yet. External candidates apply via the auth-service, then progress here.</p>
                ) : (
                    <div className="divide-y divide-border/50">
                        {apps.map((a) => (
                            <div key={a.id} className="flex items-center justify-between px-6 py-4 gap-4">
                                <div className="min-w-0">
                                    <p className="font-semibold text-sm font-mono truncate">{a.tenant_id.slice(0, 8)}…</p>
                                    <p className="text-xs text-muted-foreground">
                                        {a.status.replace(/_/g, ' ')}{a.kyc_reference ? ` · KYC ${a.kyc_reference.slice(0, 8)}` : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={a.status === 'approved' ? 'success' : a.status === 'rejected' ? 'error' : 'outline'}>{a.status.replace(/_/g, ' ')}</Badge>
                                    {APP_STATUS_FLOW[a.status]?.next && (
                                        <Button size="sm" variant="outline" className="h-8 text-[11px]" disabled={updateApp.isPending} onClick={() => advance(a)}>
                                            {APP_STATUS_FLOW[a.status]?.label} <ArrowRight className="h-3 w-3 ml-1" />
                                        </Button>
                                    )}
                                    {a.status !== 'approved' && a.status !== 'rejected' && (
                                        <Button size="sm" variant="ghost" className="h-8 text-[11px] text-red-500" disabled={updateApp.isPending} onClick={() => updateApp.mutate({ id: a.id, data: { status: 'rejected' } })}>
                                            Reject
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
