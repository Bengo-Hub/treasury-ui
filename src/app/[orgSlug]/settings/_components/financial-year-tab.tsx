'use client';

import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { FormField } from '@/components/ui/form-field';
import { useFiscalYear, useUpdateFiscalYear } from '@/hooks/use-settings';
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
 * FinancialYearTab lets a tenant pick the month/day their financial year begins.
 * This is configuration only — it does NOT (yet) change report/period behavior;
 * it stores the window and shows the derived current fiscal year for reference.
 */
export function FinancialYearTab({ tenantSlug }: { tenantSlug: string }) {
  const { data, isLoading } = useFiscalYear(tenantSlug);
  const updateFY = useUpdateFiscalYear(tenantSlug);

  const [startMonth, setStartMonth] = useState(1);
  const [startDay, setStartDay] = useState(1);

  useEffect(() => {
    if (!data) return;
    setStartMonth(data.start_month || 1);
    setStartDay(data.start_day || 1);
  }, [data]);

  const handleSave = () => {
    updateFY.mutate(
      { start_month: startMonth, start_day: startDay },
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
          Choose the month (and optionally the day) your financial year begins. In Kenya this is
          commonly January or July. This setting is used to label and bound future financial-year
          reporting — it does not change existing reports yet.
        </p>

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
