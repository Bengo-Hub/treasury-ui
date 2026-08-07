'use client';

import { Card } from '@/components/ui/base';
import { money } from '@/components/charts/chart-theme';
import { useWHVATCertificates, useCreateWHVATCertificate, useDeleteWHVATCertificate, useTaxProfile } from '@/hooks/use-tax';
import { ObligationGate } from '@/components/tax/obligation-gate';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { buildWhvatColumns } from './whvat-columns';
import { Loader2, Plus, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';

interface Props { tenantSlug: string }

const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/**
 * WHVATTab — Withholding-VAT certificates RECEIVED. When an appointed WHVAT agent (a customer)
 * pays you, they withhold 2% of the taxable value and remit it to KRA, issuing a certificate.
 * That withheld VAT is a credit against your output VAT on the VAT-3 return — capture the
 * certificates here so the VAT Return tab nets them off.
 */
export function WHVATTab({ tenantSlug }: Props) {
  const { data, isLoading } = useWHVATCertificates(tenantSlug);
  const { data: profile } = useTaxProfile(tenantSlug);
  const create = useCreateWHVATCertificate();
  const del = useDeleteWHVATCertificate();
  const [form, setForm] = useState({ certificate_no: '', withholder_pin: '', withholder_name: '', invoice_number: '', taxable_amount: '', withheld_amount: '', cert_date: '' });

  const certs = data?.certificates ?? [];
  const totalWithheld = certs.reduce((s, c) => s + Number(c.withheld_amount ?? 0), 0);
  const columns = useMemo(
    () => buildWhvatColumns({ onDelete: (cert) => del.mutate({ tenantSlug, certID: cert.id }), deletePending: del.isPending }),
    [tenantSlug, del],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.certificate_no) return;
    create.mutate(
      { tenantSlug, data: {
        certificate_no: form.certificate_no,
        withholder_pin: form.withholder_pin || undefined,
        withholder_name: form.withholder_name || undefined,
        invoice_number: form.invoice_number || undefined,
        taxable_amount: form.taxable_amount ? Number(form.taxable_amount) : undefined,
        withheld_amount: form.withheld_amount ? Number(form.withheld_amount) : undefined,
        cert_date: form.cert_date || undefined,
      } },
      { onSuccess: () => setForm({ certificate_no: '', withholder_pin: '', withholder_name: '', invoice_number: '', taxable_amount: '', withheld_amount: '', cert_date: '' }) },
    );
  };

  return (
    <ObligationGate
      met={profile?.vat_registered}
      title="Not registered for VAT"
      message="Withholding-VAT credits only apply to VAT-registered sellers. Register for VAT to capture WHVAT certificates."
    >
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary"><ShieldCheck className="h-5 w-5" /></div>
          <div className="text-sm">
            <p className="font-semibold">Withholding-VAT certificates received</p>
            <p className="text-muted-foreground">Appointed WHVAT agents withhold 2% of the taxable value on your sales and remit it to KRA. The withheld VAT is a credit against your output VAT — recorded certificates are netted off in the VAT Return tab.</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Capture form */}
        <Card className="p-4 lg:col-span-1">
          <div className="mb-3 flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Record certificate</h3></div>
          <form onSubmit={submit} className="space-y-3">
            <input className={inputCls} placeholder="Certificate no. *" value={form.certificate_no} onChange={(e) => setForm({ ...form, certificate_no: e.target.value })} />
            <input className={inputCls} placeholder="Withholder KRA PIN" value={form.withholder_pin} onChange={(e) => setForm({ ...form, withholder_pin: e.target.value })} />
            <input className={inputCls} placeholder="Withholder name" value={form.withholder_name} onChange={(e) => setForm({ ...form, withholder_name: e.target.value })} />
            <input className={inputCls} placeholder="Your invoice no." value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} />
            <input className={inputCls} type="number" step="0.01" placeholder="Taxable value (auto 2%)" value={form.taxable_amount} onChange={(e) => setForm({ ...form, taxable_amount: e.target.value })} />
            <input className={inputCls} type="number" step="0.01" placeholder="VAT withheld (override)" value={form.withheld_amount} onChange={(e) => setForm({ ...form, withheld_amount: e.target.value })} />
            <input className={inputCls} type="date" value={form.cert_date} onChange={(e) => setForm({ ...form, cert_date: e.target.value })} />
            <button type="submit" disabled={create.isPending || !form.certificate_no}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Record
            </button>
          </form>
        </Card>

        {/* List */}
        <Card className="p-4 lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Certificates ({certs.length})</h3>
            <span className="text-sm text-muted-foreground">Total withheld credit: <span className="font-semibold text-foreground">{money(totalWithheld)}</span></span>
          </div>
          <DataTable
            columns={columns}
            rows={certs}
            rowKey={(c) => c.id}
            loading={isLoading}
            storageKey="whvat-certificates-table"
            emptyText="No WHVAT certificates recorded."
          />
        </Card>
      </div>
    </div>
    </ObligationGate>
  );
}
