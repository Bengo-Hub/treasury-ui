'use client';

import { useMemo, useState } from 'react';
import { LayoutTemplate, Trash2 } from 'lucide-react';
import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { FormField } from '@/components/ui/form-field';
import { useBudgetTemplates, useDeleteBudgetTemplate } from '@/hooks/use-budgets';
import { num, type BudgetTemplate } from '@/lib/api/budgets';

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring';

/**
 * "Start from a template" for a new budget: starter templates (a share of the totals per line on
 * the standard chart) or the tenant's saved ones. Applying fills the builder's lines; nothing is
 * saved until the budget itself is.
 */
export function TemplatePicker({
  tenant,
  onApply,
}: {
  tenant: string;
  onApply: (t: BudgetTemplate, spendTotal: number, revenueTotal: number) => void;
}) {
  const { data: templates, isLoading } = useBudgetTemplates(tenant);
  const remove = useDeleteBudgetTemplate();
  const [key, setKey] = useState('');
  const [spend, setSpend] = useState('');
  const [revenue, setRevenue] = useState('');
  const chosen = useMemo(() => (templates ?? []).find((t) => t.key === key), [templates, key]);
  const hasRevenue = !!chosen?.lines.some((l) => l.category === 'revenue');

  const pick = (k: string) => {
    setKey(k);
    const t = (templates ?? []).find((x) => x.key === k);
    // Saved templates suggest the totals of the budget they came from.
    setSpend(t && num(t.spend_total) > 0 ? String(num(t.spend_total)) : '');
    setRevenue(t && num(t.revenue_total) > 0 ? String(num(t.revenue_total)) : '');
  };

  if (isLoading || !(templates ?? []).length) return null;
  const starters = (templates ?? []).filter((t) => t.kind === 'starter');
  const own = (templates ?? []).filter((t) => t.kind === 'tenant');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 py-4">
        <LayoutTemplate className="h-4 w-4 text-primary" />
        <h3 className="font-bold text-sm uppercase tracking-tight">Start from a template</h3>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-4">
        <FormField label="Template" className="md:col-span-2" description={chosen?.description}>
          <select className={inputClass} value={key} onChange={(e) => pick(e.target.value)}>
            <option value="">Blank budget</option>
            <optgroup label="Starter templates">
              {starters.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}
                  {t.industry ? ` (${t.industry})` : ''}
                </option>
              ))}
            </optgroup>
            {own.length > 0 && (
              <optgroup label="Your templates">
                {own.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </FormField>
        {chosen && (
          <>
            <FormField label="Planned spend" required>
              <input type="number" min={0} className={inputClass} value={spend} onChange={(e) => setSpend(e.target.value)} />
            </FormField>
            {hasRevenue && (
              <FormField label="Planned revenue">
                <input type="number" min={0} className={inputClass} value={revenue} onChange={(e) => setRevenue(e.target.value)} />
              </FormField>
            )}
            <div className="flex flex-wrap items-center gap-3 md:col-span-4">
              <Button size="sm" disabled={!(Number(spend) > 0)} onClick={() => onApply(chosen, Number(spend) || 0, Number(revenue) || 0)}>
                Use this template
              </Button>
              {chosen.kind === 'tenant' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-destructive"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate({ tenantSlug: tenant, key: chosen.key }, { onSuccess: () => pick('') })}
                >
                  <Trash2 className="h-4 w-4" /> Delete template
                </Button>
              )}
              {(chosen.missing_account_codes?.length ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Your chart has no account {chosen.missing_account_codes!.join(', ')}; choose an account for those lines.
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
