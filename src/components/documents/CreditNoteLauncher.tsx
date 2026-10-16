'use client';

/**
 * CreditNoteLauncher — opens the line-level CreditNoteDialog from anywhere that only knows an
 * invoice id (the invoice and proforma list rows). It loads the invoice with its lines first, so
 * the user always chooses between a whole-invoice credit and picking items, instead of a
 * one-click credit of the full amount. The invoice detail page uses CreditNoteDialog directly.
 */

import { CreditNoteDialog } from '@/components/documents/CreditNoteDialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useCreateCreditNote } from '@/hooks/use-invoices';
import { getInvoice } from '@/lib/api/invoices';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function CreditNoteLauncher({
  tenant,
  invoiceId,
  onClose,
}: {
  tenant: string;
  invoiceId: string;
  onClose: () => void;
}) {
  const invoiceQuery = useQuery({
    queryKey: ['credit-note-source', tenant, invoiceId],
    queryFn: () => getInvoice(tenant, invoiceId),
    // The remainder changes with every credit note, so never reuse a cached copy.
    staleTime: 0,
    gcTime: 0,
  });
  const mutation = useCreateCreditNote(tenant);
  const [error, setError] = useState('');

  if (invoiceQuery.isLoading || invoiceQuery.isError || !invoiceQuery.data) {
    return (
      <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent title="Credit note" onClose={onClose}>
          {invoiceQuery.isError ? (
            <p className="text-xs text-destructive">Could not load the invoice. Close this and try again.</p>
          ) : (
            <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading invoice lines...
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <CreditNoteDialog
      invoice={invoiceQuery.data}
      open
      onClose={onClose}
      pending={mutation.isPending}
      error={error}
      onSubmit={(lines) => {
        setError('');
        mutation.mutate(
          { invoiceId, lines },
          {
            onSuccess: (cn: any) => {
              toast.success(`Credit note ${cn?.invoice_number ?? ''} created`);
              onClose();
            },
            onError: (err: any) => setError(err?.response?.data?.error ?? err?.message ?? 'Failed to create credit note'),
          },
        );
      }}
    />
  );
}
