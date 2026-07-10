'use client';

/**
 * BankAccountForm — the ONE canonical bank-account field set used everywhere bank details are
 * captured: the tenant BankAccount CRUD (documents bank picker "Add New"), Settings → Payment
 * Details, and the Paystack payout/settlement config. It always offers the Paystack-backed
 * "Verify" flow: pick a bank from the country's Paystack bank list, type the account number, and
 * Verify resolves + fills the account holder name automatically (falling back to manual entry when
 * a bank/number can't be name-enquired, e.g. mobile money).
 *
 * Controlled + presentational: the parent owns persistence and the surrounding card/modal.
 */

import { useState } from 'react';
import { Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/base';
import { useBanks, useResolveAccount } from '@/hooks/use-gateways';

export interface BankAccountValue {
  account_name: string;
  bank_name: string;
  account_number: string;
  bank_branch: string;
  branch_code: string; // SWIFT/BIC or branch/sort code
  currency: string;
}

export const EMPTY_BANK_ACCOUNT: BankAccountValue = {
  account_name: '', bank_name: '', account_number: '', bank_branch: '', branch_code: '', currency: 'KES',
};

// Currencies Paystack can enumerate banks + name-enquire for, mapped to its country slug.
const CURRENCY_OPTIONS = ['KES', 'NGN', 'GHS', 'ZAR'] as const;
const currencyToCountry: Record<string, string> = {
  KES: 'kenya', NGN: 'nigeria', GHS: 'ghana', ZAR: 'south-africa',
};

const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm';
const labelClass = 'block text-xs font-medium text-muted-foreground mb-1';

interface BankAccountFormProps {
  orgSlug: string;
  value: BankAccountValue;
  onChange: (value: BankAccountValue) => void;
}

export function BankAccountForm({ orgSlug, value, onChange }: BankAccountFormProps) {
  // bankCode is transient: needed only to enumerate/verify against Paystack; we persist bank_name.
  const [bankCode, setBankCode] = useState('');
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const country = currencyToCountry[value.currency] || 'kenya';
  const { data: banksData, isLoading: loadingBanks } = useBanks(orgSlug, country);
  const banks: { code: string; name: string }[] = (banksData as any)?.banks ?? [];
  const resolveAccount = useResolveAccount(orgSlug);

  const set = (patch: Partial<BankAccountValue>) => onChange({ ...value, ...patch });

  const handleVerify = () => {
    setVerifiedName(null);
    setVerifyError(null);
    resolveAccount.mutate(
      { accountNumber: value.account_number, bankCode },
      {
        onSuccess: (res: any) => {
          const name = res?.data?.account_name ?? res?.account_name ?? '';
          if (name) {
            setVerifiedName(name);
            set({ account_name: name });
          } else {
            setVerifyError(res?.message || 'Could not resolve the account name — enter it manually.');
          }
        },
        onError: (err: any) =>
          setVerifyError(err?.response?.data?.message || err?.message || 'Verification failed — enter the name manually.'),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Currency / Country</label>
          <select
            value={value.currency}
            onChange={(e) => { set({ currency: e.target.value, bank_name: '' }); setBankCode(''); setVerifiedName(null); setVerifyError(null); }}
            className={inputClass}
          >
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c} ({currencyToCountry[c]})</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>
            Bank {loadingBanks && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}
          </label>
          <select
            value={bankCode}
            onChange={(e) => {
              const selected = banks.find((b) => b.code === e.target.value);
              setBankCode(e.target.value);
              set({ bank_name: selected?.name ?? value.bank_name });
              setVerifiedName(null);
              setVerifyError(null);
            }}
            className={inputClass}
            disabled={loadingBanks || banks.length === 0}
          >
            <option value="">
              {value.bank_name ? `${value.bank_name} (change…)` : '-- Select bank --'}
            </option>
            {banks.map((b) => (
              <option key={b.code} value={b.code}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Account Number</label>
          <div className="flex gap-2">
            <input
              value={value.account_number}
              onChange={(e) => { set({ account_number: e.target.value }); setVerifiedName(null); setVerifyError(null); }}
              className={inputClass}
              placeholder="e.g. 0123456789"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!bankCode || !value.account_number || resolveAccount.isPending}
              onClick={handleVerify}
              title={!bankCode ? 'Select a bank first' : 'Verify account number'}
            >
              {resolveAccount.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              <span className="ml-1">Verify</span>
            </Button>
          </div>
          {verifiedName && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-green-600">
              <CheckCircle2 className="h-3 w-3" /> Verified: {verifiedName}
            </p>
          )}
          {verifyError && <p className="mt-1 text-[11px] text-amber-600">{verifyError}</p>}
        </div>

        <div>
          <label className={labelClass}>Account Name</label>
          <input
            value={value.account_name}
            onChange={(e) => set({ account_name: e.target.value })}
            className={inputClass}
            placeholder="Auto-filled on verify, or enter manually"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Bank Branch (optional)</label>
          <input
            value={value.bank_branch}
            onChange={(e) => set({ bank_branch: e.target.value })}
            className={inputClass}
            placeholder="e.g. Westlands"
          />
        </div>
        <div>
          <label className={labelClass}>SWIFT / Branch Code (optional)</label>
          <input
            value={value.branch_code}
            onChange={(e) => set({ branch_code: e.target.value })}
            className={inputClass}
            placeholder="e.g. EQBLKENA"
          />
        </div>
      </div>
    </div>
  );
}
