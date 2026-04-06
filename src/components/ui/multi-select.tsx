'use client';

import { cn } from '@/lib/utils';
import { Check, ChevronDown, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface MultiSelectOption {
  value: string;
  label: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className,
}: {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const removeOption = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  const selectedLabels = value
    .map((v) => options.find((o) => o.value === v))
    .filter(Boolean) as MultiSelectOption[];

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm text-left min-h-[38px]',
          open && 'ring-1 ring-ring',
        )}
      >
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {selectedLabels.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selectedLabels.map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent text-xs font-medium"
              >
                {opt.label}
                <button
                  type="button"
                  onClick={(e) => removeOption(opt.value, e)}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No options</div>
          ) : (
            options.map((opt) => {
              const isSelected = value.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleOption(opt.value)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent/50 transition-colors',
                    isSelected && 'bg-accent/30',
                  )}
                >
                  <div
                    className={cn(
                      'h-4 w-4 rounded border flex items-center justify-center shrink-0',
                      isSelected
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-input',
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <span>{opt.label}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
