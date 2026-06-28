'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/base';
import { FormField } from '@/components/ui/form-field';
import {
  useSetCustomerOpeningBalance,
  useUpsertVendorBalance,
} from '@/hooks/use-arpa';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const inputClass =
  'w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all';

interface BaseProps {
  open: boolean;
  onClose: () => void;
  tenant: string;
  /** Display name shown in the dialog header. */
  name?: string;
}

type OpeningBalanceDialogProps =
  | (BaseProps & {
      kind: 'customer';
      /** CRM contact id (preferred) for the AR customer. */
      crmContactId?: string;
      /** Free-form identifier when no CRM id exists. */
      customerIdentifier?: string;
    })
  | (BaseProps & {
      kind: 'vendor';
      /** AP ledger vendor UUID, when known. */
      vendorId?: string;
      /** Free-form identifier when no vendor UUID exists. */
      vendorIdentifier?: string;
    });

/**
 * OpeningBalanceDialog — set a customer's carried-in AR opening balance
 * (POST /ar/customers/opening-balance) or upsert a vendor's opening / advance
 * AP balance (POST /ap/vendors), via the shared use-arpa mutation hooks (which
 * invalidate the relevant balance queries and toast on success/error).
 */
export function OpeningBalanceDialog(props: OpeningBalanceDialogProps) {
  const { open, onClose, tenant, name, kind } = props;
  const isCustomer = kind === 'customer';

  const setCustomer = useSetCustomerOpeningBalance(tenant);
  const upsertVendor = useUpsertVendorBalance(tenant);
  const mutation = isCustomer ? setCustomer : upsertVendor;

  const [openingBalance, setOpeningBalance] = useState('');
  const [advanceBalance, setAdvanceBalance] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [currency, setCurrency] = useState('KES');
  const [error, setError] = useState('');

  const submit = () => {
    const opening = openingBalance.trim();
    const advance = advanceBalance.trim();
    // Customers require an opening balance; vendors may set just an advance.
    if (isCustomer && (!opening || Number.isNaN(Number(opening)))) {
      setError('Enter a valid opening balance.');
      return;
    }
    if (!isCustomer && !opening && !advance) {
      setError('Enter an opening or advance balance.');
      return;
    }
    setError('');

    if (isCustomer) {
      setCustomer.mutate(
        {
          crm_contact_id: props.crmContactId || undefined,
          customer_identifier: props.crmContactId ? undefined : props.customerIdentifier || undefined,
          customer_name: name || undefined,
          opening_balance: opening,
          currency,
        },
        { onSuccess: () => onClose() },
      );
    } else {
      upsertVendor.mutate(
        {
          vendor_id: props.vendorId || undefined,
          vendor_identifier: props.vendorId ? undefined : props.vendorIdentifier || undefined,
          vendor_name: name || undefined,
          opening_balance: opening || undefined,
          advance_balance: advance || undefined,
          payment_terms: paymentTerms.trim() || undefined,
          currency,
        },
        { onSuccess: () => onClose() },
      );
    }
  };

  const heading = isCustomer ? 'Set Opening Balance' : 'Set Vendor Balance';
  const description = isCustomer
    ? `Carried-in AR balance${name ? ` for ${name}` : ''}.`
    : `Opening / advance AP balance${name ? ` for ${name}` : ''}.`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !mutation.isPending && onClose()}>
      <DialogContent title={heading} description={description} onClose={onClose} className="max-w-md">
        <div className="space-y-4">
          <FormField
            label="Opening Balance"
            required={isCustomer}
            description={
              isCustomer
                ? 'Amount this customer already owes (carried in).'
                : 'Amount already owed to this vendor (carried in).'
            }
          >
            <input
              type="number"
              inputMode="decimal"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </FormField>

          {!isCustomer && (
            <>
              <FormField
                label="Advance Balance"
                description="Prepayment already made to this vendor."
              >
                <input
                  type="number"
                  inputMode="decimal"
                  value={advanceBalance}
                  onChange={(e) => setAdvanceBalance(e.target.value)}
                  placeholder="0.00"
                  className={inputClass}
                />
              </FormField>
              <FormField label="Payment Terms" description="e.g. Net 30, Due on receipt.">
                <input
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="Net 30"
                  className={inputClass}
                />
              </FormField>
            </>
          )}

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
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button className="flex-1 gap-2" onClick={submit} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
