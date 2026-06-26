'use client';

/**
 * BankAccountVerify — a reusable bank-account capture widget that verifies the account against
 * Paystack (one source of truth) and auto-fills the account holder name. Reuse this on EVERY bank
 * form (reconciliation, payouts, supplier/employee bank details) instead of free-text inputs so
 * account numbers are accurate. Backed by the tenant gateways endpoints
 * (/{tenant}/gateways/banks/{country} + /gateways/resolve-account → platform Paystack).
 */

import { Button } from '@/components/ui/base';
import { FormField } from '@/components/ui/form-field';
import { useBanks, useResolveAccount } from '@/hooks/use-gateways';
import { cn } from '@/lib/utils';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';

export interface BankAccountValue {
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_name: string;
}

interface Bank {
  code: string;
  name: string;
}

interface Props {
  tenantSlug: string;
  value: BankAccountValue;
  onChange: (patch: Partial<BankAccountValue>) => void;
  /** Paystack country slug (kenya|nigeria|ghana|south africa). Defaults to kenya. */
  country?: string;
  className?: string;
}

const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm';

export function BankAccountVerify({ tenantSlug, value, onChange, country = 'kenya', className }: Props) {
  const { data: banksData, isLoading: loadingBanks } = useBanks(tenantSlug, country);
  const resolve = useResolveAccount(tenantSlug);
  const [verified, setVerified] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // Normalize the banks response ({banks:[...]} | {data:[...]} | [...]).
  const banks = useMemo<Bank[]>(() => {
    const raw = (banksData as Record<string, unknown>) ?? {};
    const arr = (raw.banks as Bank[]) ?? (raw.data as Bank[]) ?? (Array.isArray(banksData) ? (banksData as Bank[]) : []);
    return arr ?? [];
  }, [banksData]);

  function selectBank(code: string) {
    const bank = banks.find((b) => b.code === code);
    setVerified(false);
    setNote(null);
    onChange({ bank_code: code, bank_name: bank?.name ?? '', account_name: '' });
  }

  function doVerify() {
    setNote(null);
    setVerified(false);
    resolve.mutate(
      { accountNumber: value.account_number, bankCode: value.bank_code },
      {
        onSuccess: (data: unknown) => {
          const payload = ((data as Record<string, unknown>)?.data ?? data) as Record<string, unknown>;
          if (payload?.resolvable === false || !payload?.account_name) {
            setNote((payload?.message as string) || 'Could not auto-verify — enter the account name manually.');
            return;
          }
          onChange({ account_name: payload.account_name as string });
          setVerified(true);
        },
        onError: () => setNote('Verification failed — check the bank and account number.'),
      },
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <FormField label="Bank" required>
        {loadingBanks ? (
          <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading banks…
          </div>
        ) : (
          <select className={inputClass} value={value.bank_code} onChange={(e) => selectBank(e.target.value)}>
            <option value="">Select bank…</option>
            {banks.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <FormField label="Account Number" required>
        <div className="flex gap-2">
          <input
            className={cn(inputClass, 'flex-1')}
            placeholder="e.g. 1234567890"
            value={value.account_number}
            onChange={(e) => {
              setVerified(false);
              setNote(null);
              onChange({ account_number: e.target.value, account_name: '' });
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            disabled={!value.bank_code || !value.account_number || resolve.isPending}
            onClick={doVerify}
          >
            {resolve.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
          </Button>
        </div>
        {note && <p className="mt-1 text-xs text-amber-600">{note}</p>}
      </FormField>

      <FormField label="Account Name" required>
        <div className="relative">
          <input
            className={cn(inputClass, verified && 'border-green-500/60 bg-green-500/5 pr-9')}
            placeholder="Verify to auto-fill, or enter manually"
            value={value.account_name}
            onChange={(e) => onChange({ account_name: e.target.value })}
          />
          {verified && <CheckCircle2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-green-600" />}
        </div>
        {verified && <p className="mt-1 text-xs font-medium text-green-600">✓ {value.account_name}</p>}
      </FormField>
    </div>
  );
}
