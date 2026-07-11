'use client';

/**
 * AdminStatusOverrideModal — the platform-owner escape hatch for correcting a document that is
 * stuck in the wrong status (e.g. an accidentally-sent quotation that needs to go back to draft
 * so it can be edited). It bypasses the normal transition guards, so it is ONLY rendered for
 * platform owners (the page gates it) and the backend independently enforces the same privilege.
 *
 * The picker lists every status the document type can legitimately hold; picking one and
 * confirming force-sets it via adminSet{Invoice,Quotation}Status.
 */

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const prettyStatus = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function AdminStatusOverrideModal({
  open,
  docNumber,
  currentStatus,
  statuses,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  docNumber: string;
  currentStatus: string;
  statuses: readonly string[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (status: string) => void;
}) {
  const [selected, setSelected] = useState(currentStatus);

  // Reset the selection to the document's current status each time the modal is (re)opened.
  useEffect(() => {
    if (open) setSelected(currentStatus);
  }, [open, currentStatus]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title="Change document status"
        description={`${docNumber} — platform admin override. Bypasses the normal workflow.`}
        onClose={onClose}
      >
        <div className="space-y-4">
          <div className="text-sm">
            Current status:{' '}
            <span className="font-semibold">{prettyStatus(currentStatus) || '—'}</span>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">New status</label>
            <div className="grid grid-cols-2 gap-2">
              {statuses.map((s) => {
                const active = s === selected;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelected(s)}
                    className={`rounded-lg border px-3 py-2 text-sm text-left transition-colors ${
                      active
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    {prettyStatus(s)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button
              onClick={() => onSubmit(selected)}
              disabled={submitting || !selected || selected === currentStatus}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Set status
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
