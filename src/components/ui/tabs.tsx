'use client';

import { cn } from '@/lib/utils';
import { createContext, useContext, type ReactNode } from 'react';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue>({ value: '', onValueChange: () => {} });

export function Tabs({
  value,
  onValueChange,
  children,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex bg-accent/30 p-1 rounded-lg w-fit', className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
  disabled,
}: {
  value: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const ctx = useContext(TabsContext);
  const isActive = ctx.value === value;

  return (
    <button
      type="button"
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
