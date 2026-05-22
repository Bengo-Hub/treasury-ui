'use client';

import { useQuotationGraph } from '@/hooks/use-invoices';
import { cn } from '@/lib/utils';
import { BarChart2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

type ChartMode = 'line' | 'bar' | 'donut';

const MODES: { id: ChartMode; label: string }[] = [
  { id: 'line',  label: 'Line'  },
  { id: 'bar',   label: 'Bar'   },
  { id: 'donut', label: 'Donut' },
];

const DONUT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

interface Props { tenant: string; currency?: string }

export function QuotationGraph({ tenant, currency = 'KES' }: Props) {
  const { data: graphResponse } = useQuotationGraph(tenant);
  const graphData = graphResponse?.graph ?? [];
  const [open, setOpen]         = useState(true);
  const [mode, setMode]         = useState<ChartMode>('line');

  const fmtTick = (v: number) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000   ? `${(v / 1_000).toFixed(1)}K`
    : String(v);

  const fmtCurrency = (v: number) =>
    `${currency} ${v.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  const points = graphData.map(p => ({
    month:  p.month,
    Count:  p.count,
    Amount: Number(p.total_amount),
  }));

  // For donut: aggregate total amount per month as slices
  const donutSlices = points.map((p, i) => ({
    name:  p.month,
    value: p.Amount,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));

  const tooltipStyle = { fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' };
  const axisTickProps = { fontSize: 10, fill: '#94a3b8' };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const commonTooltipFormatter = (value: any, name: any) => {
    const n = Number(value ?? 0);
    return name === 'Amount' ? [fmtCurrency(n), name] : [n, name];
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 text-sm font-bold text-slate-900 hover:text-slate-700 transition-colors">
          <BarChart2 className="h-4 w-4 text-slate-400" />
          Quotation Graph
          {open
            ? <ChevronUp className="h-4 w-4 text-slate-400 ml-1" />
            : <ChevronDown className="h-4 w-4 text-slate-400 ml-1" />}
        </button>

        {open && (
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  'px-3 py-1 text-xs font-bold rounded-md transition-all',
                  mode === m.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}>
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="px-5 pb-5 border-t border-slate-100">
          {points.length === 0 ? (
            <p className="text-xs text-slate-400 font-medium py-6 text-center">No graph data yet.</p>
          ) : mode === 'line' ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={axisTickProps} />
                <YAxis yAxisId="count" orientation="left" tick={axisTickProps} width={28} />
                <YAxis yAxisId="amount" orientation="right" tickFormatter={fmtTick} tick={axisTickProps} width={44} />
                <Tooltip contentStyle={tooltipStyle} formatter={commonTooltipFormatter} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Line yAxisId="count" type="monotone" dataKey="Count" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line yAxisId="amount" type="monotone" dataKey="Amount" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : mode === 'bar' ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={axisTickProps} />
                <YAxis yAxisId="count" orientation="left" tick={axisTickProps} width={28} />
                <YAxis yAxisId="amount" orientation="right" tickFormatter={fmtTick} tick={axisTickProps} width={44} />
                <Tooltip contentStyle={tooltipStyle} formatter={commonTooltipFormatter} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Bar yAxisId="count" dataKey="Count" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar yAxisId="amount" dataKey="Amount" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            /* Donut — shows monthly amount distribution */
            <div className="flex items-center gap-6 pt-2">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={donutSlices}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutSlices.map((slice, i) => (
                      <Cell key={i} fill={slice.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any) => [fmtCurrency(Number(v ?? 0)), 'Amount']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[200px]">
                {donutSlices.map(s => (
                  <div key={s.name} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-600 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </span>
                    <span className="font-mono font-bold text-slate-900 shrink-0">{fmtTick(s.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
