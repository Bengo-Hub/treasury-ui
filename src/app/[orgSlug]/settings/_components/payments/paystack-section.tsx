'use client';

import { StatCard } from '@/components/charts/StatCard';
import { Badge, Button } from '@/components/ui/base';
import { Input, Select } from '@/components/ui/input';
import { SettingsSection } from '@/components/ui/settings-section';
import { useBanks, useResolveAccount, useTenantPayoutConfig, useUpsertTenantPayoutConfig } from '@/hooks/use-gateways';
import type { PayoutConfigResponse } from '@/lib/api/gateways';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import { AlertCircle, Banknote, CalendarClock, CheckCircle2, Loader2, Save, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PaystackAccountCard, useTenantPaystackConfig } from '../paystack-account-card';

const RECIPIENT_TYPES = [
  { value: 'kepss', label: 'Bank account (Kenya)', currency: 'KES', bank: true },
  { value: 'nuban', label: 'Bank account (Nigeria)', currency: 'NGN', bank: true },
  { value: 'ghipss', label: 'Bank account (Ghana)', currency: 'GHS', bank: true },
  { value: 'basa', label: 'Bank account (South Africa)', currency: 'ZAR', bank: true },
  { value: 'mobile_money', label: 'Mobile money', currency: 'KES', bank: false },
  { value: 'mobile_money_business', label: 'Paybill or till', currency: 'KES', bank: false },
  { value: 'mpesa_paybill', label: 'M-Pesa paybill', currency: 'KES', bank: false },
] as const;

