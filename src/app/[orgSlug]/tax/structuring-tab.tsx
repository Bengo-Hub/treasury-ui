'use client';

import { useState } from 'react';
import { useStructuringGuidance } from '@/hooks/use-tax';

interface Props { tenantSlug: string }

const label = 'text-xs text-muted-foreground';
const field = 'rounded border px-3 py-2 text-sm';

function money(v?: string) {
  return `KES ${Number(v ?? 0).toLocaleString()}`;
}

/**
 * Structuring guidance — the "mini tax/legal advisor" surface: how to fund/extract value from the
 * company without it being taxed as income (director loan vs capital injection vs salary vs
 * dividend) plus a 30%-of-EBITDA interest-deduction-cap simulator.
 */
export function StructuringTab({ tenantSlug }: Props) {
  const [ebitda, setEbitda] = useState('');
  const [interest, setInterest] = useState('');
  const params = { ebitda: Number(ebitda) || undefined, gross_interest: Number(interest) || undefined };
  const { data } = useStructuringGuidance(tenantSlug, params);

  const cap = data?.interest_cap;
  const overCap = cap && Number(cap.disallowed_interest) > 0;

  return (
    <div className="space-y-6">
      {/* Interest-cap simulator */}
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-semibold text-sm">Interest-deduction cap (30% of EBITDA)</h3>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="min-w-[160px]">
            <label className={label}>EBITDA (KES)</label>
            <input className={`${field} w-full`} type="number" placeholder="0" value={ebitda} onChange={(e) => setEbitda(e.target.value)} />
          </div>
          <div className="min-w-[160px]">
            <label className={label}>Gross interest expense (KES)</label>
            <input className={`${field} w-full`} type="number" placeholder="0" value={interest} onChange={(e) => setInterest(e.target.value)} />
          </div>
        </div>
        {cap && (
          <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm rounded p-3 ${overCap ? 'bg-destructive/10' : 'bg-muted'}`}>
            <div><span className={label}>Interest cap (30%)</span><div className="font-medium">{money(cap.interest_cap)}</div></div>
            <div><span className={label}>Allowed interest</span><div className="font-medium text-primary">{money(cap.allowed_interest)}</div></div>
            <div><span className={label}>Disallowed interest</span><div className="font-medium text-destructive">{money(cap.disallowed_interest)}</div></div>
            <div><span className={label}>Extra tax (CIT {Number(cap.cit_rate)}%)</span><div className="font-medium text-destructive">{money(cap.additional_tax)}</div></div>
          </div>
        )}
        {cap?.note && <p className="text-xs text-muted-foreground">{cap.note}</p>}
      </div>

      {/* Structuring options */}
      <div className="grid gap-3 md:grid-cols-2">
        {data?.options.map((o) => (
          <div key={o.key} className="rounded-lg border p-4 space-y-2">
            <h4 className="font-semibold text-sm">{o.title}</h4>
            <p className="text-sm"><span className={label}>When to use</span><br />{o.when_to_use}</p>
            <p className="text-sm"><span className={label}>Tax treatment</span><br />{o.tax_treatment}</p>
            {o.documentation?.length > 0 && (
              <div>
                <span className={label}>Documentation</span>
                <ul className="text-sm list-disc pl-5">{o.documentation.map((d, i) => <li key={i}>{d}</li>)}</ul>
              </div>
            )}
            {o.red_flags?.length > 0 && (
              <div>
                <span className={label}>Red flags</span>
                <ul className="text-sm list-disc pl-5 text-destructive">{o.red_flags.map((d, i) => <li key={i}>{d}</li>)}</ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {data?.notes?.map((n, i) => <p key={i} className="text-xs text-muted-foreground">{n}</p>)}
    </div>
  );
}
