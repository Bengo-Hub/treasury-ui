'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { MultiSelect } from '@/components/ui/multi-select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    useCreateEquityHolder,
    useEquityHolders,
    useEquitySummary,
    useHolderPayouts,
    useTriggerEquityPayout,
    useUpdateEquityHolder,
} from '@/hooks/use-equity';
import { useBanks, usePlatformBalance, useResolveAccount } from '@/hooks/use-gateways';
import { useMe } from '@/hooks/useMe';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import type { CreateEquityHolderRequest, EquityHolder, EquityPayout } from '@/lib/api/equity';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    AlertCircle,
    ArrowRight,
    Calendar,
    CheckCircle2,
    DollarSign,
    Info,
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
    { value: 'ordering', label: 'Ordering' },
    { value: 'subscriptions', label: 'Subscriptions' },
    { value: 'pos', label: 'POS' },
    { value: 'logistics', label: 'Logistics' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'treasury', label: 'Treasury' },
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

    const [dateRange, setDateRange] = useState({
        from: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
        to: format(new Date(), 'yyyy-MM-dd'),
    });
    const [showAddHolder, setShowAddHolder] = useState(false);
    const [editingHolder, setEditingHolder] = useState<EquityHolder | null>(null);
    const [historyHolderId, setHistoryHolderId] = useState<string | null>(null);

    const { data: holdersData, isLoading: loadingHolders } = useEquityHolders();
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
                </div>

                {/* Sidebar Projections & Config */}
                <div className="space-y-6">
                    <NextPayoutProjectionCard
                        holders={holders}
                        dateRange={dateRange}
                        onConfigure={() => router.push(`/${orgSlug}/platform`)}
                    />

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
        </div>
    );
}

/** Compute the next auto-run date from holders' payout frequencies. */
function getNextPayoutDate(holders: EquityHolder[]): { date: string; frequency: string } {
    const now = new Date();
    const activeHolders = holders.filter(h => h.is_active);
    if (activeHolders.length === 0) return { date: '-', frequency: 'none' };

    // Count frequencies
    const freqCounts: Record<string, number> = {};
    for (const h of activeHolders) {
        const f = h.payout_frequency ?? 'manual';
        freqCounts[f] = (freqCounts[f] ?? 0) + 1;
    }

    // Most common frequency
    const dominant = Object.entries(freqCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'manual';

    if (dominant === 'manual') return { date: 'Manual', frequency: 'manual' };

    if (dominant === 'monthly') {
        // First of next month
        const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return { date: format(next, 'yyyy-MM-dd'), frequency: 'monthly' };
    }

    if (dominant === 'quarterly') {
        // First of next quarter
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const nextQuarterMonth = (currentQuarter + 1) * 3;
        const next = nextQuarterMonth > 11
            ? new Date(now.getFullYear() + 1, nextQuarterMonth - 12, 1)
            : new Date(now.getFullYear(), nextQuarterMonth, 1);
        return { date: format(next, 'yyyy-MM-dd'), frequency: 'quarterly' };
    }

    return { date: '-', frequency: dominant };
}

function NextPayoutProjectionCard({
    holders,
    dateRange,
    onConfigure,
}: {
    holders: EquityHolder[];
    dateRange: { from: string; to: string };
    onConfigure: () => void;
}) {
    const { date: nextDate, frequency } = getNextPayoutDate(holders);
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
                    Profit is calculated from {dateRange.from} to {dateRange.to}. Payouts are triggered automatically if threshold is met.
                </p>
                <Button variant="outline" className="w-full bg-card shadow-sm hover:shadow-md transition-all border-none font-bold text-xs" onClick={onConfigure}>
                    Configure Frequency <ArrowRight className="h-3 w-3 ml-2" />
                </Button>
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
                        KES {projection?.projected_amount?.toLocaleString() ?? '0'}
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
    const [payoutFrequency, setPayoutFrequency] = useState<'manual' | 'monthly' | 'quarterly'>(initial?.payout_frequency ?? 'monthly');

    // Tab 2: Services
    const [selectedServices, setSelectedServices] = useState<string[]>(initial?.source_services ?? []);

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

    // Hydrate payout details from initial holder
    useEffect(() => {
        if (!initial?.payout_account_details) return;
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
            payout_method: payoutMethod,
            payout_account_details: buildPayoutDetails(),
            payout_threshold: payoutThreshold,
            payout_frequency: payoutFrequency,
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
                                    onChange={(e) => setPayoutFrequency(e.target.value as 'manual' | 'monthly' | 'quarterly')}
                                    className={selectClass}
                                >
                                    <option value="manual">Manual</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                </select>
                            </FormField>
                        </TabsContent>

                        {/* Tab 2: Services */}
                        <TabsContent value="services" className="space-y-4">
                            <FormField label="Source Services" description="Select which services this holder earns from.">
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
                                                    resolveAccountMutation.mutate(
                                                        { accountNumber, bankCode },
                                                        {
                                                            onSuccess: (data: any) => {
                                                                const resolved = data?.data?.account_name ?? data?.account_name ?? '';
                                                                setVerifiedName(resolved);
                                                                setAccountName(resolved);
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
