'use client';

import { Badge, Button, Card, CardContent } from '@/components/ui/base';
import { Input } from '@/components/ui/input';
import { escrowApi } from '@/lib/api/escrow';
import { payheroApi } from '@/lib/api/payhero';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw, Save, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const errMessage = (e: any, fallback: string) => e?.response?.data?.error || e?.response?.data?.message || e?.message || fallback;

/**
 * Platform owner's PayHero view: the organization the tenants' Teams live under, every tenant's
 * PayHero setup with its Team wallet balance, and the escrow position across tenants.
 */
export function PayHeroPlatformPanel() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ['payhero-platform-settings'], queryFn: () => payheroApi.platformSettings(), retry: false });
  // The form shows the stored ids until the owner edits them (draft), then the draft.
  const [draft, setDraft] = useState<{ organization_id: string; root_account_id: string } | null>(null);
  const form = draft ?? {
    organization_id: String(settings.data?.organization_id || ''),
    root_account_id: String(settings.data?.root_account_id || ''),
  };
  const setForm = setDraft;
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

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-tight">PayHero organization</h3>
          {settings.isError ? (
            <p className="text-sm text-muted-foreground">Add the PayHero gateway above (API username and password) first.</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Tenants&apos; Teams are created under this organization; the root account holds the platform&apos;s own channels.
              </p>
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
                <Input placeholder="Organization id" value={form.organization_id} onChange={(e) => setForm({ ...form, organization_id: e.target.value.replace(/\D/g, '') })} />
                <Input placeholder="Root account id" value={form.root_account_id} onChange={(e) => setForm({ ...form, root_account_id: e.target.value.replace(/\D/g, '') })} />
                <Button onClick={() => save.mutate()} disabled={save.isPending || !form.organization_id || !form.root_account_id}>
                  <Save className="h-4 w-4 mr-1" /> Save
                </Button>
                <Button variant="outline" onClick={() => detect.mutate()} disabled={detect.isPending}>
                  {detect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 mr-1" />} Detect
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-sm uppercase tracking-tight">Tenant PayHero setups</h3>
            <Button variant="outline" size="sm" onClick={() => setWithBalances(true)} disabled={teams.isFetching}>
              {teams.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />} Load wallet balances
            </Button>
          </div>
          {teams.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : !teams.data?.teams.length ? (
            <p className="text-sm text-muted-foreground">No tenant has enabled PayHero yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-muted-foreground"><th>Tenant</th><th>Mode</th><th>Team</th><th>Channels</th><th>Wallet</th><th /></tr></thead>
                <tbody>
                  {teams.data.teams.map((t) => (
                    <tr key={t.tenant_id} className="border-t">
                      <td className="py-1 font-mono text-xs">{t.tenant_id.slice(0, 8)}</td>
                      <td>{t.mode}</td>
                      <td>{t.team_name || (t.vendor_id ? `#${t.vendor_id}` : '')}</td>
                      <td>{t.channels}</td>
                      <td>{t.balance ? `${t.currency} ${t.balance}` : t.balance_error ? <span className="text-destructive text-xs">{t.balance_error}</span> : ''}</td>
                      <td><Badge variant={t.enabled ? 'success' : 'secondary'}>{t.enabled ? 'on' : 'off'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-tight">Escrow</h3>
          {escrow.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : !escrow.data ? (
            <p className="text-sm text-muted-foreground">Escrow overview unavailable.</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <div><p className="text-muted-foreground text-xs">Held for beneficiaries</p><p className="font-bold">{escrow.data.held}</p></div>
                <div><p className="text-muted-foreground text-xs">Released (gross)</p><p className="font-bold">{escrow.data.released_gross}</p></div>
                <div><p className="text-muted-foreground text-xs">Tenant commission</p><p className="font-bold">{escrow.data.commission}</p></div>
              </div>
              {escrow.data.tenants.length > 0 && (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-muted-foreground"><th>Tenant</th><th>Open pots</th><th>Held</th><th>Wallet check</th></tr></thead>
                  <tbody>
                    {escrow.data.tenants.map(({ totals, reconciliation }) => (
                      <tr key={totals.tenant_id} className="border-t">
                        <td className="py-1 font-mono text-xs">{totals.tenant_id.slice(0, 8)}</td>
                        <td>{totals.open_pots}</td>
                        <td>{totals.held}</td>
                        <td>
                          {!reconciliation ? '' : reconciliation.shortfall
                            ? <Badge variant="error">short {String(reconciliation.surplus)}</Badge>
                            : reconciliation.error ? <span className="text-xs text-muted-foreground">{String(reconciliation.error)}</span>
                              : <Badge variant="success">ok</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
