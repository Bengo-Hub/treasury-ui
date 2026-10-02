'use client';

import { StatCard } from '@/components/charts/StatCard';
import { Button, Card, CardContent } from '@/components/ui/base';
import { CapsuleTabs, CapsuleTabsContent, CapsuleTabsList, CapsuleTabsTrigger } from '@/components/ui/capsule-tabs';
import { PayHeroPlatformPanel } from '@/components/platform/payhero-platform-panel';
import {
  useCreatePlatformGateway,
  usePlatformGateways,
  useTestPlatformGateway,
  useUpdatePlatformGateway,
} from '@/hooks/use-gateways';
import { apiClient } from '@/lib/api/client';
import { fetchLiveForexRates } from '@/lib/api/currencies';
import type { GatewayConfig } from '@/lib/api/gateways';
import { payheroApi } from '@/lib/api/payhero';
import { useQuery } from '@tanstack/react-query';
import { Building2, CreditCard, Globe, Loader2, Plus, Star, Wallet } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { GatewayCard, type GatewayCheckResult } from './gateway-card';
import { gatewayKind, isMpesaType } from '@/components/payments/gateway-catalog';
import { GatewayCredentialsDialog } from './gateway-credentials-dialog';

const errMessage = (e: any, fallback: string) => e?.response?.data?.error || e?.response?.data?.message || e?.message || fallback;

/**
 * Platform > System Gateways: a summary, then three sections. Payment gateways (one card each),
 * PayHero (organization, tenant setups, escrow) and Integrations (non-payment keys such as forex).
 */
