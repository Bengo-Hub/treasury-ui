'use client';

import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => onOpenChange(false)}
    >
      {children}
    </div>
  );
}

export function DialogContent({
  title,
  description,
  children,
  className,
  onClose,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  onClose?: () => void;
}) {
  return (
    <div
      className={cn(
        'bg-card rounded-xl shadow-xl border border-border max-w-md w-full max-h-[90vh] overflow-y-auto p-6',
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {(title || onClose) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h3 className="text-lg font-bold">{title}</h3>}
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded hover:bg-accent shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
