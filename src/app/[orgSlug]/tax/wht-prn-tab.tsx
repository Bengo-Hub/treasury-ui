'use client';

import { useState } from 'react';
import { EtimsResponseModal } from '@/components/tax/etims-response-modal';
import { useGenerateRentalWHTPRN, useGenerateIncomeTaxWHTPRN, useGenerateVATWHTPRN, useTaxLiabilities, useRemitTaxLiability } from '@/hooks/use-tax';
import type { WHTPaymentRequest, WHTTransactionDetail, PRNResponse, TaxLiability } from '@/lib/api/tax';
import { Loader2, Send } from 'lucide-react';

const PRN_STATUS_TONE: Record<TaxLiability['status'], string> = {
  unpaid: 'bg-amber-500/10 text-amber-600',
  submitted: 'bg-primary/10 text-primary',
  remitted: 'bg-green-500/10 text-green-600',
  failed: 'bg-destructive/10 text-destructive',
};

// PRNLedger lists persisted PRNs and lets an operator remit an unpaid one to KRA via M-Pesa B2B.
// Remittance is approval+OTP gated server-side — a blocked attempt surfaces a toast pointing to
// the Approvals inbox (see useRemitTaxLiability).
function PRNLedger({ tenantSlug }: { tenantSlug: string }) {
  const { data, isLoading } = useTaxLiabilities(tenantSlug);
  const remit = useRemitTaxLiability();
  const rows = data?.items ?? [];
  if (isLoading || rows.length === 0) return null;
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div>
        <h3 className="font-semibold text-sm">PRN ledger &amp; M-Pesa remittance</h3>
        <p className="text-xs text-muted-foreground">Remit a generated PRN to the KRA PayBill from your M-Pesa float. Remittance requires approval (with OTP).</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-2 py-2 font-medium">PRN</th>
              <th className="px-2 py-2 font-medium">Obligation</th>
              <th className="px-2 py-2 font-medium text-right">Amount</th>
              <th className="px-2 py-2 font-medium">Status</th>
              <th className="px-2 py-2 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((tl) => (
              <tr key={tl.id} className="border-b border-border/50">
                <td className="px-2 py-2 font-mono text-xs">{tl.prn_number}</td>
                <td className="px-2 py-2">{tl.obligation}</td>
                <td className="px-2 py-2 text-right tabular-nums">{tl.currency} {Number(tl.prn_amount).toLocaleString()}</td>
                <td className="px-2 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PRN_STATUS_TONE[tl.status]}`}>{tl.status}</span>
                </td>
                <td className="px-2 py-2 text-right">
                  {tl.status === 'unpaid' || tl.status === 'failed' ? (
                    <button
                      onClick={() => remit.mutate({ tenantSlug, liabilityID: tl.id })}
                      disabled={remit.isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {remit.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}Remit via M-Pesa
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">{tl.payout_reference ?? '—'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface Props { tenantSlug: string }

type Variant = 'rental' | 'income' | 'vat';

const field = 'w-full rounded border px-3 py-2 text-sm';
const label = 'text-xs text-muted-foreground';

// One-transaction PRN form. Builds the nested KRA contract
// (transactionHeader + transactionDetails[1]) from a single set of inputs.
function PRNForm({ title, variant, tenantSlug, onGenerate, isPending }: {
  title: string; variant: Variant; tenantSlug: string;
  onGenerate: (p: { tenantSlug: string; req: WHTPaymentRequest }) => void;
  isPending: boolean;
}) {
  const [withholderPin, setWithholderPin] = useState('');
  const [counterpartyPin, setCounterpartyPin] = useState(''); // withholdee (IT/VAT) or landlord (rental)
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [gross, setGross] = useState('');
  const [rate, setRate] = useState(variant === 'rental' ? '7.5' : variant === 'vat' ? '2' : '5');
  // Rental-only
  const [propertyType, setPropertyType] = useState('Commercial');
  const [lrNumber, setLrNumber] = useState('');

  const iso = (d: string) => (d ? `${d}T00:00:00` : '');
  const grossN = parseFloat(gross) || 0;
  const rateN = parseFloat(rate) || 0;
  const taxAmount = +(grossN * rateN / 100).toFixed(2);

  const build = (): WHTPaymentRequest => {
    const detail: WHTTransactionDetail = {
      invoiceNo, invoiceDate: iso(invoiceDate), paymentDate: iso(paymentDate),
      grossAmount: String(grossN), taxRate: rateN, taxAmount,
    };
    if (variant === 'income') {
      detail.withholdeePin = counterpartyPin;
      detail.natureOfTransaction = 'WHT_3000';
      detail.residentialStatus = 'R';
      detail.country = 'KE';
    } else if (variant === 'vat') {
      detail.withholdeePin = counterpartyPin;
    } else {
      detail.landlordPin = counterpartyPin;
      detail.typeOfProperty = propertyType;
      detail.lrNumber = lrNumber;
    }
    return {
      transactionHeader: {
        withholderPin, transactionUniqueNo: `TXN-${Date.now()}`,
        noOfTransactions: 1,
        taxObligation: variant === 'income' ? 'WHTIT' : variant === 'rental' ? 'WHTRENT' : 'WHTVAT',
        taxPeriodFrom: iso(periodFrom), taxPeriodTo: iso(periodTo),
        totalGrossAmount: String(grossN), totalTaxAmount: String(taxAmount),
      },
      transactionDetails: [detail],
    };
  };

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h3 className="font-semibold text-sm">{title}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><label className={label}>Withholder KRA PIN</label><input className={field} value={withholderPin} onChange={(e) => setWithholderPin(e.target.value)} placeholder="Your KRA PIN" /></div>
        <div><label className={label}>{variant === 'rental' ? 'Landlord' : 'Withholdee'} KRA PIN</label><input className={field} value={counterpartyPin} onChange={(e) => setCounterpartyPin(e.target.value)} /></div>
        <div><label className={label}>Tax Period From</label><input type="date" className={field} value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} /></div>
        <div><label className={label}>Tax Period To</label><input type="date" className={field} value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} /></div>
        <div><label className={label}>Invoice No</label><input className={field} value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} /></div>
        <div><label className={label}>Invoice Date</label><input type="date" className={field} value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></div>
        <div><label className={label}>Payment Date</label><input type="date" className={field} value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} /></div>
        <div><label className={label}>Gross Amount (KES)</label><input type="number" className={field} value={gross} onChange={(e) => setGross(e.target.value)} /></div>
        <div><label className={label}>Tax Rate (%)</label><input type="number" className={field} value={rate} onChange={(e) => setRate(e.target.value)} /></div>
        <div><label className={label}>Tax Amount (computed)</label><input className={field} value={taxAmount} readOnly /></div>
        {variant === 'rental' && (
          <>
            <div><label className={label}>Property Type</label>
              <select className={field} value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                <option value="Commercial">Commercial</option>
                <option value="Residential">Residential</option>
              </select>
            </div>
            <div><label className={label}>LR Number</label><input className={field} value={lrNumber} onChange={(e) => setLrNumber(e.target.value)} /></div>
          </>
        )}
      </div>
      <button
        className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        disabled={!withholderPin || !counterpartyPin || !grossN || isPending}
        onClick={() => onGenerate({ tenantSlug, req: build() })}
      >
        {isPending ? 'Generating...' : 'Generate PRN'}
      </button>
    </div>
  );
}

