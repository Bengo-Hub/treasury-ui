'use client';

/**
 * ManualConfirmModal — the "confirm a stuck M-Pesa transaction" flow for the Transactions page.
 * Mirrors pos-ui's C2BPaymentMatcher pattern: verify against the real Daraja Transaction Status
 * Query FIRST (using the typed code, not just whatever's already on the intent), and only offer
 * the manual, unverified override as a fallback when that can't confirm it — never the other way
 * around. This is deliberately a DIFFERENT path from mpesa_manual (the pos-ui standalone tender,
 * which is intentionally pure trust with no API call): here the code is checked first.
 */

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/base';
import { checkIntentStatus, confirmManualPayment, getPaymentIntent } from '@/lib/api/payments';
import { CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

const POLL_MS = 3_000;
const POLL_TIMEOUT_MS = 18_000;

type Phase = 'input' | 'verifying' | 'fallback';

interface Props {
  open: boolean;
  onClose: () => void;
  tenant: string;
  intentId: string;
  onConfirmed: () => void;
}

export function ManualConfirmModal({ open, onClose, tenant, intentId, onConfirmed }: Props) {
  const [code, setCode] = useState('');
  const [phase, setPhase] = useState<Phase>('input');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollDeadline = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = () => {
    setCode('');
    setPhase('input');
    setError('');
    setVerifying(false);
    setConfirming(false);
    if (pollTimer.current) clearInterval(pollTimer.current);
    if (pollDeadline.current) clearTimeout(pollDeadline.current);
  };

  useEffect(() => {
    if (!open) reset();
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      if (pollDeadline.current) clearTimeout(pollDeadline.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const stopPolling = () => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    if (pollDeadline.current) clearTimeout(pollDeadline.current);
  };

  const startPolling = () => {
    pollTimer.current = setInterval(async () => {
      try {
        const intent = await getPaymentIntent(tenant, intentId);
        if (intent.status === 'succeeded') {
          stopPolling();
          toast.success('Confirmed — Safaricom verified the payment');
          onConfirmed();
          onClose();
        }
      } catch {
        // transient fetch error — keep polling until the deadline
      }
    }, POLL_MS);
    pollDeadline.current = setTimeout(() => {
      stopPolling();
      setPhase('fallback');
    }, POLL_TIMEOUT_MS);
  };

  const handleVerify = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setError('');
    setVerifying(true);
    try {
      const res = await checkIntentStatus(tenant, intentId, trimmed);
      setVerifying(false);
      if (!res.success) {
        setError(res.error || 'Could not query Safaricom with that code.');
        setPhase('fallback');
        return;
      }
      setPhase('verifying');
      startPolling();
    } catch (e: any) {
      setVerifying(false);
      setError(e?.response?.data?.error || e?.message || 'Status query failed.');
      setPhase('fallback');
    }
  };

  const handleManualConfirm = async () => {
    if (!window.confirm('This marks the transaction as paid WITHOUT Safaricom confirming it — only continue if you have verified the payment yourself. Continue?')) return;
    setConfirming(true);
    try {
      await confirmManualPayment(tenant, intentId, code.trim().toUpperCase() || undefined);
      toast.success('Transaction manually confirmed as paid');
      onConfirmed();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Manual confirm failed');
    } finally {
      setConfirming(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Confirm M-Pesa Payment" onClose={onClose} className="max-w-md">
        <div className="space-y-4">
          {phase === 'input' && (
            <>
              <p className="text-sm text-muted-foreground">
                Enter the M-Pesa confirmation code from the customer&apos;s SMS. We&apos;ll verify it
                against Safaricom before closing this out.
              </p>
              <input
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === 'Enter' && !verifying) void handleVerify(); }}
                placeholder="e.g. QB234ABCDE"
                maxLength={20}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono tracking-widest uppercase"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button disabled={!code.trim() || verifying} onClick={handleVerify}>
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                </Button>
              </div>
            </>
          )}

          {phase === 'verifying' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Checking with Safaricom for code <span className="font-mono font-bold">{code}</span>…
              </p>
              <p className="text-xs text-muted-foreground">This can take up to {Math.round(POLL_TIMEOUT_MS / 1000)}s.</p>
            </div>
          )}

          {phase === 'fallback' && (
            <>
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="text-xs">
                  {error || 'Safaricom did not confirm this code within the wait window.'} If you have
                  already verified the payment yourself (e.g. checked the statement), you can mark it
                  paid manually — this does NOT verify the code against M-Pesa.
                </p>
              </div>
              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={() => setPhase('input')}>← Try another code</Button>
                <Button variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400" disabled={confirming} onClick={handleManualConfirm}>
                  {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Mark Paid Manually
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
