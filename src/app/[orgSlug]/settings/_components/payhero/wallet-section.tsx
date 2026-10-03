'use client';

import { StatCard } from '@/components/charts/StatCard';
import { Badge, Button } from '@/components/ui/base';
import { Input, Select } from '@/components/ui/input';
import { SettingsSection } from '@/components/ui/settings-section';
import { useBankAccounts, useCreateBankAccount } from '@/hooks/use-bank-accounts';
import { payheroApi, type PayHeroStatus, type PayHeroWithdrawal } from '@/lib/api/payhero';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import { PhoneInputField } from '@bengo-hub/shared-ui-lib/contact';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, ExternalLink, Landmark, Loader2, Plus, Send, Wallet } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { errMessage, usePayHeroMutation } from './use-payhero';

const STATUS: Record<PayHeroWithdrawal['status'], { label: string; variant: 'success' | 'warning' | 'error' | 'secondary' }> = {
  completed: { label: 'Paid', variant: 'success' },
  processing: { label: 'Sending', variant: 'warning' },
  awaiting_approval: { label: 'Awaiting approval', variant: 'secondary' },
  failed: { label: 'Failed', variant: 'error' },
};

/**
 * The Team wallet from treasury, without the PayHero dashboard: both balances, which account the
 * wallet is in the books, withdrawals to the tenant's own channels or a phone, and their history.
 */
