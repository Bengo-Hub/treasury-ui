'use client';

import { useEffect, useState } from 'react';
import {
  useTaxEligibility,
  useTaxProfile,
  useUpdateTaxProfile,
  useSyncTaxObligations,
  useValidateKRAPIN,
  useCheckTaxCompliance,
} from '@/hooks/use-tax';

interface Props { tenantSlug: string }

const field = 'w-full rounded border px-3 py-2 text-sm';
const label = 'text-xs text-muted-foreground';

function money(v?: string) {
  const n = Number(v ?? 0);
  return `KES ${n.toLocaleString()}`;
}

/**
 * Unified Compliance tab — the tenant's tax position + registration profile in one place.
 * Merges the former "KRA Compliance" tab (PIN validation, TCC check, obligations) into the
 * profile so the single saved KRA PIN drives every check (no duplicate PIN entry / obligations
 * fetch). Obligations are pulled into the profile via Sync and displayed below.
 */
export function TaxProfileTab({ tenantSlug }: Props) {
  const { data: profile } = useTaxProfile(tenantSlug);
  const { data: position } = useTaxEligibility(tenantSlug);
  const update = useUpdateTaxProfile(tenantSlug);
  const sync = useSyncTaxObligations(tenantSlug);
  const validatePIN = useValidateKRAPIN();
  const checkTCC = useCheckTaxCompliance();

  const [pin, setPin] = useState('');
  const [tccNumber, setTccNumber] = useState('');
  const [pinResult, setPinResult] = useState<any>(null);
  const [tccResult, setTccResult] = useState<any>(null);
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
              <button
                className="rounded border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                disabled={!pin || validatePIN.isPending}
                onClick={() => validatePIN.mutate({ tenantSlug, pin }, { onSuccess: setPinResult })}
              >{validatePIN.isPending ? 'Validating…' : 'Validate'}</button>
            </div>
            {pinResult?.PINDATA && (
              <div className="mt-2 rounded bg-muted p-3 text-sm space-y-1">
                <p><span className="font-medium">Name:</span> {pinResult.PINDATA.Name}</p>
                <p><span className="font-medium">Type:</span> {pinResult.PINDATA.TypeOfTaxpayer}</p>
                <p><span className="font-medium">Status:</span>{' '}
                  <span className={pinResult.PINDATA.StatusOfPIN === 'Active' ? 'text-primary' : 'text-destructive'}>{pinResult.PINDATA.StatusOfPIN}</span>
                </p>
              </div>
            )}
            {pinResult?.ErrorMessage && <p className="mt-2 text-sm text-destructive">{pinResult.ErrorMessage}</p>}
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

      {/* Tax Compliance Certificate (TCC) */}
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-semibold text-sm">Tax Compliance Certificate (TCC)</h3>
        <div className="flex gap-2">
          <input className="flex-1 rounded border px-3 py-2 text-sm" placeholder="KRA PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
          <input className="flex-1 rounded border px-3 py-2 text-sm" placeholder="TCC Number (optional)" value={tccNumber} onChange={(e) => setTccNumber(e.target.value)} />
          <button
            className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            disabled={!pin || checkTCC.isPending}
            onClick={() => checkTCC.mutate({ tenantSlug, pin, tccNumber }, { onSuccess: setTccResult })}
          >{checkTCC.isPending ? 'Checking…' : 'Check TCC'}</button>
        </div>
        {tccResult?.TCCData && (
          <div className="rounded bg-muted p-3 text-sm space-y-1">
            <p><span className="font-medium">Certificate:</span> {tccResult.TCCData.TCCNumber}</p>
            <p><span className="font-medium">KRA PIN:</span> {tccResult.TCCData.KRAPIN}</p>
            <p><span className="font-medium">Status:</span>{' '}
              <span className={tccResult.TCCData.TCCStatus === 'Approved' ? 'text-primary' : 'text-destructive'}>{tccResult.TCCData.TCCStatus}</span>
            </p>
            <p><span className="font-medium">Issued:</span> {tccResult.TCCData.TCCIssueDate} &middot; <span className="font-medium">Expires:</span> {tccResult.TCCData.TCCExpiryDate}</p>
          </div>
        )}
      </div>
    </div>
  );
}
