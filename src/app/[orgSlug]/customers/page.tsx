'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useInvoices, useCustomerBalances, useRecordCustomerPayment } from '@/hooks/use-invoices';
import type { Invoice, CustomerBalance } from '@/lib/api/invoices';
import { StatementDialog } from '@/components/statement-dialog';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import {
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  FileText,
  Loader2,
  Mail,
  Search,
  User,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface CustomerSummary {
  name: string;
  email: string;
  invoiceCount: number;
  totalAmount: number;
  paidAmount: number;
  currency: string;
  lastInvoiceDate: string;
  /** CRM contact / customer UUID used by the AR statement endpoint, if known. */
  customerId?: string;
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary'> = {
  draft: 'secondary',
  sent: 'warning',
  paid: 'success',
  overdue: 'error',
  void: 'outline',
  partial: 'warning',
};

export default function CustomersPage() {
  const { tenantPathId, tenantQueryParam, isPlatformOwner, orgSlug } = useResolvedTenant();
  // Default to the platform owner's own tenant (codevertex); drill-down overrides.
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [statementCustomer, setStatementCustomer] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading, error } = useInvoices(effectiveTenant, {}, !!effectiveTenant);
  const invoices = data?.invoices ?? [];

  // Operational AR balances (CustomerBalance) — includes POS credit sales that create no invoice.
  const { data: balances } = useCustomerBalances(effectiveTenant, !!effectiveTenant);
  const outstanding = useMemo(
    () => (balances ?? []).filter((b) => (parseFloat(b.balance_due) || 0) > 0.0001),
    [balances],
  );
  const recordPay = useRecordCustomerPayment(effectiveTenant);
  const [payTarget, setPayTarget] = useState<CustomerBalance | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payRef, setPayRef] = useState('');
  const [payError, setPayError] = useState('');

  const openReceive = (b: CustomerBalance) => {
    setPayTarget(b);
    setPayAmount(b.balance_due);
    setPayMethod('cash');
    setPayRef('');
    setPayError('');
  };
  const submitReceive = () => {
    if (!payTarget) return;
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) { setPayError('Enter a valid amount.'); return; }
    const contactId = payTarget.crm_contact_id || payTarget.customer_identifier || payTarget.id;
    recordPay.mutate(
      { contactId, amount: amt, paymentMethod: payMethod, reference: payRef || undefined },
      {
        onSuccess: () => setPayTarget(null),
        onError: (e: unknown) => setPayError(e instanceof Error ? e.message : 'Payment failed.'),
      },
    );
  };

  const customers = useMemo(() => {
    const map = new Map<string, CustomerSummary>();
    invoices.forEach((inv: Invoice) => {
      const name = inv.customer_name || 'Unknown Customer';
      const email = inv.customer_email || '';
      const key = email || name;
      const amount = parseFloat(inv.total_amount ?? '0') || 0;
      const paid = inv.status === 'paid' ? amount : 0;
      const contactId = inv.customer_id || inv.crm_customer_id;
      const existing = map.get(key);
      if (existing) {
        existing.invoiceCount += 1;
        existing.totalAmount += amount;
        existing.paidAmount += paid;
        if (!existing.customerId && contactId) existing.customerId = contactId;
        if (inv.created_at > existing.lastInvoiceDate) {
          existing.lastInvoiceDate = inv.created_at;
        }
      } else {
        map.set(key, {
          name,
          email,
          invoiceCount: 1,
          totalAmount: amount,
          paidAmount: paid,
          currency: inv.currency || 'KES',
          lastInvoiceDate: inv.created_at,
          customerId: contactId,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [invoices]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
    );
  }, [customers, searchQuery]);

  const customerInvoices = useMemo(() => {
    if (!selectedCustomer) return [];
    return invoices.filter((inv: Invoice) => {
      const key = inv.customer_email || inv.customer_name || 'Unknown Customer';
      return key === selectedCustomer;
    });
  }, [invoices, selectedCustomer]);

  if (selectedCustomer) {
    const customer = customers.find(
      (c) => (c.email || c.name) === selectedCustomer,
    );
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedCustomer(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{customer?.name}</h1>
            {customer?.email && (
              <p className="text-muted-foreground mt-1 flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {customer.email}
              </p>
            )}
          </div>
          {customer?.customerId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatementCustomer({ id: customer.customerId!, name: customer.name })}
            >
              <FileText className="h-4 w-4 mr-1.5" />
              Statement
            </Button>
          )}
        </div>

        {statementCustomer && (
          <StatementDialog
            kind="customer"
            open={!!statementCustomer}
            onClose={() => setStatementCustomer(null)}
            tenant={effectiveTenant}
            entityId={statementCustomer.id}
            name={statementCustomer.name}
          />
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Total Invoiced', value: formatCurrency(customer?.totalAmount ?? 0, customer?.currency ?? 'KES') },
            { label: 'Total Paid', value: formatCurrency(customer?.paidAmount ?? 0, customer?.currency ?? 'KES') },
            { label: 'Outstanding', value: formatCurrency((customer?.totalAmount ?? 0) - (customer?.paidAmount ?? 0), customer?.currency ?? 'KES') },
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
                  {customerInvoices.map((inv: Invoice) => (
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
              {customerInvoices.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">No invoices found for this customer.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground mt-1">View customer activity derived from invoice history.</p>
        </div>
      </div>

      {isPlatformOwner && !tenantQueryParam && (
        <div className="rounded-lg border border-border bg-accent/5 px-4 py-2.5 text-center text-xs text-muted-foreground">
          Showing your own organization&apos;s customers. Drill into a tenant via the filter above to view theirs.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load customers. Check your connection and try again.
        </div>
      )}

      {/* Outstanding AR balances (operational ledger) — includes POS credit sales (no invoice).
          This is where on-account debt is settled via "Receive Payment". */}
      {outstanding.length > 0 && (
        <Card>
          <CardHeader className="py-4">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold">Outstanding balances (on account)</h3>
              <Badge variant="warning" className="ml-1">{outstanding.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {outstanding.map((b) => (
                <div key={b.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold truncate">{b.customer_name || b.customer_identifier || 'Customer'}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Paid {formatCurrency(parseFloat(b.total_paid) || 0, b.currency)} of {formatCurrency(parseFloat(b.total_invoiced) || 0, b.currency)}
                      {b.last_payment_date && ` · last paid ${new Date(b.last_payment_date).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-600">{formatCurrency(parseFloat(b.balance_due) || 0, b.currency)}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">due</p>
                    </div>
                    <Button size="sm" onClick={() => openReceive(b)}>Receive payment</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Receive Payment modal */}
      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !recordPay.isPending && setPayTarget(null)}>
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <h3 className="text-base font-bold">Receive payment</h3>
              <Button variant="ghost" size="icon" onClick={() => setPayTarget(null)} disabled={recordPay.isPending}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-accent/20 px-3 py-2 text-sm">
                <p className="font-semibold">{payTarget.customer_name || payTarget.customer_identifier || 'Customer'}</p>
                <p className="text-xs text-muted-foreground">Balance due: {formatCurrency(parseFloat(payTarget.balance_due) || 0, payTarget.currency)}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Amount ({payTarget.currency})</label>
                <input type="number" inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full mt-1 bg-accent/30 border-none rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Method</label>
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full mt-1 bg-accent/30 border-none rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary">
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank">Bank transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Reference (optional)</label>
                <input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="M-Pesa code, cheque no., etc."
                  className="w-full mt-1 bg-accent/30 border-none rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary" />
              </div>
              {payError && <p className="text-xs text-destructive">{payError}</p>}
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setPayTarget(null)} disabled={recordPay.isPending}>Cancel</Button>
                <Button className="flex-1 gap-2" onClick={submitReceive} disabled={recordPay.isPending}>
                  {recordPay.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between py-4">
          <div className="relative w-full max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              placeholder="Search customers..."
              className="w-full bg-accent/30 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading customers...
            </div>
          )}
          {!isLoading && (
            <div className="divide-y divide-border">
              {filteredCustomers.map((customer) => {
                const key = customer.email || customer.name;
                const outstanding = customer.totalAmount - customer.paidAmount;
                return (
                  <div
                    key={key}
                    onClick={() => setSelectedCustomer(key)}
                    className="px-6 py-4 flex items-center justify-between hover:bg-accent/5 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-accent/30 flex items-center justify-center border border-border">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold group-hover:text-primary transition-colors">{customer.name}</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {customer.invoiceCount} invoice{customer.invoiceCount !== 1 ? 's' : ''}
                          {customer.email && ` · ${customer.email}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatCurrency(customer.totalAmount, customer.currency)}</p>
                        <p className={cn('text-[10px] uppercase tracking-wider', outstanding > 0 ? 'text-amber-500' : 'text-emerald-500')}>
                          {outstanding > 0 ? `${formatCurrency(outstanding, customer.currency)} due` : 'Fully paid'}
                        </p>
                      </div>
                      {customer.customerId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            setStatementCustomer({ id: customer.customerId!, name: customer.name });
                          }}
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          Statement
                        </Button>
                      )}
                      <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                    </div>
                  </div>
                );
              })}
              {filteredCustomers.length === 0 && !isLoading && (
                <div className="p-12 text-center text-muted-foreground">No customers found.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {statementCustomer && (
        <StatementDialog
          kind="customer"
          open={!!statementCustomer}
          onClose={() => setStatementCustomer(null)}
          tenant={effectiveTenant}
          entityId={statementCustomer.id}
          name={statementCustomer.name}
        />
      )}
    </div>
  );
}
