'use client';

import type { ReactNode } from 'react';
import { Card } from '@/components/ui/base';
import { ShieldAlert } from 'lucide-react';

/**
 * ObligationGate hides an obligation-specific tax workflow when the tenant is NOT registered for
 * that obligation — e.g. a VAT-3 return or WHVAT-credit screen for a non-VAT-registered tenant, or
 * a Turnover-Tax return for a tenant not on TOT. Showing these unconditionally is misleading (the
 * tenant has no such filing). While the profile is still loading (`met === undefined`) children are
 * rendered optimistically to avoid a flash; only a definitive `false` gates the content.
 */
export function ObligationGate({
  met,
  title,
  message,
  children,
}: {
  met: boolean | undefined;
  title: string;
  message: string;
  children: ReactNode;
}) {
  if (met === false) {
    return (
      <Card className="p-8 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
        <h3 className="mt-3 text-sm font-semibold">{title}</h3>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">{message}</p>
        <p className="mx-auto mt-2 max-w-md text-[11px] text-muted-foreground/80">
          Set the tenant&apos;s registrations under <span className="font-medium">Compliance → Registration profile</span>.
        </p>
      </Card>
    );
  }
  return <>{children}</>;
}
