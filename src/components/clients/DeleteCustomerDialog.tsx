'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/base';
import { Trash2, Loader2, TriangleAlert } from 'lucide-react';

interface DeleteCustomerDialogProps {
  name: string;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * DeleteCustomerDialog — confirms a permanent customer delete. The backend (arpa.DeleteCustomer)
 * refuses this outright while any balance is owed either way (a 409, surfaced via toast by the
 * caller) — this dialog's job is just the confirmation step, not re-deriving that check
 * client-side. Requires typing the customer's name to confirm, since this is irreversible and
 * removes real records across two services (CRM contact + treasury AR row + POS loyalty/cache).
 */
export function DeleteCustomerDialog({ name, pending, onConfirm, onClose }: DeleteCustomerDialogProps) {
  const [typed, setTyped] = useState('');
  const confirmed = typed.trim().toLowerCase() === name.trim().toLowerCase();

  return (
    <Dialog open onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent title="Delete Customer" onClose={pending ? undefined : onClose}>
        <div className="space-y-3">
          <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <TriangleAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">
              This permanently deletes <b>{name}</b> — their CRM contact, treasury AR record, and POS loyalty/cache
              records. It cannot be undone. Blocked automatically while any balance is owed either way; their sales
              and payment history stay on record either way.
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              Type <span className="font-mono">{name}</span> to confirm
            </label>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              className="w-full mt-1 bg-accent/30 border-none rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-destructive"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1 gap-2" onClick={onConfirm} disabled={pending || !confirmed}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete Permanently
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
