'use client';

import { useState } from 'react';
import { useFileTOTReturn, useFileNILReturn } from '@/hooks/use-tax';
import type { ReturnResponse } from '@/lib/api/tax';

interface Props { tenantSlug: string }

export function TaxReturnsTab({ tenantSlug }: Props) {
  const fileTOT = useFileTOTReturn();
  const fileNIL = useFileNILReturn();
  const [filedResults, setFiledResults] = useState<{ type: string; data: ReturnResponse }[]>([]);
  const [totForm, setTotForm] = useState({ pin: '', period: '', turnover: '', taxAmount: '', obligationCode: '007' });
  const [nilForm, setNilForm] = useState({ pin: '', obligationCode: '', month: '', year: '', returnType: 'Nil' });

  const handleTOT = () => fileTOT.mutate({
    tenantSlug,
    req: {
      TAXPAYERDETAILS: {
        TaxpayerPIN: totForm.pin, Period: totForm.period,
        TurnoverAmount: parseFloat(totForm.turnover) || 0,
        TaxAmount: parseFloat(totForm.taxAmount) || 0,
        ObligationCode: totForm.obligationCode,
      },
    },
  }, { onSuccess: (data) => setFiledResults((prev) => [{ type: 'TOT Return', data }, ...prev]) });

  const handleNIL = () => fileNIL.mutate({
    tenantSlug,
    req: {
      TAXPAYERDETAILS: {
        TaxpayerPIN: nilForm.pin, ObligationCode: nilForm.obligationCode,
        Month: nilForm.month, Year: nilForm.year, ReturnType: nilForm.returnType,
      },
    },
  }, { onSuccess: (data) => setFiledResults((prev) => [{ type: 'NIL Return', data }, ...prev]) });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-semibold text-sm">Turnover Tax (TOT) Return</h3>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-gray-500">KRA PIN</label><input className="w-full rounded border px-3 py-2 text-sm" placeholder="P000111222A" value={totForm.pin} onChange={(e) => setTotForm({ ...totForm, pin: e.target.value })} /></div>
          <div><label className="text-xs text-gray-500">Period (YYYYMM)</label><input className="w-full rounded border px-3 py-2 text-sm" placeholder="202406" value={totForm.period} onChange={(e) => setTotForm({ ...totForm, period: e.target.value })} /></div>
          <div><label className="text-xs text-gray-500">Turnover Amount</label><input type="number" className="w-full rounded border px-3 py-2 text-sm" value={totForm.turnover} onChange={(e) => setTotForm({ ...totForm, turnover: e.target.value })} /></div>
          <div><label className="text-xs text-gray-500">Tax Amount</label><input type="number" className="w-full rounded border px-3 py-2 text-sm" value={totForm.taxAmount} onChange={(e) => setTotForm({ ...totForm, taxAmount: e.target.value })} /></div>
          <div><label className="text-xs text-gray-500">Obligation Code</label><input className="w-full rounded border px-3 py-2 text-sm" value={totForm.obligationCode} onChange={(e) => setTotForm({ ...totForm, obligationCode: e.target.value })} /></div>
        </div>
        <button className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50" disabled={!totForm.pin || !totForm.period || fileTOT.isPending} onClick={handleTOT}>
          {fileTOT.isPending ? 'Filing...' : 'File TOT Return'}
        </button>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-semibold text-sm">NIL Return</h3>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-gray-500">KRA PIN</label><input className="w-full rounded border px-3 py-2 text-sm" placeholder="P000111222A" value={nilForm.pin} onChange={(e) => setNilForm({ ...nilForm, pin: e.target.value })} /></div>
          <div><label className="text-xs text-gray-500">Obligation Code</label><input className="w-full rounded border px-3 py-2 text-sm" placeholder="003 (VAT)" value={nilForm.obligationCode} onChange={(e) => setNilForm({ ...nilForm, obligationCode: e.target.value })} /></div>
          <div><label className="text-xs text-gray-500">Month (01-12)</label><input className="w-full rounded border px-3 py-2 text-sm" placeholder="06" value={nilForm.month} onChange={(e) => setNilForm({ ...nilForm, month: e.target.value })} /></div>
          <div><label className="text-xs text-gray-500">Year</label><input className="w-full rounded border px-3 py-2 text-sm" placeholder="2026" value={nilForm.year} onChange={(e) => setNilForm({ ...nilForm, year: e.target.value })} /></div>
        </div>
        <button className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50" disabled={!nilForm.pin || !nilForm.obligationCode || fileNIL.isPending} onClick={handleNIL}>
          {fileNIL.isPending ? 'Filing...' : 'File NIL Return'}
        </button>
      </div>

      {filedResults.length > 0 && (
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="font-semibold text-sm">Filed Returns</h3>
          {filedResults.map((r, i) => (
            <div key={i} className="rounded bg-green-50 p-3 text-sm space-y-1">
              <p className="font-medium text-green-800">{r.type}</p>
              <p><span className="font-medium">Ack:</span> {r.data.AcknowledgementNumber}</p>
              <p><span className="font-medium">Status:</span> {r.data.Status}</p>
              {r.data.Message && <p className="text-gray-600">{r.data.Message}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
