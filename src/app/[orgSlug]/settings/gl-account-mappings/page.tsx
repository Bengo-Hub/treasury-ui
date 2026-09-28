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
  useGLMappingCatalog,
  useCreateGLAccountMapping,
  useUpdateGLAccountMapping,
  useDeleteGLAccountMapping,
} from '@/hooks/use-gl-account-mappings';
import { type GLAccountMapping, type GLMappingLeg } from '@/lib/api/gl-account-mappings';
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
  service: '',
  event_type: '',
  leg: 'debit',
  account_code: '',
  description: '',
  is_active: true,
};

const keyOf = (m: { service: string; event_type: string; leg: string }) => `${m.service}|${m.event_type}|${m.leg}`;

/**
 * Account Mappings: which ledger account each posting (a service's event and leg) uses. Every
 * posting with a fixed default is listed as a "System default" row the backend creates, so the
 * tenant edits what already happens instead of building mappings from scratch. New rows are only
 * needed for dynamic keys (chosen per document), picked from the backend catalog. The key is
 * immutable; editing changes the account, description and active state.
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

  const { data: catalog } = useGLMappingCatalog(effectiveTenant);
  const mappings = data?.gl_account_mappings ?? [];
  // Keys without a row yet: dynamic ones, or static ones whose account the chart lacks.
  const unmappedKeys = useMemo(() => {
    const have = new Set(mappings.map(keyOf));
    return (catalog ?? []).filter((k) => !have.has(keyOf(k)));
  }, [catalog, mappings]);
  const keyOptions = useMemo<ComboboxOption[]>(
    () => unmappedKeys.map((k) => ({ value: keyOf(k), label: k.label, hint: k.default_code || 'per document' })),
    [unmappedKeys],
  );
  const selectedKey = unmappedKeys.find((k) => keyOf(k) === keyOf(formData));
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
      (m.label ?? '').toLowerCase().includes(q) ||
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

  const canCreate = !!formData.service && !!formData.event_type.trim() && !!formData.account_code;
  const canUpdate = !!formData.account_code;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Mappings</h1>
          <p className="text-muted-foreground mt-1">
            Which ledger account each posting uses. Rows marked System default show what the books
            use today; change the account on any row to re-point that posting.
          </p>
        </div>
        <Button className="gap-2 shadow-lg shadow-primary/20" onClick={openCreate} disabled={keyOptions.length === 0}>
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
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold group-hover:text-primary transition-colors">
                          {m.label || m.event_type}
                        </h4>
                        {m.is_system_default && m.account_code === m.default_code ? (
                          <Badge className="bg-muted text-muted-foreground border-border">System default</Badge>
                        ) : m.default_code && m.account_code !== m.default_code ? (
                          <span title={`Default: ${accountName(m.default_code)} (${m.default_code})`}>
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Changed from {m.default_code}</Badge>
                          </span>
                        ) : null}
                        {m.dynamic && (
                          <span title="Without this row the account is chosen per document">
                            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Overrides per-document choice</Badge>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-mono">{m.service} · {m.event_type} · {m.leg}</span>
                        <span className="ml-1">posts to {accountName(m.account_code)} ({m.account_code})</span>
                        {m.description && !m.is_system_default && <span className="ml-1">· {m.description}</span>}
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
                  No mappings match. Defaults appear here once the chart of accounts is set up.
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
          description="Pick a posting that has no row yet and the account it should use."
          onClose={() => setCreateOpen(false)}
          className="max-w-lg"
        >
          <div className="space-y-4">
            <FormField
              label="Posting"
              required
              description={
                selectedKey?.dynamic
                  ? 'This posting normally picks its account per document. A mapping sends every one of them to the account below.'
                  : `${formData.service} · ${formData.event_type} · ${formData.leg}`
              }
            >
              <Combobox
                options={keyOptions}
                value={formData.service ? keyOf(formData) : ''}
                onChange={(v) => {
                  const k = unmappedKeys.find((x) => keyOf(x) === v);
                  setFormData((p) => ({
                    ...p,
                    service: k?.service ?? '',
                    event_type: k?.event_type ?? '',
                    leg: k?.leg ?? 'debit',
                    account_code: k?.default_code || p.account_code,
                  }));
                }}
                placeholder="Select posting…"
                searchPlaceholder="Search postings…"
                emptyText="Every posting already has a mapping"
              />
            </FormField>
            <FormField label="Account" required description="The ledger account this posting should use.">
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
          title={editMapping?.label || 'Edit GL Account Mapping'}
          description={
            editMapping?.default_code
              ? `Default account: ${accountName(editMapping.default_code)} (${editMapping.default_code}). The posting key cannot be changed.`
              : 'The posting key cannot be changed; deactivate this row to fall back to the per-document choice.'
          }
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