const COUNTRY_BY_CURRENCY: Record<string, string> = { KES: 'kenya', NGN: 'nigeria', GHS: 'ghana', ZAR: 'south-africa' };
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SCHEDULES = [
  { value: 'instant', label: 'Instant' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

type PayoutForm = {
  recipient_type: string; schedule_type: string; schedule_day: number; min_payout_amount: number;
  bank_name: string; bank_code: string; account_number: string; account_name: string; mobile_number: string; mpesa_paybill: string;
};

const fromConfig = (c?: PayoutConfigResponse | null): PayoutForm => ({
  recipient_type: c?.recipient_type || 'kepss',
  schedule_type: c?.schedule_type || 'weekly',
  schedule_day: c?.schedule_day || 1,
  min_payout_amount: c?.min_payout_amount ? parseFloat(c.min_payout_amount) : 0,
  bank_name: c?.bank_name ?? '',
  bank_code: c?.bank_code ?? '',
  account_number: c?.account_number ?? '',
  account_name: c?.account_name ?? '',
  mobile_number: c?.mobile_number ?? '',
  mpesa_paybill: c?.mpesa_paybill ?? '',
});

/** Paystack: the tenant's own account (optional) and, when paid by the platform, its payout destination. */
export function PaystackSection({ tenantSlug }: { tenantSlug: string }) {
  const { data: paystackConfig } = useTenantPaystackConfig(tenantSlug, true);
  const ownPaystack = !!paystackConfig?.own_account;
  return (
    <div className="space-y-6">
      <PaystackAccountCard tenantSlug={tenantSlug} />
      {!ownPaystack && <PayoutDestination tenantSlug={tenantSlug} />}
    </div>
  );
}

function PayoutDestination({ tenantSlug }: { tenantSlug: string }) {
  const { data: config, isLoading } = useTenantPayoutConfig(tenantSlug, true);
  const upsert = useUpsertTenantPayoutConfig(tenantSlug);
  const resolve = useResolveAccount(tenantSlug);
  // Stored destination until edited (draft), then the draft.
  const [draft, setDraft] = useState<PayoutForm | null>(null);
  const form = draft ?? fromConfig(config);
  const set = (patch: Partial<PayoutForm>) => setDraft({ ...form, ...patch });
  const kind = RECIPIENT_TYPES.find((t) => t.value === form.recipient_type) ?? RECIPIENT_TYPES[0];
  const { data: banksData, isLoading: loadingBanks } = useBanks(tenantSlug, kind.bank ? COUNTRY_BY_CURRENCY[kind.currency] : '');
  const banks: { name: string; code: string }[] = (banksData as any)?.data ?? (banksData as any)?.banks ?? [];
  const [verified, setVerified] = useState<{ name?: string; error?: string }>({});

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    upsert.mutate(
      {
        recipient_type: form.recipient_type,
        schedule_type: form.schedule_type,
        schedule_day: form.schedule_day,
        min_payout_amount: form.min_payout_amount || undefined,
        bank_name: form.bank_name || undefined,
        bank_code: form.bank_code || undefined,
        account_number: form.account_number || undefined,
        account_name: form.account_name || undefined,
        mobile_number: form.mobile_number || undefined,
        mpesa_paybill: form.mpesa_paybill || undefined,
      },
      {
        onSuccess: () => { setDraft(null); toast.success('Payout destination saved. The platform verifies it before the first payout.'); },
        onError: (err: any) => toast.error(err?.response?.data?.error || err?.message || 'Could not save'),
      },
    );
  };

  const verifyAccount = () => {
    setVerified({});
    resolve.mutate(
      { accountNumber: form.account_number, bankCode: form.bank_code },
      {
        onSuccess: (res: any) => {
          const name = res?.data?.account_name ?? res?.account_name ?? '';
          if (name) { setVerified({ name }); set({ account_name: name }); } else setVerified({ error: 'Could not find the account name' });
        },
        onError: (err: any) => setVerified({ error: err?.response?.data?.message || err?.message || 'Verification failed' }),
      },
    );
  };

  return (
    <SettingsSection
      icon={<Banknote className="h-4 w-4" />}
      title="Payout destination"
      description="Where the platform pays out what it collects for you. Transfer costs are yours."
      action={config ? (
        <>
          <Badge variant={config.is_verified ? 'success' : 'warning'}>{config.is_verified ? 'Verified' : 'Awaiting verification'}</Badge>
          {config.subaccount_provisioned && <Badge>Split at collection</Badge>}
        </>
      ) : undefined}
    >
      {isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : (
        <div className="space-y-6">
          {config && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard label="Payouts made" value={config.total_payouts} />
              <StatCard label="Paid out" value={formatCurrency(parseFloat(config.total_payout_amount || '0'), kind.currency)} />
              <StatCard label="Last changed" value={config.updated_at ? new Date(config.updated_at).toLocaleDateString() : 'Never'} icon={<CalendarClock className="h-4 w-4" />} />
            </div>
          )}
          {config?.subaccount_provisioned && (
            <p className="flex items-start gap-2 rounded-xl bg-primary/5 p-3 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Your share of each card payment settles straight to your bank at collection (Paystack subaccount).
            </p>
          )}

          <form className="space-y-5" onSubmit={save}>
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pay me to</legend>
              <div className="flex flex-wrap gap-2">
                {RECIPIENT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    aria-pressed={form.recipient_type === t.value}
                    onClick={() => { setVerified({}); set({ recipient_type: t.value, bank_name: '', bank_code: '', account_number: '', account_name: '', mobile_number: '', mpesa_paybill: '' }); }}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      form.recipient_type === t.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-accent',
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {kind.bank && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-medium">Bank {loadingBanks && <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />}</span>
                  <Select
                    value={form.bank_code}
                    disabled={loadingBanks || banks.length === 0}
                    onChange={(e) => { setVerified({}); set({ bank_code: e.target.value, bank_name: banks.find((b) => b.code === e.target.value)?.name ?? '' }); }}
                  >
                    <option value="">Choose a bank</option>
                    {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
                  </Select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium">Account number</span>
                  <div className="flex gap-2">
                    <Input value={form.account_number} inputMode="numeric" onChange={(e) => { setVerified({}); set({ account_number: e.target.value }); }} />
                    <Button type="button" variant="outline" onClick={verifyAccount} disabled={!form.bank_code || !form.account_number || resolve.isPending}>
                      {resolve.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check'}
                    </Button>
                  </div>
                  {verified.name && <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3.5 w-3.5" /> {verified.name}</span>}
                  {verified.error && <span className="flex items-center gap-1 text-xs text-destructive"><XCircle className="h-3.5 w-3.5" /> {verified.error}</span>}
                </label>
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-xs font-medium">Account name</span>
                  <Input value={form.account_name} onChange={(e) => set({ account_name: e.target.value })} />
                </label>
              </div>
            )}
            {form.recipient_type === 'mobile_money' && (
              <label className="block max-w-sm space-y-1">
                <span className="text-xs font-medium">Mobile number</span>
                <Input type="tel" value={form.mobile_number} onChange={(e) => set({ mobile_number: e.target.value })} placeholder="+254712345678" />
              </label>
            )}
            {form.recipient_type === 'mobile_money_business' && (
              <label className="block max-w-sm space-y-1">
                <span className="text-xs font-medium">Paybill or till number</span>
                <Input inputMode="numeric" value={form.account_number} onChange={(e) => set({ account_number: e.target.value })} />
              </label>
            )}
            {form.recipient_type === 'mpesa_paybill' && (
              <label className="block max-w-sm space-y-1">
                <span className="text-xs font-medium">Paybill number</span>
                <Input inputMode="numeric" value={form.mpesa_paybill} onChange={(e) => set({ mpesa_paybill: e.target.value })} />
              </label>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="space-y-1">
                <span className="text-xs font-medium">Payout cycle</span>
                <Select value={form.schedule_type} onChange={(e) => set({ schedule_type: e.target.value, schedule_day: 1 })}>
                  {SCHEDULES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </label>
              {form.schedule_type === 'weekly' && (
                <label className="space-y-1">
                  <span className="text-xs font-medium">Day of week</span>
                  <Select value={form.schedule_day} onChange={(e) => set({ schedule_day: parseInt(e.target.value, 10) })}>
                    {WEEKDAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
                  </Select>
                </label>
              )}
              {form.schedule_type === 'monthly' && (
                <label className="space-y-1">
                  <span className="text-xs font-medium">Day of month</span>
                  <Select value={form.schedule_day} onChange={(e) => set({ schedule_day: parseInt(e.target.value, 10) })}>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                  </Select>
                </label>
              )}
              <label className="space-y-1">
                <span className="text-xs font-medium">Minimum payout</span>
                <Input type="number" min={10} step={1} value={form.min_payout_amount || ''} onChange={(e) => set({ min_payout_amount: parseFloat(e.target.value) || 0 })} placeholder="500" />
                <span className="block text-[11px] text-muted-foreground">Paystack sends at least KES 10; a higher minimum batches small amounts.</span>
              </label>
            </div>

            {draft && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground"><AlertCircle className="h-3.5 w-3.5" /> Changing where you are paid resets the platform&apos;s verification.</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" className="gap-1.5" disabled={upsert.isPending || !draft}>
                {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save destination
              </Button>
              {draft && <Button type="button" variant="ghost" onClick={() => { setDraft(null); setVerified({}); }}>Discard</Button>}
            </div>
          </form>
        </div>
      )}
    </SettingsSection>
  );
}
