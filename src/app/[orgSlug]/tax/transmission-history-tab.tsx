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
];

const STATUS_COLORS: Record<string, string> = {
  transmitted: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
  retrying: 'bg-blue-100 text-blue-800',
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
        className="border-t hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3 text-xs font-mono text-gray-500">{record.id.slice(0, 8)}…</td>
        <td className="px-4 py-3 text-xs">
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium">
            {SOURCE_LABELS[record.source] ?? record.source}
          </span>
        </td>
        <td className="px-4 py-3 text-xs font-mono">{record.etims_receipt_number || '—'}</td>
        <td className="px-4 py-3 text-xs font-mono text-gray-500">{record.etims_cu_number || '—'}</td>
        <td className="px-4 py-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[record.transmission_status] ?? 'bg-gray-100 text-gray-700'}`}>
            {record.transmission_status}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">
          {record.transmitted_at
            ? new Date(record.transmitted_at).toLocaleString()
            : new Date(record.created_at).toLocaleString()}
        </td>
        <td className="px-4 py-3 text-right">
          {record.transmission_status === 'failed' && (
            <button
              className="rounded border border-blue-400 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 disabled:opacity-50"
              disabled={retrying}
              onClick={(e) => { e.stopPropagation(); onRetry(record.id); }}
            >
              Retry
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="border-t bg-gray-50">
          <td colSpan={7} className="px-4 py-3 text-xs space-y-1">
            {record.error_message && (
              <p className="text-red-600"><span className="font-medium">Error:</span> {record.error_message}</p>
            )}
            {record.rcpt_sign && (
              <p className="font-mono text-gray-600 break-all"><span className="font-medium">Receipt Signature:</span> {record.rcpt_sign}</p>
            )}
            <p className="text-gray-500">
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
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
              }`}
              onClick={() => { setStatusFilter(opt.value); setPage(0); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          className="rounded border px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
          onClick={() => refetch()}
        >
          Refresh
        </button>
      </div>

      {isLoading && (
        <div className="py-12 text-center text-sm text-gray-400">Loading transmissions…</div>
      )}

      {!isLoading && transmissions.length === 0 && (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-gray-400">
          No eTIMS transmissions found{statusFilter ? ` with status "${statusFilter}"` : ''}.
        </div>
      )}

      {!isLoading && transmissions.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Source</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Receipt #</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">CU Number</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
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
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{total} total</span>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-2 py-1">Page {page + 1} of {pageCount}</span>
                <button
                  disabled={page >= pageCount - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-gray-50"
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
