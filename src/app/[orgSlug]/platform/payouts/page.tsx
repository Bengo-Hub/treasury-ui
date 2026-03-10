'use client';

import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { usePlatformBalance, usePlatformBanks, useCreatePlatformRecipient } from '@/hooks/use-platform-payouts';
import { formatCurrency } from '@/lib/utils/currency';
import { Building2, Command, Landmark, Loader2, Plus, ArrowRight, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function PlatformPayoutsPage() {
  const { data: balanceData, isLoading: loadingBalance } = usePlatformBalance();
  const { data: banksData, isLoading: loadingBanks } = usePlatformBanks();
  const createRecipient = useCreatePlatformRecipient();

  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [recipientForm, setRecipientForm] = useState({
    name: '',
    account_number: '',
    bank_code: '',
  });

  const handleCreateRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRecipient.mutateAsync({
        type: 'nuban',
        name: recipientForm.name,
        account_number: recipientForm.account_number,
        bank_code: recipientForm.bank_code,
        currency: 'KES',
      });
      toast.success('Transfer recipient created securely');
      setShowAddRecipient(false);
      setRecipientForm({ name: '', account_number: '', bank_code: '' });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to create recipient');
    }
  };

  const netBalance = balanceData?.[0]?.balance ?? 0;
  const currency = balanceData?.[0]?.currency ?? 'KES';

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Treasury</h1>
          <p className="text-muted-foreground mt-1">Manage global balances, provider settlements, and payout banks.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-xl overflow-hidden relative">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none translate-x-4 -translate-y-4">
            <Command className="w-48 h-48" />
          </div>
          <CardContent className="p-8 relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2 text-slate-300">
                <Landmark className="h-5 w-5" />
                <span className="font-semibold uppercase tracking-wider text-sm">Paystack Balance</span>
              </div>
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            
            {loadingBalance ? (
              <div className="animate-pulse h-12 bg-slate-700/50 rounded w-48 mb-2"></div>
            ) : (
              <div className="text-5xl font-black mb-2 tracking-tight">
                {formatCurrency(netBalance / 100, currency)}
              </div>
            )}
            <p className="text-slate-400 text-sm font-medium">Available for tenant settlements</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Transfer Banks ({banksData?.country || 'Kenya'})</h3>
              <p className="text-sm text-muted-foreground mt-1">Today&apos;s Projected Payout destinations</p>
            </div>
            <Button size="sm" onClick={() => setShowAddRecipient(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Add Recipient
            </Button>
          </CardHeader>
          <CardContent>
            {loadingBanks ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading bank directory...
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                {banksData?.banks?.slice(0, 18).map((bank: any) => (
                  <div key={bank.code} className="p-3 border rounded-xl flex items-center gap-3 hover:bg-accent/5 transition-colors">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      {bank.code}
                    </div>
                    <p className="text-sm font-medium truncate" title={bank.name}>{bank.name}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-bold">Recent Platform Payouts</h3>
          <p className="text-sm text-muted-foreground">Automated disbursements from platform to tenant or ecosystem partners.</p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 border-2 border-dashed rounded-xl border-border bg-accent/5">
            <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <h4 className="font-bold text-muted-foreground">No recent payouts</h4>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Trigger equity distribution or manual settlements to see activity here.</p>
          </div>
        </CardContent>
      </Card>

      {showAddRecipient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAddRecipient(false)}>
          <div className="bg-card rounded-xl shadow-xl border border-border max-w-md w-full p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Register Transfer Recipient</h3>
            <form onSubmit={handleCreateRecipient} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Recipient Name</label>
                <input
                  required
                  value={recipientForm.name}
                  onChange={e => setRecipientForm({...recipientForm, name: e.target.value})}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  placeholder="e.g. Acme Corp Ltd"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Account Number</label>
                <input
                  required
                  value={recipientForm.account_number}
                  onChange={e => setRecipientForm({...recipientForm, account_number: e.target.value})}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                  placeholder="0123456789"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Bank Code</label>
                <select
                  required
                  value={recipientForm.bank_code}
                  onChange={e => setRecipientForm({...recipientForm, bank_code: e.target.value})}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                >
                  <option value="">-- Select Destination Bank --</option>
                  {banksData?.banks?.map((b: any) => (
                    <option key={b.code} value={b.code}>[{b.code}] {b.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setShowAddRecipient(false)}>Cancel</Button>
                <Button type="submit" disabled={createRecipient.isPending}>
                  {createRecipient.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Verify & Register <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
