'use client';

/**
 * DocumentApprovalModal — a thin dialog shell around the reusable DocumentApprovalCard.
 *
 * Lets any document list/row surface open the SAME centralized approval flow used on the
 * detail page (submit-for-approval / approve / reject, step trail, comment) without the user
 * having to navigate to the Approvals inbox. It is pure reuse: all logic lives in
 * DocumentApprovalCard (and the shared useApprovals hooks); this only supplies the modal chrome
 * and closes itself once an action succeeds.
 */

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DocumentApprovalCard } from './DocumentApprovalCard';
import type { ApprovalModule } from '@/lib/api/approvals';

interface Props {
  open: boolean;
  onClose: () => void;
  tenant: string | undefined;
  module: ApprovalModule;
  documentId: string;
  /** Display reference (e.g. invoice number) shown in the modal header. */
  documentReference?: string;
}

export function DocumentApprovalModal({ open, onClose, tenant, module, documentId, documentReference }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        title={documentReference || 'Approval'}
        onClose={onClose}
        className="max-w-lg"
      >
        <DocumentApprovalCard
          embedded
          tenant={tenant}
          module={module}
          documentId={documentId}
          documentReference={documentReference}
          onActed={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
