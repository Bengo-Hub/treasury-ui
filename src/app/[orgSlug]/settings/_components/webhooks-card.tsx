'use client';

import { Badge, Button, Card, CardContent } from '@/components/ui/base';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { webhooksApi, type WebhookEndpoint } from '@/lib/api/webhooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, KeyRound, Loader2, Plus, RotateCcw, Send, Trash2, Webhook } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const errMessage = (e: any, fallback: string) => e?.response?.data?.error || e?.response?.data?.message || e?.message || fallback;

/**
 * Tenant outbound webhooks (plan feature "webhooks"): treasury POSTs payment, refund and escrow
 * events to the tenant's own systems, signed with X-Treasury-Signature (see docs/escrow.md).
 */
export function WebhooksCard({ tenantSlug }: { tenantSlug: string }) {
  const qc = useQueryClient();
  const key = ['webhooks', tenantSlug];
  const endpoints = useQuery({ queryKey: key, queryFn: () => webhooksApi.list(tenantSlug), retry: false });
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState('payment.*, refund.*, escrow.*');
  const [secret, setSecret] = useState<string | null>(null);
  const [removing, setRemoving] = useState<WebhookEndpoint | null>(null);
  const [logFor, setLogFor] = useState<string | undefined>(undefined);

  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const create = useMutation({
    mutationFn: () => webhooksApi.create(tenantSlug, { url: url.trim(), events: events.split(',').map((e) => e.trim()).filter(Boolean) }),
    onSuccess: (ep) => { setSecret(ep.signing_secret); setUrl(''); refresh(); },
    onError: (e: any) => toast.error(errMessage(e, 'Could not add the endpoint')),
  });
  const rotate = useMutation({
    mutationFn: (id: string) => webhooksApi.rotate(tenantSlug, id),
    onSuccess: (ep) => { setSecret(ep.signing_secret); refresh(); },
    onError: (e: any) => toast.error(errMessage(e, 'Could not rotate the secret')),
  });
  const ping = useMutation({
    mutationFn: (id: string) => webhooksApi.ping(tenantSlug, id),
    onSuccess: () => toast.success('Test event queued; it is sent within a minute'),
    onError: (e: any) => toast.error(errMessage(e, 'Could not send a test')),
  });
  const toggle = useMutation({
    mutationFn: (ep: WebhookEndpoint) => webhooksApi.update(tenantSlug, ep.id, { is_active: !ep.is_active }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => webhooksApi.remove(tenantSlug, id),
    onSuccess: () => { setRemoving(null); refresh(); toast.success('Endpoint removed'); },
    onError: (e: any) => toast.error(errMessage(e, 'Could not remove the endpoint')),
  });

  const unavailable = endpoints.isError;

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm uppercase tracking-tight">Webhooks</h3>
        </div>
        {unavailable ? (
          <p className="text-sm text-muted-foreground">Webhooks are part of plans with the Webhooks feature.</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Treasury sends payment, refund and escrow events to your https URL, signed with
              X-Treasury-Signature: t=timestamp,v1=HMAC-SHA256(secret, &quot;timestamp.body&quot;). Failed deliveries retry for 24 hours.
            </p>
            {secret && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-1">
                <p className="text-xs font-semibold flex items-center gap-1"><KeyRound className="h-3.5 w-3.5" /> Signing secret (shown once)</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs break-all">{secret}</code>
                  <button type="button" onClick={() => { void navigator.clipboard?.writeText(secret); toast.success('Copied'); }}><Copy className="h-3.5 w-3.5" /></button>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSecret(null)}>I have saved it</Button>
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
              <Input placeholder="https://your-site.example/treasury-webhooks" value={url} onChange={(e) => setUrl(e.target.value)} />
              <Input placeholder="Events" value={events} onChange={(e) => setEvents(e.target.value)} />
              <Button onClick={() => create.mutate()} disabled={!url.startsWith('https://') || create.isPending}>
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} Add
              </Button>
            </div>
            {endpoints.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <div className="space-y-2">
                {(endpoints.data?.endpoints ?? []).map((ep) => (
                  <div key={ep.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-mono truncate">{ep.url}</p>
                        <p className="text-xs text-muted-foreground">{ep.events.join(', ')}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {ep.consecutive_failures > 0 && <Badge variant="warning">{ep.consecutive_failures} failing</Badge>}
                        <Badge variant={ep.is_active ? 'success' : 'secondary'}>{ep.is_active ? 'active' : 'paused'}</Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" onClick={() => ping.mutate(ep.id)}><Send className="h-3.5 w-3.5 mr-1" /> Test</Button>
                      <Button size="sm" variant="outline" onClick={() => toggle.mutate(ep)}>{ep.is_active ? 'Pause' : 'Resume'}</Button>
                      <Button size="sm" variant="outline" onClick={() => rotate.mutate(ep.id)}><KeyRound className="h-3.5 w-3.5 mr-1" /> New secret</Button>
                      <Button size="sm" variant="ghost" onClick={() => setLogFor(logFor === ep.id ? undefined : ep.id)}>Deliveries</Button>
                      <Button size="sm" variant="ghost" onClick={() => setRemoving(ep)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                    {logFor === ep.id && <DeliveryLog tenantSlug={tenantSlug} endpointId={ep.id} />}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        <ConfirmDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)} title="Remove this endpoint?"
          description="Pending deliveries to it are dropped." destructive isPending={remove.isPending}
          onConfirm={() => removing && remove.mutate(removing.id)} />
      </CardContent>
    </Card>
  );
}

function DeliveryLog({ tenantSlug, endpointId }: { tenantSlug: string; endpointId: string }) {
  const qc = useQueryClient();
  const key = ['webhook-deliveries', tenantSlug, endpointId];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => webhooksApi.deliveries(tenantSlug, { endpointId, limit: 20 }) });
  const replay = useMutation({
    mutationFn: (id: string) => webhooksApi.replay(tenantSlug, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success('Queued again'); },
  });
  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
  const rows = data?.data ?? [];
  if (!rows.length) return <p className="text-xs text-muted-foreground">No deliveries yet.</p>;
  return (
    <table className="w-full text-xs">
      <tbody>
        {rows.map((d) => (
          <tr key={d.id} className="border-t">
            <td className="py-1">{new Date(d.created_at).toLocaleString()}</td>
            <td>{d.event_type}</td>
            <td><Badge variant={d.status === 'delivered' ? 'success' : d.status === 'failed' ? 'error' : 'warning'}>{d.status}</Badge></td>
            <td>{d.attempts} tries{d.last_status_code ? `, HTTP ${d.last_status_code}` : ''}</td>
            <td className="text-right">
              <button type="button" className="inline-flex items-center gap-1 text-primary" onClick={() => replay.mutate(d.id)}>
                <RotateCcw className="h-3 w-3" /> Replay
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
