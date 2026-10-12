'use client';

import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

/**
 * InfoTip is a small "i" next to a label that explains what a field expects. It opens on hover
 * and on keyboard focus, and the text is also the button's accessible name, so screen readers
 * read it too. The bubble opens below the icon so it is not cut off at the top of a table or
 * dialog; `align` keeps it inside the container at the right edge.
 */
export function InfoTip({
  text,
  align = 'center',
  className,
}: {
  text: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}) {
  return (
    <span className={cn('group relative inline-flex align-middle', className)}>
      <button
        type="button"
        aria-label={text}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute top-full z-50 mt-1.5 w-64 rounded-lg border border-border bg-popover px-3 py-2 text-left text-xs font-normal normal-case leading-snug tracking-normal text-popover-foreground opacity-0 shadow-lg transition-opacity',
          'group-hover:opacity-100 group-focus-within:opacity-100',
          align === 'left' && 'left-0',
          align === 'center' && 'left-1/2 -translate-x-1/2',
          align === 'right' && 'right-0',
        )}
      >
        {text}
      </span>
    </span>
  );
}
