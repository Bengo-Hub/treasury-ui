'use client';

import { useMemo, useState } from 'react';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { StatCard } from '@/components/charts/StatCard';
import { buildTransmissionColumns, SOURCE_LABELS, TransmissionExpanded } from './transmission-columns';
import { useEtimsTransmissions, useEtimsTransmissionStats, useRetryTransmission } from '@/hooks/use-tax';

interface Props { tenantSlug: string }

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

// YYYY-MM-DD in the viewer's calendar, which is what the stats route expects for from and to.
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'transmitted', label: 'Transmitted' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'dead_letter', label: 'Dead letter' },
];

export function TransmissionHistoryTab({ tenantSlug }: Props) {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading, refetch } = useEtimsTransmissions(tenantSlug, statusFilter || undefined, limit, page * limit);
  const retry = useRetryTransmission();

  const [rangeDays, setRangeDays] = useState(30);
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - rangeDays);
    return { from: isoDay(from), to: isoDay(to) };
  }, [rangeDays]);
  const { data: stats, isLoading: statsLoading } = useEtimsTransmissionStats(tenantSlug, range);
  const waiting = (stats?.by_status?.pending ?? 0) + (stats?.by_status?.retrying ?? 0);
  const needsAttention = (stats?.by_status?.failed ?? 0) + (stats?.by_status?.dead_letter ?? 0);
  const ratePct = (stats?.success_rate ?? 0) * 100;
  const sourceSummary = Object.entries(stats?.by_source ?? {})
    .map(([source, byStatus]) => `${SOURCE_LABELS[source] ?? source} ${Object.values(byStatus).reduce((a, b) => a + b, 0)}`)
    .join(' · ');

  const transmissions = data?.transmissions ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  const handleRetry = (recordId: string) => {
    retry.mutate({ tenantSlug, recordId });
  };

  const columns = useMemo(
    () => buildTransmissionColumns({ tenantSlug, onRetry: handleRetry, retrying: retry.isPending }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tenantSlug, retry.isPending],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Documents sent to KRA in the last{' '}
            {RANGES.map((r) => (
              <button
                key={r.days}
                type="button"
                onClick={() => setRangeDays(r.days)}
                aria-pressed={rangeDays === r.days}
                className={`mx-0.5 rounded-full border px-2 py-0.5 font-medium transition-colors ${
                  rangeDays === r.days ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/40'
                }`}
              >
                {r.label}
              </button>
            ))}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Success rate"
            value={stats && stats.total > 0 ? `${ratePct.toFixed(ratePct === 100 || ratePct === 0 ? 0 : 1)}%` : '—'}
            tone={!stats || stats.total === 0 ? 'default' : ratePct >= 95 ? 'success' : ratePct >= 80 ? 'warning' : 'destructive'}
            loading={statsLoading}
            hint={`${stats?.total ?? 0} documents`}
          />
          <StatCard label="Transmitted" value={String(stats?.transmitted ?? 0)} tone="success" loading={statsLoading} hint="Signed by KRA" />
          <StatCard label="Waiting" value={String(waiting)} tone="default" loading={statsLoading} hint="Pending or retrying" />
          <StatCard
            label="Needs attention"
            value={String(needsAttention)}
            tone={needsAttention > 0 ? 'destructive' : 'default'}
            loading={statsLoading}
            hint="Failed or dead letter"
          />
        </div>
        {sourceSummary && <p className="text-xs text-muted-foreground">By document: {sourceSummary}</p>}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                statusFilter === opt.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/40'
              }`}
              onClick={() => { setStatusFilter(opt.value); setPage(0); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          className="rounded border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
          onClick={() => refetch()}
        >
          Refresh
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={transmissions}
        rowKey={(r) => r.id}
        loading={isLoading}
        loadingRows={8}
        storageKey="etims-transmissions-table"
        emptyText={`No eTIMS transmissions found${statusFilter ? ` with status "${statusFilter}"` : ''}.`}
        renderExpanded={(record) => <TransmissionExpanded record={record} tenantSlug={tenantSlug} />}
        page={page + 1}
        totalPages={pageCount}
        onPageChange={(p) => setPage(p - 1)}
        total={total}
        pageSize={limit}
      />
    </div>
  );
}
