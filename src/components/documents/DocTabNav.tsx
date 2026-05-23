'use client';

import { cn } from '@/lib/utils';

export interface DocTab<T extends string = string> {
  id: T;
  label: string;
}

interface DocTabNavProps<T extends string = string> {
  tabs: DocTab<T>[];
  active: T;
  onChange: (tab: T) => void;
}

export function DocTabNav<T extends string>({ tabs, active, onChange }: DocTabNavProps<T>) {
  return (
    <div className="border-b border-border bg-background px-6">
      <nav className="flex gap-0 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              active === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
