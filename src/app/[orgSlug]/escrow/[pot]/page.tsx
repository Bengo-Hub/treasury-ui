'use client';

import { Badge, Button, Card, CardContent } from '@/components/ui/base';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { escrowApi } from '@/lib/api/escrow';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Copy, Loader2, Pencil, Send, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { PotFormDialog } from '../pot-form-dialog';

const TREASURY_UI_URL = process.env.NEXT_PUBLIC_UI_URL || 'https://books.codevertexafrica.com';
const errMessage = (e: any, fallback: string) => e?.response?.data?.message || e?.response?.data?.error || e?.message || fallback;
const money = (v?: string, cur = 'KES') => `${cur} ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** One pot: balance, items, releases, refunds, statement, and the release / cancel actions. */
export default function PotPage() {
  const params = useParams();
  const potCode = params?.pot as string;
  const { orgSlug, tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  const tenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : (tenantPathId ?? orgSlug);
  const qc = useQueryClient();
  const key = ['escrow-pot', tenant, potCode];
  const { data: pot, isLoading } = useQuery({ queryKey: key, queryFn: () => escrowApi.getPot(tenant, potCode), enabled: !!tenant && !!potCode });
  const statement = useQuery({ queryKey: [...key, 'statement'], queryFn: () => escrowApi.statement(tenant, potCode), enabled: !!pot });
  const [editing, setEditing] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const refresh = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ['escrow-pots', tenant] }); };
  const release = useMutation({
    mutationFn: () => escrowApi.release(tenant, potCode),
    onSuccess: () => { setConfirmRelease(false); refresh(); toast.success('Release sent; it completes when the payout is confirmed'); },
    onError: (e: any) => {
      setConfirmRelease(false);
      if (e?.response?.data?.error === 'approval_required') {
        toast.info('This release needs approval. Approve it under Approvals, then release again.');
      } else {
        toast.error(errMessage(e, 'Could not release the pot'));
      }
    },
  });
  const cancel = useMutation({
    mutationFn: () => escrowApi.cancel(tenant, potCode, true),
    onSuccess: () => { setConfirmCancel(false); refresh(); toast.success('Pot cancelled; refunds sent to contributors'); },
    onError: (e: any) => {
      setConfirmCancel(false);
      if (e?.response?.data?.error === 'approval_required') {
        toast.info('Refunding this pot needs approval. Approve it under Approvals, then cancel again.');
      } else {
        toast.error(errMessage(e, 'Could not cancel the pot'));
      }
    },
  });

  if (isLoading || !pot) {
    return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }
  const shareUrl = `${TREASURY_UI_URL}/pay/pot?tenant=${encodeURIComponent(tenant)}&code=${encodeURIComponent(pot.code)}`;
  const releases = pot.metadata?.releases ?? [];
  const refunds = pot.metadata?.refunds ?? [];
  const items = pot.metadata?.items ?? [];
  const busy = pot.status === 'releasing' || !!pot.pending_release_reference;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/${orgSlug}/escrow`}><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button></Link>
        <div className="mr-auto">
          <h1 className="text-2xl font-bold tracking-tight">{pot.title}</h1>
          <p className="text-muted-foreground text-sm">Code {pot.code} · beneficiary {pot.beneficiary?.name}</p>
        </div>
        <Badge variant={pot.status === 'released' ? 'success' : pot.status === 'cancelled' ? 'secondary' : 'default'}>{pot.status}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[['Held', pot.balance], ['Target', pot.target_amount], ['Released', pot.released_gross], ['Commission taken', pot.released_fee]].map(([label, v]) => (
          <Card key={label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-bold">{v ? money(v, pot.currency) : '-'}</p></CardContent></Card>
        ))}
      </div>

      {pot.status !== 'cancelled' && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setConfirmRelease(true)} disabled={busy || Number(pot.balance) <= 0}><Send className="h-4 w-4 mr-1" /> Release</Button>
          <Button variant="outline" onClick={() => setEditing(true)} disabled={busy}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
          <Button variant="outline" onClick={() => { void navigator.clipboard?.writeText(shareUrl); toast.success('Share link copied'); }}><Copy className="h-4 w-4 mr-1" /> Copy share link</Button>
          <Button variant="ghost" onClick={() => setConfirmCancel(true)} disabled={busy}><XCircle className="h-4 w-4 mr-1" /> Cancel pot</Button>
        </div>
      )}

      {items.length > 0 && (
        <Card><CardContent className="p-6">
          <h3 className="font-bold text-sm uppercase tracking-tight mb-3">Gift items</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground"><th>Item</th><th className="text-right">Price</th><th className="text-right">Funded</th></tr></thead>
            <tbody>{items.map((it) => (
              <tr key={it.sku} className="border-t"><td className="py-1">{it.title}</td><td className="text-right">{money(it.price, pot.currency)}</td><td className="text-right">{money(it.funded_amount, pot.currency)}</td></tr>
            ))}</tbody>
          </table>
        </CardContent></Card>
      )}

      {(releases.length > 0 || refunds.length > 0) && (
        <Card><CardContent className="p-6 space-y-3">
          <h3 className="font-bold text-sm uppercase tracking-tight">Payouts</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground"><th>Reference</th><th>Kind</th><th className="text-right">Amount</th><th>Status</th></tr></thead>
            <tbody>
              {releases.map((r) => (
                <tr key={r.reference} className="border-t">
                  <td className="py-1 font-mono text-xs">{r.reference}</td><td>Release (gross {money(r.gross, pot.currency)}, commission {money(r.fee, pot.currency)})</td>
                  <td className="text-right">{money(r.net, pot.currency)}</td><td><Badge variant={r.status === 'completed' ? 'success' : r.status === 'failed' ? 'error' : 'warning'}>{r.status}</Badge>{r.reason ? <span className="text-xs text-muted-foreground ml-1">{r.reason}</span> : null}</td>
                </tr>
              ))}
              {refunds.map((r) => (
                <tr key={r.reference} className="border-t">
                  <td className="py-1 font-mono text-xs">{r.reference}</td><td>Refund {r.phone ? `to ${r.phone}` : ''}</td>
                  <td className="text-right">{money(r.amount, pot.currency)}</td><td><Badge variant={r.status === 'completed' ? 'success' : r.status === 'processing' ? 'warning' : 'error'}>{r.status}</Badge>{r.reason ? <span className="text-xs text-muted-foreground ml-1">{r.reason}</span> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      <Card><CardContent className="p-6 space-y-3">
        <h3 className="font-bold text-sm uppercase tracking-tight">Statement</h3>
        {statement.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : !statement.data?.entries.length ? (
          <p className="text-sm text-muted-foreground">No movements yet. Share the pot link to start collecting.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground"><th>Date</th><th>Description</th><th className="text-right">Amount</th><th className="text-right">Balance</th></tr></thead>
            <tbody>{statement.data.entries.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="py-1">{new Date(e.created_at).toLocaleString()}</td><td>{e.description}</td>
                <td className="text-right">{money(e.amount, pot.currency)}</td><td className="text-right">{money(e.balance_after, pot.currency)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </CardContent></Card>

      {editing && <PotFormDialog tenant={tenant} pot={pot} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); refresh(); }} />}
      <ConfirmDialog open={confirmRelease} onOpenChange={setConfirmRelease} title="Release this pot?"
        description={`${money(pot.balance, pot.currency)} goes to ${pot.beneficiary?.name}, less your commission. Your release approval policy applies.`}
        confirmLabel="Release" isPending={release.isPending} onConfirm={() => release.mutate()} />
      <ConfirmDialog open={confirmCancel} onOpenChange={setConfirmCancel} title="Cancel this pot and refund contributors?"
        description="Every contribution is paid back to the phone it came from; contributions with no phone are listed for a manual refund."
        destructive confirmLabel="Cancel and refund" isPending={cancel.isPending} onConfirm={() => cancel.mutate()} />
    </div>
  );
}
