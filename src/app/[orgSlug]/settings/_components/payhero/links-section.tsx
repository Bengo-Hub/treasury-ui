'use client';

import { Button } from '@/components/ui/base';
import { Input } from '@/components/ui/input';
import { SettingsSection } from '@/components/ui/settings-section';
import { payheroApi, type PayHeroPaymentLink } from '@/lib/api/payhero';
import { Link2, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { usePayHeroMutation } from './use-payhero';

/** Payment Links and Hosted Checkout pages made on the PayHero dashboard, kept here to share. */
export function LinksSection({ tenantSlug, links }: { tenantSlug: string; links: PayHeroPaymentLink[] }) {
  const save = usePayHeroMutation(tenantSlug, (l: PayHeroPaymentLink[]) => payheroApi.setPaymentLinks(tenantSlug, l), 'Payment links saved', 'Could not save payment links');
  const [draft, setRows] = useState<PayHeroPaymentLink[] | null>(null);
  const rows = draft ?? links;
  const update = (i: number, patch: Partial<PayHeroPaymentLink>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <SettingsSection
      icon={<Link2 className="h-4 w-4" />}
      title="Payment links"
      description="Payment Links and Hosted Checkout pages made on the PayHero dashboard, kept here to share on invoices and pots."
      action={
        <>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setRows([...rows, { label: '', url: '' }])}><Plus className="h-3.5 w-3.5" /> Add link</Button>
          <Button size="sm" className="gap-1.5" disabled={save.isPending || !draft} onClick={() => save.mutate(rows.filter((r) => r.url.trim()), { onSuccess: () => setRows(null) })}>
            {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
          </Button>
        </>
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No links yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((l, i) => (
            <li key={i} className="grid grid-cols-1 gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
              <label className="space-y-1">
                <span className="text-xs font-medium">Label</span>
                <Input value={l.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="e.g. Donations" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium">Link</span>
                <Input type="url" value={l.url} onChange={(e) => update(i, { url: e.target.value })} placeholder="https://" />
              </label>
              <Button variant="ghost" size="icon" aria-label={`Remove ${l.label || 'link'}`} onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </SettingsSection>
  );
}
