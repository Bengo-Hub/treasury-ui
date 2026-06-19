'use client';

/**
 * Shared payment-account form — the business identity + payment account that prints
 * as the issuer block / "How to pay" section on documents.
 *
 * Reused by BOTH the platform config page (platform_payment_account) and the per-tenant
 * Settings → Payment Details tab (tenant_payment_account) so the two never drift.
 */

import type { ChangeEvent } from 'react';

export interface PaymentAccount {
  business_name: string;
  tagline: string;
  // Structured address — each part renders on its own line on the document.
  building: string;
  street: string;
  city: string;
  po_box: string;
  postal_code: string;
  country: string;
  address: string; // legacy single-line fallback
  tax_pin: string;
  // Tax / VAT (synced from auth-api for tenants; not shown for the platform issuer).
  vat_registered: boolean;
  vat_registered_on: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  branch_code: string;
  // Mobile money. Paybill takes BOTH a shortcode (paybill no.) and the account no.
  // payers quote as the reference; Till is a single buy-goods number.
  mpesa_paybill: string;
  mpesa_paybill_account: string;
  mpesa_till: string;
  instructions: string;
}

export const EMPTY_PAYMENT_ACCOUNT: PaymentAccount = {
  business_name: '', tagline: '', building: '', street: '', city: '', po_box: '',
  postal_code: '', country: '', address: '', tax_pin: '', vat_registered: false,
  vat_registered_on: '', bank_name: '', account_name: '', account_number: '',
  branch_code: '', mpesa_paybill: '', mpesa_paybill_account: '', mpesa_till: '',
  instructions: '',
};

const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm';
const sectionLabel = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3';

interface PaymentAccountFieldsProps {
  acct: PaymentAccount;
  onChange: (key: keyof PaymentAccount, value: string | boolean) => void;
  /** Show the VAT registration block (tenant issuer). Defaults to false (platform). */
  showVat?: boolean;
}

/** Presentational field set; parents own load/save + the surrounding Card. */
export function PaymentAccountFields({ acct, onChange, showVat = false }: PaymentAccountFieldsProps) {
  const text = (key: keyof PaymentAccount) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange(key, e.target.value);

  const field = (label: string, key: keyof PaymentAccount, placeholder = '') => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        value={(acct[key] as string) ?? ''}
        onChange={text(key)}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );

  return (
    <>
      <div>
        <p className={sectionLabel}>Business Identity</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {field('Business / Legal Name', 'business_name', 'Codevertex Africa Limited')}
          {field('Slogan / Tagline', 'tagline', 'Tangible Solutions for Businesses')}
          {field('Tax PIN', 'tax_pin', 'P051XXXXXXX')}
        </div>
      </div>

      {showVat && (
        <div>
          <p className={sectionLabel}>VAT</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Registered for VAT?</label>
              <div className="flex items-center gap-3 h-[38px]">
                <button
                  type="button"
                  onClick={() => onChange('vat_registered', !acct.vat_registered)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${acct.vat_registered ? 'bg-primary' : 'bg-accent'}`}
                  aria-pressed={acct.vat_registered}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${acct.vat_registered ? 'translate-x-5' : ''}`} />
                </button>
                <span className="text-sm text-muted-foreground">{acct.vat_registered ? 'Yes' : 'No'}</span>
              </div>
            </div>
            {acct.vat_registered && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">VAT Registered On</label>
                <input
                  type="date"
                  value={(acct.vat_registered_on ?? '').slice(0, 10)}
                  onChange={text('vat_registered_on')}
                  className={inputClass}
                />
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">KRA PIN &amp; VAT status sync from your organisation profile.</p>
        </div>
      )}

      <div>
        <p className={sectionLabel}>Address</p>
        <p className="text-[11px] text-muted-foreground -mt-2 mb-3">Each part prints on its own line on the document (building, then street/city/country, then P.O. Box).</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {field('Building / Floor / Suite', 'building', '2nd Floor, Pioneer Hse')}
          {field('Street', 'street', 'Oginga Street')}
          {field('City / Town', 'city', 'Kisumu')}
          {field('P.O. Box', 'po_box', '547')}
          {field('Postal Code', 'postal_code', '40100')}
          {field('Country', 'country', 'Kenya')}
        </div>
      </div>

      <div>
        <p className={sectionLabel}>Bank Account</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {field('Bank Name', 'bank_name', 'Equity Bank')}
          {field('Branch / IBAN / Swift', 'branch_code')}
          {field('Account Name', 'account_name')}
          {field('Account Number', 'account_number')}
        </div>
      </div>

      <div>
        <p className={sectionLabel}>Mobile Money</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {field('M-Pesa Paybill No.', 'mpesa_paybill', 'e.g. 522533')}
          {field('Paybill Account No.', 'mpesa_paybill_account', 'e.g. your business ref')}
          {field('M-Pesa Till', 'mpesa_till', 'e.g. 5204512')}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">For Paybill, payers enter the Paybill No. then the Account No. as the reference. Till is a single Buy-Goods number.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Payment Instructions (optional)</label>
        <textarea
          value={acct.instructions}
          onChange={text('instructions')}
          rows={2}
          placeholder="e.g. Use your invoice number as the payment reference."
          className={inputClass}
        />
      </div>
    </>
  );
}
