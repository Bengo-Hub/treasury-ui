'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { RowActionMenu, type RowAction } from '@/components/ui/action-menu';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import {
  useCreateCategory,
  useDeleteCategory,
  useExpenseCategories,
  useUpdateCategory,
} from '@/hooks/use-expenses';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { cn } from '@/lib/utils';
import type { ExpenseCategory } from '@/lib/api/expenses';
import {
  ArrowLeft,
  Globe,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Search,
  Tags,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const inputClass =
  'w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all';

/** "Office Supplies" → "OFFICE_SUPPLIES"; the backend requires a non-empty code. */
function deriveCode(name: string): string {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
  return base || `CAT_${Date.now().toString(36).toUpperCase()}`;
}

/** Capsule status badge — ACTIVE (success) / INACTIVE (outline). */
function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? 'success' : 'outline'}>{active ? 'Active' : 'Inactive'}</Badge>
  );
}

/**
 * SHARED capsule — platform-managed global category that every tenant can use but
 * none can edit. Mirrors the backend's tenant-edit rejection in the UI.
 */
function SharedBadge() {
  return (
    <span title="Shared platform category — available to every organisation and managed centrally.">
      <Badge variant="secondary" className="inline-flex items-center gap-1">
        <Globe className="h-3 w-3" /> Shared
      </Badge>
    </span>
  );
}

