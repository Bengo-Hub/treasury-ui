'use client';

import { Card } from '@/components/ui/base';
import { useStatutoryRates, useComplianceCalendar } from '@/hooks/use-tax';
import { CalendarClock, Landmark } from 'lucide-react';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { buildStatutoryRateColumns } from './rates-calendar-columns';
import { useMemo } from 'react';

interface Props { tenantSlug: string }

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
  const rateColumns = useMemo(() => buildStatutoryRateColumns(), []);
  const rateRows = useMemo(() => rates.map((r, i) => ({ ...r, _key: `${r.code}-${i}` })), [rates]);

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
        <DataTable
          columns={rateColumns}
          rows={rateRows}
          rowKey={(r) => r._key}
          loading={ratesLoading}
          storageKey="statutory-rates-table"
          emptyText="No statutory rates configured."
        />
      </Card>
    </div>
  );
}
