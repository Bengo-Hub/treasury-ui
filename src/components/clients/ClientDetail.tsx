'use client';

import { Badge, Button, Card, CardContent } from '@/components/ui/base';
import type { Invoice } from '@/lib/api/invoices';
import { useCustomerStatement } from '@/hooks/use-arpa';
import { formatCurrency } from '@/lib/utils/currency';
import { ArrowLeft, Banknote, FileText, Loader2, Mail, Phone } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { ClientRecord } from './use-clients';
import { ReceivePaymentModal } from './ReceivePaymentModal';

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

/**
 * Per-client drill-in. Totals + activity come from the OPERATIONAL AR ledger
 * (CustomerBalance via the statement endpoint) — the same source the Statement modal
 * reads — because POS credit sales never create Invoice rows. Sourcing these cards from
 * invoices left credit-sale customers showing 0/0/0 with "No invoices found" while their
 * statement showed real debt. Invoices remain as a secondary section for doc-backed clients.
 */
export function ClientDetail({ tenant, client, invoices, onBack }: ClientDetailProps) {
  const router = useRouter();
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) ?? '';
  const [payOpen, setPayOpen] = useState(false);

  const { data: statement, isLoading: stmtLoading } = useCustomerStatement(
    tenant,
    client.customerId,
    undefined,
    !!client.customerId,
  );

  const clientInvoices = useMemo(
    () =>
      invoices.filter((inv) => {
        const crmId = inv.crm_customer_id || inv.customer_id;
        if (client.customerId && crmId === client.customerId) return true;
        return (inv.customer_name || '').trim().toLowerCase() === client.name.trim().toLowerCase();
      }),
    [invoices, client],
  );

  // Operational AR ledger first (matches the statement), doc-derived numbers as fallback.
  const b = client.balance;
  const totalInvoiced = b ? parseFloat(b.total_invoiced) || 0
    : statement ? parseFloat(statement.total_invoiced) || 0 : client.totalAmount;
  const totalPaid = b ? parseFloat(b.total_paid) || 0 : client.paidAmount;
  const outstanding = b ? parseFloat(b.outstanding_debit) || 0
    : statement ? parseFloat(statement.closing_balance) || 0 : client.outstanding;

  const lines = statement?.lines ?? [];

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
        {b && outstanding > 0.0001 && (
          <Button size="sm" onClick={() => setPayOpen(true)}>
            <Banknote className="h-4 w-4 mr-1.5" />
            Record payment
          </Button>
        )}
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
          { label: 'Total Invoiced', value: formatCurrency(totalInvoiced, client.currency) },
          { label: 'Total Paid', value: formatCurrency(totalPaid, client.currency) },
          { label: 'Outstanding', value: formatCurrency(outstanding, client.currency) },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-1">{label}</p>
              <p className="text-2xl font-black">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Account activity — the itemized AR ledger (credit sales, payments, credit notes…). */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-bold">Account activity</h3>
            {statement && (
              <span className="text-[11px] text-muted-foreground">
                {new Date(statement.from).toLocaleDateString()} – {new Date(statement.to).toLocaleDateString()}
              </span>
            )}
          </div>
          {stmtLoading && (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading activity…
            </div>
          )}
          {!stmtLoading && lines.length === 0 && (
            <div className="p-10 text-center text-muted-foreground text-sm">
              No account activity for this client yet.
            </div>
          )}
          {!stmtLoading && lines.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/5">
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Reference</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Debit</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Credit</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Balance</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lines.map((l, i) => (
                    <tr key={`${l.reference}-${i}`} className="hover:bg-accent/5 transition-colors">
                      <td className="px-6 py-3 text-xs whitespace-nowrap">{new Date(l.date).toLocaleDateString()}</td>
                      <td className="px-6 py-3 font-mono text-xs">{l.reference || '—'}</td>
                      <td className="px-6 py-3 text-right tabular-nums text-xs">
                        {parseFloat(l.debit) > 0 ? formatCurrency(parseFloat(l.debit), client.currency) : '—'}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-xs">
                        {parseFloat(l.credit) > 0 ? formatCurrency(parseFloat(l.credit), client.currency) : '—'}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-xs font-bold">
                        {formatCurrency(parseFloat(l.balance) || 0, client.currency)}
                      </td>
                      <td className="px-6 py-3 text-xs">
                        <Badge variant="outline">{(l.status || l.doc_type || '').replace(/_/g, ' ') || '—'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices — secondary section for doc-backed clients. */}
      {clientInvoices.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="px-6 py-3 border-b border-border">
              <h3 className="text-sm font-bold">Invoices</h3>
            </div>
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
            </div>
          </CardContent>
        </Card>
      )}

      {payOpen && b && (
        <ReceivePaymentModal tenant={tenant} target={b} onClose={() => setPayOpen(false)} />
      )}
    </div>
  );
}
