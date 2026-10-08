'use client';

import { useState, type ReactNode } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useTaxProfile } from '@/hooks/use-tax';
import { sendInvoice } from '@/lib/api/invoices';

interface SendTarget {
  tenant: string;
  id: string;
  number: string;
  email?: string;
}

/**
 * A document list's Send action behind the shared dialog: `ask(row)` opens it, and the send runs
 * through the page's row-action runner with the user's eTIMS choice. `noun` names the document in
 * the success toast ("Credit note CN-... sent").
 */
export function useSendDocument(
  run: (fn: () => Promise<unknown>, label: string) => void,
  noun: string,
  opts: { fiscal?: boolean; isPending?: boolean } = {},
): { ask: (t: SendTarget) => void; dialog: ReactNode } {
  const [target, setTarget] = useState<SendTarget | null>(null);
  const dialog = (
    <SendDocumentDialog
      tenant={target?.tenant ?? ''}
      open={target !== null}
      onOpenChange={(o) => { if (!o) setTarget(null); }}
      documentNumber={target?.number}
      customerEmail={target?.email}
      fiscal={opts.fiscal ?? true}
      isPending={opts.isPending}
      onConfirm={(syncEtims) => {
        if (!target) return;
        const { tenant, id, number } = target;
        run(() => sendInvoice(tenant, id, syncEtims), `${noun} ${number} sent`);
        setTarget(null);
      }}
    />
  );
  return { ask: setTarget, dialog };
}

/** Document types that are not a fiscal supply, so KRA eTIMS never receives them. */
const NON_FISCAL_TYPES = new Set(['proforma_invoice', 'quotation', 'sales_order', 'delivery_challan', 'delivery_note', 'payment_receipt']);

export function isFiscalDocumentType(invoiceType: string | undefined): boolean {
  return !NON_FISCAL_TYPES.has(invoiceType ?? 'standard');
}

/**
 * The one "Send" confirmation for invoices and other documents (list row action and detail page).
 * The user chooses whether sending also transmits the document to KRA eTIMS, defaulting to the
 * tenant's auto-sync setting (Tax > Profile). The list page used to send with no choice while
 * saying it would always fiscalise.
 *
 * No switch is offered when eTIMS cannot apply: the tenant has not activated it, the document is
 * not a fiscal supply (proforma, quotation, sales order, delivery note), or it is a personal
 * (off-books) collection, which is never transmitted.
 */
export function SendDocumentDialog({
  tenant,
  open,
  onOpenChange,
  documentNumber,
  customerEmail,
  fiscal = true,
  offBooks = false,
  isPending,
  onConfirm,
}: {
  tenant: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentNumber?: string;
  customerEmail?: string;
  /** A fiscal supply (an invoice or a credit/debit note), the documents KRA receives. */
  fiscal?: boolean;
  offBooks?: boolean;
  isPending?: boolean;
  onConfirm: (syncEtims: boolean | undefined) => void;
}) {
  const { data: profile } = useTaxProfile(open ? tenant : '');
  const activated = !!profile?.etims_activated;
  const autoSync = profile?.metadata?.auto_sync_etims !== false;
  const canSync = activated && fiscal && !offBooks;
  // undefined until the user touches the switch: the tenant default then applies.
  const [picked, setPicked] = useState<boolean | undefined>(undefined);
  const sync = canSync && (picked ?? autoSync);

  const doc = documentNumber || 'This document';
  const to = customerEmail ? `to ${customerEmail}` : 'to the customer';
  const description = `${doc} will be emailed ${to} with links to view it and pay online.`;

  let etimsNote: string;
  if (offBooks) etimsNote = 'A personal invoice is off the company books and is never sent to KRA eTIMS.';
  else if (!fiscal) etimsNote = 'This document is not a fiscal supply, so it is not sent to KRA eTIMS.';
  else if (!activated) etimsNote = 'KRA eTIMS is not activated for this business, so nothing is sent to KRA.';
  else etimsNote = sync
    ? 'It will also be transmitted to KRA eTIMS (fiscalised) when sent.'
    : 'It will be sent without KRA eTIMS. You can fiscalise it later with "Generate ETR Receipt".';

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setPicked(undefined);
        onOpenChange(o);
      }}
      title="Send this document?"
      description={description}
      confirmLabel={sync ? 'Send and transmit' : 'Send'}
      isPending={isPending}
      onConfirm={() => {
        // An explicit choice only when the switch was offered; otherwise the server's own rules
        // (it never transmits a personal, non-fiscal or unactivated document anyway).
        onConfirm(canSync ? sync : undefined);
        setPicked(undefined);
      }}
    >
      {canSync ? (
        <button
          type="button"
          role="switch"
          aria-checked={sync}
          onClick={() => setPicked(!sync)}
          className="flex w-full items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-left"
        >
          <span className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${sync ? 'bg-primary' : 'bg-accent'}`}>
            <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${sync ? 'translate-x-5' : ''}`} />
          </span>
          <span className="text-sm">
            <span className="font-medium">Transmit to KRA eTIMS</span>
            <span className="block text-muted-foreground">{etimsNote}</span>
          </span>
        </button>
      ) : (
        <p className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">{etimsNote}</p>
      )}
    </ConfirmDialog>
  );
}
