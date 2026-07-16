'use client';

import { useState } from 'react';
import { useEtimsTransmissions, useRetryTransmission } from '@/hooks/use-tax';
import type { EtimsTransmissionRecord } from '@/lib/api/tax';

interface Props { tenantSlug: string }

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'transmitted', label: 'Transmitted' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'dead_letter', label: 'Dead letter' },
];

const STATUS_COLORS: Record<string, string> = {
  transmitted: 'bg-primary/10 text-primary',
  pending: 'bg-muted text-muted-foreground',
  failed: 'bg-destructive/10 text-destructive',
  retrying: 'bg-muted text-foreground',
  dead_letter: 'border border-destructive/40 bg-destructive/5 text-destructive',
};

const STATUS_LABELS: Record<string, string> = {
  dead_letter: 'dead letter',
};

const SOURCE_LABELS: Record<string, string> = {
  invoice: 'Invoice',
  pos_sale: 'POS Sale',
  ordering_sale: 'Order',
  vendor_bill: 'Purchase Bill',
};

function TransmissionRow({ record, tenantSlug, onRetry, retrying }: {
  record: EtimsTransmissionRecord;
  tenantSlug: string;
  onRetry: (id: string) => void;
  retrying: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="border-t hover:bg-muted cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{record.id.slice(0, 8)}…</td>
        <td className="px-4 py-3 text-xs">
          <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
            {SOURCE_LABELS[record.source] ?? record.source}
          </span>
        </td>
        <td className="px-4 py-3 text-xs font-mono">{record.invc_no ? record.invc_no : '—'}</td>
        <td className="px-4 py-3 text-xs font-mono">{record.etims_receipt_number || '—'}</td>
        <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{record.etims_cu_number || '—'}</td>
        <td className="px-4 py-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[record.transmission_status] ?? 'bg-muted text-foreground'}`}>
            {STATUS_LABELS[record.transmission_status] ?? record.transmission_status}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground">
          {record.transmitted_at
            ? new Date(record.transmitted_at).toLocaleString()
            : new Date(record.created_at).toLocaleString()}
        </td>
        <td className="px-4 py-3 text-right">
          {(record.transmission_status === 'failed' || record.transmission_status === 'dead_letter') && (
            <button
              className="rounded border border-primary/40 px-2 py-1 text-xs text-primary hover:bg-primary/10 disabled:opacity-50"
              disabled={retrying}
              onClick={(e) => { e.stopPropagation(); onRetry(record.id); }}
            >
              {record.transmission_status === 'dead_letter' ? 'Requeue' : 'Retry'}
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="border-t bg-muted">
          <td colSpan={8} className="px-4 py-3 text-xs space-y-1">
            {record.error_message && (
              <p className="text-destructive"><span className="font-medium">Error:</span> {record.error_message}</p>
            )}
            {record.rcpt_sign && (
              <p className="font-mono text-muted-foreground break-all"><span className="font-medium">Receipt Signature:</span> {record.rcpt_sign}</p>
            )}
            <p className="text-muted-foreground">
              <span className="font-medium">Retry count:</span> {record.retry_count} &nbsp;|&nbsp;
              <span className="font-medium">Created:</span> {new Date(record.created_at).toLocaleString()}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}

export function TransmissionHistoryTab({ tenantSlug }: Props) {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading, refetch } = useEtimsTransmissions(tenantSlug, statusFilter || undefined, limit, page * limit);
  const retry = useRetryTransmission();

  const transmissions = data?.transmissions ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.ceil(total / limit);

  const handleRetry = (recordId: string) => {
    retry.mutate({ tenantSlug, recordId });
  };

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

      {isLoading && (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading transmissions…</div>
      )}

      {!isLoading && transmissions.length === 0 && (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          No eTIMS transmissions found{statusFilter ? ` with status "${statusFilter}"` : ''}.
        </div>
      )}

      {!isLoading && transmissions.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">ID</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Source</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Invc No</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Receipt #</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">CU Number</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Time</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transmissions.map((rec) => (
                  <TransmissionRow
                    key={rec.id}
                    record={rec}
                    tenantSlug={tenantSlug}
                    onRetry={handleRetry}
                    retrying={retry.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{total} total</span>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-muted"
                >
                  Previous
                </button>
                <span className="px-2 py-1">Page {page + 1} of {pageCount}</span>
                <button
                  disabled={page >= pageCount - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-muted"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