export default function ExpenseCategoriesPage() {
  const router = useRouter();
  const { tenantPathId, tenantQueryParam, isPlatformOwner, orgSlug } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  const { data, isLoading, error } = useExpenseCategories(effectiveTenant, !!effectiveTenant);
  const createCategory = useCreateCategory(effectiveTenant);
  const updateCategory = useUpdateCategory(effectiveTenant);
  const deleteCategory = useDeleteCategory(effectiveTenant);

  const [search, setSearch] = useState('');

  // Create dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [codeTouched, setCodeTouched] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();

  // Edit dialog state
  const [editTarget, setEditTarget] = useState<ExpenseCategory | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editNameError, setEditNameError] = useState<string | undefined>();

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<ExpenseCategory | null>(null);

  const allCategories = data?.categories ?? [];

  const categories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allCategories;
    return allCategories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q),
    );
  }, [allCategories, search]);

  const sharedCount = useMemo(() => allCategories.filter((c) => c.is_global).length, [allCategories]);

  const openDialog = () => {
    setName('');
    setCode('');
    setDescription('');
    setCodeTouched(false);
    setNameError(undefined);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Enter a category name');
      return;
    }
    createCategory.mutate(
      {
        name: trimmed,
        code: (codeTouched && code.trim()) || deriveCode(trimmed),
        description: description.trim() || undefined,
      },
      {
        onSuccess: (cat) => {
          toast.success(`Category "${cat.name}" created`);
          setDialogOpen(false);
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.error ?? 'Failed to create category. Please try again.');
        },
      },
    );
  };

  const openEdit = (cat: ExpenseCategory) => {
    // Global categories are platform-managed and read-only for tenants. Guard here too
    // so the dialog can never open for one even if a row action slipped through.
    if (cat.is_global) return;
    setEditTarget(cat);
    setEditName(cat.name);
    setEditDescription(cat.description ?? '');
    setEditActive(cat.is_active);
    setEditNameError(undefined);
  };

  const handleUpdate = () => {
    if (!editTarget) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditNameError('Enter a category name');
      return;
    }
    updateCategory.mutate(
      {
        id: editTarget.id,
        data: {
          name: trimmed,
          // Send empty string (not undefined) so clearing the description persists.
          description: editDescription.trim(),
          is_active: editActive,
        },
      },
      {
        onSuccess: (cat) => {
          toast.success(`Category "${cat.name}" updated`);
          setEditTarget(null);
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.error ?? 'Failed to update category. Please try again.');
        },
      },
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    deleteCategory.mutate(target.id, {
      onSuccess: () => {
        toast.success(`Category "${target.name}" deleted`);
        setDeleteTarget(null);
      },
      onError: (err: any) => {
        // 409 = the category is referenced by existing expenses; the backend
        // deactivated it (is_active=false) instead of hard-deleting.
        if (err?.response?.status === 409) {
          toast.info(
            `"${target.name}" is in use by existing expenses, so it was deactivated instead of deleted.`,
          );
          setDeleteTarget(null);
          return;
        }
        toast.error(err?.response?.data?.error ?? 'Failed to delete category. Please try again.');
      },
    });
  };

  // Row actions are only ever attached to tenant-owned rows; the global guard in
  // openEdit is a belt-and-braces backstop. Edit + Delete mirror the expenses table.
  const rowActions: RowAction<ExpenseCategory>[] = [
    {
      label: 'Edit',
      icon: <Pencil className="h-3.5 w-3.5" />,
      onClick: (c) => openEdit(c),
    },
    {
      label: 'Delete',
      icon: <Trash2 className="h-3.5 w-3.5" />,
      destructive: true,
      onClick: (c) => setDeleteTarget(c),
    },
  ];

  /** Inline cell used by both the desktop table and the mobile card. */
  const NameCell = ({ c }: { c: ExpenseCategory }) => (
    <div className="min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-foreground truncate">{c.name}</span>
        {c.is_global && <SharedBadge />}
      </div>
      {c.description && (
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.description}</p>
      )}
    </div>
  );

  /** Right-aligned action area: a "..." menu for tenant rows, a subtle hint for shared rows. */
  const ActionCell = ({ c, align = 'end' }: { c: ExpenseCategory; align?: 'start' | 'end' }) =>
    c.is_global ? (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground',
          align === 'end' && 'justify-end',
        )}
        title="Shared categories are managed centrally and can't be edited here."
      >
        <Lock className="h-3 w-3" /> Managed centrally
      </span>
    ) : (
      <div className={cn('flex', align === 'end' ? 'justify-end' : 'justify-start')}>
        <RowActionMenu row={c} actions={rowActions} />
      </div>
    );

  const isEmpty = !isLoading && categories.length === 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/${orgSlug}/expenses`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Expense Categories</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Organise expenses into categories for cleaner reporting.
            </p>
          </div>
        </div>
        <Button className="gap-2 shadow-lg shadow-primary/20 shrink-0" onClick={openDialog}>
          <Plus className="h-4 w-4" /> New Category
        </Button>
      </div>

      {isPlatformOwner && !tenantQueryParam && (
        <div className="rounded-lg border border-border bg-accent/5 px-4 py-2.5 text-center text-xs text-muted-foreground">
          Showing your own organization&apos;s categories. Drill into a tenant via the filter above to
          manage theirs.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load categories. Check your connection and try again.
        </div>
      )}

      <Card>
        {/* ---- Search / summary bar ---- */}
        <CardHeader className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between py-4">
          <div className="relative w-full sm:max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              placeholder="Search by name, code or description…"
              className="w-full bg-accent/30 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {!isLoading && allCategories.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/40 px-2.5 py-1 font-medium">
                <Tags className="h-3.5 w-3.5" /> {allCategories.length}{' '}
                {allCategories.length === 1 ? 'category' : 'categories'}
              </span>
              {sharedCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 font-medium">
                  <Globe className="h-3.5 w-3.5" /> {sharedCount} shared
                </span>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading categories…
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center gap-3 p-12 sm:p-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/40 text-muted-foreground">
                <Tags className="h-7 w-7" />
              </span>
              <p className="text-sm text-muted-foreground max-w-xs">
                {search.trim()
                  ? 'No categories match your search.'
                  : 'No expense categories yet. Create one to start grouping your spend.'}
              </p>
              {!search.trim() && (
                <Button variant="outline" className="gap-2" onClick={openDialog}>
                  <Plus className="h-4 w-4" /> Add your first category
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* ---- Desktop / tablet table ---- */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-accent/5">
                      <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                        Name
                      </th>
                      <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                        Code
                      </th>
                      <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                        Status
                      </th>
                      <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                        Created
                      </th>
                      <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {categories.map((c) => (
                      <tr key={c.id} className="hover:bg-accent/5 transition-colors">
                        <td className="px-6 py-4 align-top">
                          <NameCell c={c} />
                        </td>
                        <td className="px-6 py-4 align-top font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {c.code}
                        </td>
                        <td className="px-6 py-4 align-top text-center">
                          <StatusBadge active={c.is_active} />
                        </td>
                        <td className="px-6 py-4 align-top text-right text-xs text-muted-foreground whitespace-nowrap">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-4 align-top">
                          <ActionCell c={c} align="end" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ---- Mobile card list ---- */}
              <ul className="md:hidden divide-y divide-border">
                {categories.map((c) => (
                  <li key={c.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <NameCell c={c} />
                      {!c.is_global && <ActionCell c={c} align="start" />}
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <StatusBadge active={c.is_active} />
                        <span className="font-mono text-[11px] text-muted-foreground">{c.code}</span>
                      </div>
                      {c.is_global ? (
                        <ActionCell c={c} align="end" />
                      ) : (
                        c.created_at && (
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        )
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          title="New expense category"
          description="Categories help you group and report on spend."
          onClose={() => setDialogOpen(false)}
        >
          <div className="space-y-4">
            <FormField label="Category name" required error={nameError}>
              <input
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError(undefined);
                  if (!codeTouched) setCode(deriveCode(e.target.value));
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

            <FormField
              label="Code"
              description="Auto-generated from the name; edit if you need a specific code."
            >
              <input
                value={code}
                onChange={(e) => {
                  setCodeTouched(true);
                  setCode(e.target.value.toUpperCase());
                }}
                placeholder="OFFICE_SUPPLIES"
                className={cn(inputClass, 'font-mono')}
              />
            </FormField>

            <FormField
              label="Description"
              description="Optional — a short note about what this category covers."
            >
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="e.g. Pens, paper, printer ink and other office consumables"
                className={cn(inputClass, 'resize-y')}
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={createCategory.isPending}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleCreate} disabled={createCategory.isPending}>
                {createCategory.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent
          title="Edit expense category"
          description="Update the name, description or active status."
          onClose={() => setEditTarget(null)}
        >
          <div className="space-y-4">
            <FormField label="Category name" required error={editNameError}>
              <input
                autoFocus
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value);
                  if (editNameError) setEditNameError(undefined);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleUpdate();
                  }
                }}
                placeholder="e.g. Office Supplies"
                className={inputClass}
              />
            </FormField>

            <FormField label="Code" description="Codes are immutable once created.">
              <input
                value={editTarget?.code ?? ''}
                disabled
                className={cn(inputClass, 'font-mono opacity-60')}
              />
            </FormField>

            <FormField
              label="Description"
              description="Optional — a short note about what this category covers."
            >
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                placeholder="e.g. Pens, paper, printer ink and other office consumables"
                className={cn(inputClass, 'resize-y')}
              />
            </FormField>

            <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span>Active</span>
              <span className="text-xs text-muted-foreground">
                Inactive categories are hidden from the expense form.
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setEditTarget(null)}
                disabled={updateCategory.isPending}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleUpdate} disabled={updateCategory.isPending}>
                {updateCategory.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm — shared ConfirmDialog. The 409 in-use path is handled in
          handleDelete (soft-deactivate) with an informational toast. */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete category?"
        confirmLabel="Delete"
        destructive
        isPending={deleteCategory.isPending}
        onConfirm={handleDelete}
      >
        <p className="text-sm text-muted-foreground">
          This will permanently delete{' '}
          <span className="font-medium text-foreground">{deleteTarget?.name}</span>. If the category
          is already used by one or more expenses it will be deactivated instead of deleted, so
          existing expense history is preserved.
        </p>
      </ConfirmDialog>
    </div>
  );
}
