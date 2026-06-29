'use client';

import { Button } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * ConfirmDialog is the shared, token-styled confirmation modal used by row
 * actions before a destructive or state-changing operation (delete, submit,
 * approve, reject, reimburse). It replaces ad-hoc window.confirm() calls so the
 * confirm surface matches the design system and can host extra content (e.g. a
 * reject-reason input) via `children`.
 *
 * The confirm button is disabled while `isPending` so a slow mutation can't be
 * double-fired, and shows a spinner. `destructive` styles it in the destructive
 * token for irreversible actions.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  isPending = false,
  confirmDisabled = false,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  isPending?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description} onClose={() => onOpenChange(false)}>
        <div className="space-y-4">
          {children}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {cancelLabel}
            </Button>
            <Button
              variant={destructive ? 'destructive' : 'primary'}
              onClick={onConfirm}
              disabled={isPending || confirmDisabled}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
