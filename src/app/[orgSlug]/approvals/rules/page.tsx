'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import {
  useApprovalRules,
  useCreateApprovalRule,
  useDeleteApprovalRule,
  useUpdateApprovalRule,
} from '@/hooks/useApprovals';
import type { ApprovalModule, ApprovalRule, ApprovalStep } from '@/lib/api/approvals';
import { userHasPermission, userHasRole } from '@/lib/auth/permissions';
import { APPROVAL_MODULE_GROUPS, MODULE_LABEL, ROLE_OPTIONS, roleLabel } from '@/lib/documents/approvals';
import { useAuthStore } from '@/store/auth';
import { AlertTriangle, ArrowLeft, Minus, Plus, Shield, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

interface StepDraft {
  name: string;
  approver_role: string;
}

const DEFAULT_STEP: StepDraft = { name: 'Manager sign-off', approver_role: 'finance_admin' };

export default function ApprovalRulesPage() {
  const { orgSlug, tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  // Default to the platform owner's own tenant (codevertex); drill-down overrides.
  const tenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : (tenantPathId ?? orgSlug);

  const { data: rules, isLoading, isError, refetch } = useApprovalRules(tenant);
  const createRule = useCreateApprovalRule(tenant);
  const updateRule = useUpdateApprovalRule(tenant);
  const deleteRule = useDeleteApprovalRule(tenant);

  const user = useAuthStore((s) => s.user) as Parameters<typeof userHasPermission>[0];
  // A tenant admin owns their books' configuration — they manage approval rules even without the
  // granular treasury.approvals.* grants (which superuser/platform-owner already bypass). Gate on
  // the admin role OR the explicit permission so the CRUD buttons are visible to the people who
  // actually set up approval workflows.
  const isAdmin = userHasRole(user, ['admin', 'superuser']);
  const canAdd = isAdmin || userHasPermission(user, ['treasury.approvals.add', 'treasury.approvals.manage'], 'or');
  const canChange = isAdmin || userHasPermission(user, ['treasury.approvals.change', 'treasury.approvals.manage'], 'or');
  const canDelete = isAdmin || userHasPermission(user, ['treasury.approvals.delete', 'treasury.approvals.manage'], 'or');

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [module, setModule] = useState<ApprovalModule>('invoice');
  const [name, setName] = useState('');
  const [minAmount, setMinAmount] = useState('0');
  const [maxAmount, setMaxAmount] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [steps, setSteps] = useState<StepDraft[]>([DEFAULT_STEP]);

  function resetForm() {
    setModule('invoice');
    setName('');
    setMinAmount('0');
    setMaxAmount('');
    setIsActive(true);
    setSteps([DEFAULT_STEP]);
  }

  function startCreate() {
    setEditingId(null);
    resetForm();
    setOpen(true);
  }

  function startEdit(rule: ApprovalRule) {
    setEditingId(rule.id);
    setModule(rule.module);
    setName(rule.name);
    setMinAmount(String(rule.min_amount));
    setMaxAmount(rule.max_amount != null ? String(rule.max_amount) : '');
    setIsActive(rule.is_active);
    setSteps(
      rule.steps.length
        ? rule.steps.map((s) => ({ name: s.name, approver_role: s.approver_role }))
        : [DEFAULT_STEP],
    );
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setEditingId(null);
    resetForm();
  }

  function addStep() {
    setSteps([...steps, { name: '', approver_role: 'finance_admin' }]);
  }
  function removeStep(idx: number) {
    setSteps(steps.filter((_, i) => i !== idx));
  }
  function updateStep(idx: number, field: keyof StepDraft, value: string) {
    const next = [...steps];
    next[idx] = { ...next[idx], [field]: value };
    setSteps(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required'); return; }
    const cleanSteps: ApprovalStep[] = steps
      .filter((s) => s.approver_role)
      .map((s, i) => ({ sequence: i + 1, name: s.name.trim() || `Step ${i + 1}`, approver_role: s.approver_role }));
    if (cleanSteps.length === 0) { toast.error('Add at least one approval step'); return; }

    const payload = {
      module,
      name: name.trim(),
      min_amount: parseFloat(minAmount) || 0,
      max_amount: maxAmount.trim() === '' ? null : parseFloat(maxAmount),
      is_active: isActive,
      steps: cleanSteps,
    };

    if (editingId) {
      updateRule.mutate({ id: editingId, data: payload }, {
        onSuccess: () => { toast.success('Rule updated'); closeDialog(); },
        onError: () => toast.error('Failed to update rule'),
      });
    } else {
      createRule.mutate(payload, {
        onSuccess: () => { toast.success('Rule created'); closeDialog(); },
        onError: () => toast.error('Failed to create rule'),
      });
    }
  }

  function handleDelete(rule: ApprovalRule) {
    if (!confirm(`Delete approval rule "${rule.name}"?`)) return;
    deleteRule.mutate(rule.id, {
      onSuccess: () => toast.success('Rule deleted'),
      onError: () => toast.error('Failed to delete rule'),
    });
  }

  function band(rule: ApprovalRule) {
    const min = rule.min_amount.toLocaleString();
    return rule.max_amount != null ? `${min} – ${rule.max_amount.toLocaleString()}` : `${min} and above`;
  }

  const rows = rules ?? [];
  const saving = createRule.isPending || updateRule.isPending;

  return (
    <>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <Link href={`/${orgSlug}/approvals`}>
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
          </Link>
          <div className="mr-auto">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-6 w-6" /> Approval Rules
            </h1>
            <p className="text-muted-foreground mt-1">Amount-tiered, multi-step sign-off across invoicing, expenses, payables &amp; other finance documents</p>
          </div>
          {canAdd && (
            <Button onClick={startCreate}><Plus className="h-4 w-4 mr-2" /> New Rule</Button>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Rule</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Module</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Amount Band</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Steps</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Active</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">Loading rules...</td></tr>
                  ) : isError ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <AlertTriangle className="h-10 w-10 mx-auto text-destructive/60 mb-3" />
                        <p className="text-muted-foreground">Couldn&apos;t load approval rules</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>Retry</Button>
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <Shield className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground">No approval rules. Documents are processed without approval until a rule is added.</p>
                      </td>
                    </tr>
                  ) : (
                    rows.map((rule) => (
                      <tr key={rule.id} className="hover:bg-accent/30 transition-colors">
                        <td className="px-6 py-4 font-medium">{rule.name}</td>
                        <td className="px-6 py-4">{MODULE_LABEL[rule.module] ?? rule.module}</td>
                        <td className="px-6 py-4 tabular-nums">{band(rule)}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {rule.steps.map((s) => (
                              <Badge key={s.id ?? s.sequence} variant="outline">{s.sequence}. {roleLabel(s.approver_role)}</Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={rule.is_active ? 'success' : 'outline'}>{rule.is_active ? 'Active' : 'Inactive'}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {canChange && (
                            <Button variant="ghost" size="sm" onClick={() => startEdit(rule)}>Edit</Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="sm" aria-label="Delete rule" className="text-destructive hover:text-destructive" onClick={() => handleDelete(rule)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDialog} />
          <div className="relative z-50 w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{editingId ? 'Edit Approval Rule' : 'New Approval Rule'}</h2>
                  <button onClick={closeDialog} className="p-1 rounded-lg hover:bg-accent transition-colors">
                    <X className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Module *</label>
                      <select
                        value={module}
                        onChange={(e) => setModule(e.target.value as ApprovalModule)}
                        className="w-full rounded-lg border border-input bg-transparent px-4 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
                      >
                        {APPROVAL_MODULE_GROUPS.map((g) => (
                          <optgroup key={g.group} label={g.group}>
                            {g.items.map((it) => (
                              <option key={it.value} value={it.value}>{it.label}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">
                        Payout, Vendor Bill and Expense rules gate outbound money — a matching rule
                        blocks the payment until it is approved (with OTP).
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Name *</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. High-value invoices"
                        required
                        className="w-full rounded-lg border border-input bg-transparent px-4 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Min Amount</label>
                      <input type="number" min="0" step="0.01" value={minAmount} onChange={(e) => setMinAmount(e.target.value)}
                        className="w-full rounded-lg border border-input bg-transparent px-4 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Max Amount</label>
                      <input type="number" min="0" step="0.01" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="(blank = and above)"
                        className="w-full rounded-lg border border-input bg-transparent px-4 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                    Active
                  </label>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Approval Steps (in order) *</label>
                      <Button type="button" variant="ghost" size="sm" onClick={addStep}>
                        <Plus className="h-3 w-3 mr-1" /> Add Step
                      </Button>
                    </div>
                    {steps.map((step, idx) => (
                      <div key={idx} className="flex gap-2 items-center p-3 rounded-lg border border-border">
                        <span className="text-xs font-mono text-muted-foreground w-5 text-center shrink-0">{idx + 1}</span>
                        <input
                          value={step.name}
                          onChange={(e) => updateStep(idx, 'name', e.target.value)}
                          placeholder="Step label"
                          className="flex-1 rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
                        />
                        <select
                          value={step.approver_role}
                          onChange={(e) => updateStep(idx, 'approver_role', e.target.value)}
                          className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                        {steps.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive shrink-0" onClick={() => removeStep(idx)}>
                            <Minus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={closeDialog}>Cancel</Button>
                    <Button type="submit" className="flex-1" disabled={saving}>
                      {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Rule'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
