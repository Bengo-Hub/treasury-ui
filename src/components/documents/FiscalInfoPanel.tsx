'use client';

/**
 * FiscalInfoPanel — the KRA eTIMS fiscalisation evidence for a transmitted document:
 * CU invoice number (SCU ID/receipt no), KRA receipt + invc numbers, receipt signature and
 * the KRA verification link. Renders NOTHING when the document was never fiscalised (the
 * fiscal endpoint 404s → null), so it is safe to mount on every invoice/credit-note page.
 */

import { useInvoiceFiscalInfo } from '@/hooks/use-tax';
import { Check, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

function truncateMiddle(v: string, keep = 10) {
  if (v.length <= keep * 2 + 1) return v;
  return `${v.slice(0, keep)}…${v.slice(-keep)}`;
}

function Row({ label, value, mono, copyable }: { label: string; value?: string | number | null; mono?: boolean; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);
  if (value === undefined || value === null || value === '' || value === 0) return null;
  const str = String(value);
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={`flex items-center gap-1.5 text-right ${mono ? 'font-mono' : 'font-medium'}`}>
        {mono ? truncateMiddle(str) : str}
        {copyable && (
          <button
            type="button"
            title="Copy"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              void navigator.clipboard.writeText(str);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
          </button>
        )}
      </span>
    </div>
  );
}

export function FiscalInfoPanel({ tenant, invoiceId }: { tenant: string; invoiceId: string }) {
  const { data: fiscal } = useInvoiceFiscalInfo(tenant, invoiceId);
  if (!fiscal) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" /> KRA eTIMS
        </h3>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
          Fiscalised
        </span>
      </div>
      <div className="divide-y divide-border/60">
        <Row label="CU Invoice No" value={fiscal.cu_invoice_no} mono copyable />
        <Row label="KRA Receipt No" value={fiscal.receipt_no} mono />
        <Row label="eTIMS Invc No" value={fiscal.invc_no} mono />
        <Row label="KRA PIN" value={fiscal.kra_pin} mono />
        <Row label="Receipt signature" value={fiscal.signature} mono copyable />
        <Row
          label="Transmitted"
          value={fiscal.transmitted_at ? new Date(fiscal.transmitted_at).toLocaleString() : undefined}
        />
      </div>
      {fiscal.qr_url && (
        <a
          href={fiscal.qr_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          Verify on KRA portal <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
