'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useBills } from '@/hooks/use-bills';
import type { Bill } from '@/lib/api/bills';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowUpRight,
  Loader2,
  Search,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface VendorSummary {
  name: string;
  billCount: number;
  totalAmount: number;
  currency: string;
  lastBillDate: string;
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary'> = {
  draft: 'secondary',
  pending: 'warning',
  paid: 'success',
  overdue: 'error',
  cancelled: 'outline',
};

export default function VendorsPage() {
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);

  const queryParams = useMemo(() => ({
    ...(isPlatformOwner && tenantQueryParam ? { tenantId: tenantQueryParam } : {}),
  }), [isPlatformOwner, tenantQueryParam]);

  const { data, isLoading } = useBills(tenantPathId, queryParams, !!tenantPathId);
  const bills = data?.bills ?? [];

  // Derive unique vendors from bills
  const vendors = useMemo(() => {
    const map = new Map<string, VendorSummary>();
    bills.forEach((bill: Bill) => {
      const name = bill.vendor_name || 'Unknown Vendor';
      const existing = map.get(name);
      const amount = parseFloat(bill.total_amount) || 0;
      if (existing) {
        existing.billCount += 1;
        existing.totalAmount += amount;
        if (bill.created_at > existing.lastBillDate) {
          existing.lastBillDate = bill.created_at;
        }
      } else {
        map.set(name, {
          name,
          billCount: 1,
          totalAmount: amount,
          currency: bill.currency || 'KES',
          lastBillDate: bill.created_at,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [bills]);

  const filteredVendors = useMemo(() => {
    if (!searchQuery.trim()) return vendors;
    const q = searchQuery.toLowerCase();
    return vendors.filter((v) => v.name.toLowerCase().includes(q));
  }, [vendors, searchQuery]);

  // Bills for selected vendor
  const vendorBills = useMemo(() => {
    if (!selectedVendor) return [];
    return bills.filter((b: Bill) => (b.vendor_name || 'Unknown Vendor') === selectedVendor);
  }, [bills, selectedVendor]);

  if (selectedVendor) {
    return (
      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedVendor(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{selectedVendor}</h1>
            <p className="text-muted-foreground mt-1">Bill history for this vendor.</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/5">
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Bill #</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Amount</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Due Date</th>
                    <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {vendorBills.map((bill: Bill) => (
                    <tr key={bill.id} className="hover:bg-accent/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold">{bill.bill_number}</td>
                      <td className="px-6 py-4 text-right font-bold text-xs">{bill.currency} {bill.total_amount}</td>
                      <td className="px-6 py-4 text-xs">{new Date(bill.due_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={statusVariant[bill.status] ?? 'outline'}>
                          {bill.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-muted-foreground">
                        {new Date(bill.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {vendorBills.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">No bills found for this vendor.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground mt-1">View vendor activity derived from bill history.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between py-4">
          <div className="relative w-full max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              placeholder="Search vendors..."
              className="w-full bg-accent/30 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading vendors...
            </div>
          )}
          {!isLoading && (
            <div className="divide-y divide-border">
              {filteredVendors.map((vendor) => (
                <div
                  key={vendor.name}
                  onClick={() => setSelectedVendor(vendor.name)}
                  className="px-6 py-4 flex items-center justify-between hover:bg-accent/5 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-accent/30 flex items-center justify-center border border-border">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold group-hover:text-primary transition-colors">{vendor.name}</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {vendor.billCount} bill{vendor.billCount !== 1 ? 's' : ''} &middot; Last: {new Date(vendor.lastBillDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold">{vendor.currency} {vendor.totalAmount.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Billed</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                  </div>
                </div>
              ))}
              {filteredVendors.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">No vendors found.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
