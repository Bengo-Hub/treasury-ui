'use client';

import { useDocumentJournal } from '@/hooks/use-ledger';
import { money } from '@/components/charts/chart-theme';

interface Props {
  tenant: string;
  /** The source document id — matched against ledger reference_id. */
  referenceID?: string;
  currency?: string;
}

/**
 * DocumentJournalPanel — the Refrens-style "View Journal" panel for a source document. Lists every
 * GL journal entry posted for the document (AR/revenue on issue, cash on payment, VAT, shipping
 * recovery, reversals) with per-line debit/credit, so users can see exactly how a document hit the
 * books. Read-only; data comes from GET /journal-entries?reference_id via useDocumentJournal.
 */
export function DocumentJournalPanel({ tenant, referenceID, currency = 'KES' }: Props) {
  const { data, isLoading } = useDocumentJournal(tenant, referenceID);
  const entries = data?.entries ?? [];

  const num = (v: number | string | undefined) => {
    const n = typeof v === 'string' ? parseFloat(v) : v ?? 0;
    return Number.isFinite(n) ? n : 0;
  };

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-lg bg-muted" />;
  }
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No journal entries yet — the ledger posts when the document is sent / paid.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((e) => {
        const reversal = e.status === 'reversed' || !!e.reversed_entry_id;
        return (
          <div key={e.id} className="rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
              <span className="text-xs font-medium">
                {e.entry_number} · {new Date(e.entry_date).toLocaleDateString()}
              </span>
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{e.status}</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="px-3 py-1.5 text-left font-medium">Account</th>
                  <th className="px-3 py-1.5 text-right font-medium">Debit</th>
                  <th className="px-3 py-1.5 text-right font-medium">Credit</th>
                </tr>
              </thead>
              <tbody>
                {e.lines.map((l, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="px-3 py-1.5">
                      {l.account_code ? `${l.account_code} · ` : ''}
                      {l.account_name || l.account_id}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {num(l.debit_amount) > 0 ? money(num(l.debit_amount)) : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {num(l.credit_amount) > 0 ? money(num(l.credit_amount)) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reversal && (
              <p className="px-3 py-1.5 text-[11px] text-amber-600">Reversal entry</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
