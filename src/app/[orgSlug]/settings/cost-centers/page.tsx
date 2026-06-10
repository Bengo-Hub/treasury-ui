'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { cn } from '@/lib/utils';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import {
  useCostCenters,
  useCreateCostCenter,
  useUpdateCostCenter,
  useDeleteCostCenter,
} from '@/hooks/use-cost-centers';
import type { CostCenter } from '@/lib/api/cost-centers';
import { ArrowUpRight, Loader2, Plus, Search, Target, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface CostCenterFormData {
  name: string;
  code: string;
  description: string;
  is_active: boolean;
}

const emptyForm: CostCenterFormData = {
  name: '',
  code: '',
  description: '',
  is_active: true,
};

export default function CostCentersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editCenter, setEditCenter] = useState<CostCenter | null>(null);
  const [deleteCenter, setDeleteCenter] = useState<CostCenter | null>(null);
  const [formData, setFormData] = useState<CostCenterFormData>(emptyForm);

  const { data, isLoading, error } = useCostCenters(effectiveTenant, { active_only: activeOnly });
  const createMutation = useCreateCostCenter(effectiveTenant);
  const updateMutation = useUpdateCostCenter(effectiveTenant);
  const deleteMutation = useDeleteCostCenter(effectiveTenant);

  const centers = data?.cost_centers ?? [];

  const filtered = centers.filter((cc) => {
    const name = cc.name ?? '';
    const code = cc.code ?? '';
    const q = searchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || code.toLowerCase().includes(q);
  });

  function openCreate() {
    setFormData(emptyForm);
    setCreateOpen(true);
  }

  function openEdit(cc: CostCenter) {
    setFormData({
      name: cc.name,
      code: cc.code ?? '',
      description: cc.description ?? '',
      is_active: cc.is_active,
    });
    setEditCenter(cc);
  }

  function handleCreate() {
    createMutation.mutate(
      {
        name: formData.name,
        code: formData.code || undefined,
        description: formData.description || undefined,
        is_active: formData.is_active,
      },
      {
        onSuccess: () => setCreateOpen(false),
      },
    );
  }

  function handleUpdate() {
    if (!editCenter) return;
    updateMutation.mutate(
      {
        id: editCenter.id,
        data: {
          name: formData.name,
          code: formData.code || undefined,
          description: formData.description || undefined,
          is_active: formData.is_active,
        },
      },
      {
        onSuccess: () => setEditCenter(null),
      },
    );
  }

  function handleDelete() {
    if (!deleteCenter) return;
    deleteMutation.mutate(deleteCenter.id, {
      onSuccess: () => setDeleteCenter(null),
    });
  }

  const inputClasses =
    'w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cost Centers</h1>
          <p className="text-muted-foreground mt-1">
            Manage cost centers to tag expenses to an organizational unit for reporting.
          </p>
        </div>
        <Button className="gap-2 shadow-lg shadow-primary/20" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Cost Center
        </Button>
      </div>

      {isPlatformOwner && !tenantQueryParam && (
        <div className="rounded-lg border border-border bg-accent/5 px-4 py-10 text-center text-sm text-muted-foreground">
          Select a tenant from the filter above to view their cost centers.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load cost centers. Check your connection and try again.
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between py-4">
          <div className="relative w-full max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              placeholder="Search by name or code..."
              className="w-full bg-accent/30 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: 'All', value: false },
              { label: 'Active only', value: true },
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => setActiveOnly(opt.value)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-bold transition-all',
                  activeOnly === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-accent/30 text-muted-foreground hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((cc) => (
                <div
                  key={cc.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-accent/5 transition-colors cursor-pointer group"
                  onClick={() => openEdit(cc)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-accent/30 flex items-center justify-center border border-border">
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {cc.code && (
                          <span className="text-xs font-mono font-bold text-muted-foreground">
                            {cc.code}
                          </span>
                        )}
                        <h4 className="text-sm font-bold group-hover:text-primary transition-colors">
                          {cc.name}
                        </h4>
                      </div>
                      {cc.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 max-w-md truncate">
                          {cc.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      className={cn(
                        cc.is_active
                          ? 'bg-green-500/10 text-green-500 border-green-500/20'
                          : 'bg-muted text-muted-foreground border-border',
                      )}
                    >
                      {cc.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <button
                      type="button"
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteCenter(cc);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">
                  No cost centers match your search.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Cost Center Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          title="Add Cost Center"
          description="Create a new cost center dimension."
          onClose={() => setCreateOpen(false)}
        >
          <div className="space-y-4">
            <FormField label="Name" required>
              <input
                className={inputClasses}
                placeholder="e.g. Marketing"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              />
            </FormField>
            <FormField label="Code">
              <input
                className={inputClasses}
                placeholder="e.g. MKT"
                value={formData.code}
                onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
              />
            </FormField>
            <FormField label="Description">
              <textarea
                className={cn(inputClasses, 'min-h-20 resize-none')}
                placeholder="Optional description..."
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              />
            </FormField>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              Active
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!formData.name || createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Cost Center
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Cost Center Dialog */}
      <Dialog open={!!editCenter} onOpenChange={(open) => !open && setEditCenter(null)}>
        <DialogContent
          title="Edit Cost Center"
          description="Update cost center details."
          onClose={() => setEditCenter(null)}
        >
          <div className="space-y-4">
            <FormField label="Name" required>
              <input
                className={inputClasses}
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              />
            </FormField>
            <FormField label="Code">
              <input
                className={inputClasses}
                value={formData.code}
                onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
              />
            </FormField>
            <FormField label="Description">
              <textarea
                className={cn(inputClasses, 'min-h-20 resize-none')}
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              />
            </FormField>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              Active
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditCenter(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={!formData.name || updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteCenter} onOpenChange={(open) => !open && setDeleteCenter(null)}>
        <DialogContent title="Delete Cost Center" onClose={() => setDeleteCenter(null)}>
          <p className="text-sm text-muted-foreground mb-4">
            Are you sure you want to delete{' '}
            <span className="font-bold text-foreground">{deleteCenter?.name}</span>? Expenses tagged
            with this cost center will keep their reference.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteCenter(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
