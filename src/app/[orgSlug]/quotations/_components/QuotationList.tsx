'use client';

import { Badge, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Pagination } from '@/components/ui/pagination';
import {
  useAcceptQuotation,
  useCancelQuotation,
  useConvertToProforma,
  useConvertToSalesOrder,
  useDeclineQuotation,
  useDeleteQuotation,
  useDuplicateQuotation,
  useSendQuotation,
} from '@/hooks/use-invoices';
import type { Quotation } from '@/lib/api/invoices';
import { cn } from '@/lib/utils';
import { ColumnManager, loadColumnPrefs, type ColumnPrefs } from './ColumnManager';
import {
  Check, ChevronDown, ChevronRight, Columns,
  Copy, Eye, ExternalLink, Filter, Loader2,
  MoreHorizontal, Pencil, Plus, RefreshCw, Search, Trash2, X,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

const ITEMS_PER_PAGE = 20;

function statusBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary' {
  switch (status?.toLowerCase()) {
    case 'accepted':  return 'success';
    case 'sent':      return 'default';
    case 'draft':     return 'secondary';
    case 'expired':   return 'warning';
    case 'declined':  return 'error';
    case 'converted': return 'success';
    default:          return 'outline';
  }
}

interface QuotationListProps {
  quotations: Quotation[];
  isLoading: boolean;
  total: number;
  page: number;
  setPage: (p: number) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  effectiveTenant: string;
  onCreateClick: () => void;
  onPreview: (id: string) => void;
  onEdit: (id: string) => void;
  quotationType: 'active' | 'deleted';
  setQuotationType: (v: 'active' | 'deleted') => void;
}

