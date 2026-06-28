'use client';

import { Button } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { useCreateCategory, useExpenseCategories } from '@/hooks/use-expenses';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, Globe, Loader2, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

const inputClass =
  'w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all';

/**
 * Derives a stable category code from a name (e.g. "Office Supplies" → "OFFICE_SUPPLIES").
 * The backend create requires a non-empty `code`; we generate one so the user only has to
 * type a name (mirroring the lightweight inline-create UX used elsewhere in this repo).
 */
function deriveCode(name: string): string {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
  return base || `CAT_${Date.now().toString(36).toUpperCase()}`;
}

/**
 * CategoryCombobox is a searchable single-select for expense categories with a sticky
 * "+ Add category" footer that opens a small inline create dialog (name + optional
 * description). Creating a category POSTs it, then selects it — mirroring the established
 * inline-create UX (SupplierForm "+ Add vendor", etc.) so a user never has to leave the
 * expense form to add a missing category.
 */
export function CategoryCombobox({
  tenantIdOrSlug,
  value,
  onChange,
  disabled,
  className,
}: {
  tenantIdOrSlug: string | undefined;
  value: string | null | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogNameRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useExpenseCategories(tenantIdOrSlug, !!tenantIdOrSlug);
  const createCategory = useCreateCategory(tenantIdOrSlug);

  const options = useMemo(
    () =>
      (data?.categories ?? [])
        .filter((c) => c.is_active)
        .map((c) => ({ value: c.id, label: c.name, hint: c.code, isGlobal: !!c.is_global })),
    [data],
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (dialogOpen) requestAnimationFrame(() => dialogNameRef.current?.focus());
  }, [dialogOpen]);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.hint ?? '').toLowerCase().includes(q),
    );
  }, [options, query]);

  const openCreateDialog = () => {
    setOpen(false);
    // Pre-fill the name with whatever the user was searching for.
    setNewName(query.trim());
    setNewDescription('');
    setNameError(undefined);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) {
      setNameError('Enter a category name');
      return;
    }
    createCategory.mutate(
      {
        code: deriveCode(name),
        name,
        description: newDescription.trim() || undefined,
      },
      {
        onSuccess: (cat) => {
          toast.success(`Category "${cat.name}" created`);
          onChange(cat.id);
          setDialogOpen(false);
          setNewName('');
          setNewDescription('');
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.error ?? 'Failed to create category. Please try again.');
        },
      },
    );
  };

  return (
    <>
      <div ref={containerRef} className={cn('relative', className)}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          className={cn(
            'w-full flex items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm text-left min-h-[38px] disabled:opacity-50',
            open && 'ring-1 ring-ring',
          )}
        >
          {selected ? (
            <span className="flex-1 min-w-0 truncate">
              {selected.label}
              {selected.hint && (
                <span className="text-muted-foreground font-mono ml-2 text-xs">{selected.hint}</span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground flex-1">Select a category</span>
          )}
          <ChevronDown
            className={cn('h-4 w-4 text-muted-foreground transition-transform shrink-0', open && 'rotate-180')}
          />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search categories…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {isLoading ? (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-3 py-3 text-sm text-muted-foreground">
                  {query.trim() ? 'No matching categories' : 'No categories yet'}
                </div>
              ) : (
                filtered.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent/50 transition-colors',
                        isSelected && 'bg-accent/30',
                      )}
                    >
                      <Check
                        className={cn('h-3.5 w-3.5 shrink-0', isSelected ? 'opacity-100 text-primary' : 'opacity-0')}
                      />
                      <span className="flex-1 min-w-0 truncate">{opt.label}</span>
                      {opt.isGlobal && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground shrink-0"
                          title="Shared platform category"
                        >
                          <Globe className="h-2.5 w-2.5" /> Shared
                        </span>
                      )}
                      {opt.hint && (
                        <span className="text-muted-foreground font-mono text-xs shrink-0">{opt.hint}</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            {/* Sticky "+ Add category" footer — inline create without leaving the form. */}
            <button
              type="button"
              onClick={openCreateDialog}
              className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-sm font-medium text-primary hover:bg-accent/50 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add category
            </button>
          </div>
        )}
      </div>

      {/* Inline create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          title="Add expense category"
          description="Create a new category and use it right away."
          onClose={() => setDialogOpen(false)}
        >
          <div className="space-y-4">
            <FormField label="Category name" required error={nameError}>
              <input
                ref={dialogNameRef}
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (nameError) setNameError(undefined);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                placeholder="e.g. Office Supplies"
                className={inputClass}
              />
            </FormField>

            <FormField label="Description" description="Optional — a short note about what this category covers.">
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
                className={cn(inputClass, 'resize-y')}
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={createCategory.isPending}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleCreate} disabled={createCategory.isPending}>
                {createCategory.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create &amp; select
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
