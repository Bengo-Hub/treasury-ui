'use client';

import { Badge, Button, Card, CardContent } from '@/components/ui/base';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  useBanks,
  useResolveAccount,
  useSelectTenantGateway,
  useTenantGateways,
  useTenantPayoutConfig,
  useTenantSelectedGateways,
  useUpsertTenantPayoutConfig,
} from '@/hooks/use-gateways';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useMe } from '@/hooks/useMe';
import { getTenantMpesaConfig, updateTenantMpesaConfig, type UpdateTenantMpesaConfigRequest } from '@/lib/api/revenue';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Crown,
  Loader2,
  Plus,
  Power,
  Save,
  Smartphone,
  XCircle
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const PAYSTACK_RECIPIENT_TYPES = [
  { value: 'nuban', label: 'Bank (NUBAN — Nigeria)' },
  { value: 'kepss', label: 'Bank (KEPSS — Kenya)' },
  { value: 'ghipss', label: 'Bank (GHIPSS — Ghana)' },
  { value: 'basa', label: 'Bank (BASA — South Africa)' },
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'mobile_money_business', label: 'Mobile money business (Paybill / Till)' },
  { value: 'mpesa_paybill', label: 'M-Pesa Paybill' },
] as const;

const CURRENCY_OPTIONS = ['KES', 'NGN', 'GHS', 'ZAR'] as const;

const currencyToCountry: Record<string, string> = {
  KES: 'kenya',
  NGN: 'nigeria',
  GHS: 'ghana',
  ZAR: 'south-africa',
};