export function QuotationList({
  quotations, isLoading, total, page, setPage,
  statusFilter, setStatusFilter,
  searchQuery, setSearchQuery,
  effectiveTenant, onCreateClick,
  onPreview, onEdit,
  quotationType, setQuotationType,
}: QuotationListProps) {
  const router            = useRouter();
  const params            = useParams<{ orgSlug: string }>();
  const orgSlug           = params?.orgSlug ?? effectiveTenant;

  const sendMutation             = useSendQuotation(effectiveTenant);
  const acceptMutation           = useAcceptQuotation(effectiveTenant);
  const declineMutation          = useDeclineQuotation(effectiveTenant);
  const deleteMutation           = useDeleteQuotation(effectiveTenant);
  const duplicateMutation        = useDuplicateQuotation(effectiveTenant);
  const cancelMutation           = useCancelQuotation(effectiveTenant);
  const convertProformaMutation  = useConvertToProforma(effectiveTenant);
  const convertSalesOrderMutation = useConvertToSalesOrder(effectiveTenant);

  const [actionMenuId,      setActionMenuId]      = useState<string | null>(null);
  const [quotationTypeOpen, setQuotationTypeOpen] = useState(false);
  const [expandedRows,      setExpandedRows]      = useState<Set<string>>(new Set());
  const [columnMgrOpen,     setColumnMgrOpen]     = useState(false);
  const [colPrefs,          setColPrefs]          = useState<ColumnPrefs>(loadColumnPrefs);

  const toggleExpand = (id: string) =>
    setExpandedRows(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const filtered = quotations.filter(qt => {
    const q = searchQuery.toLowerCase();
    return !q || qt.quote_number?.toLowerCase().includes(q) || qt.customer_name?.toLowerCase().includes(q);
  });

  const STATUS_FILTERS = ['All', 'Draft', 'Sent', 'Accepted', 'Declined', 'Expired', 'Converted'];

  return (
    <div className="space-y-4">
      {/* Active Quotation / type filter bar */}
      <div className="flex items-center justify-between bg-card border border-border p-2 rounded-xl shadow-sm">
        <div className="relative">
          <button onClick={() => setQuotationTypeOpen(o => !o)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-foreground bg-background border border-border rounded-lg hover:bg-accent transition-all min-w-[160px] justify-between">
            <span>{quotationType === 'active' ? 'Active Quotation' : 'Archived Quotation'}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {quotationTypeOpen && (
            <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[160px] rounded-xl border border-border bg-popover shadow-xl py-1">
              <button onClick={() => { setQuotationType('active'); setQuotationTypeOpen(false); }}
                className="w-full text-left px-4 py-1.5 text-xs font-semibold hover:bg-accent text-foreground">
                Active Quotation
              </button>
              <button onClick={() => { setQuotationType('deleted'); setQuotationTypeOpen(false); }}
                className="w-full text-left px-4 py-1.5 text-xs font-semibold hover:bg-accent text-foreground">
                Archived Folders
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Column Manager modal */}
      {columnMgrOpen && (
        <ColumnManager
          onClose={() => setColumnMgrOpen(false)}
          onApply={prefs => setColPrefs(prefs)}
        />
      )}

      {/* Show/Hide Columns button (top) */}
      <div className="flex justify-end">
        <button onClick={() => setColumnMgrOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg bg-background hover:bg-accent text-foreground text-xs font-bold shadow-sm transition-all">
          <Columns className="h-3.5 w-3.5 text-muted-foreground" /> Show/Hide Columns
        </button>
      </div>

      {/* Table */}
      <Card className="border border-border shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between py-3.5 px-4 border-b border-border">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              placeholder="Search by quote number or customer..."
              className="w-full bg-background border border-input rounded-lg py-1.5 pl-9 pr-4 text-xs text-foreground focus:outline-none focus:border-ring transition-all shadow-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 mr-1 uppercase tracking-wider">
              <Filter className="h-3 w-3" /> Status:
            </span>
            {STATUS_FILTERS.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s === 'All' ? 'all' : s.toLowerCase())}
                className={cn(
                  'px-2.5 py-1 rounded text-xs font-bold transition-all',
                  (statusFilter === s.toLowerCase() || (s === 'All' && statusFilter === 'all'))
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3 pl-4 w-8"><input type="checkbox" className="rounded border-border focus:ring-0" /></th>
                <th className="p-3">Date</th>
                <th className="p-3 w-8"></th>
                <th className="p-3">Quotation</th>
                <th className="p-3">Quoted To</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Valid Until</th>
                <th className="p-3 text-center pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-muted-foreground font-medium">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-muted-foreground" />
                    Loading quotations...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((quote) => (
                  <>
                    <tr key={quote.id} className="hover:bg-accent/30 transition-colors duration-150 font-medium text-foreground">
                      <td className="p-3 pl-4"><input type="checkbox" className="rounded border-border focus:ring-0" /></td>
                      <td className="p-3 font-mono text-muted-foreground">{quote.quote_date?.slice(0, 10) || '—'}</td>
                      <td className="p-3">
                        <button
                          onClick={() => toggleExpand(quote.id)}
                          className="w-5 h-5 rounded border border-border bg-muted hover:bg-accent transition-all flex items-center justify-center text-muted-foreground font-bold text-xs"
                        >
                          {expandedRows.has(quote.id) ? '−' : '+'}
                        </button>
                      </td>
                      <td className="p-3 font-mono font-bold text-foreground">{quote.quote_number}</td>
                      <td className="p-3 text-foreground font-bold">{quote.customer_name || quote.customer_email || '—'}</td>
                      <td className="p-3 text-right font-mono font-bold text-foreground">
                        {quote.currency} {Number(quote.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={statusBadgeVariant(quote.status)} className="capitalize font-bold text-[10px] px-2 py-0.5">
                          {quote.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-center font-mono text-muted-foreground">{quote.valid_until?.slice(0, 10) || '—'}</td>
                      <td className="p-3 pr-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button title="Quick Preview" onClick={() => onPreview(quote.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => window.open(`#/view/${quote.quote_number}`, '_blank')}
                            title="Open in new tab"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          <button title="Edit" onClick={() => onEdit(quote.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button title="Duplicate" onClick={() => duplicateMutation.mutate(quote.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors">
                            <Copy className="h-4 w-4" />
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setActionMenuId(actionMenuId === quote.id ? null : quote.id)}
                              className={cn('p-0.5 rounded transition-all text-muted-foreground hover:text-foreground', actionMenuId === quote.id && 'bg-accent')}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {actionMenuId === quote.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setActionMenuId(null)} />
                                <div className="absolute right-0 mt-1 w-60 bg-popover border border-border p-1 rounded-xl shadow-xl z-20 text-left animate-in fade-in slide-in-from-top-1 duration-100">
                                  {[
                                    { label: 'Quick Preview',       icon: <Eye className="h-3.5 w-3.5" />,         onClick: () => onPreview(quote.id) },
                                    { label: 'Open',                icon: <ExternalLink className="h-3.5 w-3.5" />, onClick: () => window.open(`#/view/${quote.quote_number}`, '_blank') },
                                    { label: 'Edit',                icon: <Pencil className="h-3.5 w-3.5" />,       onClick: () => onEdit(quote.id) },
                                    { label: 'Duplicate',           icon: <Copy className="h-3.5 w-3.5" />,         onClick: () => duplicateMutation.mutate(quote.id) },
                                    { label: 'Send for Approval',   icon: <Plus className="h-3.5 w-3.5" />,         onClick: () => {} },
                                    { label: 'Copy Quotation link', icon: <ChevronRight className="h-3.5 w-3.5" />, onClick: () => {
                                        const url = quote.public_token
                                          ? `${window.location.origin}/q/${quote.public_token}`
                                          : `${window.location.origin}/q/${quote.id}`;
                                        navigator.clipboard.writeText(url);
                                      }},
                                    { label: 'Send Email',          icon: <Check className="h-3.5 w-3.5" />,        onClick: () => sendMutation.mutate(quote.id) },
                                    { label: 'Send WhatsApp',       icon: <RefreshCw className="h-3.5 w-3.5" />,    onClick: () => {
                                        const phone = (quote as unknown as { customer_phone?: string }).customer_phone ?? '';
                                        const publicUrl = quote.public_token
                                          ? `${window.location.origin}/q/${quote.public_token}`
                                          : '';
                                        const msg = encodeURIComponent(
                                          `Hi${quote.customer_name ? ` ${quote.customer_name}` : ''}, please find your quotation *${quote.quote_number}* here:\n${publicUrl}`
                                        );
                                        window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
                                      }},
                                    ...(quote.converted_invoice_id
                                      ? [{ label: 'View Invoice', icon: <ExternalLink className="h-3.5 w-3.5" />, onClick: () => router.push(`/${orgSlug}/invoices?id=${quote.converted_invoice_id}`) }]
                                      : []),
                                    { label: 'Convert to Invoice',     icon: <RefreshCw className="h-3.5 w-3.5" />, onClick: () => acceptMutation.mutate(quote.id) },
                                    { label: 'Convert to Proforma',    icon: <RefreshCw className="h-3.5 w-3.5" />, onClick: () => convertProformaMutation.mutate(quote.id) },
                                    { label: 'Convert to Sales Order', icon: <RefreshCw className="h-3.5 w-3.5" />, onClick: () => convertSalesOrderMutation.mutate(quote.id) },
                                    { label: 'Decline',                icon: <X className="h-3.5 w-3.5" />,         onClick: () => declineMutation.mutate(quote.id) },
                                    { label: 'Cancel',              icon: <X className="h-3.5 w-3.5" />,            onClick: () => cancelMutation.mutate(quote.id) },
                                    { label: 'Delete',              icon: <Trash2 className="h-3.5 w-3.5" />,       onClick: () => deleteMutation.mutate(quote.id), className: 'text-destructive' },
                                  ].map((item) => (
                                    <button
                                      key={item.label}
                                      onClick={() => { item.onClick(); setActionMenuId(null); }}
                                      className={cn(
                                        'w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-accent rounded-lg flex items-center gap-2',
                                        item.className ?? 'text-foreground'
                                      )}
                                    >
                                      <span className="text-muted-foreground">{item.icon}</span>
                                      {item.label}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                    {/* Expand Line Items inline */}
                    {expandedRows.has(quote.id) && quote.lines && quote.lines.length > 0 && (
                      <tr key={`${quote.id}-lines`} className="bg-accent/20">
                        <td colSpan={9} className="px-8 py-3">
                          <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
                            <thead>
                              <tr className="bg-muted text-muted-foreground text-[10px] font-bold uppercase">
                                <th className="px-3 py-2">Item Name</th>
                                <th className="px-3 py-2">HSN/SAC</th>
                                <th className="px-3 py-2">SKU ID</th>
                                <th className="px-3 py-2 text-center">Tax Rate</th>
                                <th className="px-3 py-2 text-center">Qty</th>
                                <th className="px-3 py-2 text-right">Rate</th>
                                <th className="px-3 py-2 text-right">Sub Total</th>
                                <th className="px-3 py-2 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card">
                              {quote.lines.map((line, i) => (
                                <tr key={i}>
                                  <td className="px-3 py-2 font-semibold text-foreground">{line.description}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{line.tax_code || '—'}</td>
                                  <td className="px-3 py-2 text-muted-foreground font-mono">—</td>
                                  <td className="px-3 py-2 text-center text-foreground">{line.tax_rate ?? 0}%</td>
                                  <td className="px-3 py-2 text-center text-foreground">{line.quantity}</td>
                                  <td className="px-3 py-2 text-right font-mono text-foreground">{Number(line.unit_price).toLocaleString()}</td>
                                  <td className="px-3 py-2 text-right font-mono text-foreground">{(Number(line.quantity) * Number(line.unit_price)).toLocaleString()}</td>
                                  <td className="px-3 py-2 text-right font-mono font-bold text-foreground">{Number(line.line_total).toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-muted-foreground font-semibold italic">
                    No quotations found. Create your first quotation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Footer — count + pagination + show/hide columns */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-muted-foreground font-semibold">
          Showing {filtered.length} of {total} Quotation{total !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-3">
          {total > ITEMS_PER_PAGE && (
            <Pagination
              page={page}
              totalPages={Math.ceil(total / ITEMS_PER_PAGE)}
              onPageChange={setPage}
            />
          )}
          <button onClick={() => setColumnMgrOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg bg-background hover:bg-accent text-foreground text-xs font-bold shadow-sm transition-all">
            <Columns className="h-3.5 w-3.5 text-muted-foreground" /> Show/Hide Columns
          </button>
        </div>
      </div>
    </div>
  );
}
