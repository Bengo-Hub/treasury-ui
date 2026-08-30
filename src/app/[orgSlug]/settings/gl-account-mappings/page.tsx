'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { cn } from '@/lib/utils';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useAccounts } from '@/hooks/use-accounts';
import { flattenAccounts } from '@/lib/api/accounts';
import {
  useGLAccountMappings,
  useCreateGLAccountMapping,
  useUpdateGLAccountMapping,
  useDeleteGLAccountMapping,
} from '@/hooks/use-gl-account-mappings';
import { GL_MAPPING_SERVICES, type GLAccountMapping, type GLMappingLeg } from '@/lib/api/gl-account-mappings';
import { ArrowUpRight, GitBranch, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

interface MappingFormData {
  service: string;
  event_type: string;
  leg: GLMappingLeg;
  account_code: string;
  description: string;
  is_active: boolean;
}

const emptyForm: MappingFormData = {
  service: GL_MAPPING_SERVICES[0],
  event_type: '',
  leg: 'debit',
  account_code: '',
  description: '',
  is_active: true,
};

/**
 * GL Account Mappings — tenant-configurable overrides of which chart-of-accounts leaf a
 * (service, event_type, leg) monetary event posts to (ResolveAccountCode's tier-3 lookup, ahead
 * of the platform's built-in default for that event). Mirrors the Cost Centers settings page's
 * layout/interaction pattern. service/event_type/leg are immutable once created — the identity
 * key ResolveAccountCode looks up — so editing an existing mapping only offers account_code,
 * description, and active state; retargeting a different event means deactivating this row and
 * creating a new one.
 */
export default function GLAccountMappingsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const { tenantPathId, tenantQueryParam, isPlatformOwner, orgSlug } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  const [createOpen, setCreateOpen] = useState(false);
  const [editMapping, setEditMapping] = useState<GLAccountMapping | null>(null);
  const [deleteMapping, setDeleteMapping] = useState<GLAccountMapping | null>(null);
  const [formData, setFormData] = useState<MappingFormData>(emptyForm);

  const { data, isLoading, error } = useGLAccountMappings(effectiveTenant, { active_only: activeOnly });
  const { data: accountsData } = useAccounts(effectiveTenant);
  const createMutation = useCreateGLAccountMapping(effectiveTenant);
  const updateMutation = useUpdateGLAccountMapping(effectiveTenant);
  const deleteMutation = useDeleteGLAccountMapping(effectiveTenant);

  const mappings = data?.gl_account_mappings ?? [];
  const accountOptions = useMemo<ComboboxOption[]>(
    () =>
      flattenAccounts(accountsData?.accounts ?? [])
        .filter((a) => a.is_active !== false)
        .map((a) => ({ value: a.account_code, label: a.account_name, hint: a.account_code })),
    [accountsData],
  );
  const accountName = (code: string) => accountOptions.find((o) => o.value === code)?.label ?? code;

  const filtered = mappings.filter((m) => {
    const q = searchQuery.toLowerCase();
    return (
      m.service.toLowerCase().includes(q) ||
      m.event_type.toLowerCase().includes(q) ||
      m.account_code.toLowerCase().includes(q) ||
      accountName(m.account_code).toLowerCase().includes(q)
    );
  });

  function openCreate() {
    setFormData(emptyForm);
    setCreateOpen(true);
  }

  function openEdit(m: GLAccountMapping) {
    setFormData({
      service: m.service,
      event_type: m.event_type,
      leg: m.leg,
      account_code: m.account_code,
      description: m.description ?? '',
      is_active: m.is_active,
    });
    setEditMapping(m);
  }

  function handleCreate() {
    createMutation.mutate(
      {
        service: formData.service,
        event_type: formData.event_type.trim(),
        leg: formData.leg,
        account_code: formData.account_code,
        description: formData.description || undefined,
        is_active: formData.is_active,
      },
      { onSuccess: () => setCreateOpen(false) },
    );
  }

  function handleUpdate() {
    if (!editMapping) return;
    updateMutation.mutate(
      {
        id: editMapping.id,
        data: {
          account_code: formData.account_code,
          description: formData.description || undefined,
          is_active: formData.is_active,
        },
      },
      { onSuccess: () => setEditMapping(null) },
    );
  }

  function handleDelete() {
    if (!deleteMapping) return;
    deleteMutation.mutate(deleteMapping.id, { onSuccess: () => setDeleteMapping(null) });
  }

  const inputClasses =
    'w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none disabled:opacity-60';

  const canCreate = !!formData.event_type.trim() && !!formData.account_code;
  const canUpdate = !!formData.account_code;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GL Account Mappings</h1>
          <p className="text-muted-foreground mt-1">
            Override which ledger account a service&apos;s event posts to, instead of the platform&apos;s
            built-in default — e.g. route inventory purchases to a different GL code than the standard one.
          </p>
        </div>
        <Button className="gap-2 shadow-lg shadow-primary/20" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Mapping
        </Button>
      </div>

      {isPlatformOwner && !tenantQueryParam && (
        <div className="rounded-lg border border-border bg-accent/5 px-4 py-2.5 text-center text-xs text-muted-foreground">
          Showing your own organization&apos;s mappings. Drill into a tenant via the filter above to view theirs.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load GL account mappings. Check your connection and try again.
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between py-4">
          <div className="relative w-full max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              placeholder="Search by service, event type, or account..."
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
              {filtered.map((m) => (
                <div
                  key={m.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-accent/5 transition-colors cursor-pointer group"
                  onClick={() => openEdit(m)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-accent/30 flex items-center justify-center border border-border">
                      <GitBranch className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold uppercase text-muted-foreground">{m.service}</span>
                        <h4 className="text-sm font-bold group-hover:text-primary transition-colors">{m.event_type}</h4>
                        <Badge className={cn(m.leg === 'debit' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : 'bg-purple-500/10 text-purple-600 border-purple-500/20')}>
                          {m.leg}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        → {accountName(m.account_code)} ({m.account_code})
                        {m.description && <span className="ml-1">· {m.description}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      className={cn(
                        m.is_active
                          ? 'bg-green-500/10 text-green-500 border-green-500/20'
                          : 'bg-muted text-muted-foreground border-border',
                      )}
                    >
                      {m.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <button
                      type="button"
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteMapping(m);
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
                  No GL account mappings yet — postings use the platform&apos;s built-in defaults until you add one.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Mapping Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          title="Add GL Account Mapping"
          description="Override which account a service's event posts to."
          onClose={() => setCreateOpen(false)}
          className="max-w-lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Service" required>
                <select
                  className={inputClasses}
                  value={formData.service}
                  onChange={(e) => setFormData((p) => ({ ...p, service: e.target.value }))}
                >
                  {GL_MAPPING_SERVICES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Leg" required>
                <select
                  className={inputClasses}
                  value={formData.leg}
                  onChange={(e) => setFormData((p) => ({ ...p, leg: e.target.value as GLMappingLeg }))}
                >
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </select>
              </FormField>
            </div>
            <FormField label="Event type" required description="Must match the event_type value the posting code actually sends, e.g. 'bill', 'invoice.payment'.">
              <input
                className={inputClasses}
                placeholder="e.g. bill"
                value={formData.event_type}
                onChange={(e) => setFormData((p) => ({ ...p, event_type: e.target.value }))}
              />
            </FormField>
            <FormField label="Account" required description="The ledger account this event should post to instead of the built-in default.">
              <Combobox
                options={accountOptions}
                value={formData.account_code}
                onChange={(v) => setFormData((p) => ({ ...p, account_code: v ?? '' }))}
                placeholder="Select account…"
                searchPlaceholder="Search accounts…"
                emptyText="No matching accounts"
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
              <Button onClick={handleCreate} disabled={!canCreate || createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Mapping
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Mapping Dialog */}
      <Dialog open={!!editMapping} onOpenChange={(open) => !open && setEditMapping(null)}>
        <DialogContent
          title="Edit GL Account Mapping"
          description="Service, event type, and leg are the mapping's identity and can't be changed — deactivate this and create a new one to retarget a different event."
          onClose={() => setEditMapping(null)}
          className="max-w-lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Service">
                <input className={inputClasses} value={formData.service} disabled />
              </FormField>
              <FormField label="Event type">
                <input className={inputClasses} value={formData.event_type} disabled />
              </FormField>
              <FormField label="Leg">
                <input className={inputClasses} value={formData.leg} disabled />
              </FormField>
            </div>
            <FormField label="Account" required>
              <Combobox
                options={accountOptions}
                value={formData.account_code}
                onChange={(v) => setFormData((p) => ({ ...p, account_code: v ?? '' }))}
                placeholder="Select account…"
                searchPlaceholder="Search accounts…"
                emptyText="No matching accounts"
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
              <Button variant="outline" onClick={() => setEditMapping(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={!canUpdate || updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteMapping} onOpenChange={(open) => !open && setDeleteMapping(null)}>
        <DialogContent title="Deactivate Mapping" onClose={() => setDeleteMapping(null)}>
          <p className="text-sm text-muted-foreground mb-4">
            Deactivate the mapping for{' '}
            <span className="font-bold text-foreground">{deleteMapping?.service} · {deleteMapping?.event_type} ({deleteMapping?.leg})</span>?
            Future postings for this event fall back to the platform&apos;s built-in default account.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteMapping(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Deactivate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
