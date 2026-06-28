'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Pagination } from '@/components/ui/pagination';
import { cn } from '@/lib/utils';
import {
  AlertCircle, Columns, Download, FileText, Filter,
  Loader2, MoreHorizontal, Plus, Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { PdfPreview, useDocumentPreview } from '@bengo-hub/shared-ui-lib/documents';
import { downloadPublicInvoicePdf, downloadPublicQuotationPdf } from '@/lib/api/documents';
import {
  SimpleColumnManager as ColumnManager,
  loadColumnPrefs,
  type SimpleColumnDef as ColumnDef,
  type SimpleColumnPrefs as ColumnPrefs,
} from '@/components/documents/ColumnManager';

// ---- Types ----

export interface DocumentLine {
  description: string;
  tax_code?: string;
  tax_rate?: number | string;
  quantity: number | string;
  unit_price: string | number;
  line_total: string | number;
}

export interface DocumentRow {
  id: string;
  doc_number: string;
  /** Owning tenant name — shown only in the platform-wide (all-tenants) view. */
  tenant_name?: string;
  /** Owning tenant slug — used to target row actions at the right tenant in the all-tenants view. */
  tenant_slug?: string;
  customer_name?: string;
  customer_email?: string;
  currency: string;
  total_amount: string;
  status: string;
  payment_status?: string;
  /** Delivery-note goods-dispatch lifecycle (delivery_challan/delivery_note docs only). */
  delivery_status?: string;
  doc_date: string;
  due_date?: string;
  secondary_date?: string;
  public_token?: string;
  lines?: DocumentLine[];
}

export interface DocStats {
  total_count: number;
  total_amount: string;
  amount_due?: string;
  currency: string;
}

export interface DocAction {
  label: string;
  icon: React.ReactNode;
  onClick: (row: DocumentRow) => void;
  visible?: (row: DocumentRow) => boolean;
  destructive?: boolean;
}

export const SHARED_DOC_COLUMNS: ColumnDef[] = [
  { key: 'date',           label: 'Date',           defaultTable: true,  defaultCsv: true  },
  { key: 'expand',         label: 'Line Items',      defaultTable: true,  defaultCsv: false },
  { key: 'doc_number',     label: 'Document #',      defaultTable: true,  defaultCsv: true  },
  { key: 'customer',       label: 'Customer',        defaultTable: true,  defaultCsv: true  },
  { key: 'amount',         label: 'Amount',          defaultTable: true,  defaultCsv: true  },
  { key: 'status',         label: 'Status',          defaultTable: true,  defaultCsv: true  },
  { key: 'delivery_status', label: 'Delivery Status', defaultTable: true,  defaultCsv: true  },
  { key: 'payment_status', label: 'Payment Status',  defaultTable: false, defaultCsv: true  },
  { key: 'due_date',       label: 'Due Date',        defaultTable: false, defaultCsv: true  },
  { key: 'secondary_date', label: 'Secondary Date',  defaultTable: false, defaultCsv: true  },
];

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
}

// ---- Utilities ----

function statusVariant(s: string): 'success' | 'secondary' | 'warning' | 'error' | 'default' {
  if (['paid', 'accepted', 'delivered', 'confirmed', 'converted', 'approved'].includes(s)) return 'success';
  if (['draft'].includes(s)) return 'secondary';
  if (['overdue', 'expired', 'partial', 'sent', 'pending_approval'].includes(s)) return 'warning';
  if (['void', 'cancelled', 'declined'].includes(s)) return 'error';
  return 'default';
}

function paymentVariant(s: string): 'success' | 'secondary' | 'warning' | 'error' | 'default' {
  if (s === 'paid') return 'success';
  if (s === 'partial') return 'warning';
  if (s === 'unpaid') return 'error';
  return 'secondary';
}

// Delivery-note goods-dispatch lifecycle: draft → dispatched → delivered (+ cancelled).
export function deliveryVariant(s: string): 'success' | 'secondary' | 'warning' | 'error' | 'default' {
  if (s === 'delivered') return 'success';
  if (s === 'dispatched') return 'warning';
  if (s === 'cancelled') return 'error';
  return 'secondary'; // draft / empty
}

