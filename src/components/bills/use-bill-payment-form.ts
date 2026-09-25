'use client';

import { useBankAccounts } from '@/hooks/use-bank-accounts';
import { bankAccountHint } from '@/lib/api/bank-accounts';
import { ONLINE_PAYMENT_METHODS } from '@/lib/api/bills';
import type { ComboboxOption } from '@/components/ui/combobox';
import { nowDatetimeLocal, datetimeLocalToISO, resolveDefaultAccount } from '@bengo-hub/shared-ui-lib/payments';
import { useEffect, useMemo, useState } from 'react';

// Per-method reference requirement: the SAME rule shared-ui-lib's SettlementModal registry uses
// everywhere else on the platform (AR receipts, vendor-credit payouts, POS credit-sale
// settlement): only methods that produce an actual slip/code (bank transfer, cheque) need one.
// Cash and card have nothing to write down. A previous version of the bill dialog blanket-required
// a reference for ANY offline method, including cash, and that's the bug this map fixes.
export const OFFLINE_METHODS: { value: string; label: string; requiresReference: boolean }[] = [
  { value: 'cash', label: 'Cash', requiresReference: false },
  { value: 'card', label: 'Card', requiresReference: false },
  { value: 'bank', label: 'Bank transfer', requiresReference: true },
  { value: 'cheque', label: 'Cheque', requiresReference: true },
];

export const ONLINE_METHODS = [
  { value: 'mpesa_b2b', label: 'M-Pesa B2B' },
  { value: 'mpesa_b2c', label: 'M-Pesa B2C' },
  { value: 'paystack_bank', label: 'Paystack (bank)' },
  { value: 'paystack_mobile', label: 'Paystack (mobile)' },
];

export const offlineMethodRequiresReference = (m: string): boolean =>
  OFFLINE_METHODS.find((om) => om.value === m)?.requiresReference ?? false;

export const isOnlineMethod = (m: string): boolean => (ONLINE_PAYMENT_METHODS as readonly string[]).includes(m);
// mpesa_b2c/paystack_mobile pay an individual's OWN phone (MSISDN). mpesa_b2b is a DIFFERENT
// shape entirely: it pays another ORGANIZATION's paybill/till, never a phone number, so it gets
// its own field set (isShortcodeMethod below), not lumped in here.
export const isPhoneMethod = (m: string): boolean => m === 'mpesa_b2c' || m === 'paystack_mobile';
export const isShortcodeMethod = (m: string): boolean => m === 'mpesa_b2b';

/** The payment-channel part of a vendor payment request, shared by PayBill and the consolidated settlement. */
export interface BillPaymentChannel {
  payment_method: string;
  paid_from_account_id?: string;
  reference?: string;
  recipient_phone?: string;
  recipient_shortcode?: string;
  recipient_is_till?: boolean;
  recipient_bank_code?: string;
  recipient_account_number?: string;
  recipient_account_name?: string;
  paid_at?: string;
}

/**
 * State + validation for "how is this vendor payment being made": method, the cash/bank account
 * it leaves from (offline), the supplier's payout destination (online), reference and date.
 * Used by PayBillDialog (one bill) and SettleVendorDialog (one amount across many bills) so both
 * follow exactly the same rules and defaults.
 */
