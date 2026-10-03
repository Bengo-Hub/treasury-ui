'use client';

import { StatCard } from '@/components/charts/StatCard';
import { Button } from '@/components/ui/base';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { SettingsSection } from '@/components/ui/settings-section';
import { Input } from '@/components/ui/input';
import { usePlatformTenants } from '@/hooks/use-platform-tenants';
import { escrowApi } from '@/lib/api/escrow';
import { payheroApi, type PayHeroTeamRow } from '@/lib/api/payhero';
import { buildEscrowColumns, buildTenantSetupColumns, hasPayHeroAccount, type EscrowTenantRow } from './payhero-platform-columns';
import { formatCurrency } from '@/lib/utils/currency';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Landmark, Loader2, Pencil, Plus, RefreshCw, Save, ShieldCheck, Users, Wand2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const errMessage = (e: any, fallback: string) => e?.response?.data?.error || e?.response?.data?.message || e?.message || fallback;


/**
 * Platform owner's PayHero view: the organization tenants' Teams live under, every tenant's setup
 * with its Team wallet, and the escrow position across tenants.
 */
export function PayHeroPlatformPanel() {
  const qc = useQueryClient();
  const tenants = usePlatformTenants();
  const tenantName = useMemo(() => {
    const m = new Map((tenants.data ?? []).map((t) => [t.id, t.name || t.slug]));
    return (id: string) => m.get(id) ?? `${id.slice(0, 8)}...`;
  }, [tenants.data]);

  const settings = useQuery({ queryKey: ['payhero-platform-settings'], queryFn: () => payheroApi.platformSettings(), retry: false });
  const configured = !!settings.data?.organization_id && !!settings.data?.root_account_id;
  // Stored ids until the owner edits them (draft); the form shows only while editing or unset.
  const [draft, setDraft] = useState<{ organization_id: string; root_account_id: string } | null>(null);
  const form = draft ?? { organization_id: String(settings.data?.organization_id || ''), root_account_id: String(settings.data?.root_account_id || '') };
  const editing = draft !== null || !configured;
  const onSaved = () => { setDraft(null); qc.invalidateQueries({ queryKey: ['payhero-platform-settings'] }); toast.success('PayHero organization saved'); };
  const save = useMutation({
    mutationFn: () => payheroApi.setPlatformSettings({ organization_id: Number(form.organization_id), root_account_id: Number(form.root_account_id) }),
    onSuccess: onSaved,
    onError: (e: any) => toast.error(errMessage(e, 'Could not save')),
  });
  const detect = useMutation({
    mutationFn: () => payheroApi.detectPlatformSettings(),
    onSuccess: onSaved,
    onError: (e: any) => toast.error(errMessage(e, 'Could not detect; enter the ids by hand')),
  });

  const [withBalances, setWithBalances] = useState(false);
  const teams = useQuery({ queryKey: ['payhero-teams', withBalances], queryFn: () => payheroApi.teams(withBalances), retry: false });
  const escrow = useQuery({ queryKey: ['escrow-overview'], queryFn: () => escrowApi.platformOverview(), retry: false });
  const rows = useMemo(() => teams.data?.teams ?? [], [teams.data]);
  const live = rows.filter(hasPayHeroAccount).length;
  const pending = rows.filter((t) => !hasPayHeroAccount(t) && t.mode === 'platform_team').length;
  // Team actions for tenants that enabled PayHero (own Team) but have no Team on PayHero yet. Name,
  // email and phone default to the tenant's own record on the server.
  const teamsChanged = (msg: string) => { qc.invalidateQueries({ queryKey: ['payhero-teams'] }); toast.success(msg); };
  const createTeam = useMutation({
    mutationFn: (tenantID: string) => payheroApi.platformCreateTeam(tenantID),
    onSuccess: () => teamsChanged('Team created on PayHero'),
    onError: (e: any) => toast.error(errMessage(e, 'Could not create the Team')),
  });
  const [linkIDs, setLinkIDs] = useState<Record<string, string>>({});
  const linkTeam = useMutation({
    mutationFn: (v: { tenantID: string; accountID: number }) => payheroApi.platformLinkTeam(v.tenantID, v.accountID),
    onSuccess: () => teamsChanged('Team linked'),
    onError: (e: any) => toast.error(errMessage(e, 'Could not link the Team')),
  });

  const teamActions = (t: PayHeroTeamRow) => (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" className="gap-1.5" disabled={createTeam.isPending} onClick={() => createTeam.mutate(t.tenant_id)}>
        {createTeam.isPending && createTeam.variables === t.tenant_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Create Team
      </Button>
      <Input
        inputMode="numeric"
        aria-label="Existing PayHero account id"
        placeholder="or link account id"
        className="h-8 w-40 text-xs"
        value={linkIDs[t.tenant_id] ?? ''}
        onChange={(e) => setLinkIDs({ ...linkIDs, [t.tenant_id]: e.target.value.replace(/\D/g, '') })}
      />
      {linkIDs[t.tenant_id] && (
        <Button size="sm" variant="outline" disabled={linkTeam.isPending} onClick={() => linkTeam.mutate({ tenantID: t.tenant_id, accountID: Number(linkIDs[t.tenant_id]) })}>Link</Button>
      )}
    </div>
  );
  const setupColumns = buildTenantSetupColumns(tenantName, teamActions, withBalances);
  const escrowColumns = useMemo(() => buildEscrowColumns(tenantName), [tenantName]);
  // Every tenant that can hold escrow (its own Team or PayHero account), with zeros until it has
  // pots, plus any tenant the overview reports.
  const escrowRows = useMemo<EscrowTenantRow[]>(() => {
    const byTenant = new Map((escrow.data?.tenants ?? []).map((r) => [r.totals.tenant_id, r]));
    for (const t of rows) {
      if (hasPayHeroAccount(t) && t.mode !== 'platform_root' && !byTenant.has(t.tenant_id)) {
        byTenant.set(t.tenant_id, { totals: { tenant_id: t.tenant_id, pots: 0, open_pots: 0, held: '0', in_flight: '0', released_gross: '0', commission: '0' } });
      }
    }
    return [...byTenant.values()];
  }, [escrow.data, rows]);

  return (
    <div className="space-y-6">
      <SettingsSection
        icon={<Building2 className="h-4 w-4" />}
        title="Organization"
        description="Tenants' Teams are created under this organization. The root account holds the platform's own channels."
        action={configured && !editing ? (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDraft({ organization_id: String(settings.data!.organization_id), root_account_id: String(settings.data!.root_account_id) })}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        ) : undefined}
      >
        {settings.isLoading ? (
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
        ) : settings.isError ? (
          <p className="text-sm text-muted-foreground">Add the PayHero gateway (API username and password) first.</p>
        ) : !editing ? (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">Organization</dt><dd className="mt-0.5 font-mono text-lg font-semibold">#{settings.data!.organization_id}</dd></div>
            <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">Root account</dt><dd className="mt-0.5 font-mono text-lg font-semibold">#{settings.data!.root_account_id}</dd></div>
            <div className="flex items-center gap-2 rounded-xl bg-green-500/10 p-3 text-sm font-medium text-green-700"><ShieldCheck className="h-4 w-4" /> Ready for tenant Teams</div>
          </dl>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-xs font-medium">Organization id</span>
                <Input inputMode="numeric" value={form.organization_id} onChange={(e) => setDraft({ ...form, organization_id: e.target.value.replace(/\D/g, '') })} />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs font-medium">Root account id</span>
                <Input inputMode="numeric" value={form.root_account_id} onChange={(e) => setDraft({ ...form, root_account_id: e.target.value.replace(/\D/g, '') })} />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">Detect reads both from the PayHero account behind the platform keys.</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="gap-1.5" onClick={() => save.mutate()} disabled={save.isPending || !form.organization_id || !form.root_account_id}>
                {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => detect.mutate()} disabled={detect.isPending}>
                {detect.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Detect
              </Button>
              {draft && configured && (
                <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setDraft(null)}><X className="h-3.5 w-3.5" /> Cancel</Button>
              )}
            </div>
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        icon={<Users className="h-4 w-4" />}
        title="Tenant setups"
        description={`${live} live on PayHero${pending ? `, ${pending} waiting for a Team` : ''}. How each tenant is set up and its Team wallet.`}
        action={rows.length > 0 ? (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setWithBalances(true); if (withBalances) teams.refetch(); }} disabled={teams.isFetching}>
            {teams.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} {withBalances ? 'Refresh balances' : 'Load wallet balances'}
          </Button>
        ) : undefined}
        bodyClassName="p-0"
      >
        <DataTable
          columns={setupColumns}
          rows={rows}
          rowKey={(t) => t.tenant_id}
          loading={teams.isLoading}
          loadingRows={3}
          error={teams.isError}
          storageKey="platform-payhero-tenant-setups"
          emptyText="No tenant has enabled PayHero yet. Tenants enable it under Settings, Payments, PayHero."
        />
      </SettingsSection>

      <SettingsSection icon={<Landmark className="h-4 w-4" />} title="Escrow" description="Money held for beneficiaries, per tenant, checked against each Team wallet hourly.">
        {escrow.isError ? (
          <p className="text-sm text-muted-foreground">Escrow overview unavailable.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard label="Held for beneficiaries" value={formatCurrency(Number(escrow.data?.held ?? 0), 'KES')} loading={escrow.isLoading} tone="primary" />
              <StatCard label="Released (gross)" value={formatCurrency(Number(escrow.data?.released_gross ?? 0), 'KES')} loading={escrow.isLoading} />
              <StatCard label="Tenant commission" value={formatCurrency(Number(escrow.data?.commission ?? 0), 'KES')} loading={escrow.isLoading} tone="success" />
            </div>
            <DataTable
              columns={escrowColumns}
              rows={escrowRows}
              rowKey={(r) => r.totals.tenant_id}
              loading={escrow.isLoading}
              loadingRows={2}
              storageKey="platform-payhero-escrow-tenants"
              emptyText="No tenant can hold escrow yet: escrow needs a Team (or the tenant's own PayHero account)."
            />
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
