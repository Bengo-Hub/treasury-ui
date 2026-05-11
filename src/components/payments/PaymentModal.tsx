'use client';

import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { ReactNode } from 'react';

export function PaymentModal({
  title,
  children,
  onClose,
  className,
  embed = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
  embed?: boolean;
}) {
  // In embed mode (inside an iframe) render as an inline card — no fixed backdrop.
  // The outer TreasuryPaymentModal in the host page already provides the modal chrome.
  if (embed) {
    return (
      <div className={cn('bg-card rounded-xl border border-border w-full p-6', className)}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            aria-label="Back"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div
        className={cn('bg-card rounded-xl shadow-xl border border-border max-w-md w-full p-6', className)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="payment-modal-title" className="text-lg font-bold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
