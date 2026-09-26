'use client';

import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { FormField } from '@/components/ui/form-field';
import { useFiscalYear, useUpdateFiscalYear } from '@/hooks/use-settings';
import type { PeriodFrequency } from '@/lib/api/settings';
import { CalendarRange, Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { YearEndClosePanel } from './year-end-close-panel';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const inputClass =
  'w-full bg-accent/10 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary outline-none';

/**
 * FinancialYearTab sets when the tenant's financial year begins and how it is divided into
 * accounting periods (monthly or quarterly). Periods are generated automatically from these
 * settings, the current and next year ahead of time; a tenant that never saves them gets a
 * calendar year with monthly periods.
 */
export function FinancialYearTab({ tenantSlug }: { tenantSlug: string }) {
  const { data, isLoading } = useFiscalYear(tenantSlug);
  const updateFY = useUpdateFiscalYear(tenantSlug);

  const [startMonth, setStartMonth] = useState(1);
  const [startDay, setStartDay] = useState(1);
  const [frequency, setFrequency] = useState<PeriodFrequency>('monthly');
  // "" = automatic (the earlier of registration and the first booked transaction).
  const [booksStart, setBooksStart] = useState('');

  useEffect(() => {
    if (!data) return;
    setStartMonth(data.start_month || 1);
    setStartDay(data.start_day || 1);
    setFrequency(data.period_frequency === 'quarterly' ? 'quarterly' : 'monthly');
    setBooksStart(data.books_start ?? '');
  }, [data]);

  const handleSave = () => {
    updateFY.mutate(
      { start_month: startMonth, start_day: startDay, period_frequency: frequency, books_start: booksStart },
      {
        onSuccess: () => toast.success('Financial year saved'),
        onError: (err: any) =>
          toast.error(err?.response?.data?.message || err?.message || 'Failed to save'),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-[30vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground opacity-30" />
        <p className="text-sm text-muted-foreground">Loading financial year...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader className="border-b border-border/50 py-4">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm uppercase tracking-tight">Financial Year</h3>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <p className="text-xs text-muted-foreground">
          Choose the month (and optionally the day) your financial year begins, and how the year is
          divided into accounting periods. In Kenya the year commonly starts in January or July.
          Periods are generated automatically and every journal entry is linked to its period. A
          new frequency applies to years that have no periods yet; existing periods are kept.
        </p>

        {data?.presets && data.presets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-semibold text-muted-foreground self-center">Quick select:</span>
            {data.presets.map((p) => {
              const active = startMonth === p.start_month && startDay === p.start_day;
              return (
                <button
                  key={p.key}
                  type="button"
                  title={p.description}
                  onClick={() => {
                    setStartMonth(p.start_month);
                    setStartDay(p.start_day);
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    active ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent/30'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Fiscal Year Starts In">
            <select
              value={startMonth}
              onChange={(e) => setStartMonth(parseInt(e.target.value) || 1)}
              className={inputClass}
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Start Day" description="Day of the start month (1-28).">
            <input
              type="number"
              min={1}
              max={28}
              value={startDay}
              onChange={(e) => setStartDay(parseInt(e.target.value) || 1)}
              className={`${inputClass} w-40 font-mono`}
            />
          </FormField>
          <FormField label="Accounting Periods" description="How the financial year is divided for period close.">
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value === 'quarterly' ? 'quarterly' : 'monthly')}
              className={inputClass}
            >
              <option value="monthly">Monthly (12 periods)</option>
              <option value="quarterly">Quarterly (4 periods)</option>
            </select>
          </FormField>
          <FormField
            label="Books Start"
            description="First month the business traded. Leave empty for automatic (registration or first transaction, whichever is earlier). No periods are kept before it."
          >
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={booksStart}
                max={new Date().toISOString().slice(0, 7)}
                onChange={(e) => setBooksStart(e.target.value)}
                className={`${inputClass} w-48`}
              />
              {booksStart && (
                <button type="button" className="text-xs text-primary hover:underline" onClick={() => setBooksStart('')}>
                  Use automatic
                </button>
              )}
            </div>
          </FormField>
        </div>

        {data && (
          <div className="rounded-xl bg-accent/10 border border-border p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Current Financial Year
            </p>
            <p className="text-sm font-semibold">{data.fy_label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.fy_start} &rarr; {data.fy_end}
            </p>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button size="sm" className="gap-2" disabled={updateFY.isPending} onClick={handleSave}>
            {updateFY.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Financial Year
          </Button>
        </div>
      </CardContent>
    </Card>

      {/* Year-End Close — only renders for users with the close permission. */}
      <YearEndClosePanel tenantSlug={tenantSlug} />
    </div>
  );
}
