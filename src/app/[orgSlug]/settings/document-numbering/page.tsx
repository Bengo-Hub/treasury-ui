'use client';

import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { FormField } from '@/components/ui/form-field';
import {
  useSequenceConfigs,
  useUpdateSequenceConfig,
  useResetSequenceCounter,
  usePreviewNextNumber,
} from '@/hooks/use-sequences';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { DOC_TYPES, type DocType, type SequenceConfig } from '@/lib/api/sequences';
import { FileText, Loader2, RefreshCw, Save } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const DOC_TYPE_LABELS: Record<DocType, string> = {
  quotation: 'Quotation',
  invoice: 'Invoice',
  proforma_invoice: 'Proforma Invoice',
  credit_note: 'Credit Note',
  debit_note: 'Debit Note',
  sales_order: 'Sales Order',
  payment_receipt: 'Payment Receipt',
};

const RESET_FREQ_OPTIONS = [
  { value: 'never', label: 'Never' },
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const DATE_FORMAT_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'YYMMDD', label: 'YYMMDD (e.g. 260523)' },
  { value: 'YYYYMMDD', label: 'YYYYMMDD (e.g. 20260523)' },
  { value: 'MMYY', label: 'MMYY (e.g. 0526)' },
  { value: 'DDMMYY', label: 'DDMMYY (e.g. 230526)' },
];

function DocTypeCard({ tenant, docType }: { tenant: string; docType: DocType }) {
  const { data: configsData } = useSequenceConfigs(tenant);
  const configs = configsData?.configs;
  const idx = DOC_TYPES.indexOf(docType);
  const cfg = configs?.[idx];

  const [form, setForm] = useState<{ prefix: string; separator: string; date_format: string; padding: number; reset_freq: string }>({
    prefix: '',
    separator: '-',
    date_format: 'YYMMDD',
    padding: 6,
    reset_freq: 'never',
  });

  useEffect(() => {
    if (cfg) {
      setForm({
        prefix: cfg.prefix ?? '',
        separator: cfg.separator ?? '-',
        date_format: cfg.date_format ?? 'YYMMDD',
        padding: cfg.padding ?? 6,
        reset_freq: cfg.reset_freq ?? 'never',
      });
    }
  }, [cfg]);

  const { data: preview } = usePreviewNextNumber(tenant, docType);
  const update = useUpdateSequenceConfig(tenant, docType);
  const reset = useResetSequenceCounter(tenant, docType);

  const handleSave = () => {
    update.mutate(
      { prefix: form.prefix, separator: form.separator, date_format: form.date_format, padding: form.padding, reset_freq: form.reset_freq },
      {
        onSuccess: () => toast.success(`${DOC_TYPE_LABELS[docType]} sequence updated`),
        onError: () => toast.error('Failed to update sequence'),
      }
    );
  };

  const handleReset = () => {
    if (!confirm(`Reset ${DOC_TYPE_LABELS[docType]} counter to 0? This cannot be undone.`)) return;
    reset.mutate(undefined, {
      onSuccess: () => toast.success('Counter reset'),
      onError: () => toast.error('Failed to reset counter'),
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{DOC_TYPE_LABELS[docType]}</span>
          </div>
          {preview && (
            <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
              Next: {preview.next_number}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FormField label="Prefix">
            <input
              className="w-full rounded border px-2 py-1.5 text-sm bg-background"
              value={form.prefix}
              onChange={e => setForm(f => ({ ...f, prefix: e.target.value }))}
              placeholder="INV"
            />
          </FormField>
          <FormField label="Separator">
            <input
              className="w-full rounded border px-2 py-1.5 text-sm bg-background"
              value={form.separator}
              onChange={e => setForm(f => ({ ...f, separator: e.target.value }))}
              placeholder="-"
              maxLength={3}
            />
          </FormField>
          <FormField label="Date Format">
            <select
              className="w-full rounded border px-2 py-1.5 text-sm bg-background"
              value={form.date_format}
              onChange={e => setForm(f => ({ ...f, date_format: e.target.value }))}
            >
              {DATE_FORMAT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Padding">
            <input
              type="number"
              className="w-full rounded border px-2 py-1.5 text-sm bg-background"
              value={form.padding}
              min={1}
              max={10}
              onChange={e => setForm(f => ({ ...f, padding: Number(e.target.value) }))}
            />
          </FormField>
        </div>
        <FormField label="Reset Frequency">
          <select
            className="w-full rounded border px-2 py-1.5 text-sm bg-background"
            value={form.reset_freq}
            onChange={e => setForm(f => ({ ...f, reset_freq: e.target.value }))}
          >
            {RESET_FREQ_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FormField>
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={handleReset} disabled={reset.isPending}>
            {reset.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Reset Counter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DocumentNumberingPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const { tenantPathId } = useResolvedTenant();
  const tenant = tenantPathId || orgSlug;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Document Numbering</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure the format for automatically generated document numbers. Changes apply to new documents only.
        </p>
      </div>
      <div className="space-y-4">
        {DOC_TYPES.map(docType => (
          <DocTypeCard key={docType} tenant={tenant} docType={docType} />
        ))}
      </div>
    </div>
  );
}
