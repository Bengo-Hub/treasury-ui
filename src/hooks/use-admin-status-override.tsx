'use client';

/**
 * useAdminStatusOverride — wires the platform-owner "Change Status (Admin)" escape hatch into any
 * document list page. It returns an extra action (only for platform owners) plus the modal that
 * force-sets the picked status via adminSet{Invoice,Quotation}Status. The backend independently
 * enforces the platform-owner privilege, so this is a UI affordance, not the security boundary.
 *
 * `family` selects the invoice-family vs quotation status set + endpoint; every non-quotation
 * document type (credit note, delivery challan, sales order, proforma, receipt, …) is 'invoice'.
 */

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useDocRowAction } from './use-doc-row-action';
import { AdminStatusOverrideModal } from '@/components/documents/AdminStatusOverrideModal';
import type { DocAction, DocumentRow } from '@/components/documents/SharedDocumentList';
import {
  adminSetInvoiceStatus,
  ADMIN_INVOICE_STATUSES,
  adminSetQuotationStatus,
  ADMIN_QUOTATION_STATUSES,
} from '@/lib/api/invoices';

export function useAdminStatusOverride(opts: {
  family: 'invoice' | 'quotation';
  isPlatformOwner: boolean;
  /** Resolves the tenant slug a row's mutation should target (aggregate vs tenant-scoped). */
  rowTenant: (r: DocumentRow) => string;
}): { adminActions: DocAction[]; statusModal: React.ReactNode } {
  const { family, isPlatformOwner, rowTenant } = opts;
  const { run, isPending } = useDocRowAction();
  const [row, setRow] = useState<DocumentRow | null>(null);

  const statuses = family === 'invoice' ? ADMIN_INVOICE_STATUSES : ADMIN_QUOTATION_STATUSES;
  const setStatus = family === 'invoice' ? adminSetInvoiceStatus : adminSetQuotationStatus;

  const adminActions: DocAction[] = isPlatformOwner
    ? [
        {
          label: 'Change Status (Admin)',
          icon: <SlidersHorizontal className="h-3.5 w-3.5" />,
          onClick: (r: DocumentRow) => setRow(r),
          visible: () => true,
        },
      ]
    : [];

  const statusModal = row ? (
    <AdminStatusOverrideModal
      open={!!row}
      docNumber={row.doc_number ?? 'Document'}
      currentStatus={row.status ?? ''}
      statuses={statuses}
      submitting={isPending}
      onClose={() => setRow(null)}
      onSubmit={(status) => {
        const r = row;
        run(() => setStatus(rowTenant(r), r.id, status), `${r.doc_number} → ${status}`);
        setRow(null);
      }}
    />
  ) : null;

  return { adminActions, statusModal };
}
