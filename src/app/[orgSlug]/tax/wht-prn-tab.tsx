'use client';

import { useState } from 'react';
import { useGenerateRentalWHTPRN, useGenerateIncomeTaxWHTPRN, useGenerateVATWHTPRN } from '@/hooks/use-tax';
import type { WHTPaymentRequest, PRNResponse } from '@/lib/api/tax';

interface Props { tenantSlug: string }

function PRNForm({ title, tenantSlug, onGenerate, isPending }: {
  title: string; tenantSlug: string;
  onGenerate: (p: { tenantSlug: string; req: WHTPaymentRequest }) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<WHTPaymentRequest>({
    WithholdeePIN: '', WithholderPIN: '', Amount: 0, PaymentPeriod: '', PaymentDate: '',
  });
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h3 className="font-semibold text-sm">{title}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Withholdee KRA PIN</label>
          <input className="w-full rounded border px-3 py-2 text-sm" placeholder="PIN of the withholdee" value={form.WithholdeePIN} onChange={(e) => setForm({ ...form, WithholdeePIN: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Withholder KRA PIN</label>
          <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Your KRA PIN" value={form.WithholderPIN} onChange={(e) => setForm({ ...form, WithholderPIN: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Amount (KES)</label>
          <input type="number" className="w-full rounded border px-3 py-2 text-sm" placeholder="0.00" value={form.Amount || ''} onChange={(e) => setForm({ ...form, Amount: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Payment Period (YYYYMM)</label>
          <input className="w-full rounded border px-3 py-2 text-sm" placeholder="202406" value={form.PaymentPeriod} onChange={(e) => setForm({ ...form, PaymentPeriod: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Payment Date</label>
          <input type="date" className="w-full rounded border px-3 py-2 text-sm" value={form.PaymentDate} onChange={(e) => setForm({ ...form, PaymentDate: e.target.value })} />
        </div>
      </div>
      <button
        className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        disabled={!form.WithholdeePIN || !form.WithholderPIN || !form.Amount || isPending}
        onClick={() => onGenerate({ tenantSlug, req: form })}
      >
        {isPending ? 'Generating...' : 'Generate PRN'}
      </button>
    </div>
  );
}

export function WHTPaymentRefTab({ tenantSlug }: Props) {
  const rentalPRN = useGenerateRentalWHTPRN();
  const incomePRN = useGenerateIncomeTaxWHTPRN();
  const vatPRN = useGenerateVATWHTPRN();
  const [results, setResults] = useState<{ type: string; data: PRNResponse }[]>([]);

  const handleGenerate = (type: string, mutate: any) => (params: any) => {
    mutate.mutate(params, {
      onSuccess: (data: PRNResponse) => setResults((prev) => [{ type, data }, ...prev]),
    });
  };

  return (
    <div className="space-y-6">
      <PRNForm title="Rental Withholding Tax PRN" tenantSlug={tenantSlug} onGenerate={handleGenerate('Rental WHT', rentalPRN)} isPending={rentalPRN.isPending} />
      <PRNForm title="Income Tax Withholding PRN" tenantSlug={tenantSlug} onGenerate={handleGenerate('Income WHT', incomePRN)} isPending={incomePRN.isPending} />
      <PRNForm title="VAT Withholding PRN" tenantSlug={tenantSlug} onGenerate={handleGenerate('VAT WHT', vatPRN)} isPending={vatPRN.isPending} />
      {results.length > 0 && (
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="font-semibold text-sm">Generated PRNs</h3>
          {results.map((r, i) => (
            <div key={i} className="rounded bg-muted p-3 text-sm space-y-1">
              <p className="font-medium text-foreground">{r.type}</p>
              <p><span className="font-medium">PRN:</span> <span className="font-mono font-bold">{r.data.PRN}</span></p>
              <p><span className="font-medium">Amount:</span> KES {Number(r.data.Amount).toLocaleString()}</p>
              {r.data.PaymentSlip && (
                <p><span className="font-medium">Slip:</span> {r.data.PaymentSlip.SlipNumber} (expires {r.data.PaymentSlip.ExpiryDate})</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
