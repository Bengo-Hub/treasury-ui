'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Pagination } from '@/components/ui/pagination';
import type { Invoice } from '@/lib/api/invoices';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
} from 'lucide-react';
import React, { useRef, useState } from 'react';

// ---- Exported types ----

export interface DocumentRow {
  id: string;
  doc_number: string;
  customer_name?: string;
  customer_email?: string;
  currency: string;
  total_amount: string;
  status: string;
  payment_status?: string;
  doc_date: string;
  due_date?: string;
  public_token?: string;
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

export interface DocumentListPageProps {
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
  showPaymentStatus?: boolean;
  showDueDate?: boolean;
  emptyStateDescription?: string;
}

// ---- Utilities ----

const statusVariant = (s: string): 'success' | 'secondary' | 'warning' | 'error' | 'default' => {
  if (['paid', 'accepted', 'delivered', 'confirmed'].includes(s)) return 'success';
  if (['draft'].includes(s)) return 'secondary';
  if (['overdue', 'expired', 'partial'].includes(s)) return 'warning';
  if (['void', 'cancelled', 'declined'].includes(s)) return 'error';
  return 'default';
};

const paymentVariant = (s: string): 'success' | 'secondary' | 'warning' | 'error' | 'default' => {
  if (s === 'paid') return 'success';
  if (s === 'partial') return 'warning';
  if (s === 'unpaid') return 'error';
  return 'secondary';
};

function fmt(amount: string | number, currency: string) {
  return `${currency} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

// ---- Stats Cards ----

function StatsBar({ stats }: { stats: DocStats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Docs</p>
          <p className="text-2xl font-black text-foreground tabular-nums">{stats.total_count}</p>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
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
          <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
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
  const ref = useRef<HTMLDivElement>(null);
  const visible = actions.filter(a => !a.visible || a.visible(row));
  if (visible.length === 0) return null;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="p-1.5 rounded-lg hover:bg-accent transition-colors"
      >
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-popover border border-border rounded-xl shadow-xl py-1.5 min-w-[180px]">
            {visible.map((a) => (
              <button
                key={a.label}
                onClick={(e) => { e.stopPropagation(); a.onClick(row); setOpen(false); }}
                className={cn(
                  'w-full text-left px-4 py-2 text-xs font-medium transition-colors flex items-center gap-2',
                  a.destructive
                    ? 'text-destructive hover:bg-destructive/10'
                    : 'text-foreground hover:bg-accent'
                )}
              >
                {a.icon}
                {a.label}
              </button>
            ))}
          </div>
        </>
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

// ---- Empty State ----

function EmptyState({
  title,
  description,
  createLabel,
  onCreateClick,
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

export function DocumentListPage({
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
  showPaymentStatus = false,
  showDueDate = false,
  emptyStateDescription,
}: DocumentListPageProps) {
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
  const isEmpty = !isLoading && rows.length === 0 && !error && !isLoading;

  // Count columns for skeleton
  let colCount = 5; // #, customer, amount, status, actions
  if (showPaymentStatus) colCount += 1;
  if (showDueDate) colCount += 1;
  colCount += 1; // date

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {onCreateClick && createLabel && (
          <Button variant="primary" className="gap-2 shrink-0" onClick={onCreateClick}>
            <Plus className="h-4 w-4" /> {createLabel}
          </Button>
        )}
      </div>

      {/* Stats */}
      {stats && <StatsBar stats={stats} />}

      {/* Error */}
      {!!error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Failed to load {title.toLowerCase()}. Check your connection and try again.
        </div>
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
          <div className="flex items-center gap-1 flex-wrap">
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
                {s}
              </button>
            ))}
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
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Doc #
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    {showPaymentStatus && (
                      <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Payment
                      </th>
                    )}
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Date
                    </th>
                    {showDueDate && (
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Due Date
                      </th>
                    )}
                    {actions.length > 0 && (
                      <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
                      <tr
                        key={row.id}
                        className="border-b border-border hover:bg-accent/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="font-mono text-xs font-bold text-foreground">
                              {row.doc_number}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-medium text-foreground">
                            {row.customer_name || '—'}
                          </div>
                          {row.customer_email && (
                            <div className="text-[11px] text-muted-foreground">{row.customer_email}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs font-bold text-foreground">
                          {fmt(row.total_amount, row.currency)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                        </td>
                        {showPaymentStatus && (
                          <td className="px-4 py-3 text-center">
                            {row.payment_status ? (
                              <Badge variant={paymentVariant(row.payment_status)}>
                                {row.payment_status}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {row.doc_date ? new Date(row.doc_date).toLocaleDateString() : '—'}
                        </td>
                        {showDueDate && (
                          <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                            {row.due_date ? new Date(row.due_date).toLocaleDateString() : '—'}
                          </td>
                        )}
                        {actions.length > 0 && (
                          <td className="px-4 py-3 text-center">
                            <ActionMenu row={row} actions={actions} />
                          </td>
                        )}
                      </tr>
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
    </div>
  );
}

// ---- invoiceToDocumentRow utility ----

export function invoiceToDocumentRow(inv: Invoice): DocumentRow {
  return {
    id: inv.id,
    doc_number: inv.invoice_number,
    customer_name: inv.customer_name,
    customer_email: inv.customer_email,
    currency: inv.currency,
    total_amount: inv.total_amount,
    status: inv.status,
    payment_status: inv.payment_status,
    doc_date: inv.invoice_date,
    due_date: inv.due_date,
    public_token: inv.public_token,
  };
}
