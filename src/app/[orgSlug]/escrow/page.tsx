'use client';

import { Badge, Button, Card, CardContent } from '@/components/ui/base';
import { Input, Select } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { escrowApi, type Pot } from '@/lib/api/escrow';
import { PotFormDialog } from './pot-form-dialog';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle, Landmark, Loader2, Plus, Save } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const PAGE_SIZE = 20;
const errMessage = (e: any, fallback: string) => e?.response?.data?.error || e?.response?.data?.message || e?.message || fallback;
const money = (v?: string, cur = 'KES') => `${cur} ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'secondary' | 'default'> = {
  open: 'default', releasing: 'warning', released: 'success', cancelled: 'secondary',
};

/** Escrow pots: hold customers' money for a beneficiary and release it, less your commission. */
export default function EscrowPage() {
  const { orgSlug, tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  const tenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : (tenantPathId ?? orgSlug);
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);

  const readiness = useQuery({ queryKey: ['escrow-readiness', tenant], queryFn: () => escrowApi.readiness(tenant), enabled: !!tenant, retry: false });
  const summary = useQuery({ queryKey: ['escrow-summary', tenant], queryFn: () => escrowApi.summary(tenant), enabled: !!tenant && !!readiness.data, retry: false });
  const pots = useQuery({
    queryKey: ['escrow-pots', tenant, status, page],
    queryFn: () => escrowApi.listPots(tenant, { status: status || undefined, page, limit: PAGE_SIZE }),
    enabled: !!tenant && !!readiness.data,
  });
  const acceptTerms = useMutation({
    mutationFn: () => escrowApi.acceptTerms(tenant),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['escrow-readiness', tenant] }); toast.success('Escrow terms accepted'); },
    onError: (e: any) => toast.error(errMessage(e, 'Could not accept the terms')),
  });

  const columns = useMemo<DataTableColumn<Pot>[]>(() => [
    { key: 'title', header: 'Pot', primary: true, accessor: (p) => p.title,
      render: (p) => <Link className="font-medium text-primary hover:underline" href={`/${orgSlug}/escrow/${p.code}`}>{p.title}</Link> },
    { key: 'code', header: 'Code', accessor: (p) => p.code, cellClassName: 'font-mono text-xs' },
    { key: 'beneficiary', header: 'Beneficiary', accessor: (p) => p.beneficiary?.name ?? '' },
    { key: 'balance', header: 'Held', align: 'right', accessor: (p) => Number(p.balance), render: (p) => money(p.balance, p.currency) },
    { key: 'released', header: 'Released', align: 'right', accessor: (p) => Number(p.released_gross), render: (p) => money(p.released_gross, p.currency) },
    { key: 'status', header: 'Status', accessor: (p) => p.status, render: (p) => <Badge variant={STATUS_VARIANT[p.status] ?? 'default'}>{p.status}</Badge> },
  ], [orgSlug]);

  if (readiness.isLoading) {
    return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }
  if (readiness.isError) {
    return (
      <div className="p-6">
        <Card><CardContent className="p-6 text-sm text-muted-foreground">
          Escrow is part of plans with Escrow Management. Upgrade your plan to hold customers&apos; money for beneficiaries.
        </CardContent></Card>
      </div>
    );
  }
  const r = readiness.data!;
  const totals = summary.data?.totals;
  const totalPages = Math.max(1, Math.ceil((pots.data?.total ?? 0) / PAGE_SIZE));

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="mr-auto">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Landmark className="h-6 w-6" /> Escrow</h1>
          <p className="text-muted-foreground mt-1">Hold customers&apos; money for a beneficiary; release it when the pot&apos;s rules are met, less your commission.</p>
        </div>
        {r.ready && <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-2" /> New pot</Button>}
      </div>

      {!r.ready && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <h3 className="font-bold text-sm uppercase tracking-tight">Before you start</h3>
            {[
              [r.platform_enabled, 'Escrow is switched on for the platform'],
              [r.payhero_enabled && r.team_mode, 'PayHero enabled with your own Team (Settings, Payments, PayHero)'],
              [r.has_team, 'Your PayHero Team is created'],
              [r.kyc_tier >= 3, `KYC tier 3 or higher (now tier ${r.kyc_tier})`],
              [r.terms_accepted, 'Escrow terms accepted'],
            ].map(([ok, label]) => (
              <p key={String(label)} className="flex items-center gap-2 text-sm">
                {ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-muted-foreground" />} {label}
              </p>
            ))}
            {!r.terms_accepted && (
              <div className="rounded-lg border p-3 text-xs text-muted-foreground space-y-2">
                <p>
                  By accepting, your business agrees to hold money its customers pay into escrow pots for the pots&apos; beneficiaries,
                  to release it only under each pot&apos;s rules, and to refund contributors if a pot is cancelled. Your commission is
                  your own income; the platform takes no cut of escrow money.
                </p>
                <Button size="sm" onClick={() => acceptTerms.mutate()} disabled={acceptTerms.isPending}>Accept terms ({r.terms_version})</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {totals && (
        <div className="grid gap-3 sm:grid-cols-4">
          {[['Held for beneficiaries', totals.held], ['Release in progress', totals.in_flight], ['Released', totals.released_gross], ['Your commission', totals.commission]].map(([label, v]) => (
            <Card key={label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-bold">{money(v)}</p></CardContent></Card>
          ))}
        </div>
      )}

      {r.terms_accepted && <FeeRuleCard tenant={tenant} />}

      <Card>
        <CardContent className="p-0">
          <div className="p-3 flex gap-2">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              {['open', 'releasing', 'released', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div className="px-2 pb-2">
            <DataTable<Pot>
              columns={columns}
              rows={pots.data?.data ?? []}
              rowKey={(p) => p.id}
              loading={pots.isLoading}
              error={pots.isError}
              onRetry={() => pots.refetch()}
              storageKey="escrow-pots-table"
              emptyText="No pots yet."
            />
          </div>
          {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="p-3" />}
        </CardContent>
      </Card>

      {creating && <PotFormDialog tenant={tenant} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); qc.invalidateQueries({ queryKey: ['escrow-pots', tenant] }); }} />}
    </div>
  );
}

function FeeRuleCard({ tenant }: { tenant: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['escrow-fee-rule', tenant], queryFn: () => escrowApi.feeRule(tenant) });
  // Stored rule until edited (draft), then the draft.
  const [draft, setF] = useState<{ percentage: string; fixed_amount: string; min_amount: string; max_amount: string } | null>(null);
  const r = data?.fee_rule;
  const f = draft ?? { percentage: r?.percentage ?? '', fixed_amount: r?.fixed_amount ?? '', min_amount: r?.min_amount ?? '', max_amount: r?.max_amount ?? '' };
  const save = useMutation({
    mutationFn: () => escrowApi.setFeeRule(tenant, Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '')) as any),
    onSuccess: () => { setF(null); qc.invalidateQueries({ queryKey: ['escrow-fee-rule', tenant] }); toast.success('Commission saved'); },
    onError: (e: any) => toast.error(errMessage(e, 'Could not save the commission')),
  });
  return (
    <Card>
      <CardContent className="p-6 space-y-3">
        <h3 className="font-bold text-sm uppercase tracking-tight">Your commission on releases</h3>
        <p className="text-xs text-muted-foreground">Taken from each release before the beneficiary is paid; a pot can set its own.</p>
        <div className="grid gap-2 sm:grid-cols-4">
          <Input placeholder="Percentage (e.g. 5)" value={f.percentage} onChange={(e) => setF({ ...f, percentage: e.target.value })} />
          <Input placeholder="Fixed amount" value={f.fixed_amount} onChange={(e) => setF({ ...f, fixed_amount: e.target.value })} />
          <Input placeholder="Only from (gross)" value={f.min_amount} onChange={(e) => setF({ ...f, min_amount: e.target.value })} />
          <Input placeholder="At most" value={f.max_amount} onChange={(e) => setF({ ...f, max_amount: e.target.value })} />
        </div>
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}><Save className="h-4 w-4 mr-1" /> Save</Button>
      </CardContent>
    </Card>
  );
}
