'use client';

import { Badge, Button } from '@/components/ui/base';
import { SettingsSection } from '@/components/ui/settings-section';
import { payheroApi, type PayHeroStatus } from '@/lib/api/payhero';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, ExternalLink, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { errMessage, payheroKey } from './use-payhero';

/** PayHero's own tiers and what each unlocks (PayHero dashboard, Management, Verification). */
const TIERS = [
  { tier: 1, name: 'Personal', text: 'Wallet, send money and payouts; KES 30,000 a day' },
  { tier: 2, name: 'Business Lite', text: 'Payments wallet and reports; KES 200,000 a day' },
  { tier: 3, name: 'Company', text: 'Unlimited, full access and API keys; needed to hold money for others (escrow)' },
  { tier: 4, name: 'Cross-border', text: 'International transfers and multi-country access' },
];

const PAYHERO_DASHBOARD = 'https://b2b.payhero.africa/dashboard';

/**
 * Team verification, read only: verification is done on the PayHero dashboard (the Team,
 * Management, Verification); treasury pulls the tier and status so escrow and limits follow it.
 */
export function VerificationSection({ tenantSlug, st }: { tenantSlug: string; st: PayHeroStatus }) {
  const qc = useQueryClient();
  const refresh = useMutation({
    mutationFn: () => payheroApi.refreshKYC(tenantSlug),
    onSuccess: (d: PayHeroStatus) => { qc.setQueryData(payheroKey(tenantSlug), d); toast.success('Tier refreshed from PayHero'); },
    onError: (e: any) => toast.error(errMessage(e, 'Could not read the tier from PayHero')),
  });
  const tier = st.team.kyc_tier ?? 0;

  return (
    <SettingsSection
      icon={<ShieldCheck className="h-4 w-4" />}
      title="Verification"
      description="Done on the PayHero dashboard; the tier shown here is read from PayHero."
      action={
        <div className="flex items-center gap-2">
          {st.team.kyc_status && <Badge variant={st.team.kyc_verified ? 'success' : 'warning'}>{st.team.kyc_status}</Badge>}
          <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
            {refresh.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh tier
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <ol className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          {TIERS.map((t) => (
            <li key={t.tier} className={`rounded-xl border p-3 ${tier >= t.tier ? 'border-green-500/30 bg-green-500/10' : 'border-border'}`}>
              <p className="text-sm font-semibold">
                Tier {t.tier}, {t.name} {tier >= t.tier && <BadgeCheck className="inline h-4 w-4 text-green-600" />}
              </p>
              <p className="text-xs text-muted-foreground">{t.text}</p>
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted-foreground">
          To verify or upgrade, open the PayHero dashboard, switch to this Team and go to Management, Verification.
          {st.team.kyc_synced_at && <> Last read {new Date(st.team.kyc_synced_at).toLocaleString()}.</>}
        </p>
        <a href={PAYHERO_DASHBOARD} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          Open the PayHero dashboard <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </SettingsSection>
  );
}
