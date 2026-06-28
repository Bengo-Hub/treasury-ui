'use client';

import { Button } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { MultiSelect } from '@/components/ui/multi-select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useBanks, useResolveAccount } from '@/hooks/use-gateways';
import { usePlatformTenants } from '@/hooks/use-platform-tenants';
import { useReferrals } from '@/hooks/use-referrals';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import type { CreateEquityHolderRequest, EquityHolder } from '@/lib/api/equity';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info, Loader2, X } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

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

export function HolderFormModal({
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