export function WHTPaymentRefTab({ tenantSlug }: Props) {
  const rentalPRN = useGenerateRentalWHTPRN();
  const incomePRN = useGenerateIncomeTaxWHTPRN();
  const vatPRN = useGenerateVATWHTPRN();
  const [results, setResults] = useState<{ type: string; data: PRNResponse }[]>([]);
  const [detail, setDetail] = useState<{ type: string; data: PRNResponse } | null>(null);

  const handleGenerate = (type: string, mutate: any) => (params: any) => {
    mutate.mutate(params, {
      onSuccess: (data: PRNResponse) => setResults((prev) => [{ type, data }, ...prev]),
    });
  };

  return (
    <div className="space-y-6">
      <PRNForm title="Income Tax Withholding PRN" variant="income" tenantSlug={tenantSlug} onGenerate={handleGenerate('Income WHT', incomePRN)} isPending={incomePRN.isPending} />
      <PRNForm title="Rental Withholding Tax PRN" variant="rental" tenantSlug={tenantSlug} onGenerate={handleGenerate('Rental WHT', rentalPRN)} isPending={rentalPRN.isPending} />
      <PRNForm title="VAT Withholding PRN" variant="vat" tenantSlug={tenantSlug} onGenerate={handleGenerate('VAT WHT', vatPRN)} isPending={vatPRN.isPending} />
      {results.length > 0 && (
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="font-semibold text-sm">Generated PRNs</h3>
          {results.map((r, i) => (
            <div key={i} className="rounded bg-muted p-3 text-sm space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-foreground">{r.type} — {r.data.status ?? r.data.responseDesc}</p>
                <button
                  type="button"
                  className="shrink-0 rounded border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-accent"
                  onClick={() => setDetail(r)}
                >
                  View / print
                </button>
              </div>
              {r.data.responseData && (
                <>
                  <p><span className="font-medium">PRN:</span> <span className="font-mono font-bold">{r.data.responseData.prnNumber}</span></p>
                  <p><span className="font-medium">Amount:</span> KES {Number(r.data.responseData.prnAmount).toLocaleString()}</p>
                  {r.data.responseData.prnDate && <p><span className="font-medium">Date:</span> {r.data.responseData.prnDate}</p>}
                </>
              )}
              {r.data.errorMessage && <p className="text-destructive">{r.data.errorMessage}</p>}
            </div>
          ))}
        </div>
      )}
      {detail && (
        <EtimsResponseModal
          open={!!detail}
          onClose={() => setDetail(null)}
          title={`${detail.type} PRN`}
          payload={detail.data}
          rows={[
            { label: 'Type', value: detail.type },
            { label: 'Status', value: detail.data.status ?? detail.data.responseDesc },
            { label: 'Response code', value: detail.data.responseCode, mono: true },
            { label: 'PRN number', value: detail.data.responseData?.prnNumber, mono: true },
            { label: 'PRN amount', value: detail.data.responseData ? `KES ${Number(detail.data.responseData.prnAmount).toLocaleString()}` : undefined },
            { label: 'PRN date', value: detail.data.responseData?.prnDate },
            { label: 'Error', value: detail.data.errorMessage, danger: true },
          ]}
        />
      )}
      <PRNLedger tenantSlug={tenantSlug} />
    </div>
  );
}
