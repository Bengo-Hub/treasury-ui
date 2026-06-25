'use client';

import { Card } from '@/components/ui/base';
import { useStatutoryRates, useComplianceCalendar } from '@/hooks/use-tax';
import { CalendarClock, Landmark } from 'lucide-react';

interface Props { tenantSlug: string }

function rateLabel(rate: number | string, rateType: string): string {
  const n = Number(rate);
  if (rateType === 'percent' || rateType === 'percentage') return `${n}%`;
  if (rateType === 'fixed' || rateType === 'amount') return `KES ${n.toLocaleString()}`;
  return String(rate);
}

/**
 * RatesCalendarTab — Kenya statutory-rate reference (VAT/PAYE/WHT/TOT/CIT/NSSF/SHIF/AHL/…) plus
 * the derived compliance calendar (next filing/remittance due dates). Platform-global reference
 * data sourced from the in-force StatutoryRate set, so it stays correct as rates change.
 */
export function RatesCalendarTab({ tenantSlug }: Props) {
  const { data: ratesData, isLoading: ratesLoading } = useStatutoryRates(tenantSlug);
  const { data: calData, isLoading: calLoading } = useComplianceCalendar(tenantSlug);
  const rates = ratesData?.rates ?? [];
  const items = calData?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Compliance calendar */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Upcoming obligations</h3>
        </div>
        {calLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-9 animate-pulse rounded bg-muted" />)}</div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming obligations.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{it.obligation}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{it.frequency}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Next due <span className="font-medium text-foreground">{it.next_due_date}</span></p>
                {it.note && <p className="mt-1 text-xs text-muted-foreground">{it.note}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Statutory rates */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Kenya statutory rates ({rates.length})</h3>
        </div>
        {ratesLoading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-8 animate-pulse rounded bg-muted" />)}</div>
        ) : rates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No statutory rates configured.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-2 py-2 font-medium">Category</th>
                  <th className="px-2 py-2 font-medium">Name</th>
                  <th className="px-2 py-2 font-medium text-right">Rate</th>
                  <th className="px-2 py-2 font-medium">Frequency</th>
                  <th className="px-2 py-2 font-medium">Effective</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((r, i) => (
                  <tr key={`${r.code}-${i}`} className="border-b border-border/50 hover:bg-accent/5">
                    <td className="px-2 py-2"><span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase">{r.category}</span></td>
                    <td className="px-2 py-2">{r.name}{r.notes && <span className="block text-xs text-muted-foreground">{r.notes}</span>}</td>
                    <td className="px-2 py-2 text-right font-medium tabular-nums">{rateLabel(r.rate, r.rate_type)}</td>
                    <td className="px-2 py-2 text-muted-foreground">{r.filing_frequency || '—'}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">{r.effective_from ? new Date(r.effective_from).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