function fmt(amount: string | number, currency: string) {
  return `${currency} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

// ---- Stats Cards ----

function StatsBar({ stats, title }: { stats: DocStats; title: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total {title}</p>
          <p className="text-2xl font-black text-foreground tabular-nums">{stats.total_count}</p>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-primary font-black text-xs">{stats.currency}</span>
        </div>
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Amount</p>
          <p className="text-xl font-black text-foreground tabular-nums">
            {fmt(stats.total_amount, stats.currency)}
          </p>
        </div>
      </div>
      {stats.amount_due !== undefined && (
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Amount Due</p>
            <p className="text-xl font-black text-destructive tabular-nums">
              {fmt(stats.amount_due, stats.currency)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Action Menu ----

function ActionMenu({ row, actions }: { row: DocumentRow; actions: DocAction[] }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const visible = actions.filter(a => !a.visible || a.visible(row));

  // Position the menu in a viewport-fixed portal so it escapes the table's
  // horizontal scroll container (which otherwise clips an absolutely-positioned
  // dropdown). Align the menu's right edge to the trigger and flip up/right when
  // there isn't room below or to the right.
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const GAP = 6;
    const rect = btnRef.current.getBoundingClientRect();
    const menuW = menuRef.current?.offsetWidth ?? 224;
    const menuH = menuRef.current?.offsetHeight ?? 320;
    let left = rect.right - menuW;                       // right-align to trigger
    if (left < 8) left = Math.min(rect.left, window.innerWidth - menuW - 8);
    left = Math.max(8, left);
    let top = rect.bottom + GAP;                          // open downward
    if (top + menuH > window.innerHeight - 8) {
      const above = rect.top - GAP - menuH;               // flip up if no room below
      top = above >= 8 ? above : Math.max(8, window.innerHeight - menuH - 8);
    }
    setPos({ top, left });
  }, [open]);

  // Close on scroll/resize so the fixed menu never detaches from its trigger.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  if (visible.length === 0) return null;

  return (
    <div className="inline-block">
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="p-1.5 rounded-lg hover:bg-accent transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[61] bg-popover border border-border rounded-xl shadow-xl py-1.5 min-w-52 max-w-[min(18rem,calc(100vw-1rem))] max-h-[calc(100vh-1rem)] overflow-y-auto"
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, visibility: pos ? 'visible' : 'hidden' }}
          >
            {visible.map((a) => (
              <button
                key={a.label}
                role="menuitem"
                onClick={(e) => { e.stopPropagation(); a.onClick(row); setOpen(false); }}
                className={cn(
                  'w-full text-left px-4 py-2 text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap',
                  a.destructive
                    ? 'text-destructive hover:bg-destructive/10'
                    : 'text-foreground hover:bg-accent'
                )}
              >
                <span className="shrink-0">{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}

// ---- Loading Skeleton ----

function LoadingRows({ cols }: { cols: number }) {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="border-b border-border">
          {[...Array(cols)].map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3 bg-muted rounded animate-pulse" style={{ width: j === 0 ? '80%' : '60%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ---- Expanded Line Items Row ----

function ExpandedLines({ row, colSpan }: { row: DocumentRow; colSpan: number }) {
  if (!row.lines?.length) return null;
  return (
    <tr className="bg-accent/20">
      <td colSpan={colSpan} className="px-8 py-3">
        <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-muted text-muted-foreground text-[10px] font-bold uppercase">
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-center">Tax Code</th>
              <th className="px-3 py-2 text-center">Tax %</th>
              <th className="px-3 py-2 text-center">Qty</th>
              <th className="px-3 py-2 text-right">Rate</th>
              <th className="px-3 py-2 text-right">Sub Total</th>
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {row.lines.map((line, i) => (
              <tr key={i}>
                <td className="px-3 py-2 font-semibold text-foreground">{line.description}</td>
                <td className="px-3 py-2 text-center text-muted-foreground">{line.tax_code || '—'}</td>
                <td className="px-3 py-2 text-center text-foreground">{line.tax_rate ?? 0}%</td>
                <td className="px-3 py-2 text-center text-foreground">{line.quantity}</td>
                <td className="px-3 py-2 text-right font-mono text-foreground">{Number(line.unit_price).toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-mono text-foreground">
                  {(Number(line.quantity) * Number(line.unit_price)).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right font-mono font-bold text-foreground">
                  {Number(line.line_total).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </td>
    </tr>
  );
}

// ---- Empty State ----

function EmptyState({
  title, description, createLabel, onCreateClick,
}: {
  title: string;
  description?: string;
  createLabel?: string;
  onCreateClick?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <FileText className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-base font-bold text-foreground mb-1">No {title} yet</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        {description ?? `Create your first ${title.toLowerCase()} to get started.`}
      </p>
      {onCreateClick && createLabel && (
        <Button variant="primary" className="gap-2" onClick={onCreateClick}>
          <Plus className="h-4 w-4" /> {createLabel}
        </Button>
      )}
    </div>
  );
}

// ---- Main Component ----

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
}: SharedDocumentListProps) {
  const [columnMgrOpen, setColumnMgrOpen] = useState(false);
  const [colPrefs, setColPrefs] = useState<ColumnPrefs>(() =>
    loadColumnPrefs(storageKey, SHARED_DOC_COLUMNS)
  );
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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

  const toggleExpand = (id: string) =>
    setExpandedRows(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  // Derive which columns are visible from prefs
  const visibleCols = useMemo(() => {
    const t = colPrefs.table;
    return {
      date:           t['date']           ?? true,
      expand:         (t['expand']        ?? true) && showExpandLineItems,
      doc_number:     t['doc_number']     ?? true,
      tenant:         showTenant,
      customer:       t['customer']       ?? true,
      amount:         t['amount']         ?? true,
      status:         t['status']         ?? true,
      delivery_status: (t['delivery_status'] ?? true) && showDeliveryStatus,
      payment_status: (t['payment_status'] ?? false) && showPaymentStatus,
      due_date:       (t['due_date']      ?? false) && showDueDate,
      secondary_date: (t['secondary_date'] ?? false) && !!secondaryDateLabel,
    };
  }, [colPrefs, showPaymentStatus, showDeliveryStatus, showDueDate, showExpandLineItems, showTenant, secondaryDateLabel]);

  const colCount = Object.values(visibleCols).filter(Boolean).length + 1; // +1 for actions
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
  const isEmpty = !isLoading && rows.length === 0 && !error;

  const thCls = 'px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap';

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

      {/* Error */}
      {!!error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Failed to load {title.toLowerCase()}. Check your connection and try again.
        </div>
      )}

      {/* Column Manager modal */}
      {columnMgrOpen && (
        <ColumnManager
          columns={SHARED_DOC_COLUMNS}
          storageKey={storageKey}
          onClose={() => setColumnMgrOpen(false)}
          onApply={prefs => setColPrefs(prefs)}
        />
      )}

      {/* Table Card */}
      <Card>
        {/* Filter bar */}
        <CardHeader className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between py-3 px-4">
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
            <button
              onClick={() => setColumnMgrOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-border rounded-lg bg-background hover:bg-accent text-foreground text-xs font-bold transition-all"
            >
              <Columns className="h-3 w-3 text-muted-foreground" /> Columns
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isEmpty ? (
            <EmptyState
              title={title}
              description={emptyStateDescription}
              createLabel={createLabel}
              onCreateClick={onCreateClick}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {visibleCols.date && <th className={`${thCls} text-left`}>Date</th>}
                    {visibleCols.expand && <th className={`${thCls} w-8`} />}
                    {visibleCols.doc_number && <th className={`${thCls} text-left`}>Doc #</th>}
                    {visibleCols.tenant && <th className={`${thCls} text-left`}>Tenant</th>}
                    {visibleCols.customer && <th className={`${thCls} text-left`}>Customer</th>}
                    {visibleCols.amount && <th className={`${thCls} text-right`}>Amount</th>}
                    {visibleCols.status && <th className={`${thCls} text-center`}>Status</th>}
                    {visibleCols.delivery_status && <th className={`${thCls} text-center`}>Delivery</th>}
                    {visibleCols.payment_status && <th className={`${thCls} text-center`}>Payment</th>}
                    {visibleCols.due_date && <th className={`${thCls} text-right`}>Due Date</th>}
                    {visibleCols.secondary_date && <th className={`${thCls} text-center`}>{secondaryDateLabel}</th>}
                    {(allActions.length > 0 || onRowPreview) && (
                      <th className={`${thCls} text-center sticky right-0 bg-muted/30 border-l border-border z-10`}>
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <LoadingRows cols={colCount} />
                  ) : (
                    rows.map((row) => (
                      <>
                        <tr
                          key={row.id}
                          className="border-b border-border hover:bg-accent/30 transition-colors"
                        >
                          {visibleCols.date && (
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap font-mono">
                              {row.doc_date ? new Date(row.doc_date).toLocaleDateString() : '—'}
                            </td>
                          )}
                          {visibleCols.expand && (
                            <td className="px-2 py-3 text-center">
                              <button
                                onClick={() => toggleExpand(row.id)}
                                className="w-5 h-5 rounded border border-border bg-muted hover:bg-accent transition-all flex items-center justify-center text-muted-foreground font-bold text-xs"
                              >
                                {expandedRows.has(row.id) ? '−' : '+'}
                              </button>
                            </td>
                          )}
                          {visibleCols.doc_number && (
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span className="font-mono text-xs font-bold text-foreground">
                                  {row.doc_number}
                                </span>
                              </div>
                            </td>
                          )}
                          {visibleCols.tenant && (
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center rounded-md bg-accent/40 px-2 py-0.5 text-[11px] font-medium text-foreground">
                                {row.tenant_name || '—'}
                              </span>
                            </td>
                          )}
                          {visibleCols.customer && (
                            <td className="px-4 py-3">
                              <div className="text-xs font-medium text-foreground">
                                {row.customer_name || '—'}
                              </div>
                              {row.customer_email && (
                                <div className="text-[11px] text-muted-foreground">{row.customer_email}</div>
                              )}
                            </td>
                          )}
                          {visibleCols.amount && (
                            <td className="px-4 py-3 text-right font-mono text-xs font-bold text-foreground whitespace-nowrap">
                              {fmt(row.total_amount, row.currency)}
                            </td>
                          )}
                          {visibleCols.status && (
                            <td className="px-4 py-3 text-center">
                              <Badge variant={statusVariant(row.status)} className="capitalize text-[10px]">
                                {row.status?.replace(/_/g, ' ')}
                              </Badge>
                            </td>
                          )}
                          {visibleCols.delivery_status && (
                            <td className="px-4 py-3 text-center">
                              <Badge variant={deliveryVariant(row.delivery_status || 'draft')} className="capitalize text-[10px]">
                                {(row.delivery_status || 'draft').replace(/_/g, ' ')}
                              </Badge>
                            </td>
                          )}
                          {visibleCols.payment_status && (
                            <td className="px-4 py-3 text-center">
                              {row.payment_status ? (
                                <Badge variant={paymentVariant(row.payment_status)} className="capitalize text-[10px]">
                                  {row.payment_status}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                          )}
                          {visibleCols.due_date && (
                            <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                              {row.due_date ? new Date(row.due_date).toLocaleDateString() : '—'}
                            </td>
                          )}
                          {visibleCols.secondary_date && (
                            <td className="px-4 py-3 text-center text-xs text-muted-foreground whitespace-nowrap">
                              {row.secondary_date ? new Date(row.secondary_date).toLocaleDateString() : '—'}
                            </td>
                          )}
                          {(allActions.length > 0 || onRowPreview) && (
                            <td className="px-4 py-3 text-center sticky right-0 bg-card border-l border-border z-10">
                              <div className="flex items-center justify-center gap-1">
                                {onRowPreview && (
                                  <button
                                    title="Quick Preview"
                                    onClick={() => onRowPreview(row.id)}
                                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                  >
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                      <circle cx="12" cy="12" r="3"/>
                                    </svg>
                                  </button>
                                )}
                                {allActions.length > 0 && <ActionMenu row={row} actions={allActions} />}
                              </div>
                            </td>
                          )}
                        </tr>
                        {expandedRows.has(row.id) && (
                          <ExpandedLines key={`${row.id}-exp`} row={row} colSpan={colCount} />
                        )}
                      </>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && total > 0 && (
            <div className="px-4 py-2 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {total} {title.toLowerCase()} total
              </span>
              <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
            </div>
          )}
        </CardContent>
      </Card>

      {pdfKind && <PdfPreview {...previewProps} />}
    </div>
  );
}

// ---- Adapter utilities ----

import type { Invoice, Quotation } from '@/lib/api/invoices';

export function invoiceToDocumentRow(inv: Invoice): DocumentRow {
  return {
    id: inv.id,
    doc_number: inv.invoice_number,
    tenant_name: inv.tenant_name,
    tenant_slug: inv.tenant_slug,
    customer_name: inv.customer_name,
    customer_email: inv.customer_email,
    currency: inv.currency,
    total_amount: inv.total_amount,
    status: inv.status,
    payment_status: inv.payment_status,
    delivery_status: inv.delivery_status,
    doc_date: inv.invoice_date,
    due_date: inv.due_date,
    public_token: inv.public_token,
    lines: inv.lines?.map(l => ({
      description: l.description,
      tax_code: l.tax_code,
      tax_rate: l.tax_rate,
      quantity: l.quantity,
      unit_price: l.unit_price,
      line_total: l.line_total,
    })),
  };
}

export function quotationToDocumentRow(qt: Quotation): DocumentRow {
  return {
    id: qt.id,
    doc_number: qt.quote_number,
    tenant_name: qt.tenant_name,
    tenant_slug: qt.tenant_slug,
    customer_name: qt.customer_name,
    customer_email: qt.customer_email,
    currency: qt.currency,
    total_amount: qt.total_amount,
    status: qt.status,
    doc_date: qt.quote_date,
    secondary_date: qt.valid_until,
    public_token: qt.public_token,
    lines: qt.lines?.map(l => ({
      description: l.description,
      tax_code: l.tax_code,
      tax_rate: l.tax_rate,
      quantity: l.quantity,
      unit_price: l.unit_price,
      line_total: l.line_total,
    })),
  };
}
