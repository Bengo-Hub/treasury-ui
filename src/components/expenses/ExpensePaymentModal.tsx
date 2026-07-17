'use client';

import { formatCurrency } from '@/lib/utils/currency';
import type { Expense } from '@/lib/api/expenses';
import type { TreasuryEmbedMessage } from '@/lib/embed-messages';
import { CheckCircle2, Loader2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Tenant slug or ID used to create the payment intent on the public checkout. */
  tenant: string;
  expense: Expense;
  onClose: () => void;
  /** Fired once payment is confirmed inside the embedded checkout; receives the settled intent ID. */
  onConfirmed: (intentId: string) => void;
  /** True while the host is persisting the reimbursement link (reimburse mutation pending). */
  linking?: boolean;
}

// Reuse the existing embedded checkout (/pay?embed=true) — the same iframe + postMessage
// contract external services use. Referencing the expense makes treasury-api auto-create a
// payment intent for THIS expense; the confirmed message carries its intentId, which the host
// then links via reimburseExpense. Wallet is omitted because it needs the host to perform the
// debit with an auth token (not wired here) — mpesa/paystack self-settle inside the checkout.
function buildPayUrl(tenant: string, expense: Expense): string {
  const params = new URLSearchParams({
    embed: 'true',
    tenant,
    amount: String(Number(expense.total_amount) || 0),
    currency: expense.currency || 'KES',
    reference_id: expense.id,
    reference_type: 'expense',
    invoice_number: expense.expense_number,
    description: `Reimbursement for expense ${expense.expense_number}`,
    gateways: 'mpesa,paystack',
  });
  return `/pay?${params.toString()}`;
}

export function ExpensePaymentModal({ tenant, expense, onClose, onConfirmed, linking }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(560);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  // Build the URL once so the iframe never reloads mid-payment.
  const src = useRef(buildPayUrl(tenant, expense)).current;

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      // Only trust messages from OUR checkout iframe. Comparing event.source is
      // origin-independent, so it still holds after the Paystack redirect to the
      // hosted success page (which lives on a different origin in some deployments).
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return;
      const msg = event.data as TreasuryEmbedMessage;
      if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return;
      switch (msg.type) {
        case 'treasury:resize':
          if (msg.height > 0) setHeight(Math.max(320, Math.min(msg.height, 800)));
          break;
        case 'treasury:payment_confirmed':
          setError('');
          setConfirmed(true);
          onConfirmed(msg.intentId);
          break;
        case 'treasury:payment_failed':
          setError(msg.error || 'The payment could not be completed. Please try again.');
          break;
        default:
          break;
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onConfirmed]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex w-full max-w-lg max-h-[92vh] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-sm font-black text-foreground">Record payment</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {expense.expense_number} · {formatCurrency(Number(expense.total_amount), expense.currency)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
            {error}
          </div>
        )}

        {confirmed ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <p className="text-sm font-semibold text-foreground">Payment received</p>
            <p className="text-xs text-muted-foreground">
              {linking ? 'Linking the payment to the expense…' : 'Marking the expense reimbursed…'}
            </p>
            {linking && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>
        ) : (
          <div className="overflow-y-auto">
            <iframe
              ref={iframeRef}
              src={src}
              title={`Pay expense ${expense.expense_number}`}
              className="w-full border-0"
              style={{ height }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