/** Recipient types that use bank details (bank_code, account_number, account_name). */
const BANK_RECIPIENT_TYPES = ['nuban', 'kepss', 'ghipss', 'basa'];

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const SCHEDULE_TYPES = [
  { value: 'instant', label: 'Instant' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
] as const;

export default function GatewaysPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const { tenantPathId } = useResolvedTenant();
  const tenantSlug = tenantPathId || orgSlug;
  const { data: gateways = [], isLoading: loading, error: queryError } = useTenantGateways(tenantSlug);
  const { data: selectedData } = useTenantSelectedGateways(tenantSlug);
  const selected = selectedData?.selected ?? [];
  // The first selected gateway is the primary; all selected gateways are active
  const primaryGateway = selected[0];
  const activeGatewayTypes = new Set(selected.map((g) => g.gateway_type));
  const hasPaystack = activeGatewayTypes.has('paystack');
  const hasMpesa = selected.some((g) => g.gateway_type?.startsWith('mpesa'));
  const mpesaGateway = selected.find((g) => g.gateway_type?.startsWith('mpesa'));

  const { data: user } = useMe();
  const isSuperAdmin = user?.isPlatformOwner || user?.isSuperUser;
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load gateways') : null;

  const selectMutation = useSelectTenantGateway(tenantSlug);
  const { data: payoutConfig, isLoading: loadingPayout } = useTenantPayoutConfig(tenantSlug, hasPaystack);
  const upsertPayout = useUpsertTenantPayoutConfig(tenantSlug);

  // Bank resolution state
  const [payoutCurrency, setPayoutCurrency] = useState('NGN');
  const bankCountry = currencyToCountry[payoutCurrency] || '';
  const { data: banksData, isLoading: loadingBanks } = useBanks(tenantSlug, bankCountry);
  const banks: { name: string; code: string }[] = (banksData as any)?.data ?? (banksData as any)?.banks ?? [];
  const resolveAccountMutation = useResolveAccount(tenantSlug);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const { data: mpesaConfig, isLoading: loadingMpesa } = useQuery({
    queryKey: ['mpesa-config', orgSlug],
    queryFn: () => getTenantMpesaConfig(orgSlug),
    enabled: !!orgSlug && hasMpesa,
  });
  const queryClient = useQueryClient();
  const updateMpesa = useMutation({
    mutationFn: (body: UpdateTenantMpesaConfigRequest) => updateTenantMpesaConfig(orgSlug, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mpesa-config', orgSlug] });
      toast.success('M-Pesa config saved');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to save'),
  });

  const [payoutForm, setPayoutForm] = useState({
    recipient_type: payoutConfig?.recipient_type ?? 'nuban',
    schedule_type: payoutConfig?.schedule_type ?? 'weekly',
    schedule_day: payoutConfig?.schedule_day ?? 1,
    min_payout_amount: payoutConfig?.min_payout_amount ? parseFloat(payoutConfig.min_payout_amount) : 0,
    bank_name: payoutConfig?.bank_name ?? '',
    bank_code: payoutConfig?.bank_code ?? '',
    account_number: payoutConfig?.account_number ?? '',
    account_name: payoutConfig?.account_name ?? '',
    mobile_number: payoutConfig?.mobile_number ?? '',
    mpesa_paybill: payoutConfig?.mpesa_paybill ?? '',
  });
  const [mpesaForm, setMpesaForm] = useState({
    shortcode: mpesaConfig?.shortcode ?? '',
    initiator_name: mpesaConfig?.initiator_name ?? '',
    initiator_password: '',
  });

  useEffect(() => {
    if (payoutConfig) {
      setPayoutForm((f) => ({
        ...f,
        recipient_type: payoutConfig.recipient_type ?? 'nuban',
        schedule_type: payoutConfig.schedule_type ?? 'weekly',
        schedule_day: payoutConfig.schedule_day ?? 1,
        min_payout_amount: payoutConfig.min_payout_amount ? parseFloat(payoutConfig.min_payout_amount) : 0,
        bank_name: payoutConfig.bank_name ?? '',
        bank_code: payoutConfig.bank_code ?? '',
        account_number: payoutConfig.account_number ?? '',
        account_name: payoutConfig.account_name ?? '',
        mobile_number: payoutConfig.mobile_number ?? '',
        mpesa_paybill: payoutConfig.mpesa_paybill ?? '',
      }));
    }
  }, [payoutConfig]);

  useEffect(() => {
    if (mpesaConfig) {
      setMpesaForm((f) => ({ ...f, shortcode: mpesaConfig.shortcode ?? '', initiator_name: mpesaConfig.initiator_name ?? '' }));
    }
  }, [mpesaConfig]);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Payment Gateways</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Activate gateways for your pay pages. The primary gateway is used by default; customers can choose any active gateway.
          </p>
        </div>
        {isSuperAdmin && (
          <Link href={`/${orgSlug}/platform`}>
            <Button className="gap-2 shadow-lg shadow-primary/20 w-full sm:w-auto">
              <Plus className="h-4 w-4" /> Platform config
            </Button>
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading gateways…
        </div>
      ) : error ? (
        <div className="text-sm text-destructive py-4">{error}</div>
      ) : gateways.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No gateways available. Platform admin can configure Paystack or M-Pesa in Platform Configuration.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Available gateways: toggleable cards */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold text-sm uppercase tracking-tight text-muted-foreground mb-4">Payment gateways</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Activate gateways to show them on your pay pages. Set one as primary — it will be the default option for customers.
              </p>
              <div className="flex flex-wrap gap-3">
                {gateways.map((gw) => {
                  const isActive = activeGatewayTypes.has(gw.gateway_type);
                  const isPrimary = primaryGateway?.gateway_type === gw.gateway_type;
                  const isPaystackGw = gw.gateway_type === 'paystack';
                  const isMpesaGw = gw.gateway_type?.startsWith('mpesa');
                  return (
                    <div
                      key={gw.gateway_type}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border-2 p-4 min-w-[220px] transition-all',
                        isActive
                          ? isPrimary
                            ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                            : 'border-green-500/50 bg-green-500/5'
                          : 'border-border hover:border-primary/30 opacity-75'
                      )}
                    >
                      <div className={cn(
                        'h-10 w-10 rounded-lg flex items-center justify-center',
                        isMpesaGw ? 'bg-green-500/10' : isPaystackGw ? 'bg-blue-500/10' : 'bg-purple-500/10'
                      )}>
                        {isMpesaGw ? <Smartphone className="h-5 w-5 text-muted-foreground" /> : <CreditCard className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{gw.name}</p>
                          {isPrimary && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase">
                              <Crown className="h-3 w-3" /> Primary
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">{gw.gateway_type}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isActive && !isPrimary && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[10px] h-7 px-2"
                            disabled={selectMutation.isPending}
                            onClick={() => {
                              selectMutation.mutate(gw.gateway_type, {
                                onSuccess: () => toast.success(`${gw.name} set as primary`),
                              });
                            }}
                            title="Set as primary gateway"
                          >
                            <Crown className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Button
                            size="sm"
                            disabled={selectMutation.isPending}
                            onClick={() => {
                              selectMutation.mutate(gw.gateway_type, {
                                onSuccess: () => toast.success(`${gw.name} activated`),
                              });
                            }}
                          >
                            {selectMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
                              <span className="flex items-center gap-1.5">
                                <Power className="h-3.5 w-3.5" /> Activate
                              </span>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {selected.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-3">
                  {selected.length} gateway{selected.length !== 1 ? 's' : ''} active. All active gateways will appear on your shared pay pages.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Gateway config tabs — shown when at least one gateway is active */}
          {(hasPaystack || hasMpesa) && (
            <Tabs defaultValue={hasPaystack ? 'paystack' : 'mpesa'}>
              <TabsList>
                {hasPaystack && (
                  <TabsTrigger value="paystack">
                    <CreditCard className="h-4 w-4 mr-1.5 inline" /> Paystack
                  </TabsTrigger>
                )}
                {hasMpesa && (
                  <TabsTrigger value="mpesa">
                    <Smartphone className="h-4 w-4 mr-1.5 inline" /> M-Pesa
                  </TabsTrigger>
                )}
              </TabsList>

              {hasPaystack && (
              <TabsContent value="paystack">
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-sm uppercase tracking-tight">Paystack payout configuration</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Payouts to you use the details below. Transaction costs are borne by you.
                </p>
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">Transaction cost borne by you</span>
                </div>
                {loadingPayout ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading payout config…
                  </div>
                ) : (
                  <>
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      upsertPayout.mutate(
                        {
                          recipient_type: payoutForm.recipient_type,
                          schedule_type: payoutForm.schedule_type,
                          schedule_day: payoutForm.schedule_day,
                          min_payout_amount: payoutForm.min_payout_amount || undefined,
                          bank_name: payoutForm.bank_name || undefined,
                          bank_code: payoutForm.bank_code || undefined,
                          account_number: payoutForm.account_number || undefined,
                          account_name: payoutForm.account_name || undefined,
                          mobile_number: payoutForm.mobile_number || undefined,
                          mpesa_paybill: payoutForm.mpesa_paybill || undefined,
                        },
                        {
                          onSuccess: () => toast.success('Payout config saved'),
                          onError: (err: any) => toast.error(err?.message || 'Failed to save'),
                        }
                      );
                    }}
                  >
                    {/* Recipient type */}
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Payout method</label>
                      <select
                        value={payoutForm.recipient_type}
                        onChange={(e) => {
                          setPayoutForm((f) => ({ ...f, recipient_type: e.target.value, bank_name: '', bank_code: '', account_number: '', account_name: '', mobile_number: '', mpesa_paybill: '' }));
                          setVerifiedName(null);
                          setVerifyError(null);
                        }}
                        className="w-full max-w-xs rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      >
                        {PAYSTACK_RECIPIENT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Bank recipient types: nuban, kepss, ghipss, basa */}
                    {BANK_RECIPIENT_TYPES.includes(payoutForm.recipient_type) && (
                      <>
                        {/* Currency selector for bank lookup */}
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Currency / Country</label>
                          <select
                            value={payoutCurrency}
                            onChange={(e) => {
                              setPayoutCurrency(e.target.value);
                              setPayoutForm((f) => ({ ...f, bank_name: '', bank_code: '' }));
                              setVerifiedName(null);
                              setVerifyError(null);
                            }}
                            className="w-full max-w-xs rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          >
                            {CURRENCY_OPTIONS.map((c) => (
                              <option key={c} value={c}>{c} ({currencyToCountry[c]})</option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Bank dropdown */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Bank {loadingBanks && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}
                            </label>
                            <select
                              value={payoutForm.bank_code}
                              onChange={(e) => {
                                const selectedBank = banks.find((b) => b.code === e.target.value);
                                setPayoutForm((f) => ({
                                  ...f,
                                  bank_code: e.target.value,
                                  bank_name: selectedBank?.name ?? '',
                                }));
                                setVerifiedName(null);
                                setVerifyError(null);
                              }}
                              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                              disabled={loadingBanks || banks.length === 0}
                            >
                              <option value="">-- Select bank --</option>
                              {banks.map((b) => (
                                <option key={b.code} value={b.code}>{b.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Bank name (auto-filled, read-only) */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Bank name</label>
                            <input
                              value={payoutForm.bank_name}
                              readOnly
                              className="w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm"
                            />
                          </div>

                          {/* Account number + verify button */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Account number</label>
                            <div className="flex gap-2">
                              <input
                                value={payoutForm.account_number}
                                onChange={(e) => {
                                  setPayoutForm((f) => ({ ...f, account_number: e.target.value }));
                                  setVerifiedName(null);
                                  setVerifyError(null);
                                }}
                                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                placeholder="e.g. 0123456789"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={!payoutForm.bank_code || !payoutForm.account_number || resolveAccountMutation.isPending}
                                onClick={() => {
                                  setVerifiedName(null);
                                  setVerifyError(null);
                                  resolveAccountMutation.mutate(
                                    { accountNumber: payoutForm.account_number, bankCode: payoutForm.bank_code },
                                    {
                                      onSuccess: (res: any) => {
                                        const name = res?.data?.account_name ?? res?.account_name ?? '';
                                        if (name) {
                                          setVerifiedName(name);
                                          setPayoutForm((f) => ({ ...f, account_name: name }));
                                        } else {
                                          setVerifyError('Could not resolve account name');
                                        }
                                      },
                                      onError: (err: any) => {
                                        setVerifyError(err?.response?.data?.message || err?.message || 'Verification failed');
                                      },
                                    }
                                  );
                                }}
                                className="shrink-0"
                              >
                                {resolveAccountMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Verify'}
                              </Button>
                            </div>
                            {verifiedName && (
                              <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle2 className="h-3.5 w-3.5" /> {verifiedName}
                              </p>
                            )}
                            {verifyError && (
                              <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                                <XCircle className="h-3.5 w-3.5" /> {verifyError}
                              </p>
                            )}
                          </div>

                          {/* Account name (auto-filled from verification) */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Account name</label>
                            <input
                              value={payoutForm.account_name}
                              onChange={(e) => setPayoutForm((f) => ({ ...f, account_name: e.target.value }))}
                              className={cn(
                                'w-full rounded-lg border border-input px-3 py-2 text-sm',
                                verifiedName ? 'bg-green-50 border-green-300 dark:bg-green-950/20 dark:border-green-800' : 'bg-background'
                              )}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Mobile money: mobile_number */}
                    {payoutForm.recipient_type === 'mobile_money' && (
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Mobile number</label>
                        <input
                          value={payoutForm.mobile_number}
                          onChange={(e) => setPayoutForm((f) => ({ ...f, mobile_number: e.target.value }))}
                          className="w-full max-w-xs rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          placeholder="e.g. +254712345678"
                        />
                      </div>
                    )}

                    {/* Mobile money business: account_number (paybill/till) */}
                    {payoutForm.recipient_type === 'mobile_money_business' && (
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Paybill / Till number</label>
                        <input
                          value={payoutForm.account_number}
                          onChange={(e) => setPayoutForm((f) => ({ ...f, account_number: e.target.value }))}
                          className="w-full max-w-xs rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          placeholder="e.g. 174379"
                        />
                      </div>
                    )}

                    {/* M-Pesa paybill */}
                    {payoutForm.recipient_type === 'mpesa_paybill' && (
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Paybill number</label>
                        <input
                          value={payoutForm.mpesa_paybill}
                          onChange={(e) => setPayoutForm((f) => ({ ...f, mpesa_paybill: e.target.value }))}
                          className="w-full max-w-xs rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                    )}

                    {/* Schedule */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Payout cycle</label>
                        <select
                          value={payoutForm.schedule_type}
                          onChange={(e) => setPayoutForm((f) => ({ ...f, schedule_type: e.target.value, schedule_day: 1 }))}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        >
                          {SCHEDULE_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Schedule day: only for weekly / monthly */}
                      {payoutForm.schedule_type === 'weekly' && (
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Day of week</label>
                          <select
                            value={payoutForm.schedule_day}
                            onChange={(e) => setPayoutForm((f) => ({ ...f, schedule_day: parseInt(e.target.value, 10) }))}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          >
                            {WEEKDAYS.map((day, idx) => (
                              <option key={day} value={idx + 1}>{day}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {payoutForm.schedule_type === 'monthly' && (
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Day of month</label>
                          <select
                            value={payoutForm.schedule_day}
                            onChange={(e) => setPayoutForm((f) => ({ ...f, schedule_day: parseInt(e.target.value, 10) }))}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          >
                            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Min. payout threshold (amount)</label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={payoutForm.min_payout_amount || ''}
                          onChange={(e) => setPayoutForm((f) => ({ ...f, min_payout_amount: parseFloat(e.target.value) || 0 }))}
                          placeholder="0"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <Button type="submit" disabled={upsertPayout.isPending} className="gap-2">
                      {upsertPayout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save payout config
                    </Button>
                  </form>

                  {/* Payout stats */}
                  {payoutConfig && (
                    <div className="mt-6 pt-4 border-t flex flex-wrap gap-3">
                      <div className="rounded-lg bg-muted px-3 py-2 text-center min-w-[120px]">
                        <p className="text-lg font-bold">{payoutConfig.total_payouts}</p>
                        <p className="text-[11px] text-muted-foreground">Total payouts</p>
                      </div>
                      <div className="rounded-lg bg-muted px-3 py-2 text-center min-w-[120px]">
                        <p className="text-lg font-bold">{parseFloat(payoutConfig.total_payout_amount || '0').toLocaleString()}</p>
                        <p className="text-[11px] text-muted-foreground">Total amount</p>
                      </div>
                      {payoutConfig.is_verified && (
                        <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-xs font-medium text-green-700 dark:text-green-400">Verified</span>
                        </div>
                      )}
                      <div className="rounded-lg bg-muted px-3 py-2 text-center min-w-[120px]">
                        <p className="text-xs font-medium">{payoutConfig.updated_at ? new Date(payoutConfig.updated_at).toLocaleDateString() : '--'}</p>
                        <p className="text-[11px] text-muted-foreground">Last updated</p>
                      </div>
                    </div>
                  )}
                  </>
                )}
              </CardContent>
            </Card>
              </TabsContent>
              )}

              {hasMpesa && (
              <TabsContent value="mpesa">
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-sm uppercase tracking-tight">M-Pesa tenant configuration</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Daraja credentials are managed at platform level. Configure your short code and initiator details here.
                </p>
                {loadingMpesa ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                  </div>
                ) : (
                  <form
                    className="space-y-4 max-w-md"
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateMpesa.mutate({
                        shortcode: mpesaForm.shortcode || undefined,
                        initiator_name: mpesaForm.initiator_name || undefined,
                        initiator_password: mpesaForm.initiator_password || undefined,
                      });
                    }}
                  >
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Short code</label>
                      <input
                        value={mpesaForm.shortcode}
                        onChange={(e) => setMpesaForm((f) => ({ ...f, shortcode: e.target.value }))}
                        placeholder="e.g. 174379"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Initiator name</label>
                      <input
                        value={mpesaForm.initiator_name}
                        onChange={(e) => setMpesaForm((f) => ({ ...f, initiator_name: e.target.value }))}
                        placeholder="Initiator name"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Initiator password</label>
                      <input
                        type="password"
                        value={mpesaForm.initiator_password}
                        onChange={(e) => setMpesaForm((f) => ({ ...f, initiator_password: e.target.value }))}
                        placeholder="Leave blank to keep current"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        autoComplete="new-password"
                      />
                    </div>
                    <Button type="submit" disabled={updateMpesa.isPending} className="gap-2">
                      {updateMpesa.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save M-Pesa config
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
              </TabsContent>
              )}
            </Tabs>
          )}

          {selected.length > 0 && !hasPaystack && !hasMpesa && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-semibold">Connected via Treasury</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  All payments for this tenant route through treasury. No extra tenant config for these gateways.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
