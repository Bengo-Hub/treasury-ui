'use client';

import { useState } from 'react';
import { useValidateKRAPIN, useCheckTaxCompliance, useTaxpayerObligations } from '@/hooks/use-tax';

interface Props { tenantSlug: string }

export function KRAComplianceTab({ tenantSlug }: Props) {
  const [pin, setPin] = useState('');
  const [tccNumber, setTccNumber] = useState('');
  const [pinResult, setPinResult] = useState<any>(null);
  const [tccResult, setTccResult] = useState<any>(null);
  const [obligationsPin, setObligationsPin] = useState('');

  const validatePIN = useValidateKRAPIN();
  const checkTCC = useCheckTaxCompliance();
  const { data: obligations, refetch: fetchObligations, isFetching: loadingObligations } =
    useTaxpayerObligations(tenantSlug, obligationsPin);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-semibold text-sm">KRA PIN Validation</h3>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded border px-3 py-2 text-sm"
            placeholder="Enter KRA PIN (e.g. P000111222A)"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          <button
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={!pin || validatePIN.isPending}
            onClick={() => validatePIN.mutate({ tenantSlug, pin }, { onSuccess: setPinResult })}
          >
            {validatePIN.isPending ? 'Validating...' : 'Validate PIN'}
          </button>
        </div>
        {pinResult?.PINDATA && (
          <div className="rounded bg-green-50 p-3 text-sm space-y-1">
            <p><span className="font-medium">Name:</span> {pinResult.PINDATA.Name}</p>
            <p><span className="font-medium">Type:</span> {pinResult.PINDATA.TypeOfTaxpayer}</p>
            <p>
              <span className="font-medium">Status:</span>{' '}
              <span className={pinResult.PINDATA.StatusOfPIN === 'Active' ? 'text-green-700' : 'text-red-600'}>
                {pinResult.PINDATA.StatusOfPIN}
              </span>
            </p>
          </div>
        )}
        {pinResult?.ErrorMessage && <p className="text-sm text-red-600">{pinResult.ErrorMessage}</p>}
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-semibold text-sm">Tax Compliance Certificate (TCC)</h3>
        <div className="flex gap-2">
          <input className="flex-1 rounded border px-3 py-2 text-sm" placeholder="KRA PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
          <input className="flex-1 rounded border px-3 py-2 text-sm" placeholder="TCC Number (optional)" value={tccNumber} onChange={(e) => setTccNumber(e.target.value)} />
          <button
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={!pin || checkTCC.isPending}
            onClick={() => checkTCC.mutate({ tenantSlug, pin, tccNumber }, { onSuccess: setTccResult })}
          >
            {checkTCC.isPending ? 'Checking...' : 'Check TCC'}
          </button>
        </div>
        {tccResult?.TCCDATA && (
          <div className="rounded bg-green-50 p-3 text-sm space-y-1">
            <p><span className="font-medium">Certificate:</span> {tccResult.TCCDATA.Number}</p>
            <p><span className="font-medium">Taxpayer:</span> {tccResult.TCCDATA.TaxpayerName}</p>
            <p>
              <span className="font-medium">Status:</span>{' '}
              <span className={tccResult.TCCDATA.Status === 'Valid' ? 'text-green-700' : 'text-red-600'}>{tccResult.TCCDATA.Status}</span>
            </p>
            <p><span className="font-medium">Expires:</span> {tccResult.TCCDATA.ExpiryDate}</p>
          </div>
        )}
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-semibold text-sm">Taxpayer Obligations</h3>
        <div className="flex gap-2">
          <input className="flex-1 rounded border px-3 py-2 text-sm" placeholder="KRA PIN" value={obligationsPin} onChange={(e) => setObligationsPin(e.target.value)} />
          <button
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={!obligationsPin || loadingObligations}
            onClick={() => fetchObligations()}
          >
            {loadingObligations ? 'Loading...' : 'Fetch'}
          </button>
        </div>
        {obligations?.OBLIGATIONS && obligations.OBLIGATIONS.length > 0 && (
          <table className="w-full text-sm border">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Due Date</th>
                <th className="px-3 py-2 text-right">Amount (KES)</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {obligations.OBLIGATIONS.map((o, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2">{o.ObligationCode}</td>
                  <td className="px-3 py-2">{o.ObligationDescription}</td>
                  <td className="px-3 py-2">{o.DueDate}</td>
                  <td className="px-3 py-2 text-right">{Number(o.Amount).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <span className={o.Status === 'Paid' ? 'text-green-700' : o.Status === 'Overdue' ? 'text-red-600' : 'text-yellow-700'}>
                      {o.Status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