export function GatewaysTab() {
  const { data, isLoading, error, refetch } = usePlatformGateways(true);
  const gateways = data?.gateways ?? [];
  const payments = gateways.filter((g) => !gatewayKind(g.gateway_type).integration);
  const integrations = gateways.filter((g) => gatewayKind(g.gateway_type).integration);
  const live = payments.filter((g) => g.is_active && g.status === 'active').length;
  const primary = payments.find((g) => g.is_primary);
  const hasPayHero = gateways.some((g) => g.gateway_type === 'payhero');

  // Same query keys as the PayHero panel, so both share one cache entry.
  const phSettings = useQuery({ queryKey: ['payhero-platform-settings'], queryFn: () => payheroApi.platformSettings(), enabled: hasPayHero, retry: false });
  const phTeams = useQuery({ queryKey: ['payhero-teams', false], queryFn: () => payheroApi.teams(false), enabled: hasPayHero, retry: false });

  const test = useTestPlatformGateway();
  const create = useCreatePlatformGateway();
  const update = useUpdatePlatformGateway();
  const [section, setSection] = useState('gateways');
  const [dialog, setDialog] = useState<{ edit?: GatewayConfig } | null>(null);
  const [checking, setChecking] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, GatewayCheckResult>>({});
  const [registering, setRegistering] = useState<string | null>(null);

  const check = async (gw: GatewayConfig) => {
    setChecking(gw.id);
    try {
      if (gw.gateway_type === 'forex_provider') {
        const r = await fetchLiveForexRates();
        setResults((p) => ({ ...p, [gw.id]: { success: r.success, message: r.success ? `${r.rates_upserted ?? 0} rates fetched` : r.error || 'Fetch failed' } }));
      } else {
        const r = await test.mutateAsync(gw.id);
        setResults((p) => ({
          ...p,
          [gw.id]: r.success
            ? {
                success: true,
                message: 'Connected',
                capabilities: [
                  ...(r.supports_stk !== undefined ? [{ label: 'Phone prompts', on: !!r.supports_stk }] : []),
                  ...(r.supports_refund !== undefined ? [{ label: 'Refunds', on: !!r.supports_refund }] : []),
                ],
              }
            : { success: false, message: r.error || 'Connection failed' },
        }));
        refetch();
      }
    } catch (e) {
      setResults((p) => ({ ...p, [gw.id]: { success: false, message: errMessage(e, 'Connection failed') } }));
    } finally {
      setChecking(null);
    }
  };

  const registerC2B = async (gw: GatewayConfig) => {
    setRegistering(gw.id);
    try {
      await apiClient.post(`/api/v1/platform/gateways/${gw.id}/register-c2b`, {});
      toast.success('C2B URLs registered with Safaricom');
    } catch (e) {
      toast.error(errMessage(e, 'C2B registration failed'));
    } finally {
      setRegistering(null);
    }
  };

  const saveUrl = async (gw: GatewayConfig, field: 'webhook_url' | 'callback_url', url: string) => {
    try {
      await update.mutateAsync({ id: gw.id, body: { [field]: url } });
      toast.success('URL updated');
      refetch();
    } catch (e) {
      toast.error(errMessage(e, 'Could not update the URL'));
    }
  };

  const submitDialog = async (type: string, name: string, credentials: Record<string, string>) => {
    try {
      if (dialog?.edit) {
        await update.mutateAsync({ id: dialog.edit.id, body: { name, ...(Object.keys(credentials).length ? { credentials } : {}) } });
        toast.success('Gateway saved');
      } else {
        await create.mutateAsync({ gateway_type: type, name, credentials });
        toast.success(`${gatewayKind(type).label} added. Run a connection test to make it live.`);
      }
      setDialog(null);
      refetch();
    } catch (e) {
      toast.error(errMessage(e, 'Could not save the gateway'));
    }
  };

  const cards = (list: GatewayConfig[]) => (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {list.map((gw) => (
        <GatewayCard
          key={gw.id}
          gw={gw}
          checking={checking === gw.id}
          result={results[gw.id]}
          registeringC2B={registering === gw.id}
          onCheck={() => check(gw)}
          onEditCredentials={() => setDialog({ edit: gw })}
          onRegisterC2B={isMpesaType(gw.gateway_type) ? () => registerC2B(gw) : undefined}
          onSaveUrl={(field, url) => saveUrl(gw, field, url)}
        />
      ))}
    </div>
  );

  const empty = (text: string) => (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><CreditCard className="h-6 w-6" /></span>
        <p className="max-w-sm text-sm text-muted-foreground">{text}</p>
        <Button size="sm" className="gap-1.5" onClick={() => setDialog({})}><Plus className="h-4 w-4" /> Activate a gateway</Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Payment gateways</h2>
          <p className="text-sm text-muted-foreground">Accounts the platform collects and pays out with. Tenants connect their own on their Settings page.</p>
        </div>
        <Button className="gap-1.5 self-start sm:self-auto" onClick={() => setDialog({})}>
          <Plus className="h-4 w-4" /> Activate gateway
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Live gateways" value={isLoading ? '' : `${live} of ${payments.length}`} loading={isLoading} icon={<CreditCard className="h-4 w-4" />} tone={live === payments.length ? 'success' : 'warning'} />
        <StatCard label="Primary" value={primary ? gatewayKind(primary.gateway_type).label : 'None'} loading={isLoading} icon={<Star className="h-4 w-4" />} tone="primary" />
        <StatCard
          label="PayHero organization"
          value={!hasPayHero ? 'Not added' : phSettings.data?.organization_id ? `#${phSettings.data.organization_id}` : 'Not set'}
          hint={phSettings.data?.root_account_id ? `Root account #${phSettings.data.root_account_id}` : undefined}
          loading={hasPayHero && phSettings.isLoading}
          icon={<Building2 className="h-4 w-4" />}
          tone={phSettings.data?.organization_id ? 'success' : 'warning'}
        />
        <StatCard label="Tenants on PayHero" value={phTeams.data?.teams.length ?? 0} loading={hasPayHero && phTeams.isLoading} icon={<Wallet className="h-4 w-4" />} />
      </div>

      <CapsuleTabs value={section} onValueChange={setSection}>
        <CapsuleTabsList>
          <CapsuleTabsTrigger value="gateways" badge={<span className="rounded-full bg-background/20 px-1.5 text-[11px]">{payments.length}</span>}>
            <CreditCard className="h-4 w-4" /> Gateways
          </CapsuleTabsTrigger>
          <CapsuleTabsTrigger value="payhero"><Wallet className="h-4 w-4" /> PayHero</CapsuleTabsTrigger>
          <CapsuleTabsTrigger value="integrations"><Globe className="h-4 w-4" /> Integrations</CapsuleTabsTrigger>
        </CapsuleTabsList>

        <CapsuleTabsContent value="gateways" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading gateways</div>
          ) : error ? (
            <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{errMessage(error, 'Could not load the gateways')}</p>
          ) : payments.length === 0 ? (
            empty('No payment gateway yet. Add Paystack, M-Pesa or PayHero with the keys from their dashboards.')
          ) : (
            cards(payments)
          )}
        </CapsuleTabsContent>

        <CapsuleTabsContent value="payhero" className="mt-4">
          {hasPayHero ? <PayHeroPlatformPanel /> : empty('Add the PayHero gateway first (API username and password from the PayHero dashboard).')}
        </CapsuleTabsContent>

        <CapsuleTabsContent value="integrations" className="mt-4">
          {integrations.length === 0 ? empty('No integration keys yet. Add the forex rates key to fetch live exchange rates.') : cards(integrations)}
        </CapsuleTabsContent>
      </CapsuleTabs>

      {dialog && (
        <GatewayCredentialsDialog
          editType={dialog.edit?.gateway_type}
          editName={dialog.edit?.name}
          configuredTypes={gateways.map((g) => g.gateway_type)}
          submitting={create.isPending || update.isPending}
          onClose={() => setDialog(null)}
          onSubmit={submitDialog}
        />
      )}
    </div>
  );
}
