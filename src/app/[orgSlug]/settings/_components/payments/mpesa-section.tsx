'use client';

import { Badge, Button } from '@/components/ui/base';
import { Input } from '@/components/ui/input';
import { SettingsSection } from '@/components/ui/settings-section';
import {
  getTenantMpesaConfig,
  getTenantMpesaQR,
  registerMpesaC2BURLs,
  updateTenantMpesaConfig,
  type UpdateTenantMpesaConfigRequest,
} from '@/lib/api/revenue';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, QrCode, Save, Send, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

type MpesaForm = { shortcode: string; initiator_name: string; initiator_password: string; environment: 'sandbox' | 'production' };

/** The tenant's own Daraja short code and initiator, C2B registration and the merchant QR. */
export function MpesaSection({ tenant }: { tenant: string }) {
  const qc = useQueryClient();
  const { data: config, isLoading } = useQuery({ queryKey: ['mpesa-config', tenant], queryFn: () => getTenantMpesaConfig(tenant), enabled: !!tenant });
  // Stored values until edited (draft). The initiator password is write-only and never shown.
  const [draft, setDraft] = useState<MpesaForm | null>(null);
  const form: MpesaForm = draft ?? { shortcode: config?.shortcode ?? '', initiator_name: config?.initiator_name ?? '', initiator_password: '', environment: config?.environment ?? 'sandbox' };
  const set = (patch: Partial<MpesaForm>) => setDraft({ ...form, ...patch });
  const live = form.environment === 'production';
  const errText = (e: any, fallback: string) => e?.response?.data?.message || e?.response?.data?.error || e?.message || fallback;

  const save = useMutation({
    mutationFn: (body: UpdateTenantMpesaConfigRequest) => updateTenantMpesaConfig(tenant, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mpesa-config', tenant] }); setDraft(null); toast.success('M-Pesa settings saved'); },
    onError: (e: any) => toast.error(errText(e, 'Could not save')),
  });
  // C2B registration tells Safaricom where to send confirmations when a customer pays the short
  // code directly; needed once before direct payments can be matched.
  const registerC2B = useMutation({
    mutationFn: () => registerMpesaC2BURLs(tenant),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mpesa-config', tenant] }); toast.success('C2B URLs registered with Safaricom'); },
    onError: (e: any) => toast.error(errText(e, 'C2B registration failed')),
  });
  const [qrImage, setQrImage] = useState<string | null>(null);
  const qr = useMutation({
    mutationFn: () => getTenantMpesaQR(tenant),
    onSuccess: (d) => setQrImage(d.image_base64),
    onError: (e: any) => toast.error(errText(e, 'QR generation failed')),
  });

  return (
    <SettingsSection
      icon={<Smartphone className="h-4 w-4" />}
      title="M-Pesa"
      description="Your short code and initiator. Daraja API keys are managed by the platform."
      action={
        <>
          <Badge variant={live ? 'success' : 'warning'}>{live ? 'Live' : 'Sandbox'}</Badge>
          <Badge variant={config?.c2b_registered ? 'success' : 'secondary'}>{config?.c2b_registered ? 'C2B registered' : 'C2B not registered'}</Badge>
        </>
      }
    >
      {isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr]">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({
                shortcode: form.shortcode || undefined,
                initiator_name: form.initiator_name || undefined,
                initiator_password: form.initiator_password || undefined,
                environment: form.environment,
              });
            }}
          >
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-medium">{live ? 'Live mode' : 'Test mode (sandbox)'}</p>
                <p className="text-xs text-muted-foreground">{live ? 'Real M-Pesa payments on your live short code.' : 'Sandbox short code 174379; no real money moves.'}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={live}
                aria-label="Live mode"
                onClick={() => set({ environment: live ? 'sandbox' : 'production' })}
                className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors', live ? 'bg-primary' : 'bg-muted')}
              >
                <span className={cn('inline-block h-4 w-4 rounded-full bg-background shadow transition-transform', live ? 'translate-x-6' : 'translate-x-1')} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-medium">Short code</span>
                <Input inputMode="numeric" value={form.shortcode} onChange={(e) => set({ shortcode: e.target.value })} />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium">Initiator name</span>
                <Input value={form.initiator_name} onChange={(e) => set({ initiator_name: e.target.value })} />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs font-medium">Initiator password</span>
                <Input type="password" value={form.initiator_password} onChange={(e) => set({ initiator_password: e.target.value })} placeholder="Leave blank to keep the current one" autoComplete="new-password" />
              </label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="gap-1.5" disabled={save.isPending || !draft}>
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
              </Button>
              {draft && <Button type="button" variant="ghost" onClick={() => setDraft(null)}>Discard</Button>}
            </div>
          </form>

          <div className="space-y-4 border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Direct payments</h4>
              <p className="text-xs text-muted-foreground">Register C2B once so payments made straight to your short code (no phone prompt) are matched. The QR lets customers scan to pay in the M-Pesa app.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-1.5" onClick={() => registerC2B.mutate()} disabled={registerC2B.isPending}>
                {registerC2B.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Register C2B
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={() => qr.mutate()} disabled={qr.isPending}>
                {qr.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />} Merchant QR
              </Button>
            </div>
            {qrImage && (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-background p-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- data: URI, no next/image benefit */}
                <img src={`data:image/png;base64,${qrImage}`} alt="M-Pesa merchant QR code" className="h-40 w-40" />
                <p className="text-[11px] text-muted-foreground">Scan with the M-Pesa app to pay this short code</p>
              </div>
            )}
          </div>
        </div>
      )}
    </SettingsSection>
  );
}
