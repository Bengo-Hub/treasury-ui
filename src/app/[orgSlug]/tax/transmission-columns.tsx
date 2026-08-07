'use client';

// DataTable column definitions + expanded-row content for the Transmission
// History tab — split out of transmission-history-tab.tsx to mirror the
// vendors/expenses/budgets list convention. The per-row expand (chevron) now
// comes from DataTable's own renderExpanded/chevron affordance instead of a
// row onClick toggle — the feature (view error/retry/receipt detail) is
// unchanged, only triggered via the chevron rather than anywhere on the row.

import { useState } from 'react';
import Link from 'next/link';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { EtimsResponseModal } from '@/components/tax/etims-response-modal';
import type { EtimsTransmissionRecord } from '@/lib/api/tax';

function localDocHref(tenantSlug: string, record: EtimsTransmissionRecord): string | null {
  const id = record.invoice_id || record.source_id;
  if (!id) return null;
  if (record.source === 'invoice') return `/${tenantSlug}/invoices/${id}`;
  return null;
}

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

export const SOURCE_LABELS: Record<string, string> = {
  invoice: 'Invoice',
  pos_sale: 'POS Sale',
  ordering_sale: 'Order',
  vendor_bill: 'Purchase Bill',
};

export interface TransmissionColumnCallbacks {
  tenantSlug: string;
  onRetry: (id: string) => void;
  retrying: boolean;
}

export function buildTransmissionColumns(cb: TransmissionColumnCallbacks): DataTableColumn<EtimsTransmissionRecord>[] {
  return [
    { key: 'id', header: 'ID', cellClassName: 'font-mono text-xs text-muted-foreground', accessor: (r) => r.id, render: (r) => `${r.id.slice(0, 8)}…` },
    {
      key: 'source', header: 'Source', primary: true, filterable: true,
      filterOptions: Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label })),
      accessor: (r) => r.source,
      render: (r) => <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">{SOURCE_LABELS[r.source] ?? r.source}</span>,
    },
    { key: 'invc_no', header: 'Invc No', cellClassName: 'font-mono text-xs', accessor: (r) => r.invc_no ?? '', render: (r) => (r.invc_no ? r.invc_no : '—') },
    { key: 'etims_receipt_number', header: 'Receipt #', mobileHidden: true, cellClassName: 'font-mono text-xs', accessor: (r) => r.etims_receipt_number ?? '', render: (r) => r.etims_receipt_number || '—' },
    { key: 'etims_cu_number', header: 'CU Number', mobileHidden: true, cellClassName: 'font-mono text-xs text-muted-foreground', accessor: (r) => r.etims_cu_number ?? '', render: (r) => r.etims_cu_number || '—' },
    {
      key: 'transmission_status', header: 'Status', mobileAction: true,
      accessor: (r) => r.transmission_status,
      render: (r) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.transmission_status] ?? 'bg-muted text-foreground'}`}>
          {STATUS_LABELS[r.transmission_status] ?? r.transmission_status}
        </span>
      ),
    },
    {
      key: 'time', header: 'Time', mobileHidden: true, cellClassName: 'text-muted-foreground',
      accessor: (r) => r.transmitted_at ?? r.created_at,
      render: (r) => new Date(r.transmitted_at ?? r.created_at).toLocaleString(),
    },
    {
      key: 'actions', header: 'Actions', align: 'right', exportable: false,
      render: (record) =>
        record.transmission_status === 'failed' || record.transmission_status === 'dead_letter' ? (
          <button
            className="rounded border border-primary/40 px-2 py-1 text-xs text-primary hover:bg-primary/10 disabled:opacity-50"
            disabled={cb.retrying}
            onClick={(e) => { e.stopPropagation(); cb.onRetry(record.id); }}
          >
            {record.transmission_status === 'dead_letter' ? 'Requeue' : 'Retry'}
          </button>
        ) : null,
    },
  ];
}

/** Expanded-row content: error/receipt-signature detail + a modal with the full payload. */
export function TransmissionExpanded({ record, tenantSlug }: { record: EtimsTransmissionRecord; tenantSlug: string }) {
  const [showDetails, setShowDetails] = useState(false);
  const href = localDocHref(tenantSlug, record);

  return (
    <div className="space-y-1 text-xs">
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
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          className="rounded border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent"
          onClick={() => setShowDetails(true)}
        >
          View details
        </button>
        {href && (
          <Link href={href} className="rounded border border-primary/40 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">
            Open document / print →
          </Link>
        )}
      </div>
      <EtimsResponseModal
        open={showDetails}
        onClose={() => setShowDetails(false)}
        title={`eTIMS Transmission — ${SOURCE_LABELS[record.source] ?? record.source}`}
        payload={record}
        rows={[
          { label: 'Record ID', value: record.id, mono: true },
          { label: 'Source', value: SOURCE_LABELS[record.source] ?? record.source },
          { label: 'Status', value: STATUS_LABELS[record.transmission_status] ?? record.transmission_status, danger: record.transmission_status === 'failed' || record.transmission_status === 'dead_letter' },
          { label: 'eTIMS Invc No', value: record.invc_no || undefined, mono: true },
          { label: 'KRA Receipt No', value: record.etims_receipt_number, mono: true },
          { label: 'CU Number', value: record.etims_cu_number, mono: true },
          { label: 'Receipt signature', value: record.rcpt_sign, mono: true },
          { label: 'Error', value: record.error_message, danger: true },
          { label: 'Retry count', value: record.retry_count },
          { label: 'Transmitted at', value: record.transmitted_at ? new Date(record.transmitted_at).toLocaleString() : undefined },
          { label: 'Created', value: new Date(record.created_at).toLocaleString() },
        ]}
      />
    </div>
  );
}
