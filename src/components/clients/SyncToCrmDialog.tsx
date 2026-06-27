'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/base';
import { CloudUpload, Loader2 } from 'lucide-react';

interface SyncToCrmDialogProps {
  /** Client display name being synced (for the header). */
  name: string;
  /** Pre-fill from any contact details already on the client. */
  defaultEmail?: string;
  defaultPhone?: string;
  /** Whether the sync mutation is in flight. */
  pending?: boolean;
  /** Capture the entered email (required) + optional phone. */
  onConfirm: (values: { email: string; phone?: string }) => void;
  onClose: () => void;
}

/**
 * SyncToCrmDialog — captures a required email + optional phone when a client has no
 * contact details, then hands them to `useSyncCustomerToCRM`. Reuses the shared Dialog
 * primitive + sonner toasts (handled by the caller). Kept tiny + single-purpose.
 */
export function SyncToCrmDialog({
  name,
  defaultEmail,
  defaultPhone,
  pending,
  onConfirm,
  onClose,
}: SyncToCrmDialogProps) {
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [phone, setPhone] = useState(defaultPhone ?? '');
  const [error, setError] = useState('');

  const submit = () => {
    const trimmed = email.trim();
    // Basic email presence + shape check — email is required to resolve a CRM contact.
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    onConfirm({ email: trimmed, phone: phone.trim() || undefined });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent
        title="Sync to CRM"
        description={`Add contact details for ${name} to sync them to the CRM.`}
        onClose={pending ? undefined : onClose}
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Email (required)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
              autoFocus
              className="w-full mt-1 bg-accent/30 border-none rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Phone (optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+254 7XX XXX XXX"
              className="w-full mt-1 bg-accent/30 border-none rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button className="flex-1 gap-2" onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
              Sync to CRM
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
