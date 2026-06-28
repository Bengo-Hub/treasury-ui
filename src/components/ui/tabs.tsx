'use client';

import { cn } from '@/lib/utils';
import { createContext, useContext, useState, type ReactNode } from 'react';

type TabsVariant = 'default' | 'capsule';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  variant: TabsVariant;
}

const TabsContext = createContext<TabsContextValue>({ value: '', onValueChange: () => {}, variant: 'default' });

export function Tabs({
  value: controlledValue,
  onValueChange: controlledOnChange,
  defaultValue,
  variant = 'default',
  children,
  className,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  variant?: TabsVariant;
  children: ReactNode;
  className?: string;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const value = controlledValue ?? internalValue;
  const onValueChange = controlledOnChange ?? setInternalValue;

  return (
    <TabsContext.Provider value={{ value, onValueChange, variant }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  const { variant } = useContext(TabsContext);

  if (variant === 'capsule') {
    // Modern segmented/capsule bar. Scrolls horizontally on narrow screens instead of
    // wrapping awkwardly; the track + active pill use semantic tokens so tenant branding
    // (the `primary`/`card` palette) drives the colours.
    return (
      <div
        role="tablist"
        className={cn(
          'inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-border/60 bg-muted/40 p-1 shadow-inner [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          className,
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <div role="tablist" className={cn('flex bg-accent/30 p-1 rounded-lg w-fit', className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
  disabled,
  badge,
}: {
  value: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  /** Optional count/label rendered as a pill next to the tab label. */
  badge?: ReactNode;
}) {
  const ctx = useContext(TabsContext);
  const isActive = ctx.value === value;

  if (ctx.variant === 'capsule') {
    return (
      <button
        type="button"
        role="tab"
        aria-selected={isActive}
        disabled={disabled}
        onClick={() => ctx.onValueChange(value)}
        className={cn(
          'inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
          disabled && 'opacity-50 pointer-events-none',
          className,
        )}
      >
        <span>{children}</span>
        {badge != null && (
          <span
            className={cn(
              'inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums',
              isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-foreground/10 text-foreground/70',
            )}
          >
            {badge}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        'px-6 py-2 rounded-md text-sm font-medium transition-all',
        isActive
          ? 'bg-card shadow-sm text-foreground'
          : 'text-muted-foreground hover:text-foreground',
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
}
