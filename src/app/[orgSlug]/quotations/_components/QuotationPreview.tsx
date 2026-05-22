'use client';

import { useQuotation } from '@/hooks/use-invoices';
import { Badge } from '@/components/ui/base';
import { cn } from '@/lib/utils';
import {
  Copy, Download, ExternalLink, Link2, Mail, Pencil, X,
} from 'lucide-react';

function statusBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary' {
  switch (status?.toLowerCase()) {
    case 'accepted':  return 'success';
    case 'sent':      return 'default';
    case 'draft':     return 'secondary';
    case 'expired':   return 'warning';
    case 'declined':  return 'error';
    case 'converted': return 'success';
    default:          return 'outline';
  }
}

interface Props {
  quotationId: string;
  tenant: string;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
}

const fmt = (v: string | number) =>
  Number(v).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export function QuotationPreview({ quotationId, tenant, onClose, onEdit, onDuplicate }: Props) {
  const { data: q, isLoading } = useQuotation(tenant, quotationId);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">Quick Preview</h2>
            {q && (
              <Badge variant={statusBadgeVariant(q.status)} className="capitalize text-[10px]">
                {q.status}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {[
              { icon: <ExternalLink className="h-4 w-4" />, label: 'Open', onClick: () => {
                if (q?.public_token) window.open(`/q/${q.public_token}`, '_blank');
              }},
              { icon: <Link2 className="h-4 w-4" />, label: 'Share Link', onClick: () => {
                if (q?.public_token) navigator.clipboard.writeText(`${window.location.origin}/q/${q.public_token}`);
              }},
              { icon: <Mail className="h-4 w-4" />, label: 'Email', onClick: () => {} },
              { icon: <Copy className="h-4 w-4" />, label: 'Duplicate', onClick: onDuplicate },
              { icon: <Download className="h-4 w-4" />, label: 'Download', onClick: () => {} },
              { icon: <Pencil className="h-4 w-4" />, label: 'Edit', onClick: onEdit },
            ].map(({ icon, label, onClick }) => (
              <button key={label} title={label} onClick={onClick}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors">
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors ml-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Panel body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm font-medium">
              Loading…
            </div>
          )}

          {q && (
            <div className="space-y-6 text-sm">
              {/* Document header */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">QUOTATION</h1>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{q.quote_number}</p>
                </div>
                <div className="h-14 w-14 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">
                  Logo
                </div>
              </div>

              {/* Meta row */}
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">Quotation Date</p>
                  <p className="font-semibold text-slate-800">{fmtDate(q.quote_date)}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">Valid Until</p>
                  <p className="font-semibold text-slate-800">{fmtDate(q.valid_until)}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">Currency</p>
                  <p className="font-semibold text-slate-800">{q.currency}</p>
                </div>
              </div>

              {/* Client block */}
              {(q.customer_name || q.customer_email) && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quotation For</p>
                  {q.customer_name && <p className="font-bold text-slate-900">{q.customer_name}</p>}
                  {q.customer_email && <p className="font-mono text-slate-500 text-xs">{q.customer_email}</p>}
                </div>
              )}

              {/* Line items */}
              {q.lines && q.lines.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Line Items</p>
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wide text-[10px]">
                          <th className="p-2.5 pl-3 text-left">Item</th>
                          <th className="p-2.5 text-right">Qty</th>
                          <th className="p-2.5 text-right">Rate</th>
                          <th className="p-2.5 text-right">Tax</th>
                          <th className="p-2.5 pr-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {q.lines.map((line, i) => (
                          <tr key={line.id ?? i} className="hover:bg-slate-50/40">
                            <td className="p-2.5 pl-3 font-medium text-slate-800">{line.description}</td>
                            <td className="p-2.5 text-right text-slate-600 tabular-nums">{fmt(line.quantity)}</td>
                            <td className="p-2.5 text-right text-slate-600 tabular-nums">{fmt(line.unit_price)}</td>
                            <td className="p-2.5 text-right text-slate-500 tabular-nums">{fmt(line.tax_amount)}</td>
                            <td className="p-2.5 pr-3 text-right font-bold text-slate-900 tabular-nums">{fmt(line.line_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="flex justify-end">
                <div className="space-y-1.5 min-w-[200px]">
                  {[
                    { label: 'Subtotal', value: q.subtotal },
                    { label: 'Tax', value: q.tax_amount },
                    { label: 'Discount', value: q.discount_amount },
                  ].filter(r => Number(r.value) > 0).map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-xs text-slate-600 font-medium">
                      <span>{label}</span>
                      <span className="tabular-nums font-semibold">{fmt(value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 pt-2 mt-2">
                    <span>Total ({q.currency})</span>
                    <span className="tabular-nums">{fmt(q.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Notes / Terms */}
              {q.notes && (
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-slate-600 text-xs leading-relaxed">{q.notes}</p>
                </div>
              )}
              {q.terms && (
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Terms & Conditions</p>
                  <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-line">{q.terms}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
