'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/base';
import { UserPlus, Loader2 } from 'lucide-react';
import { PhoneInputField } from '@bengo-hub/shared-ui-lib/contact';

interface AddCustomerDialogProps {
  pending?: boolean;
  onConfirm: (values: { name: string; email?: string; phone?: string }) => void;
  onClose: () => void;
}

/**
 * AddCustomerDialog — creates a brand-new customer directly in the CRM (no prior invoice/order
 * needed). Reuses the same upsert-by-email-or-phone mechanism "Sync to CRM" already uses for a
 * doc-derived customer (marketflow dedups by email/phone, so this can never create a duplicate of
 * an existing contact) — no separate "create" endpoint needed.
 */
export function AddCustomerDialog({ pending, onConfirm, onClose }: AddCustomerDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError('Enter an email or phone number.');
      return;
    }
    setError('');
    onConfirm({ name: name.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent title="Add Customer" description="Create a new customer record." onClose={pending ? undefined : onClose}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Name (required)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full mt-1 bg-accent/30 border-none rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
              className="w-full mt-1 bg-accent/30 border-none rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Phone</label>
            <PhoneInputField value={phone} onChange={setPhone} placeholder="7XX XXX XXX" className="w-full mt-1" />
          </div>
          <p className="text-[11px] text-muted-foreground">Email or phone is required to create the record.</p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button className="flex-1 gap-2" onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Add Customer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
