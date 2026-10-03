'use client';

import { StatCard } from '@/components/charts/StatCard';
import { gatewayKind } from '@/components/payments/gateway-catalog';
import { Badge, Button, Card, CardContent } from '@/components/ui/base';
import { CapsuleTabs, CapsuleTabsContent, CapsuleTabsList, CapsuleTabsTrigger } from '@/components/ui/capsule-tabs';
import { Input } from '@/components/ui/input';
import { SettingsSection } from '@/components/ui/settings-section';
import {
  useDeactivateTenantGateway,
  useSelectTenantGateway,
  useTenantGateways,
  useTenantSelectedGateways,
} from '@/hooks/use-gateways';
import { useMe } from '@/hooks/useMe';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import { CreditCard, Crown, Gauge, Layers, Loader2, Power, PowerOff, Save, Settings2, Smartphone, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { MpesaSection } from './payments/mpesa-section';
import { PaystackSection } from './payments/paystack-section';
import { PayHeroTab } from './payhero/payhero-tab';

interface PaymentsTabProps {
  orgSlug: string;
  tenantSlug: string;
  maxPaymentAmount: number;
  onSaveMaxAmount: () => void;
  onMaxAmountChange: (v: number) => void;
  isSavingSettings: boolean;
}

/**
 * Settings > Payments: a summary, then one section per concern. Gateways (which ones customers
 * see, the primary, the payment limit), then the setup of each active gateway, then PayHero.
 */
export function PaymentsTab({ orgSlug, tenantSlug, maxPaymentAmount, onSaveMaxAmount, onMaxAmountChange, isSavingSettings }: PaymentsTabProps) {
  const { data: gateways = [], isLoading, error } = useTenantGateways(tenantSlug);
  const { data: selectedData } = useTenantSelectedGateways(tenantSlug);
  const selected = selectedData?.selected ?? [];
  const primary = selected[0];
  const activeTypes = new Set(selected.map((g) => g.gateway_type));
  const hasPaystack = activeTypes.has('paystack');
  const hasMpesa = selected.some((g) => g.gateway_type?.startsWith('mpesa'));
  const { data: user } = useMe();
  // ?section= opens a section directly (the PayHero announcement links to ?tab=payments&section=payhero).
  const searchParams = useSearchParams();
  const [section, setSection] = useState(() => searchParams?.get('section') || 'gateways');

  // The section where an active gateway is configured (none for COD and complimentary).
  const setupSection = (type: string) =>
    type === 'payhero' ? 'payhero' : type === 'paystack' ? 'paystack' : type.startsWith('mpesa') ? 'mpesa' : null;

  const select = useSelectTenantGateway(tenantSlug);
  const deactivate = useDeactivateTenantGateway(tenantSlug);
  const [busyType, setBusyType] = useState<string | null>(null);
  const act = (type: string, name: string, kind: 'activate' | 'primary' | 'deactivate') => {
    setBusyType(type);
    const done = { onSettled: () => setBusyType(null) };
    if (kind === 'deactivate') {
      deactivate.mutate(type, {
        ...done,
        onSuccess: () => toast.success(`${name} turned off`),
        onError: (e: any) => toast.error(e?.response?.data?.message || 'Could not turn it off'),
      });
    } else {
      select.mutate(
        { type, primary: kind === 'primary' },
        {
          ...done,
          onSuccess: () => toast.success(kind === 'primary' ? `${name} is now the primary gateway` : `${name} turned on`),
          onError: (e: any) => toast.error(e?.response?.data?.error || e?.response?.data?.message || 'Could not update the gateway'),
        },
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Gateways on" value={`${selected.length} of ${gateways.length}`} loading={isLoading} icon={<Layers className="h-4 w-4" />} tone={selected.length ? 'success' : 'warning'} />
        <StatCard label="Primary" value={primary ? gatewayKind(primary.gateway_type).label : 'None'} loading={isLoading} icon={<Crown className="h-4 w-4" />} tone="primary" />
        <StatCard label="Single payment limit" value={maxPaymentAmount > 0 ? formatCurrency(maxPaymentAmount, 'KES') : 'No limit'} icon={<Gauge className="h-4 w-4" />} className="col-span-2 lg:col-span-1" />
      </div>

      <CapsuleTabs value={section} onValueChange={setSection}>
        <CapsuleTabsList>
          <CapsuleTabsTrigger value="gateways"><Layers className="h-4 w-4" /> Gateways</CapsuleTabsTrigger>
          {hasPaystack && <CapsuleTabsTrigger value="paystack"><CreditCard className="h-4 w-4" /> Paystack</CapsuleTabsTrigger>}
          {hasMpesa && <CapsuleTabsTrigger value="mpesa"><Smartphone className="h-4 w-4" /> M-Pesa</CapsuleTabsTrigger>}
          <CapsuleTabsTrigger value="payhero"><Wallet className="h-4 w-4" /> PayHero</CapsuleTabsTrigger>
        </CapsuleTabsList>

        <CapsuleTabsContent value="gateways" className="mt-4 space-y-6">
          <SettingsSection
            icon={<Layers className="h-4 w-4" />}
            title="Gateways on your pay pages"
            description="Turn on the gateways customers can pay with. The primary one is offered first."
            action={user?.isPlatformOwner ? (
              <Link href={`/${orgSlug}/platform`}><Button size="sm" variant="outline" className="gap-1.5"><Settings2 className="h-3.5 w-3.5" /> Platform gateways</Button></Link>
            ) : undefined}
          >
            {isLoading ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)}</div>
            ) : error ? (
              <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error instanceof Error ? error.message : 'Could not load the gateways'}</p>
            ) : gateways.length === 0 ? (
              <p className="text-sm text-muted-foreground">No gateways are available yet. The platform admin adds them under Platform, Gateways.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {gateways.map((gw) => {
                  const kind = gatewayKind(gw.gateway_type);
                  const Icon = kind.icon;
                  const on = activeTypes.has(gw.gateway_type);
                  const isPrimary = primary?.gateway_type === gw.gateway_type;
                  const busy = busyType === gw.gateway_type;
                  return (
                    <li
                      key={gw.gateway_type}
                      className={cn('flex flex-col gap-3 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center',
                        isPrimary ? 'border-primary bg-primary/5' : on ? 'border-border' : 'border-dashed border-border bg-muted/30')}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', on ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-sm font-semibold">{gw.name}</p>
                            {isPrimary ? <Badge>Primary</Badge> : on ? <Badge variant="success">On</Badge> : <Badge variant="secondary">Off</Badge>}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{kind.description}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        {on && setupSection(gw.gateway_type) && (
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => setSection(setupSection(gw.gateway_type)!)}>
                            <Settings2 className="h-3.5 w-3.5" /> Set up
                          </Button>
                        )}
                        {on && !isPrimary && (
                          <Button size="sm" variant="ghost" className="gap-1" disabled={busy} onClick={() => act(gw.gateway_type, gw.name, 'primary')}>
                            <Crown className="h-3.5 w-3.5" /> Make primary
                          </Button>
                        )}
                        {on ? (
                          <Button size="sm" variant="ghost" className="gap-1 text-destructive hover:bg-destructive/10" disabled={busy} onClick={() => act(gw.gateway_type, gw.name, 'deactivate')} aria-label={`Turn off ${gw.name}`}>
                            <PowerOff className="h-3.5 w-3.5" /> Off
                          </Button>
                        ) : (
                          <Button size="sm" className="gap-1" disabled={busy} onClick={() => act(gw.gateway_type, gw.name, 'activate')}>
                            <Power className="h-3.5 w-3.5" /> Turn on
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SettingsSection>

          <SettingsSection icon={<Gauge className="h-4 w-4" />} title="Payment limit" description="The largest single payment accepted. 0 means no limit.">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="space-y-1 sm:w-64">
                <span className="text-xs font-medium">Maximum per payment (KES)</span>
                <Input type="number" min={0} value={maxPaymentAmount || ''} onChange={(e) => onMaxAmountChange(parseFloat(e.target.value) || 0)} className="font-mono" />
              </label>
              <Button className="gap-1.5" disabled={isSavingSettings} onClick={onSaveMaxAmount}>
                {isSavingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save limit
              </Button>
            </div>
          </SettingsSection>

          {selected.length > 0 && !hasPaystack && !hasMpesa && (
            <Card><CardContent className="p-5 text-sm text-muted-foreground">Your active gateways need no setup of their own; payments run through treasury.</CardContent></Card>
          )}
        </CapsuleTabsContent>

        {hasPaystack && <CapsuleTabsContent value="paystack" className="mt-4"><PaystackSection tenantSlug={tenantSlug} /></CapsuleTabsContent>}
        {hasMpesa && <CapsuleTabsContent value="mpesa" className="mt-4"><MpesaSection tenant={orgSlug} /></CapsuleTabsContent>}
        <CapsuleTabsContent value="payhero" className="mt-4"><PayHeroTab tenantSlug={tenantSlug} /></CapsuleTabsContent>
      </CapsuleTabs>
    </div>
  );
}
