'use client';

import { useMemo, useState } from 'react';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { buildTransmissionColumns, TransmissionExpanded } from './transmission-columns';
import { useEtimsTransmissions, useRetryTransmission } from '@/hooks/use-tax';

interface Props { tenantSlug: string }

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
