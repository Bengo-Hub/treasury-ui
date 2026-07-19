'use client';

import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import {
  useSequenceConfig,
  useUpdateSequenceConfig,
  useResetSequenceCounter,
  useSetSequenceCounter,
  usePreviewNextNumber,
} from '@/hooks/use-sequences';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { DOC_TYPES, type DocType } from '@/lib/api/sequences';
import { AlertTriangle, FileText, Hash, Loader2, RefreshCw, Save } from 'lucide-react';
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
  delivery_challan: 'Delivery Challan',
  expense: 'Expense',
};

// Suggested prefixes pre-filled ONLY when a tenant switches a doc type to the "Prefixed" format.
// The platform default is pure numeric (no prefix, no date) — these are hints, not defaults.
const DOC_TYPE_SUGGESTED_PREFIX: Record<DocType, string> = {
  quotation: 'QT',
  invoice: 'INV',
  proforma_invoice: 'PI',
  credit_note: 'CN',
  debit_note: 'DN',
  sales_order: 'SO',
  payment_receipt: 'RCP',
  delivery_challan: 'DC',
  expense: 'EXP',
};

const RESET_FREQ_OPTIONS = [
  { value: 'never', label: 'Never' },
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly (calendar)' },
  { value: 'fiscal_yearly', label: 'Yearly (fiscal year)' },
];

const DATE_FORMAT_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'YYMMDD', label: 'YYMMDD (e.g. 260523)' },
  { value: 'YYYYMMDD', label: 'YYYYMMDD (e.g. 20260523)' },
  { value: 'MMYY', label: 'MMYY (e.g. 0526)' },
  { value: 'DDMMYY', label: 'DDMMYY (e.g. 230526)' },
];

