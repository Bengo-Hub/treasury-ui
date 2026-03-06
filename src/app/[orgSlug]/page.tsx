'use client';

import { Badge, Card, CardContent } from '@/components/ui/base';
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CreditCard,
  DollarSign,
  Wallet
} from 'lucide-react';

export default function DashboardPage() {
  const kpis = [
    { label: 'Total Revenue', value: 'KES 2,847,500', trend: '+12.3%', up: true, icon: DollarSign, color: 'text-green-500 bg-green-500/10' },
    { label: 'Pending Settlements', value: 'KES 342,100', trend: '8 batches', up: false, icon: Wallet, color: 'text-amber-500 bg-amber-500/10' },
    { label: 'Payment Methods', value: '4 Active', trend: 'M-Pesa, Stripe, Card, Cash', up: true, icon: CreditCard, color: 'text-blue-500 bg-blue-500/10' },
    { label: 'Today\'s Transactions', value: '1,284', trend: '+8.1%', up: true, icon: Banknote, color: 'text-purple-500 bg-purple-500/10' },
  ];

  const recentTransactions = [
    { id: 'TXN-001', type: 'M-Pesa', amount: 'KES 15,000', status: 'completed', time: '2 min ago' },
    { id: 'TXN-002', type: 'Stripe', amount: 'KES 42,300', status: 'completed', time: '8 min ago' },
    { id: 'TXN-003', type: 'M-Pesa', amount: 'KES 8,750', status: 'pending', time: '15 min ago' },
    { id: 'TXN-004', type: 'Card', amount: 'KES 120,000', status: 'completed', time: '22 min ago' },
    { id: 'TXN-005', type: 'Cash', amount: 'KES 3,200', status: 'completed', time: '30 min ago' },
    { id: 'TXN-006', type: 'M-Pesa', amount: 'KES 67,500', status: 'failed', time: '45 min ago' },
  ];

  return (
    <div className="p-8">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Treasury Dashboard</h1>
          <p className="text-muted-foreground mt-1">Monitor revenue, settlements, and payment operations.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="group hover:border-primary/30 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${kpi.color}`}>
                    <kpi.icon className="h-5 w-5" />
                  </div>
                  {kpi.up ? (
                    <div className="flex items-center gap-0.5 text-xs font-bold text-green-500">
                      <ArrowUpRight className="h-3 w-3" />
                      {kpi.trend}
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
                      {kpi.trend}
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold mt-1">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold">Recent Transactions</h3>
            <Badge variant="outline">Last 1 hour</Badge>
          </div>
          <div className="divide-y divide-border">
            {recentTransactions.map((txn) => (
              <div key={txn.id} className="px-6 py-4 flex items-center justify-between hover:bg-accent/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-9 w-9 rounded-lg bg-accent/30 flex items-center justify-center">
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{txn.id}</p>
                    <p className="text-xs text-muted-foreground">{txn.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <p className="text-sm font-bold">{txn.amount}</p>
                  <Badge variant={txn.status === 'completed' ? 'success' : txn.status === 'pending' ? 'warning' : 'error'}>
                    {txn.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground w-20 text-right">{txn.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
