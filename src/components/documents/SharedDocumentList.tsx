'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/base';
import { cn } from '@/lib/utils';
import { Archive, Download, Filter, Plus, Search, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import { PdfPreview, useDocumentPreview } from '@bengo-hub/shared-ui-lib/documents';
import { DataTable, type BulkAction } from '@bengo-hub/shared-ui-lib/data-table';
import { downloadPublicInvoicePdf, downloadPublicQuotationPdf } from '@/lib/api/documents';
import { allowedActions, type ActionKey, type DocType } from '@/lib/documents/actions';
import { useBulkDocumentOps, type DocFamily } from '@/hooks/use-bulk-document-ops';
import { buildDocumentColumns } from './document-list-columns';
import {
  EmptyState,
  ExpandedLines,
  StatsBar,
  type DocAction,
  type DocStats,
  type DocumentRow,
} from './document-list-parts';

// Backwards-compatible re-exports — row types/adapters used across hooks and pages.
export {
  deliveryVariant,
  invoiceToDocumentRow,
  quotationToDocumentRow,
  type DocAction,
  type DocStats,
  type DocumentLine,
  type DocumentRow,
} from './document-list-parts';

/** Enables row-selection + the bulk Archive/Delete bar (tenant-scoped views only). */
export interface BulkConfig {
  /** Document type whose centralized action policy gates the bulk buttons. */
  docType: DocType;
  /** Backend endpoint family: invoice family vs quotations. */
  family: DocFamily;
  /** Tenant the bulk endpoints are called against. */
  tenant: string;
}

export interface SharedDocumentListProps {
  title: string;
  subtitle?: string;
  createLabel?: string;
  onCreateClick?: () => void;
  rows: DocumentRow[];
  isLoading: boolean;
  error?: unknown;
  total: number;
  page: number;
  onPageChange: (p: number) => void;
  itemsPerPage?: number;
  statusOptions: string[];
  statusFilter: string;
  onStatusChange: (s: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  stats?: DocStats;
  actions?: DocAction[];
  /**
   * When set, the list injects a "View / Download PDF" action that opens the
   * shared PdfPreview modal (Download / Print / Open-in-tab) for any row with a
   * public_token, instead of force-downloading. Invoice-family docs use
   * `'invoice'`; quotations use `'quotation'`.
   */
  pdfKind?: 'invoice' | 'quotation';
  showPaymentStatus?: boolean;
  /** Show a delivery-status column (delivery_challan / delivery_note surfaces). */
  showDeliveryStatus?: boolean;
  showDueDate?: boolean;
  showExpandLineItems?: boolean;
  /** Show an owning-tenant column (platform-wide all-tenants view). */
  showTenant?: boolean;
  secondaryDateLabel?: string;
  emptyStateDescription?: string;
  storageKey?: string;
  docTypeLabel?: string;
  archiveLabel?: string;
  isArchived?: boolean;
  onArchiveToggle?: (archived: boolean) => void;
  onRowPreview?: (id: string) => void;
  /** Row selection + bulk Archive/Delete. Omit in the all-tenants aggregate view. */
  bulk?: BulkConfig;
}

export function SharedDocumentList({
  title,
  subtitle,
  createLabel,
  onCreateClick,
  rows,
  isLoading,
  error,
  total,
  page,
  onPageChange,
  itemsPerPage = 20,
  statusOptions,
  statusFilter,
  onStatusChange,
  searchQuery,
  onSearchChange,
  stats,
  actions = [],
  pdfKind,
  showPaymentStatus = false,
  showDeliveryStatus = false,
  showDueDate = false,
  showExpandLineItems = false,
  showTenant = false,
  secondaryDateLabel,
  emptyStateDescription,
  storageKey = 'shared-doc-column-prefs',
  docTypeLabel,
  archiveLabel = 'Archived',
  isArchived = false,
  onArchiveToggle,
  onRowPreview,
  bulk,
}: SharedDocumentListProps) {
  // Preview-first PDF flow shared by every document list: opens the shared modal
  // (Download / Print / Open-in-tab) rather than navigating to the file.
  const { openPreview, previewProps } = useDocumentPreview({ onError: (m) => toast.error(m) });

  const allActions: DocAction[] = useMemo(() => {
    if (!pdfKind) return actions;
    const pdfAction: DocAction = {
      label: 'View / Download PDF',
      icon: <Download className="h-3.5 w-3.5" />,
      onClick: (row) => {
        if (!row.public_token) return;
        const token = row.public_token;
        const name = row.doc_number || 'document';
        openPreview(
          () =>
            (pdfKind === 'quotation'
              ? downloadPublicQuotationPdf(token, name)
              : downloadPublicInvoicePdf(token, name)
            ).then((res) => res.blob),
          { fileName: `${name}.pdf`, title: name }
        );
      },
      visible: (row) => !!row.public_token,
    };
    return [pdfAction, ...actions];
  }, [pdfKind, actions, openPreview]);

  // ---- Row selection + bulk operations (policy-gated like the single-row actions) ----
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);
  const bulkOps = useBulkDocumentOps(bulk?.family ?? 'invoice', bulk?.tenant ?? '');

  // Selections don't survive page / filter / archive-view changes.
  useEffect(() => { setSelected(new Set()); }, [page, statusFilter, isArchived]);

  // Same centralized policy the per-row menu uses: archive = the void/cancel transition.
  const archiveKey: ActionKey = bulk?.family === 'quotation' ? 'cancel' : 'void';
  const rowAllows = (row: DocumentRow, key: ActionKey) =>
    !!bulk && allowedActions(bulk.docType, { status: row.status, payment_status: row.payment_status }).includes(key);
  // Whether this doc type's policy can EVER grant delete (e.g. never for standard invoices).
  const supportsDelete = !!bulk && allowedActions(bulk.docType, { status: 'draft' }).includes('delete');

  const selectedRows = useMemo(() => rows.filter((r) => selected.has(r.id)), [rows, selected]);

  const bulkActions: BulkAction[] = useMemo(() => {
    if (!bulk) return [];
    const out: BulkAction[] = [
      {
        key: 'archive',
        label: 'Archive',
        icon: <Archive className="h-3.5 w-3.5" />,
        disabled: bulkOps.isPending || !selectedRows.some((r) => rowAllows(r, archiveKey)),
        onClick: (ids) =>
          bulkOps.archive.mutateAsync(ids).then(() => setSelected(new Set())).catch(() => {}),
      },
    ];
    if (supportsDelete) {
      out.push({
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        icon: <Trash2 className="h-3.5 w-3.5" />,
        disabled: bulkOps.isPending || !selectedRows.some((r) => rowAllows(r, 'delete')),
        onClick: (ids) => setBulkDeleteIds(ids),
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulk, selectedRows, bulkOps.isPending, supportsDelete, archiveKey]);

  // ---- Columns (built in document-list-columns.tsx to keep this file small) ----
  const columns = useMemo(
    () =>
      buildDocumentColumns({
        showTenant,
        showDeliveryStatus,
        showPaymentStatus,
        showDueDate,
        secondaryDateLabel,
        actions: allActions,
        onRowPreview,
      }),
    [showTenant, showDeliveryStatus, showPaymentStatus, showDueDate, secondaryDateLabel, allActions, onRowPreview],
  );

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onArchiveToggle && (
            <button
              onClick={() => onArchiveToggle(!isArchived)}
              className="px-3 py-2 text-xs font-bold rounded-lg border border-border bg-background hover:bg-accent text-foreground transition-all"
            >
              {isArchived ? `Active ${docTypeLabel ?? title}` : archiveLabel}
            </button>
          )}
          {onCreateClick && createLabel && (
            <Button variant="primary" className="gap-2" onClick={onCreateClick}>
              <Plus className="h-4 w-4" /> {createLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && <StatsBar stats={stats} title={docTypeLabel ?? title} />}

      {/* Table (shared DataTable: sortable headers, funnel filters over the loaded page,
          column visibility via storageKey, CSV export, selection + bulk bar, footer) */}
      <DataTable<DocumentRow>
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={isLoading}
        error={!!error}
        emptyState={
          <EmptyState
            title={title}
            description={emptyStateDescription}
            createLabel={createLabel}
            onCreateClick={onCreateClick}
          />
        }
        storageKey={storageKey}
        renderExpanded={showExpandLineItems ? (row) => <ExpandedLines row={row} /> : undefined}
        selectable={!!bulk}
        selected={selected}
        onSelectedChange={setSelected}
        isRowSelectable={(r) => rowAllows(r, archiveKey) || (supportsDelete && rowAllows(r, 'delete'))}
        bulkActions={bulkActions}
        showExportCsv
        exportFileName={title.toLowerCase().replace(/\s+/g, '-')}
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
        total={total}
        pageSize={itemsPerPage}
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                placeholder={`Search ${title.toLowerCase()}…`}
                className="w-full rounded-lg py-1.5 pl-9 pr-3 text-xs bg-background border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                <Filter className="h-3 w-3" />
              </span>
              {statusOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(s)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-bold capitalize transition-all',
                    statusFilter === s
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  {s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* Destructive bulk delete goes through the shared confirm surface. */}
      <ConfirmDialog
        open={bulkDeleteIds !== null}
        onOpenChange={(o) => { if (!o) setBulkDeleteIds(null); }}
        title={`Delete ${bulkDeleteIds?.length ?? 0} selected document${(bulkDeleteIds?.length ?? 0) === 1 ? '' : 's'}?`}
        description="Documents that can no longer be deleted (per their status) are skipped and reported. This cannot be undone."
        confirmLabel="Delete"
        destructive
        isPending={bulkOps.remove.isPending}
        onConfirm={() => {
          if (!bulkDeleteIds) return;
          bulkOps.remove
            .mutateAsync(bulkDeleteIds)
            .then(() => setSelected(new Set()))
            .catch(() => {})
            .finally(() => setBulkDeleteIds(null));
        }}
      />

      {pdfKind && <PdfPreview {...previewProps} />}
    </div>
  );
}
