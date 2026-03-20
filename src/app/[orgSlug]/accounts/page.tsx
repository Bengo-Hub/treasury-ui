'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Landmark,
  Loader2,
  Plus,
  Search
} from 'lucide-react';
import { useState } from 'react';

interface Account {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: string;
  currency: string;
  category: string;
  allowPostings: boolean;
  status: string;
}

const typeColors: Record<string, string> = {
  asset: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  liability: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  equity: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  revenue: 'bg-green-500/10 text-green-500 border-green-500/20',
  expense: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export default function AccountsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const tenantID = useAuthStore((s) => s.user?.tenantId ?? '');

  const { data: accountsData, isLoading } = useQuery({
    queryKey: ['ledger-accounts', tenantID],
    queryFn: () => apiClient.get<{ accounts: Account[]; total: number }>(`/api/v1/${tenantID}/ledger/chart-of-accounts`),
    enabled: !!tenantID,
    staleTime: 5 * 60_000,
  });

  const accounts = accountsData?.accounts ?? [];

  const filtered = accounts.filter((acc) => {
    const matchesSearch = acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.code.includes(searchQuery);
    const matchesType = typeFilter === 'all' || acc.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage your treasury ledger accounts and balances.</p>
        </div>
        <Button className="gap-2 shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" /> Add Account
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between py-4">
          <div className="relative w-full max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              placeholder="Search by name or code..."
              className="w-full bg-accent/30 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'asset', 'liability', 'revenue', 'expense'].map((t) => (
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
          <div className="divide-y divide-border">
            {filtered.map((account) => (
              <div key={account.id} className="px-6 py-4 flex items-center justify-between hover:bg-accent/5 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-accent/30 flex items-center justify-center border border-border">
                    <Landmark className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-muted-foreground">{account.code}</span>
                      <h4 className="text-sm font-bold group-hover:text-primary transition-colors">{account.name}</h4>
                    </div>
                    <Badge className={cn("mt-1", typeColors[account.type])}>
                      {account.type}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold">{account.currency} {account.balance}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Balance</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">No accounts match your search.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
