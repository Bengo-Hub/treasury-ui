'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/base';
import { FormField } from '@/components/ui/form-field';
import { useRecordVendorRefund } from '@/hooks/use-arpa';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const inputClass =
  'w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all';

interface VendorRefundDialogProps {
  open: boolean;
  onClose: () => void;
  tenant: string;
  /** Display name shown in the dialog header. */
  name?: string;
  /** AP ledger vendor UUID, when known. */
  vendorId?: string;
  /** Free-form identifier (vendor name) when no vendor UUID exists. */
  vendorIdentifier?: string;
}

/**
 * VendorRefundDialog — record cash received back from a supplier on a purchase
 * return (POST /ap/vendors/refund-received), via the shared use-arpa mutation
 * hook (which invalidates the vendor balance + AP summary queries and toasts
 * on success/error). Posts DR Cash / CR Accounts Payable.
 */
export function VendorRefundDialog(props: VendorRefundDialogProps) {
  const { open, onClose, tenant, name } = props;
  const refund = useRecordVendorRefund(tenant);

  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [currency, setCurrency] = useState('KES');
  const [error, setError] = useState('');

  const submit = () => {
    const amt = amount.trim();
    if (!amt || Number.isNaN(Number(amt)) || Number(amt) <= 0) {
      setError('Enter a valid refund amount.');
      return;
    }
    setError('');

    refund.mutate(
      {
        vendor_id: props.vendorId || undefined,
        vendor_identifier: props.vendorId ? undefined : props.vendorIdentifier || undefined,
        amount: amt,
        currency: currency.trim() || undefined,
        reference: reference.trim() || undefined,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !refund.isPending && onClose()}>
      <DialogContent
        title="Record Refund Received"
        description={`Cash received back from a purchase return${name ? ` for ${name}` : ''}.`}
        onClose={onClose}
        className="max-w-md"
      >
        <div className="space-y-4">
          <FormField
            label="Amount"
            required
            description="Cash received back from this supplier."
          >
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </FormField>

          <FormField label="Reference" description="e.g. credit note or refund reference.">
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </FormField>

          <FormField label="Currency">
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              placeholder="KES"
              maxLength={3}
              className={cn(inputClass, 'uppercase')}
            />
          </FormField>

          {error && <p className="text-xs text-destructive font-medium">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={refund.isPending}>
              Cancel
            </Button>
            <Button className="flex-1 gap-2" onClick={submit} disabled={refund.isPending}>
              {refund.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Record Refund
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