export function useBillPaymentForm(tenant: string, amount: number) {
  const [method, setMethod] = useState('cash');
  const [accountId, setAccountId] = useState('');
  const [accountTouched, setAccountTouched] = useState(false);
  const [reference, setReference] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientShortcode, setRecipientShortcode] = useState('');
  const [recipientIsTill, setRecipientIsTill] = useState(false);
  const [recipientBankName, setRecipientBankName] = useState('');
  const [recipientBankCode, setRecipientBankCode] = useState('');
  const [recipientAccountNumber, setRecipientAccountNumber] = useState('');
  const [recipientAccountName, setRecipientAccountName] = useState('');
  const [paidAtLocal, setPaidAtLocal] = useState(nowDatetimeLocal());

  // Sourced from the real bank_accounts table: the backend's paid_from_account_id resolves as a
  // financial-account lookup (ledger.ResolveCashCode), which needs a BankAccount ID, not a
  // ChartOfAccount one.
  const { data: bankAccountsData } = useBankAccounts(tenant);
  const accountOptions = useMemo<ComboboxOption[]>(
    () =>
      (bankAccountsData?.bank_accounts ?? [])
        .filter((a) => a.is_active !== false)
        .map((a) => ({ value: a.id, label: a.account_name, hint: bankAccountHint(a) })),
    [bankAccountsData],
  );
  const selectedAccount = bankAccountsData?.bank_accounts?.find((a) => a.id === accountId);
  const selectedAccountBalance = selectedAccount?.balance !== undefined ? parseFloat(selectedAccount.balance) : undefined;
  // Warn (never hard-block; the cashier may still be entering figures, or the account genuinely
  // runs negative) when the chosen account's balance won't cover this payment.
  const insufficientBalance =
    !!selectedAccount &&
    selectedAccountBalance !== undefined &&
    !Number.isNaN(selectedAccountBalance) &&
    amount > selectedAccountBalance;

  // Preload the account this offline method's default_payment_methods mapping points to: re-runs
  // when the method changes, but never clobbers a manual pick.
  useEffect(() => {
    if (accountTouched || accountId || !bankAccountsData?.bank_accounts?.length) return;
    const def = resolveDefaultAccount(bankAccountsData.bank_accounts, method);
    if (def) setAccountId(def.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankAccountsData, method]);

  const online = isOnlineMethod(method);

  const reset = () => {
    setMethod('cash');
    setAccountId('');
    setAccountTouched(false);
    setReference('');
    setRecipientPhone('');
    setRecipientShortcode('');
    setRecipientIsTill(false);
    setRecipientBankName('');
    setRecipientBankCode('');
    setRecipientAccountNumber('');
    setRecipientAccountName('');
    setPaidAtLocal(nowDatetimeLocal());
  };

  /** Validates the channel fields; returns the request fragment, or an error message. */
  const build = (): { channel?: BillPaymentChannel; error?: string } => {
    if (online) {
      if (isPhoneMethod(method) && !recipientPhone.trim()) return { error: 'Recipient phone is required for this method.' };
      if (isShortcodeMethod(method) && !recipientShortcode.trim()) {
        return { error: 'Recipient shortcode (paybill or till number) is required for this method.' };
      }
      if (method === 'paystack_bank' && (!recipientBankCode.trim() || !recipientAccountNumber.trim())) {
        return { error: 'Recipient bank code and account number are required for this method.' };
      }
      return {
        channel: {
          payment_method: method,
          reference: reference.trim() || undefined,
          recipient_phone: isPhoneMethod(method) ? recipientPhone.trim() || undefined : undefined,
          recipient_shortcode: isShortcodeMethod(method) ? recipientShortcode.trim() || undefined : undefined,
          recipient_is_till: isShortcodeMethod(method) ? recipientIsTill : undefined,
          recipient_bank_code: recipientBankCode.trim() || undefined,
          recipient_account_number: recipientAccountNumber.trim() || undefined,
          recipient_account_name: recipientAccountName.trim() || undefined,
          paid_at: datetimeLocalToISO(paidAtLocal),
        },
      };
    }
    if (!accountId) return { error: 'Select which account this payment is coming from.' };
    if (offlineMethodRequiresReference(method) && !reference.trim()) {
      return { error: 'A reference is required for this payment method.' };
    }
    return {
      channel: {
        payment_method: method,
        paid_from_account_id: accountId,
        reference: reference.trim() || undefined,
        paid_at: datetimeLocalToISO(paidAtLocal),
      },
    };
  };

  return {
    method, setMethod, accountId, setAccountId, setAccountTouched, reference, setReference,
    recipientPhone, setRecipientPhone, recipientShortcode, setRecipientShortcode,
    recipientIsTill, setRecipientIsTill, recipientBankName, setRecipientBankName,
    recipientBankCode, setRecipientBankCode, recipientAccountNumber, setRecipientAccountNumber,
    recipientAccountName, setRecipientAccountName, paidAtLocal, setPaidAtLocal,
    accountOptions, selectedAccount, selectedAccountBalance, insufficientBalance, online,
    reset, build,
  };
}

export type BillPaymentForm = ReturnType<typeof useBillPaymentForm>;
