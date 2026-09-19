'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/base';
import { Pencil, Loader2 } from 'lucide-react';
import { PhoneInputField } from '@bengo-hub/shared-ui-lib/contact';

interface EditCustomerDialogProps {
  name: string;
  defaultEmail?: string;
  defaultPhone?: string;
  pending?: boolean;
  onConfirm: (values: { name?: string; email?: string; phone?: string }) => void;
  onClose: () => void;
}

/**
 * EditCustomerDialog — edit a customer's name/email/phone. Only usable once the customer has a
 * linked CRM contact (the backend refuses otherwise, pointing the user at "Sync to CRM" first —
 * this dialog doesn't duplicate that check, it just surfaces the backend's own error via toast).
 */
export function EditCustomerDialog({ name, defaultEmail, defaultPhone, pending, onConfirm, onClose }: EditCustomerDialogProps) {
  const [newName, setNewName] = useState(name);
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [phone, setPhone] = useState(defaultPhone ?? '');
  const [error, setError] = useState('');

  const submit = () => {
    if (!newName.trim()) {
      setError('Name is required.');
      return;
    }
    setError('');
    onConfirm({
      name: newName.trim() !== name ? newName.trim() : undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent title="Edit Customer" description={`Update ${name}'s details.`} onClose={pending ? undefined : onClose}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
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
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button className="flex-1 gap-2" onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
