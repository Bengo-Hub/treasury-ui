'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle, X } from 'lucide-react';
import { useTaxEligibility } from '@/hooks/use-tax';

/**
 * TaxComplianceBanner — warns a business the moment it becomes eligible-but-non-compliant
 * (e.g. trailing 12-month turnover crosses the VAT threshold but VAT/eTIMS aren't active).
 * A business that qualifies for VAT but doesn't charge it becomes personally liable for the
 * uncollected VAT — this is the nudge to register + activate eTIMS. Brand-aware, dismissible
 * for the session. Hidden when the tenant is compliant (severity ok).
 */
export function TaxComplianceBanner() {
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) || '';
  const { data } = useTaxEligibility(orgSlug);
  const [dismissed, setDismissed] = useState(false);

  if (!orgSlug || dismissed || !data) return null;
  if (data.severity === 'ok' || !data.warnings?.length) return null;

  const critical = data.severity === 'critical';
  const tone = critical
    ? 'bg-destructive/10 border-destructive/30 text-destructive'
    : data.severity === 'warning'
      ? 'bg-primary/10 border-primary/30 text-foreground'
      : 'bg-muted border-border text-muted-foreground';

  return (
    <div className={`border-b px-4 sm:px-6 py-2.5 ${tone}`} role="alert">
      <div className="flex items-start gap-3">
        <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${critical ? 'text-destructive' : 'text-primary'}`} />
        <div className="flex-1 min-w-0 text-sm">
          <p className="font-semibold">
            {critical ? 'Tax compliance action required' : 'Tax compliance reminder'}
          </p>
          <p className="opacity-90">{data.warnings[0]}</p>
          {data.actions?.length > 0 && (
            <p className="mt-0.5 text-xs opacity-75">Next steps: {data.actions.join(' · ')}</p>
          )}
        </div>
        <Link
          href={`/${orgSlug}/tax`}
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          Review & activate
        </Link>
        <button
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded p-1 opacity-60 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
