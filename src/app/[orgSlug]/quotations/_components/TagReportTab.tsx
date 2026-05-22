'use client';

import { Card, CardContent } from '@/components/ui/base';
import { cn } from '@/lib/utils';
import { ArrowUpDown, Calendar, Check, Columns, Download } from 'lucide-react';
import { useState } from 'react';

export function TagReportTab() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string[]>(['all']);

  const statusOptions = ['All', 'Draft', 'Sent', 'Accepted', 'Declined', 'Expired', 'Converted'];

  const toggleStatus = (s: string) => {
    const key = s.toLowerCase();
    if (key === 'all') { setSelectedStatus(['all']); return; }
    setSelectedStatus(prev => {
      const without = prev.filter(x => x !== 'all');
      return without.includes(key)
        ? (without.filter(x => x !== key).length ? without.filter(x => x !== key) : ['all'])
        : [...without, key];
    });
  };

  const fmt = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  const dateLabel = dateFrom || dateTo ? `${fmt(dateFrom)} – ${fmt(dateTo)}` : 'Select date range';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <h2 className="text-lg font-black text-slate-900 tracking-tight">Tag Wise Report</h2>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Invoice Date</label>
          <div className="relative inline-flex items-center gap-2">
            <div onClick={() => setShowDatePicker(o => !o)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer hover:border-slate-300 shadow-sm transition-all min-w-[220px]">
              <span>{dateLabel}</span>
              <Calendar className="h-3.5 w-3.5 text-slate-400 ml-auto" />
            </div>
            {showDatePicker && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-4 space-y-3 min-w-[260px]">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">From</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-slate-900" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">To</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-slate-900" />
                </div>
                <button onClick={() => setShowDatePicker(false)}
                  className="w-full py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all">
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Select Quotation Status</label>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map(s => {
              const key = s.toLowerCase();
              const isActive = selectedStatus.includes(key);
              return (
                <button key={s} onClick={() => toggleStatus(s)}
                  className={cn(
                    'inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all',
                    isActive
                      ? 'bg-white border-violet-400 text-violet-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                  )}>
                  {isActive && <Check className="h-3 w-3 text-violet-500" />}
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all">
          <Download className="h-3.5 w-3.5 text-slate-400" /> Download CSV
        </button>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all">
          <Columns className="h-3.5 w-3.5 text-slate-400" /> Show/Hide Columns
        </button>
      </div>

      <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-semibold text-[11px]">
                <th className="p-3 pl-4 w-8"><input type="checkbox" className="rounded border-slate-300 focus:ring-0" disabled /></th>
                {['Tag Name', 'Last Quotation Date', 'Total Quotation', 'Total Quotation Amount', 'Total GST'].map(col => (
                  <th key={col} className="p-3">
                    <button className="inline-flex items-center gap-1 hover:text-slate-800 transition-colors font-bold uppercase tracking-wide">
                      {col} <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6}>
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="mb-4">
                      <div className="h-20 w-24 rounded-2xl bg-violet-100/60 flex items-center justify-center mx-auto">
                        <div className="relative">
                          <div className="h-10 w-14 bg-violet-200/80 rounded-md border-2 border-violet-300/60" />
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-3 w-8 bg-violet-300/60 rounded-t-md" />
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-6 bg-violet-400/40 rounded-full" />
                        </div>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-500">No Data</p>
                    <p className="text-xs text-slate-400 mt-1">No records found for the selected filters.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
