'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/base';
import { usePlatformReferralPerformance } from '@/hooks/use-platform-analytics';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { buildReferralEarnerColumns } from './referral-earner-columns';
import { Award } from 'lucide-react';
import { useMemo } from 'react';

interface Props {
  from?: string;
  to?: string;
}

/**
 * ReferralPerformancePanel — active referral-program count + the top-earning referrers for the
 * period, from `/platform/analytics/referral-performance`. Reuses the shared DataTable (mirroring
 * referral-columns.tsx's conventions) instead of a hand-rolled list.
 */
export function ReferralPerformancePanel({ from, to }: Props) {
  const { data, isLoading, isError } = usePlatformReferralPerformance(from, to, 10);
  const earners = data?.top_earners ?? [];
  const columns = useMemo(() => buildReferralEarnerColumns(data?.currency || 'KES'), [data?.currency]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">Referral Performance</h3>
          </div>
          {!isLoading && !isError && (
            <span className="text-xs font-semibold text-muted-foreground shrink-0">
              {data?.active_programs ?? 0} active program{(data?.active_programs ?? 0) === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">Top-earning referrers this period.</p>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          rows={earners}
          rowKey={(r) => r.referral_id || `${r.holder_id}-${r.referred_tenant_id ?? 'none'}`}
          loading={isLoading}
          loadingRows={5}
          error={isError}
          storageKey="platform-referral-performance-table"
          emptyText="No referral earnings in this period"
        />
      </CardContent>
    </Card>
  );
}
