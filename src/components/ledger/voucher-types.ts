import type { JournalEntry, VoucherType } from '@/lib/api/ledger';

/**
 * Voucher book definitions shared by the voucher form and the voucher list. The types follow the
 * voucher set every mainstream ledger uses (Tally, Zoho, Odoo, QuickBooks).
 */
export const VOUCHER_TYPES: VoucherType[] = ['payment', 'receipt', 'contra', 'journal', 'sales', 'purchase'];

export const VOUCHER_LABEL: Record<VoucherType, string> = {
  payment: 'Payment Voucher',
  receipt: 'Receipt Voucher',
  contra: 'Contra Voucher',
  journal: 'Journal Voucher',
  sales: 'Sales Voucher',
  purchase: 'Purchase Voucher',
};

/** One line under the type picker saying when to use it. */
export const VOUCHER_HINT: Record<VoucherType, string> = {
  payment:
    'Money paid out of one cash, bank or M-Pesa account: wages to casual workers, repairs, rent, a supplier. List what it was for; the account it left is credited for you.',
  receipt:
    'Money received into one cash, bank or M-Pesa account that is not an invoice payment: a refund, a deposit, owner capital, other income.',
  contra: 'Moving money between your own accounts, for example cash banked, or bank to M-Pesa.',
  journal: 'Adjustments with no cash movement, such as accruals, corrections or reclassifications. Debits must equal credits.',
  sales: 'A sale recorded straight in the ledger without an invoice. Debits must equal credits.',
  purchase: 'A purchase recorded straight in the ledger without a bill. Debits must equal credits.',
};

/** Payment and receipt vouchers take one cash account plus amount lines; contra takes two cash accounts. */
export const isCashVoucher = (t: VoucherType) => t === 'payment' || t === 'receipt';

export const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

export function voucherTypeOf(entry: JournalEntry): string {
  const meta = (entry.metadata as Record<string, unknown> | undefined) ?? {};
  return String(meta.voucher_type ?? entry.reference_type ?? '').toLowerCase();
}

export function voucherMeta(entry: JournalEntry, key: string): string {
  const v = (entry.metadata as Record<string, unknown> | undefined)?.[key];
  return typeof v === 'string' ? v : '';
}

/** Voucher number (PV-000123); entries saved before vouchers had numbers show their entry number. */
export function voucherNumberOf(entry: JournalEntry): string {
  return voucherMeta(entry, 'voucher_number') || entry.entry_number;
}

export function voucherTotal(entry: JournalEntry): number {
  return (entry.lines ?? []).reduce((sum, line) => sum + Number(line.debit_amount || 0), 0);
}
