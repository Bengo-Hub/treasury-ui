'use client';

import { Badge, Button } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useEquityHolders } from '@/hooks/use-equity';
import { useEquityEntitlements } from '@/hooks/use-equity-entitlements';
import { useBanks, useResolveAccount } from '@/hooks/use-gateways';
import { usePlatformTenants } from '@/hooks/use-platform-tenants';
import { useReferrals } from '@/hooks/use-referrals';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import type { CreateEquityHolderRequest, EquityHolder } from '@/lib/api/equity';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info, Loader2, Settings2, X } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export const SERVICE_OPTIONS = [
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

export const PAYOUT_METHODS = [
    { value: 'paystack_transfer', label: 'Paystack Transfer' },
    { value: 'bank', label: 'Bank Transfer (Manual)' },
    { value: 'mpesa_paybill', label: 'M-Pesa Paybill' },
    { value: 'mpesa_till', label: 'M-Pesa Till' },
];

export const RECIPIENT_TYPES = [
    { value: 'nuban', label: 'NUBAN (Nigeria)' },
    { value: 'kepss', label: 'KEPSS (Kenya)' },
    { value: 'ghipss', label: 'GHIPSS (Ghana)' },
    { value: 'basa', label: 'BASA (South Africa)' },
    { value: 'mobile_money', label: 'Mobile Money' },
    { value: 'mobile_money_business', label: 'Mobile Money Business' },
];

export const CURRENCY_OPTIONS = ['KES', 'NGN', 'GHS', 'ZAR'] as const;

export const currencyToCountry: Record<string, string> = {
    KES: 'kenya',
    NGN: 'nigeria',
    GHS: 'ghana',
    ZAR: 'south-africa',
};

export const COMPENSATION_MODELS = [
    {
        value: 'equity_revenue_share',
        label: 'Equity Revenue Share',
        hint: 'Contractual revenue/profit-share participant under an EPA. Earnings come from entitlements.',
    },
    {
        value: 'royalty',
        label: 'Royalty / Referral Partner',
        hint: 'External partner earning a % of a referred tenant’s subscription revenue. Earnings come from entitlements.',
    },
    {
        value: 'dividend',
        label: 'Dividend (Registered Shareholder)',
        hint: 'Umbrella company or one of its registered shareholders. Paid by declared dividend, never the automatic revenue-share engine.',
    },
] as const;

type CompensationModel = (typeof COMPENSATION_MODELS)[number]['value'];

export function HolderFormModal({
    title,
    open,
    initial,
    onClose,
    onSubmit,
    isSubmitting,
    onManageEntitlements,
}: {
    title: string;
    open: boolean;
    initial: EquityHolder | null;
    onClose: () => void;
    onSubmit: (data: CreateEquityHolderRequest) => Promise<void>;
    isSubmitting: boolean;
    /**
     * Opens the entitlements manager for this holder. Entitlements are the ONLY
     * way a non-dividend holder's earnings are configured, so the form hands off
     * rather than editing the retired percentage_share / source_services fields.
     */
    onManageEntitlements?: () => void;
}) {
    const params = useParams();
    const orgSlug = params?.orgSlug as string;
    const { tenantPathId } = useResolvedTenant();
    const tenantSlug = tenantPathId || orgSlug;

    const [activeTab, setActiveTab] = useState('basic');
    const [name, setName] = useState(initial?.name ?? '');
    const [holderType, setHolderType] = useState<'shareholder' | 'royalty'>(initial?.holder_type ?? 'shareholder');
    const [email, setEmail] = useState(initial?.email ?? '');
    const [compensationModel, setCompensationModel] = useState<CompensationModel>(
        (initial?.compensation_model as CompensationModel) ?? 'equity_revenue_share',
    );
    const [percentageShare, setPercentageShare] = useState(initial?.percentage_share ?? 0);
    const [payoutFrequency, setPayoutFrequency] = useState<'manual' | 'monthly' | 'quarterly' | 'annually'>(initial?.payout_frequency ?? 'monthly');
    const [payoutScheduleDay, setPayoutScheduleDay] = useState(initial?.payout_schedule_day ?? 0);
    const [financialYearEndMonth, setFinancialYearEndMonth] = useState(initial?.financial_year_end_month ?? 12);
    const [closeOfBooksDay, setCloseOfBooksDay] = useState(initial?.close_of_books_day ?? 0);

    // Dividend-model shareholding (umbrella + its registered shareholders)
    const [parentHolderId, setParentHolderId] = useState(initial?.parent_holder_id ?? '');
    const [shareCount, setShareCount] = useState<number>(initial?.share_count ?? 0);
    const [totalIssuedShares, setTotalIssuedShares] = useState<number>(initial?.total_issued_shares ?? 0);

    // Earnings scope (non-dividend). source_services is retired from this form —
    // entitlements are the only earnings config — but whatever is stored is preserved.
    const [linkedTenantIds, setLinkedTenantIds] = useState<string[]>(initial?.linked_tenant_ids ?? []);
    const [referralId, setReferralId] = useState(initial?.referral_id ?? '');

    // Referral and tenant selects
    const { data: referralsData, isLoading: loadingReferrals } = useReferrals();
    const referrals = referralsData?.referrals ?? [];
    const { data: platformTenants, isLoading: loadingTenants } = usePlatformTenants();

    const isDividend = compensationModel === 'dividend';

    // Umbrella candidates: dividend-model holders that don't roll up under anyone.
    const { data: allHoldersData } = useEquityHolders();
    const umbrellaHolders = useMemo(
        () =>
            (allHoldersData?.holders ?? []).filter(
                (h) => h.compensation_model === 'dividend' && !h.parent_holder_id && h.id !== initial?.id,
            ),
        [allHoldersData, initial?.id],
    );
    const parentHolder = umbrellaHolders.find((h) => h.id === parentHolderId);

    // A child shareholder's denominator is the umbrella's issued-share count.
    const effectiveTotalIssued = parentHolderId
        ? (parentHolder?.total_issued_shares ?? 0)
        : totalIssuedShares;
    const derivedPercentage =
        shareCount > 0 && effectiveTotalIssued > 0
            ? Number(((shareCount / effectiveTotalIssued) * 100).toFixed(4))
            : null;
    // The registered % is either derived from the share counts or typed directly.
    const effectivePercentage = derivedPercentage ?? percentageShare;

    // Read-only view of the entitlements that actually drive a non-dividend
    // holder's allocation, so the admin sees the live config without leaving the form.
    const { data: entitlementsData, isLoading: loadingEntitlements } = useEquityEntitlements(
        !isDividend && initial?.id ? initial.id : '',
    );
    const activeEntitlements = (entitlementsData?.entitlements ?? []).filter((e) => e.is_active);

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
            setCompensationModel((initial.compensation_model as CompensationModel) ?? 'equity_revenue_share');
            setPercentageShare(initial.percentage_share ?? 0);
            setParentHolderId(initial.parent_holder_id ?? '');
            setShareCount(initial.share_count ?? 0);
            setTotalIssuedShares(initial.total_issued_shares ?? 0);
            setPayoutFrequency(initial.payout_frequency ?? 'monthly');
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
            setCompensationModel('equity_revenue_share');
            setPercentageShare(0);
            setParentHolderId('');
            setShareCount(0);
            setTotalIssuedShares(0);
            setPayoutFrequency('monthly');
            setPayoutScheduleDay(0);
            setFinancialYearEndMonth(12);
            setCloseOfBooksDay(0);
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
            compensation_model: compensationModel,
            // Only dividend holders carry a meaningful registered %. For everyone else
            // the stored value is passed through untouched — the allocation engine
            // always prefers entitlements, so editing it here would be a no-op.
            percentage_share: isDividend ? effectivePercentage : (initial?.percentage_share ?? 0),
            ...(isDividend
                ? {
                      parent_holder_id: parentHolderId || undefined,
                      share_count: shareCount || undefined,
                      // Only the umbrella owns the issued-share total.
                      total_issued_shares: parentHolderId ? undefined : (totalIssuedShares || undefined),
                  }
                : {
                      linked_tenant_ids: linkedTenantIds.length > 0 ? linkedTenantIds : undefined,
                      referral_id: referralId || undefined,
                      // source_services is retired from this form; preserve what's stored
                      // rather than silently clearing it.
                      source_services: initial?.source_services,
                  }),
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
                            <TabsTrigger value="services">{isDividend ? 'Shareholding' : 'Earnings'}</TabsTrigger>
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
                            <FormField
                                label="Compensation Model"
                                required
                                description="Decides how this holder earns — and therefore which fields below apply."
                            >
                                <select
                                    value={compensationModel}
                                    onChange={(e) => setCompensationModel(e.target.value as CompensationModel)}
                                    className={selectClass}
                                >
                                    {COMPENSATION_MODELS.map((m) => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    {COMPENSATION_MODELS.find((m) => m.value === compensationModel)?.hint}
                                </p>
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

                        {/* Tab 2 — dividend: registered shareholding. */}
                        {isDividend && (
                            <TabsContent value="services" className="space-y-4">
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10 text-sm text-purple-600 dark:text-purple-400">
                                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span>
                                        Dividend holders don&apos;t use entitlements. Their share is either typed
                                        directly or derived from the registered share counts below.
                                    </span>
                                </div>

                                <FormField
                                    label="Umbrella Company"
                                    description="Leave blank if this holder IS the umbrella company. Otherwise pick the company this shareholder rolls up under."
                                >
                                    <select
                                        value={parentHolderId}
                                        onChange={(e) => setParentHolderId(e.target.value)}
                                        className={selectClass}
                                    >
                                        <option value="">None — this holder is the umbrella company</option>
                                        {umbrellaHolders.map((h) => (
                                            <option key={h.id} value={h.id}>{h.name}</option>
                                        ))}
                                    </select>
                                </FormField>

                                <FormField label="Share Count" description="BRS/CR12-registered shares held.">
                                    <input
                                        type="number"
                                        min={0}
                                        step={1}
                                        value={shareCount || ''}
                                        onChange={(e) => setShareCount(parseInt(e.target.value) || 0)}
                                        className={inputClass}
                                        placeholder="e.g. 250"
                                    />
                                </FormField>

                                {!parentHolderId && (
                                    <FormField label="Total Issued Shares" description="The company's total issued shares — the denominator for every shareholder's %.">
                                        <input
                                            type="number"
                                            min={0}
                                            step={1}
                                            value={totalIssuedShares || ''}
                                            onChange={(e) => setTotalIssuedShares(parseInt(e.target.value) || 0)}
                                            className={inputClass}
                                            placeholder="e.g. 1000"
                                        />
                                    </FormField>
                                )}

                                <FormField
                                    label="Percentage Share"
                                    required
                                    description={
                                        derivedPercentage != null
                                            ? 'Derived from the share counts above — edit the counts to change it.'
                                            : 'Typed directly. Fill in the share counts above to derive it instead.'
                                    }
                                >
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            step={0.01}
                                            value={derivedPercentage != null ? derivedPercentage : (percentageShare || '')}
                                            onChange={(e) => setPercentageShare(parseFloat(e.target.value) || 0)}
                                            className={cn(inputClass, 'pr-9', derivedPercentage != null && 'bg-muted/50')}
                                            readOnly={derivedPercentage != null}
                                            required
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                                    </div>
                                </FormField>

                                {parentHolderId && !parentHolder?.total_issued_shares && (
                                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 text-sm text-amber-600 dark:text-amber-400">
                                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                        <span>
                                            The selected umbrella has no total issued shares recorded, so the % can&apos;t be derived.
                                            Set it on the umbrella holder, or type the % directly.
                                        </span>
                                    </div>
                                )}

                                {effectivePercentage >= 10 && (
                                    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 text-sm text-blue-600 dark:text-blue-400">
                                        <Info className="h-4 w-4 mt-0.5 shrink-0" />
                                        <span>
                                            At {effectivePercentage}% this holder is a beneficial owner — a Beneficial
                                            Ownership Regulations 2020 filing is required.
                                        </span>
                                    </div>
                                )}
                            </TabsContent>
                        )}

                        {/* Tab 2 — non-dividend: entitlements drive earnings; only scope is edited here. */}
                        {!isDividend && (
                        <TabsContent value="services" className="space-y-4">
                            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                                <div className="flex items-start gap-2 text-sm">
                                    <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                                    <div>
                                        <p className="font-semibold text-foreground">Earnings are configured via Entitlements.</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            The allocation engine always prefers per-service entitlements over the legacy
                                            flat percentage and source-service list, so those fields are no longer editable here.
                                        </p>
                                    </div>
                                </div>

                                {initial?.id ? (
                                    loadingEntitlements ? (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading entitlements…
                                        </div>
                                    ) : activeEntitlements.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">
                                            No active entitlements — this holder currently earns nothing from the revenue-share engine.
                                        </p>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {activeEntitlements.map((e) => (
                                                <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg bg-background/60 border border-border/50 px-3 py-2 text-xs">
                                                    <span className="font-mono truncate">{e.service_id === '*' ? 'All services' : e.service_id}</span>
                                                    <span className="flex items-center gap-2 shrink-0">
                                                        <span className="font-bold">{parseFloat(e.equity_pct).toFixed(2)}%</span>
                                                        <Badge variant="outline">{e.vesting_type}</Badge>
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        Save the holder first, then add entitlements to define what they earn.
                                    </p>
                                )}

                                {onManageEntitlements && initial?.id && (
                                    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onManageEntitlements}>
                                        <Settings2 className="h-3.5 w-3.5" /> Manage Entitlements
                                    </Button>
                                )}
                            </div>

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
                        )}

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
