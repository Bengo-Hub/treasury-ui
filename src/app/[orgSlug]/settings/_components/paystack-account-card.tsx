'use client';

import { Badge, Button, Card, CardContent } from '@/components/ui/base';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { gatewayKeys } from '@/hooks/use-gateways';
import {
  disconnectTenantPaystack,
  getTenantPaystackConfig,
  updateTenantPaystackConfig,
  type TenantPaystackConfig,
} from '@/lib/api/revenue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Copy, KeyRound, Loader2, Save, Unplug } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export const paystackConfigKey = (tenantSlug: string) => ['paystack-config', tenantSlug];

export function useTenantPaystackConfig(tenantSlug: string, enabled = true) {
  return useQuery<TenantPaystackConfig>({
    queryKey: paystackConfigKey(tenantSlug),
    queryFn: () => getTenantPaystackConfig(tenantSlug),
    enabled: !!tenantSlug && enabled,
  });
}

/**
 * Lets a tenant collect card/mobile payments on its own Paystack account. Without one, the
 * platform account collects and pays the tenant out on its payout schedule.
 */
export function PaystackAccountCard({ tenantSlug }: { tenantSlug: string }) {
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useTenantPaystackConfig(tenantSlug);
  const [form, setForm] = useState({ secret_key: '', public_key: '' });
  const [editing, setEditing] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const onSaved = (data: TenantPaystackConfig) => {
    queryClient.setQueryData(paystackConfigKey(tenantSlug), data);
    queryClient.invalidateQueries({ queryKey: gatewayKeys.tenant(tenantSlug) });
  };
  const errMessage = (e: any, fallback: string) => e?.response?.data?.message || e?.response?.data?.error || e?.message || fallback;

  const save = useMutation({
    mutationFn: () => updateTenantPaystackConfig(tenantSlug, {
      secret_key: form.secret_key.trim(),
      public_key: form.public_key.trim(),
    }),
    onSuccess: (data) => {
      onSaved(data);
      setForm({ secret_key: '', public_key: '' });
      setEditing(false);
      toast.success('Paystack account connected');
    },
    onError: (e: any) => toast.error(errMessage(e, 'Could not connect Paystack account')),
  });
  const disconnect = useMutation({
    mutationFn: () => disconnectTenantPaystack(tenantSlug),
    onSuccess: (data) => {
      onSaved(data);
      setConfirmDisconnect(false);
      toast.success('Switched back to the platform Paystack account');
    },
    onError: (e: any) => toast.error(errMessage(e, 'Could not disconnect')),
  });

  const own = !!config?.own_account;
  const showForm = !own || editing;
  const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono';

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-tight">Paystack account</h3>
          </div>
          {config && (
            <Badge variant={own ? 'success' : 'secondary'}>
              {own ? `Your own account${config.mode ? ` (${config.mode})` : ''}` : 'Platform account'}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {own
                ? 'Customer payments are charged on your Paystack account and settle to you directly by Paystack. The platform does not hold or pay out this money.'
                : 'Customer payments are collected on the platform Paystack account and paid out to you using the payout details below. Connect your own Paystack account to receive payments directly instead.'}
            </p>

            {own && config && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-muted px-3 py-2">
                  <p className="text-muted-foreground">Public key</p>
                  <p className="font-mono break-all">{config.public_key}</p>
                </div>
                <div className="rounded-lg bg-muted px-3 py-2">
                  <p className="text-muted-foreground">Secret key</p>
                  <p className="font-mono">{config.secret_key_last4 ? `ending in ${config.secret_key_last4}` : 'saved'}</p>
                </div>
              </div>
            )}

            {config?.webhook_url && (
              <div className="rounded-lg border border-border px-3 py-2 text-xs space-y-1">
                <p className="text-muted-foreground">
                  Webhook URL{own ? '' : ' (needed once you connect your own account)'}: paste it into your Paystack
                  dashboard under Settings, API Keys &amp; Webhooks, so payment confirmations reach us.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all">{config.webhook_url}</code>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => {
                      navigator.clipboard?.writeText(config.webhook_url).then(
                        () => toast.success('Webhook URL copied'),
                        () => toast.error('Copy failed'),
                      );
                    }}
                    title="Copy webhook URL"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {showForm ? (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  save.mutate();
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Secret key</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={form.secret_key}
                      onChange={(e) => setForm((f) => ({ ...f, secret_key: e.target.value }))}
                      placeholder="sk_live_… or sk_test_…"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Public key</label>
                    <input
                      value={form.public_key}
                      onChange={(e) => setForm((f) => ({ ...f, public_key: e.target.value }))}
                      placeholder="pk_live_… or pk_test_…"
                      className={inputClass}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Find both keys in your Paystack dashboard under Settings, API Keys &amp; Webhooks. Both must be live keys or
                  both test keys. We check them with Paystack before saving and store the secret key encrypted.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" className="gap-2" disabled={save.isPending || !form.secret_key.trim() || !form.public_key.trim()}>
                    {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {own ? 'Replace keys' : 'Connect my Paystack account'}
                  </Button>
                  {own && (
                    <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={save.isPending}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="gap-2" onClick={() => setEditing(true)}>
                  <KeyRound className="h-4 w-4" /> Replace keys
                </Button>
                <Button type="button" variant="outline" className="gap-2 text-destructive" onClick={() => setConfirmDisconnect(true)}>
                  <Unplug className="h-4 w-4" /> Use platform account instead
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
      <ConfirmDialog
        open={confirmDisconnect}
        onOpenChange={setConfirmDisconnect}
        title="Switch back to the platform account?"
        description="New payments will be collected by the platform and paid out to you on your payout schedule. Payments already made on your own account stay there."
        confirmLabel="Switch to platform account"
        destructive
        isPending={disconnect.isPending}
        onConfirm={() => disconnect.mutate()}
      />
    </Card>
  );
}
