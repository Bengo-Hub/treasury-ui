'use client';

import { Landmark } from 'lucide-react';

export interface BankAccount {
  id: string;
  name: string;
  account_number?: string;
  bank_name?: string;
}

interface BankAccountSectionProps {
  accounts: BankAccount[];
  selectedAccountId?: string;
  onSelect: (id: string) => void;
}

export function BankAccountSection({ accounts, selectedAccountId, onSelect }: BankAccountSectionProps) {
  if (accounts.length === 0) return null;

  return (
    <div className="p-4 rounded-xl border border-border bg-card space-y-3">
      <div className="flex items-center gap-2 text-xs font-black text-foreground">
        <Landmark className="h-4 w-4 text-primary" />
        Deposit to Account
      </div>
      <select
        value={selectedAccountId ?? ''}
        onChange={e => onSelect(e.target.value)}
        className="w-full rounded-lg py-2 px-3 text-xs border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
        <option value="">— Select account —</option>
        {accounts.map(a => (
          <option key={a.id} value={a.id}>
            {a.name}{a.bank_name ? ` · ${a.bank_name}` : ''}{a.account_number ? ` (···${a.account_number.slice(-4)})` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
