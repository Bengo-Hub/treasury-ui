'use client';

import { StatCard } from '@/components/charts/StatCard';
import { CapsuleTabs, CapsuleTabsContent, CapsuleTabsList, CapsuleTabsTrigger } from '@/components/ui/capsule-tabs';
import { payheroApi } from '@/lib/api/payhero';
import { formatCurrency } from '@/lib/utils/currency';
import { useQuery } from '@tanstack/react-query';
import { Landmark, Link2, Route, Settings2, ShieldCheck, Wallet } from 'lucide-react';
import { useState } from 'react';
import { ChannelsSection } from './channels-section';
import { LinksSection } from './links-section';
import { SetupSection } from './setup-section';
import { modeLabel, usePayHeroStatus } from './use-payhero';
import { VerificationSection } from './verification-section';

/**
 * A tenant's PayHero: a summary (mode, channels, wallets), then sections for the account, channels
 * and routing, payment links and verification. Sections that need an enabled account stay hidden
 * until it is enabled.
 */
export function PayHeroTab({ tenantSlug }: { tenantSlug: string }) {
  const { data: st, isLoading } = usePayHeroStatus(tenantSlug);
  const [section, setSection] = useState('setup');
  const hasAccount = (st?.vendor_id ?? 0) > 0;
  const balance = useQuery({
    queryKey: ['payhero-balance', tenantSlug],
    queryFn: () => payheroApi.balance(tenantSlug),
    enabled: !!st?.enabled && hasAccount && st.mode !== 'platform_root',
    retry: false,
  });

  if (isLoading) {
    return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}</div>;
  }
  if (!st?.enabled) {
    return <SetupSection tenantSlug={tenantSlug} st={st} />;
  }
  const activeChannels = st.channels.filter((c) => c.is_active && c.enabled).length;
  const cur = balance.data?.currency || 'KES';
  const walletValue = st.mode === 'platform_root' ? 'Shared account' : balance.isError ? 'Unavailable' : formatCurrency(Number(balance.data?.balance ?? 0), cur);
  const canRoute = hasAccount || st.mode !== 'platform_team';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Account" value={modeLabel(st.mode)} hint={st.team.name || undefined} icon={<Settings2 className="h-4 w-4" />} tone="primary" />
        <StatCard label="Channels in use" value={`${activeChannels} of ${st.channels.length}`} icon={<Landmark className="h-4 w-4" />} tone={activeChannels > 0 ? 'success' : 'warning'} />
        <StatCard label="Payments wallet" value={walletValue} loading={balance.isLoading && balance.fetchStatus !== 'idle'} icon={<Wallet className="h-4 w-4" />}
          hint={balance.data?.service_balance !== undefined ? `Service wallet ${formatCurrency(Number(balance.data.service_balance), cur)}` : undefined} />
        <StatCard label="KYC tier" value={st.mode === 'platform_team' ? (st.team.kyc_tier ?? 0) : 'Not needed'} icon={<ShieldCheck className="h-4 w-4" />}
          tone={(st.team.kyc_tier ?? 0) >= 3 ? 'success' : 'default'} hint={st.mode === 'platform_team' ? 'Tier 3 unlocks escrow' : undefined} />
      </div>

      <CapsuleTabs value={section} onValueChange={setSection}>
        <CapsuleTabsList>
          <CapsuleTabsTrigger value="setup"><Settings2 className="h-4 w-4" /> Account</CapsuleTabsTrigger>
          <CapsuleTabsTrigger value="channels" disabled={!canRoute}><Route className="h-4 w-4" /> Channels and routing</CapsuleTabsTrigger>
          <CapsuleTabsTrigger value="links"><Link2 className="h-4 w-4" /> Payment links</CapsuleTabsTrigger>
          {st.mode === 'platform_team' && hasAccount && (
            <CapsuleTabsTrigger value="verification"><ShieldCheck className="h-4 w-4" /> Verification</CapsuleTabsTrigger>
          )}
        </CapsuleTabsList>
        <CapsuleTabsContent value="setup" className="mt-4"><SetupSection tenantSlug={tenantSlug} st={st} /></CapsuleTabsContent>
        <CapsuleTabsContent value="channels" className="mt-4"><ChannelsSection tenantSlug={tenantSlug} st={st} /></CapsuleTabsContent>
        <CapsuleTabsContent value="links" className="mt-4"><LinksSection tenantSlug={tenantSlug} links={st.payment_links} /></CapsuleTabsContent>
        <CapsuleTabsContent value="verification" className="mt-4"><VerificationSection tenantSlug={tenantSlug} st={st} /></CapsuleTabsContent>
      </CapsuleTabs>
    </div>
  );
}
