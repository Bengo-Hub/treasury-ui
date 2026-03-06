'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { cn } from '@/lib/utils';
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Wallet
} from 'lucide-react';
import { useState } from 'react';

interface SettlementBatch {
  id: string;
  batchRef: string;
  gateway: string;
  transactionCount: number;
  grossAmount: string;
  fees: string;
  netAmount: string;
  status: 'settled' | 'pending' | 'processing' | 'failed';
  settledAt: string;
}

const mockBatches: SettlementBatch[] = [
  { id: '1', batchRef: 'STL-20260306-001', gateway: 'M-Pesa', transactionCount: 142, grossAmount: '845,200', fees: '16,904', netAmount: '828,296', status: 'settled', settledAt: '2026-03-06 06:00' },
  { id: '2', batchRef: 'STL-20260306-002', gateway: 'Stripe', transactionCount: 38, grossAmount: '1,240,000', fees: '36,580', netAmount: '1,203,420', status: 'settled', settledAt: '2026-03-06 06:00' },
  { id: '3', batchRef: 'STL-20260305-003', gateway: 'M-Pesa', transactionCount: 95, grossAmount: '342,100', fees: '6,842', netAmount: '335,258', status: 'pending', settledAt: '-' },
  { id: '4', batchRef: 'STL-20260305-004', gateway: 'Card', transactionCount: 22, grossAmount: '580,000', fees: '14,500', netAmount: '565,500', status: 'processing', settledAt: '-' },
  { id: '5', batchRef: 'STL-20260304-005', gateway: 'M-Pesa', transactionCount: 210, grossAmount: '1,100,000', fees: '22,000', netAmount: '1,078,000', status: 'settled', settledAt: '2026-03-05 06:00' },
];

export default function SettlementsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = mockBatches.filter((b) =>
    statusFilter === 'all' || b.status === statusFilter
  );

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settlements</h1>
          <p className="text-muted-foreground mt-1">Track settlement batches and payout status across gateways.</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> Export
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-green-500">Settled Today</span>
            </div>
            <p className="text-3xl font-bold">KES 2,031,716</p>
            <p className="text-xs text-muted-foreground mt-1">180 transactions across 2 batches</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="h-5 w-5 text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Pending</span>
            </div>
            <p className="text-3xl font-bold">KES 342,100</p>
            <p className="text-xs text-muted-foreground mt-1">95 transactions in 1 batch</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Wallet className="h-5 w-5 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Fees (MTD)</span>
            </div>
            <p className="text-3xl font-bold">KES 96,826</p>
            <p className="text-xs text-muted-foreground mt-1">Average rate: 2.3%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-tight">Settlement Batches</h3>
          </div>
          <div className="flex gap-2">
            {['all', 'settled', 'pending', 'processing'].map((s) => (
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
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/5">
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Batch Ref</th>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Gateway</th>
                  <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Txns</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Gross</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Fees</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Net Payout</th>
                  <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Settled At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((batch) => (
                  <tr key={batch.id} className="hover:bg-accent/5 transition-colors cursor-pointer group">
                    <td className="px-6 py-4 font-mono text-xs font-bold">{batch.batchRef}</td>
                    <td className="px-6 py-4 text-xs font-medium">{batch.gateway}</td>
                    <td className="px-6 py-4 text-center text-xs">{batch.transactionCount}</td>
                    <td className="px-6 py-4 text-right text-xs">KES {batch.grossAmount}</td>
                    <td className="px-6 py-4 text-right text-xs text-muted-foreground">KES {batch.fees}</td>
                    <td className="px-6 py-4 text-right text-xs font-bold">KES {batch.netAmount}</td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={batch.status === 'settled' ? 'success' : batch.status === 'pending' ? 'warning' : batch.status === 'processing' ? 'default' : 'error'}>
                        {batch.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-muted-foreground">
                      <div className="flex items-center justify-end gap-2">
                        {batch.settledAt}
                        <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
