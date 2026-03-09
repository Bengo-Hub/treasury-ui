'use client';

import { Badge, Button, Card, CardContent } from '@/components/ui/base';
import {
  useTenantGateways,
  useTenantPayoutConfig,
  useTenantSelectedGateways,
  useSelectTenantGateway,
  useUpsertTenantPayoutConfig,
} from '@/hooks/use-gateways';
import { useMe } from '@/hooks/useMe';
import { getTenantMpesaConfig, updateTenantMpesaConfig, type UpdateTenantMpesaConfigRequest } from '@/lib/api/revenue';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  CreditCard,
  ExternalLink,
  Loader2,
  Plus,
  Save,
  Smartphone,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const PAYSTACK_RECIPIENT_TYPES = [
  { value: 'nuban', label: 'Bank (NUBAN)' },
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'mpesa_till', label: 'M-Pesa Till' },
  { value: 'mpesa_paybill', label: 'M-Pesa Paybill' },
] as const;

const SCHEDULE_TYPES = [
  { value: 'instant', label: 'Instant' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
] as const;

export default function GatewaysPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const { data: gateways = [], isLoading: loading, error: queryError } = useTenantGateways(orgSlug);
  const { data: selectedData } = useTenantSelectedGateways(orgSlug);
  const selected = selectedData?.selected ?? [];
  const selectedGateway = selected[0]; // primary
  const isPaystack = selectedGateway?.gateway_type === 'paystack';
  const isMpesa = selectedGateway?.gateway_type?.startsWith('mpesa');

  const { data: user } = useMe();
  const isSuperAdmin = user?.roles?.includes('super_admin');
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load gateways') : null;

  const selectMutation = useSelectTenantGateway(orgSlug);
  const { data: payoutConfig, isLoading: loadingPayout } = useTenantPayoutConfig(orgSlug, isPaystack);
  const upsertPayout = useUpsertTenantPayoutConfig(orgSlug);

  const { data: mpesaConfig, isLoading: loadingMpesa } = useQuery({
    queryKey: ['mpesa-config', orgSlug],
    queryFn: () => getTenantMpesaConfig(orgSlug),
    enabled: !!orgSlug && isMpesa,
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
            Select your preferred gateway. Configure payout (Paystack) or short code (M-Pesa) below.
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
          {/* Available gateways: select one */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold text-sm uppercase tracking-tight text-muted-foreground mb-4">Preferred gateway</h3>
              <div className="flex flex-wrap gap-3">
                {gateways.map((gw) => {
                  const isSelected = selectedGateway?.gateway_type === gw.gateway_type;
                  const isPaystackGw = gw.gateway_type === 'paystack';
                  const isMpesaGw = gw.gateway_type?.startsWith('mpesa');
                  return (
                    <div
                      key={gw.gateway_type}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border-2 p-4 min-w-[200px]',
                        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                      )}
                    >
                      <div className={cn(
                        'h-10 w-10 rounded-lg flex items-center justify-center',
                        isMpesaGw ? 'bg-green-500/10' : isPaystackGw ? 'bg-blue-500/10' : 'bg-purple-500/10'
                      )}>
                        {isMpesaGw ? <Smartphone className="h-5 w-5 text-muted-foreground" /> : <CreditCard className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{gw.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{gw.gateway_type}</p>
                      </div>
                      {isSelected ? (
                        <Badge variant="success">Selected</Badge>
                      ) : (
                        <Button
                          size="sm"
                          disabled={selectMutation.isPending}
                          onClick={() => selectMutation.mutate(gw.gateway_type)}
                        >
                          {selectMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Select'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Paystack: payout config */}
          {isPaystack && selectedGateway && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-sm uppercase tracking-tight">Paystack payout configuration</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Money-in goes to the platform Paystack account; payouts to you use the details below. Transaction costs are borne by you.
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
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Payout method</label>
                      <select
                        value={payoutForm.recipient_type}
                        onChange={(e) => setPayoutForm((f) => ({ ...f, recipient_type: e.target.value }))}
                        className="w-full max-w-xs rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      >
                        {PAYSTACK_RECIPIENT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    {(payoutForm.recipient_type === 'nuban') && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Bank name</label>
                          <input
                            value={payoutForm.bank_name}
                            onChange={(e) => setPayoutForm((f) => ({ ...f, bank_name: e.target.value }))}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Bank code</label>
                          <input
                            value={payoutForm.bank_code}
                            onChange={(e) => setPayoutForm((f) => ({ ...f, bank_code: e.target.value }))}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Account number</label>
                          <input
                            value={payoutForm.account_number}
                            onChange={(e) => setPayoutForm((f) => ({ ...f, account_number: e.target.value }))}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Account name</label>
                          <input
                            value={payoutForm.account_name}
                            onChange={(e) => setPayoutForm((f) => ({ ...f, account_name: e.target.value }))}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                    )}
                    {(payoutForm.recipient_type === 'mobile_money' || payoutForm.recipient_type === 'mpesa_till') && (
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Mobile number</label>
                        <input
                          value={payoutForm.mobile_number}
                          onChange={(e) => setPayoutForm((f) => ({ ...f, mobile_number: e.target.value }))}
                          className="w-full max-w-xs rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                    )}
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Payout cycle</label>
                        <select
                          value={payoutForm.schedule_type}
                          onChange={(e) => setPayoutForm((f) => ({ ...f, schedule_type: e.target.value }))}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        >
                          {SCHEDULE_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Schedule day</label>
                        <input
                          type="number"
                          min={1}
                          max={28}
                          value={payoutForm.schedule_day}
                          onChange={(e) => setPayoutForm((f) => ({ ...f, schedule_day: parseInt(e.target.value, 10) || 1 }))}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
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
                )}
              </CardContent>
            </Card>
          )}

          {/* M-Pesa: short code & initiator */}
          {isMpesa && selectedGateway && (
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
          )}

          {selectedGateway && !isPaystack && !isMpesa && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-semibold">Connected via Treasury</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  All payments for this tenant route through treasury. No extra tenant config for this gateway.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
