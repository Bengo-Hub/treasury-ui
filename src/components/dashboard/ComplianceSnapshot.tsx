'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/base';
import { money } from '@/components/charts/chart-theme';
import { useTaxEligibility, useTaxPositionEstimate } from '@/hooks/use-tax';
import { ShieldCheck, AlertTriangle, CalendarClock } from 'lucide-react';

interface Props { tenant: string }

/**
 * ComplianceSnapshot — a tax-health card for the dashboard: eligibility severity + the next
 * obligations with due dates. Reuses the tax hooks (data ownership: treasury owns tax). Links to
 * the full Compliance tab.
 */
export function ComplianceSnapshot({ tenant }: Props) {
  const elig = useTaxEligibility(tenant);
  const pos = useTaxPositionEstimate(tenant);
  const sev = elig.data?.severity ?? 'ok';
  const critical = sev === 'critical';
  const ok = sev === 'ok';

  const tone = critical ? 'text-destructive' : sev === 'warning' ? 'text-yellow-600' : 'text-primary';
  const obligations = (pos.data?.obligations ?? []).slice(0, 3);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Tax compliance</h3>
        <Link href={`/${tenant}/tax`} className="text-xs text-primary hover:underline">Open</Link>
      </div>

      <div className={`flex items-start gap-2 text-sm ${tone}`}>
        {ok ? <ShieldCheck className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
        <span>{ok ? 'Compliant — no action required.' : (elig.data?.warnings?.[0] ?? 'Review your tax position.')}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-xs text-muted-foreground">Rolling 12m turnover</span>
          <div className="font-medium">{money(elig.data?.rolling_turnover_12m)}</div></div>
        <div><span className="text-xs text-muted-foreground">VAT this period</span>
          <div className="font-medium">{money(pos.data?.vat_payable)}</div></div>
      </div>

      {obligations.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {obligations.map((o, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />{o.obligation}
              </span>
              <span className={o.overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                {o.overdue ? `Overdue ${Math.abs(o.days_until_due)}d` : `${o.days_until_due}d`}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
