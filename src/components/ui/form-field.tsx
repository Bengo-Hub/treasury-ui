'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function FormField({
  label,
  description,
  error,
  children,
  className,
  required,
}: {
  label: string;
  description?: string;
  error?: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <label className="block text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {description && (
        <p className="text-[11px] text-muted-foreground/70">{description}</p>
      )}
      {children}
      {error && (
        <p className="text-[11px] text-destructive font-medium">{error}</p>
      )}
    </div>
  );
}
