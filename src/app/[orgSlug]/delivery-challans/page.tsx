'use client';

import { SharedDocumentList, type DocAction, type DocumentRow } from '@/components/documents/SharedDocumentList';
import { SharedDocumentCreateView } from '@/components/documents/SharedDocumentCreateView';
import { useDocumentListSource } from '@/hooks/use-document-list-source';
import { useDocumentActions } from '@/hooks/use-document-actions';
import { useDocRowAction } from '@/hooks/use-doc-row-action';
import {
  voidInvoice, duplicateInvoice, deleteInvoice,
  dispatchDeliveryNote, deliverDeliveryNote, cancelDeliveryNote,
} from '@/lib/api/invoices';
import { Ban, CheckCircle2, Copy, ExternalLink, Loader2, Pencil, Trash2, Truck, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 20;

/** Current delivery lifecycle state for a row, defaulting empty → 'draft'. */
const deliveryStateOf = (r: DocumentRow) => r.delivery_status || 'draft';

export default function DeliveryChallansPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<{ id: string; tenant: string } | null>(null);
  // "Mark Delivered" dialog state (optional received-by + note).
  const [deliver, setDeliver] = useState<{ row: DocumentRow } | null>(null);
  const [receivedBy, setReceivedBy] = useState('');
  const [deliverNote, setDeliverNote] = useState('');

  const src = useDocumentListSource({ family: 'invoice', invoiceType: 'delivery_challan', status: statusFilter, page, limit: ITEMS_PER_PAGE });
  const { run, isPending } = useDocRowAction();

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return src.rows;
    const q = searchQuery.toLowerCase();
    return src.rows.filter(r =>
      r.doc_number?.toLowerCase().includes(q) || r.customer_name?.toLowerCase().includes(q) || r.tenant_name?.toLowerCase().includes(q));
  }, [src.rows, searchQuery]);

  const baseActions = useDocumentActions('delivery_challan', {
    view_details: { label: 'View Details', icon: <ExternalLink className="h-3.5 w-3.5" />, onClick: (r) => router.push(`/${src.detailHrefTenant(r)}/invoices/${r.id}`) },
    view_public: { label: 'View Public Page', icon: <ExternalLink className="h-3.5 w-3.5" />, onClick: (r) => r.public_token && window.open(`/i/${r.public_token}`, '_blank') },
    edit: { label: 'Edit', icon: <Pencil className="h-3.5 w-3.5" />, onClick: (r) => setEdit({ id: r.id, tenant: src.rowTenant(r) || src.docTenant }) },
    duplicate: { label: 'Duplicate', icon: <Copy className="h-3.5 w-3.5" />, onClick: (r) => run(() => duplicateInvoice(src.rowTenant(r), r.id), 'Delivery note duplicated') },
    void: { label: 'Cancel', icon: <Ban className="h-3.5 w-3.5" />, destructive: true, onClick: (r) => run(() => voidInvoice(src.rowTenant(r), r.id), `Delivery note ${r.doc_number} cancelled`) },
    delete: { label: 'Delete', icon: <Trash2 className="h-3.5 w-3.5" />, destructive: true, onClick: (r) => run(() => deleteInvoice(src.rowTenant(r), r.id), 'Delivery note deleted') },
  });

  // Goods-dispatch lifecycle actions, gated to the valid current delivery_status (a separate
  // axis from the document status the policy in lib/documents/actions keys on). Mark Dispatched
  // emits the goods-issue event (deducts stock); Mark Delivered opens a dialog for an optional
  // receiver + note. These call the merged delivery-note api client fns and reuse useDocRowAction
  // (which invalidates the invoice queries so the badge + actions refresh on success).
  const deliveryActions: DocAction[] = [
    {
      label: 'Mark Dispatched',
      icon: <Truck className="h-3.5 w-3.5" />,
      visible: (r) => deliveryStateOf(r) === 'draft',
      onClick: (r) => {
        if (!window.confirm(`Mark ${r.doc_number} as dispatched? This deducts stock (emits a goods-issue) for the delivered items.`)) return;
        run(() => dispatchDeliveryNote(src.rowTenant(r), r.id), `Delivery note ${r.doc_number} dispatched`);
      },
    },
    {
      label: 'Mark Delivered',
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      visible: (r) => deliveryStateOf(r) === 'dispatched',
      onClick: (r) => { setReceivedBy(''); setDeliverNote(''); setDeliver({ row: r }); },
    },
    {
      label: 'Cancel Delivery',
      icon: <X className="h-3.5 w-3.5" />,
      destructive: true,
      visible: (r) => ['draft', 'dispatched'].includes(deliveryStateOf(r)),
      onClick: (r) => {
        if (!window.confirm(`Cancel delivery for ${r.doc_number}? It will be marked cancelled.`)) return;
        run(() => cancelDeliveryNote(src.rowTenant(r), r.id), `Delivery ${r.doc_number} cancelled`);
      },
    },
  ];

  const submitDeliver = () => {
    if (!deliver) return;
    const r = deliver.row;
    run(
      () => deliverDeliveryNote(src.rowTenant(r), r.id, {
        received_by: receivedBy.trim() || undefined,
        note: deliverNote.trim() || undefined,
      }),
      `Delivery note ${r.doc_number} delivered`,
    );
    setDeliver(null);
  };

  // Render delivery lifecycle actions first (the surface's primary workflow), then the
  // standard document actions.
  const actions = [...deliveryActions, ...baseActions];

  if (edit) {
    return <SharedDocumentCreateView effectiveTenant={edit.tenant} docType="delivery_challan" editId={edit.id} onClose={() => setEdit(null)} />;
  }

  return (
    <>
      <SharedDocumentList
        title="Delivery Challans"
        subtitle={src.isAggregate ? 'All tenants — track goods dispatched to customers.' : 'Track goods dispatched to customers.'}
        rows={filtered}
        isLoading={src.isLoading}
        error={src.error}
        total={src.total}
        page={page}
        onPageChange={setPage}
        itemsPerPage={ITEMS_PER_PAGE}
        statusOptions={['all', 'draft', 'dispatched', 'delivered', 'cancelled']}
        statusFilter={statusFilter}
        onStatusChange={(s) => { setStatusFilter(s); setPage(1); }}
        searchQuery={searchQuery}
        onSearchChange={(q) => { setSearchQuery(q); setPage(1); }}
        actions={actions}
        pdfKind="invoice"
        showDueDate
        showDeliveryStatus
        showExpandLineItems
        showTenant={src.showTenant}
        storageKey="delivery-challan-col-prefs"
        emptyStateDescription="Delivery notes are generated from invoices (Generate Delivery Note in an invoice's action menu) or from a quotation's Generate Delivery Challan action."
      />

      {/* Mark Delivered dialog — optional received-by + note (dispatched → delivered). */}
      {deliver && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/75"
          onClick={(e) => { if (e.target === e.currentTarget) setDeliver(null); }}
        >
          <div className="relative w-full max-w-sm rounded-2xl border border-border p-6 space-y-4 bg-card shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Mark Delivered</h2>
              <button onClick={() => setDeliver(null)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{deliver.row.doc_number} will be marked as delivered.</p>
            <div>
              <label className="text-xs font-bold block mb-1 text-foreground">Received by</label>
              <input
                className="w-full rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-ring bg-background border border-input text-foreground"
                placeholder="Name of receiver (optional)"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1 text-foreground">Note</label>
              <textarea
                className="w-full rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-ring bg-background border border-input text-foreground min-h-20"
                placeholder="Delivery note (optional)..."
                value={deliverNote}
                onChange={(e) => setDeliverNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeliver(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium hover:bg-accent transition-colors text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={submitDeliver}
                disabled={isPending}
                className={cn(
                  'px-5 py-2 rounded-lg text-xs font-bold transition-all bg-primary text-primary-foreground hover:bg-primary/90',
                  isPending && 'opacity-50 cursor-not-allowed',
                )}
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin inline mr-1" />}
                Mark Delivered
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
