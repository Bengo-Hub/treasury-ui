'use client';

import { Badge, Button, Card, CardContent } from '@/components/ui/base';
import type { Invoice } from '@/lib/api/invoices';
import { formatCurrency } from '@/lib/utils/currency';
import { ArrowLeft, FileText, Mail, Phone } from 'lucide-react';
import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { ClientRecord } from './use-clients';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary'> = {
  draft: 'secondary',
  sent: 'warning',
  paid: 'success',
  overdue: 'error',
  void: 'outline',
  partial: 'warning',
};

interface ClientDetailProps {
  tenant: string;
  client: ClientRecord;
  invoices: Invoice[];
  onBack: () => void;
}

/** Per-client drill-in: header, AR statement, totals, and this client's invoices. */
export function ClientDetail({ client, invoices, onBack }: ClientDetailProps) {
  const router = useRouter();
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) ?? '';

  const clientInvoices = useMemo(
    () =>
      invoices.filter((inv) => {
        const crmId = inv.crm_customer_id || inv.customer_id;
        if (client.customerId && crmId === client.customerId) return true;
        return (inv.customer_name || '').trim().toLowerCase() === client.name.trim().toLowerCase();
      }),
    [invoices, client],
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold tracking-tight truncate">{client.name}</h1>
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm">
            {client.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {client.email}
              </span>
            )}
            {client.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {client.phone}
              </span>
            )}
          </div>
        </div>
        {client.customerId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/${orgSlug}/customers/${client.customerId}/statement`)}
          >
            <FileText className="h-4 w-4 mr-1.5" />
            Statement
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Total Invoiced', value: formatCurrency(client.totalAmount, client.currency) },
          { label: 'Total Paid', value: formatCurrency(client.paidAmount, client.currency) },
          { label: 'Outstanding', value: formatCurrency(client.outstanding, client.currency) },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-1">{label}</p>
              <p className="text-2xl font-black">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/5">
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Invoice #</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Amount</th>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Due Date</th>
                  <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clientInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-accent/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold">{inv.invoice_number}</td>
                    <td className="px-6 py-4 text-right font-bold text-xs">{inv.currency} {inv.total_amount}</td>
                    <td className="px-6 py-4 text-xs">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={statusVariant[inv.status] ?? 'outline'}>{inv.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-muted-foreground">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {clientInvoices.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">No invoices found for this client.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
