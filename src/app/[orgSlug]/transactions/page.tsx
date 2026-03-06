'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { cn } from '@/lib/utils';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Download,
  Filter,
  Search
} from 'lucide-react';
import { useState } from 'react';

interface Transaction {
  id: string;
  reference: string;
  type: 'payment' | 'refund' | 'payout' | 'transfer';
  gateway: string;
  amount: string;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'reversed';
  customer: string;
  date: string;
}

const mockTransactions: Transaction[] = [
  { id: '1', reference: 'TXN-20260306-001', type: 'payment', gateway: 'M-Pesa', amount: '15,000', currency: 'KES', status: 'completed', customer: 'John Mwangi', date: '2026-03-06 14:32' },
  { id: '2', reference: 'TXN-20260306-002', type: 'payment', gateway: 'Stripe', amount: '42,300', currency: 'KES', status: 'completed', customer: 'Acme Corp', date: '2026-03-06 14:28' },
  { id: '3', reference: 'TXN-20260306-003', type: 'refund', gateway: 'M-Pesa', amount: '8,750', currency: 'KES', status: 'pending', customer: 'Jane Njeri', date: '2026-03-06 14:15' },
  { id: '4', reference: 'TXN-20260306-004', type: 'payment', gateway: 'Card', amount: '120,000', currency: 'KES', status: 'completed', customer: 'Savannah Ltd', date: '2026-03-06 13:58' },
  { id: '5', reference: 'TXN-20260306-005', type: 'payout', gateway: 'Bank Transfer', amount: '500,000', currency: 'KES', status: 'completed', customer: 'Vendor Payout', date: '2026-03-06 13:30' },
  { id: '6', reference: 'TXN-20260306-006', type: 'payment', gateway: 'M-Pesa', amount: '67,500', currency: 'KES', status: 'failed', customer: 'Peter Ochieng', date: '2026-03-06 12:45' },
  { id: '7', reference: 'TXN-20260306-007', type: 'transfer', gateway: 'Internal', amount: '200,000', currency: 'KES', status: 'completed', customer: 'Float Top-up', date: '2026-03-06 12:00' },
];

export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = mockTransactions.filter((txn) => {
    const matchesSearch = txn.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.customer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || txn.status === statusFilter;
    const matchesType = typeFilter === 'all' || txn.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-1">View and filter all payment transactions across gateways.</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between py-4">
          <div className="relative w-full max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              placeholder="Search by reference or customer..."
              className="w-full bg-accent/30 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span className="font-semibold uppercase tracking-wider">Status:</span>
            </div>
            {['all', 'completed', 'pending', 'failed'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn("px-3 py-1 rounded-full text-xs font-bold capitalize transition-all",
                  statusFilter === s ? "bg-primary text-primary-foreground" : "bg-accent/30 text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
            <div className="w-px h-5 bg-border mx-2" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span className="font-semibold uppercase tracking-wider">Type:</span>
            </div>
            {['all', 'payment', 'refund', 'payout', 'transfer'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn("px-3 py-1 rounded-full text-xs font-bold capitalize transition-all",
                  typeFilter === t ? "bg-primary text-primary-foreground" : "bg-accent/30 text-muted-foreground hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/5">
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Reference</th>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Gateway</th>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Customer</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Amount</th>
                  <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((txn) => (
                  <tr key={txn.id} className="hover:bg-accent/5 transition-colors cursor-pointer">
                    <td className="px-6 py-4 font-mono text-xs font-bold">{txn.reference}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {txn.type === 'refund' || txn.type === 'payout' ? (
                          <ArrowDownLeft className="h-3.5 w-3.5 text-orange-500" />
                        ) : (
                          <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
                        )}
                        <span className="capitalize text-xs font-medium">{txn.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs">{txn.gateway}</td>
                    <td className="px-6 py-4 text-xs font-medium">{txn.customer}</td>
                    <td className="px-6 py-4 text-right font-bold text-xs">{txn.currency} {txn.amount}</td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={txn.status === 'completed' ? 'success' : txn.status === 'pending' ? 'warning' : 'error'}>
                        {txn.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-muted-foreground">{txn.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">No transactions match your filters.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
