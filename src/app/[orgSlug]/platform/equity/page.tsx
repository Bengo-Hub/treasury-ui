'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    useCreateEquityHolder,
    useEquityHolders,
    useEquityPolicy,
    useEquitySchedule,
    useEquitySummary,
    useHolderPayouts,
    useRunEquityPayout,
    useTriggerEquityPayout,
    useUpdateEquityHolder,
    useUpdateEquityPolicy,
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
import { usePlatformBalance } from '@/hooks/use-gateways';
import { useMe } from '@/hooks/useMe';
import type { CreateEquityHolderRequest, EquityHolder, EquityPayout, EquityPayoutSchedule, RunPayoutResponse, RunPayoutResult } from '@/lib/api/equity';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    AlertCircle,
    ArrowRight,
    Calendar,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    DollarSign,
    Eye,
    Info,
    Link2,
    Loader2,
    MoreVertical,
    Percent,
    PieChart,
    Plus,
    RefreshCcw,
    Shield,
    TrendingUp,
    Users,
    X,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { PaystackBalanceCard } from '@/components/platform/PaystackBalanceCard';
import { HolderFormModal, SERVICE_OPTIONS } from '@/components/platform/equity-holder-form';
import { type ReactNode, useEffect, useState } from 'react';

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
    const [showPreviewPayout, setShowPreviewPayout] = useState(false);
    const [showAddHolder, setShowAddHolder] = useState(false);
    const [holderSearch, setHolderSearch] = useState('');
    const [holderPage, setHolderPage] = useState(1);
    const HOLDERS_PER_PAGE = 2;
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

    // Client-side search + pagination over the holders list. Paginated at 2/page so the page
    // doesn't stretch; the search resets to page 1 (handled on input change).
    const filteredHolders = holders.filter((h) => {
        const q = holderSearch.trim().toLowerCase();
        if (!q) return true;
        return (
            h.name.toLowerCase().includes(q) ||
            (h.email ?? '').toLowerCase().includes(q) ||
            h.holder_type.toLowerCase().includes(q)
        );
    });
    const holderTotalPages = Math.max(1, Math.ceil(filteredHolders.length / HOLDERS_PER_PAGE));
    const currentHolderPage = Math.min(holderPage, holderTotalPages);
    const pagedHolders = filteredHolders.slice(
        (currentHolderPage - 1) * HOLDERS_PER_PAGE,
        currentHolderPage * HOLDERS_PER_PAGE,
    );

    // isSuperUser is a TENANT-scoped role, not platform-wide — excluded so a tenant's own
    // admin/superuser can never reach the platform equity/referrals section.
    const isSuperAdmin = user?.isPlatformOwner;

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

    // Active date-range preset, so the segmented control can reflect the current selection.
    const activeRangePreset: 'last30' | 'thisMonth' | null = (() => {
        const to = new Date();
        const last30From = new Date(to);
        last30From.setDate(last30From.getDate() - 30);
        const monthFrom = new Date(to.getFullYear(), to.getMonth(), 1);
        const toStr = format(to, 'yyyy-MM-dd');
        if (dateRange.to === toStr && dateRange.from === format(last30From, 'yyyy-MM-dd')) return 'last30';
        if (dateRange.to === toStr && dateRange.from === format(monthFrom, 'yyyy-MM-dd')) return 'thisMonth';
        return null;
    })();

    const applyRange = (preset: 'last30' | 'thisMonth') => {
        const to = new Date();
        const from = preset === 'last30'
            ? (() => { const d = new Date(to); d.setDate(d.getDate() - 30); return d; })()
            : new Date(to.getFullYear(), to.getMonth(), 1);
        setDateRange({ from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') });
    };

    return (
        <div className="p-4 sm:p-6 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">Equity &amp; Royalties</Badge>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                        Platform Equity Management
                    </h1>
                    <p className="text-muted-foreground mt-1 max-w-2xl text-sm sm:text-base">
                        Manage shareholders and royalty holders, monitor revenue allocations, and trigger automated payouts via Paystack.
                    </p>
                </div>

                {/* Action cluster: date-range segmented control grouped separately from the
                    payout actions, so the primary CTA never crowds the title and the whole
                    cluster wraps cleanly on narrow widths. */}
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
                    <div
                        role="group"
                        aria-label="Date range"
                        className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 p-1 shadow-inner"
                    >
                        <button
                            type="button"
                            aria-pressed={activeRangePreset === 'last30'}
                            onClick={() => applyRange('last30')}
                            className={cn(
                                'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                activeRangePreset === 'last30'
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <Calendar className="h-3.5 w-3.5" />
                            Last 30 Days
                        </button>
                        <button
                            type="button"
                            aria-pressed={activeRangePreset === 'thisMonth'}
                            onClick={() => applyRange('thisMonth')}
                            className={cn(
                                'inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                activeRangePreset === 'thisMonth'
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            This Month
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="gap-2" onClick={() => setShowPreviewPayout(true)}>
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline">Preview Payouts</span>
                            <span className="sm:hidden">Preview</span>
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
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} variant="capsule" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="holders" badge={holders.length || undefined}>Holders</TabsTrigger>
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
                                        value={holderSearch}
                                        onChange={(e) => { setHolderSearch(e.target.value); setHolderPage(1); }}
                                        placeholder="Search holders..."
                                        className="h-9 w-48 sm:w-64 rounded-full bg-accent/30 border-none px-4 text-xs focus:ring-1 focus:ring-primary/20 outline-none"
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
                            ) : filteredHolders.length === 0 ? (
                                <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                                    <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center opacity-30">
                                        <Users className="h-6 w-6" />
                                    </div>
                                    <p className="text-sm">No holders match &ldquo;{holderSearch}&rdquo;.</p>
                                    <Button variant="outline" size="sm" onClick={() => setHolderSearch('')}>Clear search</Button>
                                </div>
                            ) : (
                                <>
                                    <div className="divide-y divide-border/50">
                                        {pagedHolders.map((holder) => (
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
                                    {/* Pager — shows even with one page so the total count stays visible. */}
                                    <div className="flex items-center justify-between gap-3 px-8 py-4 border-t border-border/50">
                                        <p className="text-xs text-muted-foreground">
                                            Showing{' '}
                                            <span className="font-semibold text-foreground">
                                                {(currentHolderPage - 1) * HOLDERS_PER_PAGE + 1}–{Math.min(currentHolderPage * HOLDERS_PER_PAGE, filteredHolders.length)}
                                            </span>{' '}
                                            of <span className="font-semibold text-foreground">{filteredHolders.length}</span>
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                disabled={currentHolderPage <= 1}
                                                onClick={() => setHolderPage((p) => Math.max(1, p - 1))}
                                                aria-label="Previous page"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>
                                            <span className="text-xs font-medium tabular-nums text-muted-foreground">
                                                Page {currentHolderPage} / {holderTotalPages}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                disabled={currentHolderPage >= holderTotalPages}
                                                onClick={() => setHolderPage((p) => Math.min(holderTotalPages, p + 1))}
                                                aria-label="Next page"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </>
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
                    <PaystackBalanceCard
                        balance={balanceData}
                        loading={loadingBalance}
                        className="border-none shadow-xl shadow-black/5"
                    />
                </div>
            </div>
                </TabsContent>

                <TabsContent value="referrals" className="mt-6">
                    <ReferralsPanel />
                </TabsContent>

                <TabsContent value="schedule" className="mt-6 space-y-6">
                    <PlatformRetentionCard />
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

            {showPreviewPayout && (
                <PreviewPayoutModal
                    defaultRange={dateRange}
                    onClose={() => setShowPreviewPayout(false)}
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

/**
 * PlatformRetentionCard edits the platform equity policy: the % the platform retains
 * before distributing the remainder to equity holders. The API stores fractions in
 * [0, 1); the UI works in whole percent (0–99) and shows the derived distributable
 * share live. Saving invalidates the equity-summary queries so projected payouts refresh.
 */
function PlatformRetentionCard() {
    const { data, isLoading } = useEquityPolicy();
    const updatePolicy = useUpdateEquityPolicy();
    const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm';

    // Retention held in whole-percent units (e.g. 30 for 0.30). Empty string = untouched.
    const [retentionPct, setRetentionPct] = useState<string>('');

    useEffect(() => {
        if (data?.policy) {
            setRetentionPct(String(Math.round((data.policy.platform_retention_pct ?? 0) * 1000) / 10));
        }
    }, [data?.policy]);

    const parsed = parseFloat(retentionPct);
    const hasValue = retentionPct.trim() !== '' && !Number.isNaN(parsed);
    const isValid = hasValue && parsed >= 0 && parsed <= 99;
    const distributablePct = hasValue ? Math.max(0, 100 - parsed) : null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;
        // Convert whole-percent → fraction for the API (0 ≤ x < 1).
        updatePolicy.mutate({ platform_retention_pct: parsed / 100 });
    };

    return (
        <Card className="border-none shadow-xl shadow-black/5 max-w-2xl">
            <CardHeader className="bg-transparent border-none">
                <h3 className="text-xl font-bold flex items-center gap-3">
                    <Percent className="h-5 w-5 text-primary" />
                    Platform Retention %
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    The share the platform retains before distributing the remainder to equity holders.
                    Default is 30%. The distributable share is derived automatically.
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading policy...
                    </div>
                ) : (
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <FormField
                            label="Platform Retention (%)"
                            description="Percentage of net profit the platform keeps before equity distribution. Allowed range: 0–99."
                            error={hasValue && !isValid ? 'Enter a value between 0 and 99.' : undefined}
                        >
                            <div className="relative">
                                <input
                                    type="number"
                                    min={0}
                                    max={99}
                                    step="0.1"
                                    value={retentionPct}
                                    onChange={(e) => setRetentionPct(e.target.value)}
                                    className={cn(inputClass, 'pr-9')}
                                    placeholder="30"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                            </div>
                        </FormField>

                        <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-4 py-3 text-sm">
                            <Info className="h-4 w-4 text-primary shrink-0" />
                            <span>
                                Distributable to holders:{' '}
                                <span className="font-bold">
                                    {distributablePct != null ? `${Number(distributablePct.toFixed(2))}%` : '—'}
                                </span>
                            </span>
                        </div>

                        <div className="pt-1">
                            <Button type="submit" disabled={updatePolicy.isPending || !isValid}>
                                {updatePolicy.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Save Retention
                            </Button>
                        </div>
                    </form>
                )}
            </CardContent>
        </Card>
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

/**
 * PreviewPayoutModal shows the EXPECTED payouts per holder for a period — net-of-WHT amount,
 * status/skip reason — plus the platform-retention split (distributable pool vs retained) and
 * the total net payout. It uses the Run Payout dry-run path, which computes via the shared
 * allocation engine WITHOUT disbursing, persisting, or calling Paystack.
 */
function PreviewPayoutModal({
    defaultRange,
    onClose,
}: {
    defaultRange: { from: string; to: string };
    onClose: () => void;
}) {
    const runPayout = useRunEquityPayout();
    const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm';
    const [range, setRange] = useState(defaultRange);
    const [result, setResult] = useState<RunPayoutResponse | null>(null);

    const preview = async () => {
        const res = await runPayout.mutateAsync({ period_start: range.from, period_end: range.to, dry_run: true });
        setResult(res);
    };

    const fmt = (v?: string) => `KES ${Number(v ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const retentionPctLabel = result?.platform_retention_pct != null ? `${(result.platform_retention_pct * 100).toFixed(0)}%` : '—';
    const distributablePctLabel = result?.distributable_pct != null ? `${(result.distributable_pct * 100).toFixed(0)}%` : '—';

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent title="Preview Payouts (Dry Run)" onClose={onClose} className="max-w-2xl">
                <div className="space-y-4">
                    <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/10 px-4 py-3 text-sm">
                        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">
                            Computes expected payouts against current platform revenue. Nothing is disbursed, persisted, or sent to Paystack.
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Period Start">
                            <input type="date" value={range.from} onChange={(e) => { setRange((r) => ({ ...r, from: e.target.value })); setResult(null); }} className={inputClass} />
                        </FormField>
                        <FormField label="Period End">
                            <input type="date" value={range.to} onChange={(e) => { setRange((r) => ({ ...r, to: e.target.value })); setResult(null); }} className={inputClass} />
                        </FormField>
                    </div>

                    {result && (
                        <>
                            {/* Retention split summary */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="rounded-xl border border-border/60 bg-card p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Net Revenue</p>
                                    <p className="text-sm font-black mt-1">{fmt(result.net_profit)}</p>
                                </div>
                                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Distributable ({distributablePctLabel})</p>
                                    <p className="text-sm font-black mt-1">{fmt(result.distributable_pool)}</p>
                                </div>
                                <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Platform Retained ({retentionPctLabel})</p>
                                    <p className="text-sm font-black mt-1">{fmt(result.platform_retained)}</p>
                                </div>
                            </div>

                            <div className="rounded-lg border border-border/60 max-h-72 overflow-y-auto divide-y divide-border/50">
                                {result.results.length === 0 ? (
                                    <p className="p-4 text-sm text-muted-foreground">No holders / no allocation for this period.</p>
                                ) : result.results.map((r) => (
                                    <div key={r.holder_id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                                        <span className="font-medium min-w-0 truncate">{r.holder_name}</span>
                                        <span className="flex items-center gap-2 shrink-0">
                                            <span className="font-mono">{fmt(r.amount)}</span>
                                            {r.skipped
                                                ? <Badge variant="outline" className="text-[10px]">{r.skipped}</Badge>
                                                : <Badge variant="success" className="text-[10px]">net of WHT</Badge>}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-accent/20 px-4 py-3">
                                <span className="text-sm font-bold">Total Net Payout</span>
                                <span className="text-sm font-black font-mono">{fmt(result.total_net_payout)}</span>
                            </div>
                        </>
                    )}

                    <div className="flex gap-3 pt-1">
                        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Close</Button>
                        <Button type="button" className="flex-1 gap-2" onClick={preview} disabled={runPayout.isPending}>
                            {runPayout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                            {result ? 'Recompute Preview' : 'Compute Preview'}
                        </Button>
                    </div>
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
