'use client';

import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { PresentationEditor } from '@/components/documents/PresentationEditor';
import { SignatureCard } from '@/components/documents/SignatureCard';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { getSettingValue, useSettings, useUpdateSetting } from '@/hooks/use-settings';
import {
  PRESENTATION_SETTING_KEY,
  parsePresentationDefaults,
  type Presentation,
  type PresentationDefaults,
} from '@/lib/documents/presentation';
import { FileText, Loader2, RotateCcw, Save } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// The documents with line items. Keys are treasury-api's document types.
const DOC_TYPES: { key: string; label: string }[] = [
  { key: 'invoice', label: 'Invoice' },
  { key: 'quotation', label: 'Quotation' },
  { key: 'proforma_invoice', label: 'Proforma Invoice' },
  { key: 'sales_order', label: 'Sales Order' },
  { key: 'credit_note', label: 'Credit Note' },
  { key: 'debit_note', label: 'Debit Note' },
  { key: 'delivery_challan', label: 'Delivery Note' },
  { key: 'payment_receipt', label: 'Payment Receipt' },
];

export default function DocumentPresentationPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  const tenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : (tenantPathId || orgSlug);

  const { data, isLoading } = useSettings(tenant);
  const update = useUpdateSetting(tenant);
  const [draft, setDraft] = useState<PresentationDefaults>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!data || dirty) return;
    setDraft(parsePresentationDefaults(getSettingValue(data.settings, PRESENTATION_SETTING_KEY, {})));
  }, [data, dirty]);

  const setType = (key: string, value: Presentation | undefined) => {
    setDraft((d) => {
      const next = { ...d };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    try {
      await update.mutateAsync({ key: PRESENTATION_SETTING_KEY, value: draft, configType: 'json' });
      setDirty(false);
      toast.success('Document presentation saved');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Failed to save');
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Document Presentation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            The signature, how amounts print and which line columns show on each document type, in PDFs
            and in CSV and Excel exports. A single document can still use its own layout from its form.
          </p>
        </div>
        <Button onClick={save} disabled={!dirty || update.isPending}>
          {update.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
          Save
        </Button>
      </div>

      <SignatureCard tenant={tenant} docTypes={DOC_TYPES} />

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading settings
        </div>
      ) : (
        <div className="space-y-4">
          {DOC_TYPES.map(({ key, label }) => {
            const value = draft[key];
            return (
              <Card key={key}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{label}</span>
                      {!value && <span className="text-xs text-muted-foreground">Standard layout</span>}
                    </div>
                    {value ? (
                      <button type="button" onClick={() => setType(key, undefined)}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <RotateCcw className="h-3.5 w-3.5" /> Use standard
                      </button>
                    ) : (
                      <button type="button" onClick={() => setType(key, {})}
                        className="text-xs font-medium text-primary hover:underline">
                        Customise
                      </button>
                    )}
                  </div>
                </CardHeader>
                {value && (
                  <CardContent>
                    <PresentationEditor value={value} onChange={(v) => setType(key, v)} />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
