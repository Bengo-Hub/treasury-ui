'use client';

import { Badge, Button } from '@/components/ui/base';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Select } from '@/components/ui/input';
import { SettingsSection } from '@/components/ui/settings-section';
import { payheroApi, type PayHeroStatus } from '@/lib/api/payhero';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Loader2, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { errMessage, payheroKey } from './use-payhero';

const CHECKS = [
  { value: 'national_id_ke', label: 'National ID (Kenya)', hint: 'id_number=12345678' },
  { value: 'kra_pin', label: 'KRA PIN', hint: 'kra_pin=P051234567X' },
  { value: 'phone', label: 'Phone number', hint: 'phone=0712345678' },
  { value: 'bank_account_ke', label: 'Bank account (Kenya)', hint: 'bank_code=01\naccount_number=1234567890' },
];

const TIERS = [
  { tier: 2, text: 'National ID or a verified phone' },
  { tier: 3, text: 'National ID and a company KRA PIN; needed to hold money in your wallet (escrow)' },
  { tier: 4, text: 'Manual review by PayHero' },
];

/** Team verification: billed checks (price confirmed first), KYC submission and the tier. */
export function VerificationSection({ tenantSlug, st }: { tenantSlug: string; st: PayHeroStatus }) {
  const qc = useQueryClient();
  const onSaved = (d: PayHeroStatus) => qc.setQueryData(payheroKey(tenantSlug), d);
  const [check, setCheck] = useState(CHECKS[0].value);
  const [fields, setFields] = useState('');
  const [confirmPrice, setConfirmPrice] = useState(false);
  const pricing = useQuery({ queryKey: ['payhero-kyc-pricing', tenantSlug], queryFn: () => payheroApi.kycPricing(tenantSlug) });
  const refresh = useMutation({ mutationFn: () => payheroApi.refreshKYC(tenantSlug), onSuccess: onSaved });
  const verify = useMutation({
    mutationFn: () => {
      const parsed: Record<string, string> = {};
      fields.split('\n').forEach((line) => {
        const [k, ...rest] = line.split('=');
        if (k?.trim() && rest.length) parsed[k.trim()] = rest.join('=').trim();
      });
      return payheroApi.verify(tenantSlug, check, parsed, true);
    },
    onSuccess: (v) => { toast.success(`${v.check}: ${v.status}${v.subject_name ? ` (${v.subject_name})` : ''}`); setFields(''); setConfirmPrice(false); refresh.mutate(); },
    onError: (e: any) => toast.error(errMessage(e, 'Verification failed')),
  });
  const submit = useMutation({
    mutationFn: () => payheroApi.submitKYC(tenantSlug, { entity_type: 'company' }),
    onSuccess: (d) => { onSaved(d); toast.success('KYC submitted'); },
    onError: (e: any) => toast.error(errMessage(e, 'Could not submit KYC')),
  });
  const priceOf = (pricing.data as any)?.[check] ?? (pricing.data as any)?.pricing?.[check];
  const tier = st.team.kyc_tier ?? 0;
  const chosen = CHECKS.find((c) => c.value === check);

  return (
    <SettingsSection
      icon={<ShieldCheck className="h-4 w-4" />}
      title="Verification"
      description="Each check is billed by PayHero; the price is shown before it runs."
      action={
        <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
          {refresh.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh tier
        </Button>
      }
    >
      <div className="space-y-6">
        <ol className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {TIERS.map((t) => (
            <li key={t.tier} className={`rounded-xl border p-3 ${tier >= t.tier ? 'border-green-500/30 bg-green-500/10' : 'border-border'}`}>
              <p className="text-sm font-semibold">Tier {t.tier} {tier >= t.tier && <BadgeCheck className="inline h-4 w-4 text-green-600" />}</p>
              <p className="text-xs text-muted-foreground">{t.text}</p>
            </li>
          ))}
        </ol>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_2fr]">
          <label className="space-y-1">
            <span className="text-xs font-medium">Check</span>
            <Select value={check} onChange={(e) => setCheck(e.target.value)}>
              {CHECKS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium">Details, one field=value per line</span>
            <textarea
              className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              placeholder={chosen?.hint}
              value={fields}
              onChange={(e) => setFields(e.target.value)}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => setConfirmPrice(true)} disabled={!fields.trim() || verify.isPending}>
            {verify.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />} Run check
          </Button>
          <Button className="gap-1.5" onClick={() => submit.mutate()} disabled={submit.isPending || !st.verifications.some((v) => v.status === 'verified')}>
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit for KYC
          </Button>
        </div>

        {st.verifications.length > 0 && (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {st.verifications.map((v) => (
              <li key={v.check} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
                <span className="font-medium">{CHECKS.find((c) => c.value === v.check)?.label ?? v.check}</span>
                <span className="flex-1 text-muted-foreground">{v.subject_name}</span>
                <Badge variant={v.status === 'verified' ? 'success' : 'warning'}>{v.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ConfirmDialog open={confirmPrice} onOpenChange={setConfirmPrice} title="Run a billed check?"
        description={`PayHero charges for each ${chosen?.label ?? check} check${priceOf ? `: ${typeof priceOf === 'object' ? JSON.stringify(priceOf) : priceOf}` : ''}.`}
        confirmLabel="Run and pay" isPending={verify.isPending} onConfirm={() => verify.mutate()} />
    </SettingsSection>
  );
}
