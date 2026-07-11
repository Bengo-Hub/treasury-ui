'use client';

import { cn } from '@/lib/utils';
import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * Capsule (pill) segmented tab bar — a modern, responsive alternative to the plain `Tabs`
 * primitive. The track is a rounded-full muted capsule; the active tab is a solid
 * `bg-primary` pill with a subtle shadow. The bar scrolls horizontally on small screens
 * so a long list of tabs (~11) never forces a page-level horizontal scroll.
 *
 * API mirrors `@/components/ui/tabs` (CapsuleTabs / CapsuleTabsList / CapsuleTabsTrigger /
 * CapsuleTabsContent) so it can be dropped in without changing `<TabsContent>` bodies.
 */

interface CapsuleTabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const CapsuleTabsContext = createContext<CapsuleTabsContextValue>({
  value: '',
  onValueChange: () => {},
});

export function CapsuleTabs({
  value: controlledValue,
  onValueChange: controlledOnChange,
  defaultValue,
  children,
  className,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  children: ReactNode;
  className?: string;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const value = controlledValue ?? internalValue;
  const onValueChange = controlledOnChange ?? setInternalValue;

  return (
    <CapsuleTabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </CapsuleTabsContext.Provider>
  );
}

export function CapsuleTabsList({
  children,
  className,
  wrap,
}: {
  children: ReactNode;
  className?: string;
  /**
   * When true, pills FLOW onto multiple rows instead of scrolling horizontally — use for long
   * tab sets (12+) so users never have to scroll the bar left/right. Default keeps the
   * single-row horizontal scroller (backwards compatible).
   */
  wrap?: boolean;
}) {
  if (wrap) {
    return (
      <div
        role="tablist"
        className={cn('flex w-full min-w-0 flex-wrap items-center gap-1 rounded-2xl bg-muted p-1', className)}
      >
        {children}
      </div>
    );
  }
  return (
    // The negative margin + padding keeps the focus ring / shadow of edge pills from being
    // clipped while still allowing horizontal scroll on mobile.
    <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div
        role="tablist"
        className={cn(
          'inline-flex w-max min-w-full items-center gap-1 rounded-full bg-muted p-1',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function CapsuleTabsTrigger({
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
  /** Optional attention element (count capsule / dot / "New" pill) rendered after the label. */
  badge?: ReactNode;
}) {
  const ctx = useContext(CapsuleTabsContext);
  const isActive = ctx.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4',
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      {children}
      {badge}
    </button>
  );
}

export function CapsuleTabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(CapsuleTabsContext);
  if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
}