function ResetConfirmDialog({
  docTypeLabel,
  open,
  onConfirm,
  onCancel,
  isPending,
}: {
  docTypeLabel: string;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        title="Reset Counter"
        description={`Reset the ${docTypeLabel} sequence counter back to 0?`}
        onClose={onCancel}
      >
        <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 mb-5">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">
            This will restart numbering from 1. Existing documents keep their current numbers. This cannot be undone.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Reset Counter
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DocTypeCard({ tenant, docType }: { tenant: string; docType: DocType }) {
  const { data: cfg } = useSequenceConfig(tenant, docType);
  const { data: preview } = usePreviewNextNumber(tenant, docType);
  const suggestedPrefix = DOC_TYPE_SUGGESTED_PREFIX[docType];

  // 'numeric' → pure sequential number (e.g. 000001); 'prefixed' → prefix/date/separator style.
  const [format, setFormat] = useState<'numeric' | 'prefixed'>('numeric');
  const [form, setForm] = useState({
    prefix: '',
    separator: '-',
    date_format: '',
    padding: 6,
    reset_freq: 'never',
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  // "Set current number" lets a tenant continuing an existing series pin the last-issued
  // number so the next document picks up at value+1. Empty until the user types one.
  const [counterInput, setCounterInput] = useState('');

  useEffect(() => {
    if (cfg) {
      const isPrefixed = Boolean(cfg.prefix || cfg.date_format);
      setFormat(isPrefixed ? 'prefixed' : 'numeric');
      setForm({
        prefix: cfg.prefix ?? '',
        separator: cfg.separator ?? '-',
        date_format: cfg.date_format ?? '',
        padding: cfg.padding ?? 6,
        reset_freq: cfg.reset_freq ?? 'never',
      });
    }
  }, [cfg, docType]);

  // Switching format clears (numeric) or pre-fills (prefixed) the prefix/date fields.
  const selectNumeric = () => {
    setFormat('numeric');
    setForm((f) => ({ ...f, prefix: '', date_format: '' }));
  };
  const selectPrefixed = () => {
    setFormat('prefixed');
    setForm((f) => ({
      ...f,
      prefix: f.prefix || suggestedPrefix,
      date_format: f.date_format || 'YYMMDD',
    }));
  };

  const update = useUpdateSequenceConfig(tenant, docType);
  const reset = useResetSequenceCounter(tenant, docType);
  const setCounter = useSetSequenceCounter(tenant, docType);

  const handleSetCounter = () => {
    const val = Number(counterInput);
    if (!Number.isInteger(val) || val < 0) {
      toast.error('Enter a whole number of 0 or more');
      return;
    }
    setCounter.mutate(val, {
      onSuccess: () => {
        toast.success(`${DOC_TYPE_LABELS[docType]} will continue from ${val + 1}`);
        setCounterInput('');
      },
      onError: () => toast.error('Failed to set the current number'),
    });
  };

  const handleSave = () => {
    // Numeric format persists as empty prefix + empty date so the backend emits just the counter.
    const numeric = format === 'numeric';
    update.mutate(
      {
        prefix: numeric ? '' : form.prefix,
        separator: form.separator,
        date_format: numeric ? '' : form.date_format,
        padding: form.padding,
        reset_freq: form.reset_freq,
      },
      {
        onSuccess: () => toast.success(`${DOC_TYPE_LABELS[docType]} sequence updated`),
        onError: () => toast.error('Failed to update sequence'),
      },
    );
  };

  const handleResetConfirmed = () => {
    reset.mutate(undefined, {
      onSuccess: () => {
        toast.success(`${DOC_TYPE_LABELS[docType]} counter reset to 0`);
        setConfirmOpen(false);
      },
      onError: () => {
        toast.error('Failed to reset counter');
        setConfirmOpen(false);
      },
    });
  };

  return (
    <>
      <ResetConfirmDialog
        docTypeLabel={DOC_TYPE_LABELS[docType]}
        open={confirmOpen}
        onConfirm={handleResetConfirmed}
        onCancel={() => setConfirmOpen(false)}
        isPending={reset.isPending}
      />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{DOC_TYPE_LABELS[docType]}</span>
            </div>
            {preview?.next_number && (
              <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                Next: {preview.next_number}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Numbering format toggle: pure numeric (default) vs prefixed/dated. */}
          <FormField
            label="Numbering Format"
            description={
              format === 'numeric'
                ? 'Pure sequential number — no prefix or date.'
                : 'Prefix + optional date + sequential number.'
            }
          >
            <div className="inline-flex rounded-md border bg-background p-0.5 text-sm">
              <button
                type="button"
                onClick={selectNumeric}
                className={`px-3 py-1 rounded ${
                  format === 'numeric'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Numeric
              </button>
              <button
                type="button"
                onClick={selectPrefixed}
                className={`px-3 py-1 rounded ${
                  format === 'prefixed'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Prefixed
              </button>
            </div>
          </FormField>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {format === 'prefixed' && (
              <>
                <FormField label="Prefix" description={`Suggested: ${suggestedPrefix}`}>
                  <input
                    className="w-full rounded border px-2 py-1.5 text-sm bg-background"
                    value={form.prefix}
                    onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value }))}
                    placeholder={suggestedPrefix}
                  />
                </FormField>
                <FormField label="Separator">
                  <input
                    className="w-full rounded border px-2 py-1.5 text-sm bg-background"
                    value={form.separator}
                    onChange={(e) => setForm((f) => ({ ...f, separator: e.target.value }))}
                    placeholder="-"
                    maxLength={3}
                  />
                </FormField>
                <FormField label="Date Format">
                  <select
                    className="w-full rounded border px-2 py-1.5 text-sm bg-background"
                    value={form.date_format}
                    onChange={(e) => setForm((f) => ({ ...f, date_format: e.target.value }))}
                  >
                    {DATE_FORMAT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </FormField>
              </>
            )}
            <FormField label="Zero Padding">
              <input
                type="number"
                className="w-full rounded border px-2 py-1.5 text-sm bg-background"
                value={form.padding}
                min={1}
                max={10}
                onChange={(e) => setForm((f) => ({ ...f, padding: Number(e.target.value) }))}
              />
            </FormField>
          </div>
          <FormField
            label="Reset Frequency"
            description="How often the counter resets back to 1."
          >
            <select
              className="w-full rounded border px-2 py-1.5 text-sm bg-background"
              value={form.reset_freq}
              onChange={(e) => setForm((f) => ({ ...f, reset_freq: e.target.value }))}
            >
              {RESET_FREQ_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FormField>

          {cfg && (
            <p className="text-xs text-muted-foreground">
              Current counter: <span className="font-mono font-medium">{cfg.current_val}</span>
              {cfg.last_reset && (
                <> &nbsp;·&nbsp; Last reset: {new Date(cfg.last_reset).toLocaleDateString()}</>
              )}
            </p>
          )}

          {/* Set the current number — for continuing an existing series (e.g. migrating in at
              invoice #042, so the next issued is #043). */}
          <FormField
            label="Set Current Number"
            description="Continue an existing series: enter the last number you already issued; the next document will be that + 1."
          >
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Hash className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="w-full rounded border pl-7 pr-2 py-1.5 text-sm bg-background font-mono"
                  value={counterInput}
                  placeholder={cfg ? String(cfg.current_val) : '0'}
                  onChange={(e) => setCounterInput(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSetCounter}
                disabled={setCounter.isPending || counterInput.trim() === ''}
              >
                {setCounter.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Hash className="h-3.5 w-3.5" />}
                Set
              </Button>
            </div>
          </FormField>

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={update.isPending}>
              {update.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmOpen(true)}
              disabled={reset.isPending}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset Counter
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function DocumentNumberingPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  // Default to the platform owner's own tenant (codevertex); drill-down overrides.
  const tenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : (tenantPathId || orgSlug);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Document Numbering</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose pure numeric numbering (the default, e.g. 000001) or a prefixed/dated format
          per document type. Changes apply to new documents only — existing numbers are not affected.
        </p>
      </div>
      <div className="space-y-4">
        {DOC_TYPES.map((docType) => (
          <DocTypeCard key={docType} tenant={tenant} docType={docType} />
        ))}
      </div>
    </div>
  );
}