export function WalletSection({ tenantSlug, st }: { tenantSlug: string; st: PayHeroStatus }) {
  const qc = useQueryClient();
  const balance = useQuery({ queryKey: ['payhero-balance', tenantSlug], queryFn: () => payheroApi.balance(tenantSlug), retry: false });
  const history = useQuery({ queryKey: ['payhero-withdrawals', tenantSlug], queryFn: () => payheroApi.withdrawals(tenantSlug) });
  const { data: accountsData } = useBankAccounts(tenantSlug);
  const accounts = (accountsData?.bank_accounts ?? []).filter((a) => a.account_type !== 'cash');
  const mapWallet = usePayHeroMutation(tenantSlug, (id: string) => payheroApi.setWalletAccount(tenantSlug, id), 'Wallet account saved', 'Could not save the wallet account');
  const createAccount = useCreateBankAccount(tenantSlug);
  const cur = balance.data?.currency || 'KES';

  const createWalletAccount = () =>
    createAccount.mutate(
      { account_type: 'gateway', account_name: `PayHero wallet${st.team.name ? ` (${st.team.name})` : ''}`, currency: cur },
      {
        onSuccess: (acct) => mapWallet.mutate(acct.id),
        onError: (e: any) => toast.error(errMessage(e, 'Could not create the account')),
      },
    );

  // Withdraw form.
  const usable = st.channels.filter((c) => c.is_active);
  const [to, setTo] = useState<'channel' | 'phone'>(usable.length ? 'channel' : 'phone');
  const [channelID, setChannelID] = useState<number>(usable[0]?.payhero_channel_id ?? 0);
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const withdraw = useMutation({
    mutationFn: () => payheroApi.withdraw(tenantSlug, {
      amount,
      reason: reason || undefined,
      ...(to === 'channel' ? { channel_id: channelID } : { phone }),
    }),
    onSuccess: (w) => {
      toast.success(w.status === 'failed' ? `Withdrawal failed: ${w.failure}` : `Withdrawal ${w.reference} sent`);
      setAmount('');
      setReason('');
      qc.invalidateQueries({ queryKey: ['payhero-withdrawals', tenantSlug] });
      qc.invalidateQueries({ queryKey: ['payhero-balance', tenantSlug] });
    },
    onError: (e: any) => {
      if (e?.response?.data?.error === 'approval_required') {
        toast.info('This withdrawal needs approval. Approve it under Approvals, then send it again.');
        return;
      }
      toast.error(errMessage(e, 'Could not withdraw'));
    },
  });
  const canSend = Number(amount) > 0 && (to === 'channel' ? channelID > 0 : phone.length > 8);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Payments wallet" value={balance.isError ? 'Unavailable' : formatCurrency(Number(balance.data?.balance ?? 0), cur)} loading={balance.isLoading} icon={<Wallet className="h-4 w-4" />} tone="primary"
          hint="Escrow, commission and wallet collections" />
        <StatCard label="Service wallet" value={balance.isError ? 'Unavailable' : formatCurrency(Number(balance.data?.service_balance ?? 0), cur)} loading={balance.isLoading} icon={<Landmark className="h-4 w-4" />}
          tone={Number(balance.data?.service_balance ?? 0) > 0 ? 'default' : 'warning'} hint="Pays PayHero's costs" />
        <a href="https://b2b.payhero.africa/dashboard" target="_blank" rel="noreferrer" className="flex flex-col justify-center gap-1 rounded-2xl border border-dashed border-border p-4 text-sm hover:bg-accent/40">
          <span className="flex items-center gap-1.5 font-medium">Top up the service wallet <ExternalLink className="h-3.5 w-3.5" /></span>
          <span className="text-xs text-muted-foreground">Only the PayHero dashboard can add service credit. Collections stop when it is empty.</span>
        </a>
      </div>

      <SettingsSection icon={<Landmark className="h-4 w-4" />} title="Wallet in your books" description="The account the Team wallet is in your accounts and ledger. Money collected into the wallet lands here; withdrawals move it out.">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={st.wallet_account_id ?? ''} onChange={(e) => mapWallet.mutate(e.target.value)} disabled={mapWallet.isPending} className="sm:max-w-md" aria-label="Wallet account">
            <option value="">Not mapped</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{[a.account_name, a.bank_name].filter(Boolean).join(' / ')}</option>)}
          </Select>
          {!st.wallet_account_id && (
            <Button variant="outline" className="gap-1.5" onClick={createWalletAccount} disabled={createAccount.isPending || mapWallet.isPending}>
              {createAccount.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create a wallet account
            </Button>
          )}
        </div>
      </SettingsSection>

      <SettingsSection icon={<ArrowUpRight className="h-4 w-4" />} title="Withdraw" description="Pay out of the wallet to one of your channels or a phone. Your disbursement approval policy applies.">
        <div className="space-y-4">
          <div className="inline-flex rounded-full bg-muted p-1" role="tablist" aria-label="Withdraw to">
            {(['channel', 'phone'] as const).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={to === k} disabled={k === 'channel' && !usable.length} onClick={() => setTo(k)}
                className={cn('rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50', to === k ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                {k === 'channel' ? 'My channel' : 'A phone'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr]">
            <label className="space-y-1">
              <span className="text-xs font-medium">{to === 'channel' ? 'Channel' : 'Phone'}</span>
              {to === 'channel' ? (
                <Select value={channelID} onChange={(e) => setChannelID(Number(e.target.value))}>
                  {usable.map((c) => <option key={c.payhero_channel_id} value={c.payhero_channel_id}>{[c.description || c.channel_type, c.short_code].filter(Boolean).join(' ')}</option>)}
                </Select>
              ) : (
                <PhoneInputField value={phone} onChange={setPhone} defaultCountry="KE" />
              )}
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium">Amount ({cur})</span>
              <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0.00" />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-medium">Reason <span className="font-normal text-muted-foreground">(optional)</span></span>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. October commission" />
            </label>
          </div>
          <Button className="gap-1.5" onClick={() => withdraw.mutate()} disabled={!canSend || withdraw.isPending}>
            {withdraw.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Withdraw
          </Button>

          {(history.data?.withdrawals.length ?? 0) > 0 && (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {history.data!.withdrawals.map((w) => (
                <li key={w.reference} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{w.destination}</p>
                    <p className="text-xs text-muted-foreground">{w.reference}, {new Date(w.requested_at).toLocaleString()}{w.failure ? `, ${w.failure}` : ''}</p>
                  </div>
                  <span className="tabular-nums font-semibold">{formatCurrency(Number(w.amount), w.currency || cur)}</span>
                  <Badge variant={STATUS[w.status]?.variant ?? 'secondary'}>{STATUS[w.status]?.label ?? w.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SettingsSection>
    </div>
  );
}
