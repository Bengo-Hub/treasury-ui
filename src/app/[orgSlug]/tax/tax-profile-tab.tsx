'use client';

import { useEffect, useState } from 'react';
import { useTaxEligibility, useTaxProfile, useUpdateTaxProfile, useSyncTaxObligations } from '@/hooks/use-tax';

interface Props { tenantSlug: string }

const field = 'w-full rounded border px-3 py-2 text-sm';
const label = 'text-xs text-muted-foreground';

function money(v?: string) {
  const n = Number(v ?? 0);
  return `KES ${n.toLocaleString()}`;
}

export function TaxProfileTab({ tenantSlug }: Props) {
  const { data: profile } = useTaxProfile(tenantSlug);
  const { data: position } = useTaxEligibility(tenantSlug);
  const update = useUpdateTaxProfile(tenantSlug);
  const sync = useSyncTaxObligations(tenantSlug);

  const [pin, setPin] = useState('');
  useEffect(() => { if (profile?.kra_pin) setPin(profile.kra_pin); }, [profile?.kra_pin]);

  const sev = position?.severity ?? 'ok';
  const sevTone = sev === 'critical' ? 'bg-destructive/10 text-destructive border-destructive/30'
    : sev === 'warning' ? 'bg-primary/10 text-foreground border-primary/30'
    : sev === 'info' ? 'bg-muted text-muted-foreground border-border'
    : 'bg-muted text-foreground border-border';

  return (
    <div className="space-y-6">
      {/* Eligibility position */}
      {position && (
        <div className={`rounded-lg border p-4 space-y-2 ${sevTone}`}>
          <h3 className="font-semibold text-sm">Tax position</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className={label}>Rolling 12-month turnover</span><div className="font-medium">{money(position.rolling_turnover_12m)}</div></div>
            <div><span className={label}>VAT registration threshold</span><div className="font-medium">{money(position.vat_threshold)}</div></div>
            <div><span className={label}>VAT eligible</span><div className="font-medium">{position.vat_eligible ? 'Yes' : 'No'}</div></div>
            <div><span className={label}>VAT compliant</span><div className="font-medium">{position.vat_compliant ? 'Yes' : 'No'}</div></div>
            <div><span className={label}>eTIMS activated</span><div className="font-medium">{position.etims_activated ? 'Yes' : 'No'}</div></div>
            <div><span className={label}>Charging VAT</span><div className="font-medium">{position.auto_charge_vat ? 'Yes' : 'No'}</div></div>
          </div>
          {position.warnings?.map((w, i) => <p key={i} className="text-sm">{w}</p>)}
          {position.actions?.length > 0 && <p className="text-xs opacity-75">Next steps: {position.actions.join(' · ')}</p>}
        </div>
      )}

      {/* Registration profile */}
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-semibold text-sm">Registration profile</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Business KRA PIN</label>
            <div className="flex gap-2">
              <input className={field} placeholder="P000111222A" value={pin} onChange={(e) => setPin(e.target.value)} />
              <button
                className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
                disabled={!pin || update.isPending}
                onClick={() => update.mutate({ kra_pin: pin })}
              >Save</button>
            </div>
          </div>
          <div className="flex items-end">
            <button
              className="rounded border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
              disabled={!profile?.kra_pin || sync.isPending}
              onClick={() => sync.mutate()}
            >{sync.isPending ? 'Syncing…' : 'Sync obligations from KRA'}</button>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!profile?.vat_registered}
              onChange={(e) => update.mutate({ vat_registered: e.target.checked })} />
            VAT registered (allows charging & claiming VAT)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!profile?.auto_charge_vat}
              onChange={(e) => update.mutate({ auto_charge_vat: e.target.checked })} />
            Charge VAT on sales & invoices
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!profile?.tot_registered}
              onChange={(e) => update.mutate({ tot_registered: e.target.checked })} />
            Turnover Tax (TOT) registered
          </label>
        </div>

        {profile?.registered_obligations && profile.registered_obligations.length > 0 && (
          <div className="pt-2">
            <p className={label}>KRA obligations</p>
            <ul className="text-sm list-disc pl-5">
              {profile.registered_obligations.map((o, i) => <li key={i}>{o.name} <span className="text-muted-foreground">({o.type})</span></li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
