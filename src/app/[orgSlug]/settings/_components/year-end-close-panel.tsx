'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { useFYClose, useFYClosePreview } from '@/hooks/use-settings';
import { useHasPermission, useIsPlatformOwner } from '@/hooks/useMe';
import type { FYProposedLine } from '@/lib/api/settings';
import { AlertTriangle, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

/**
 * YearEndClosePanel drives the fiscal-year-end close: it previews the proposed closing
 * journal entry (revenue + expense → Retained Earnings) and the periods that would be
 * sealed, then — behind an explicit confirmation dialog — posts the close to the GL.
 *
 * CAUTION: confirming posts to the General Ledger. The button is gated on the
 * treasury.fiscalyear.close permission (or platform owner). Preview writes nothing.
 */
export function YearEndClosePanel({ tenantSlug }: { tenantSlug: string }) {
  const canClose = useHasPermission('treasury.fiscalyear.close') || useIsPlatformOwner();
  const defaultYear = new Date().getFullYear() - 1;
  const [year, setYear] = useState(defaultYear);
  const [previewYear, setPreviewYear] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const preview = useFYClosePreview(tenantSlug, previewYear ?? 0, previewYear !== null);
  const closeMut = useFYClose(tenantSlug);

  if (!canClose) return null; // hide entirely from users without the permission

  const data = preview.data;
  const alreadyClosed = data?.already_closed === true;

  const runPreview = () => {
    setPreviewYear(year);
  };

  const confirmClose = () => {
    closeMut.mutate(
      { fiscal_year: year, confirm: true, post_opening_balances: false },
      {
        onSuccess: (res) => {
          setConfirmOpen(false);
          toast.success(
            res.already_closed
              ? `Fiscal year ${res.fiscal_year_label} was already closed`
              : `Fiscal year ${res.fiscal_year_label} closed (net income ${res.net_income})`,
          );
        },
        onError: (err: any) => {
          const status = err?.response?.status;
          const body = err?.response?.data;
          if (status === 409 && body?.already_closed) {
            setConfirmOpen(false);
            toast.info('Fiscal year is already closed — no changes made.');
            // Refresh the preview so the UI shows the closed state.
            preview.refetch();
            return;
          }
          toast.error(body?.error || body?.message || err?.message || 'Failed to close fiscal year');
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader className="border-b border-border/50 py-4">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm uppercase tracking-tight">Year-End Close</h3>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-5">
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 flex gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Closing a fiscal year posts a <strong>closing journal entry</strong> that zeroes your
            revenue and expense accounts into <strong>Retained Earnings</strong>, and seals that
            year&apos;s accounting periods. Always review the preview first. This action is
            idempotent — a year can only be closed once.
          </p>
        </div>

        <div className="flex items-end gap-3">
          <FormField label="Fiscal Year (year it ends)">
            <input
              type="number"
              min={2000}
              max={3000}
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value) || defaultYear)}
              className="w-36 bg-accent/10 border border-border rounded-lg py-2 px-3 text-sm font-mono focus:ring-1 focus:ring-primary outline-none"
            />
          </FormField>
          <Button size="sm" variant="outline" className="gap-2" onClick={runPreview} disabled={preview.isFetching}>
            {preview.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Preview Close
          </Button>
        </div>

        {preview.isError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-600">
            {(preview.error as any)?.response?.data?.error ||
              'Failed to compute preview. Ensure a Retained Earnings account (code 3100) exists.'}
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{data.fiscal_year_label}</p>
                <p className="text-xs text-muted-foreground">
                  {data.fy_start} &rarr; {data.fy_end}
                </p>
              </div>
              {alreadyClosed ? (
                <Badge variant="secondary">Already Closed</Badge>
              ) : (
                <Badge variant="warning">Open</Badge>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Metric label="Revenue" value={data.total_revenue} />
              <Metric label="Expense" value={data.total_expense} />
              <Metric label="Net Income" value={data.net_income} highlight />
            </div>

            <ClosingTable lines={data.closing_lines} debit={data.closing_total_debit} credit={data.closing_total_credit} />

            {data.periods_to_close.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Periods to close ({data.periods_to_close.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {data.periods_to_close.map((p) => (
                    <Badge key={p.id} variant={p.status === 'closed' ? 'secondary' : 'outline'}>
                      {p.name}
                      {p.status === 'closed' ? ' ✓' : ''}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {data.warning && (
              <p className="text-[11px] text-muted-foreground italic">{data.warning}</p>
            )}

            <div className="flex justify-end pt-1">
              {alreadyClosed ? (
                <Badge variant="success" className="self-center">
                  <ShieldCheck className="h-3 w-3 inline mr-1" /> Closed
                </Badge>
              ) : (
                <Button size="sm" variant="destructive" onClick={() => setConfirmOpen(true)}>
                  Close {data.fiscal_year_label}…
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          title={`Close ${data?.fiscal_year_label ?? ''}?`}
          description="This posts a closing journal entry to the General Ledger and seals the year's periods."
          onClose={() => setConfirmOpen(false)}
        >
          <div className="space-y-4">
            <div className="rounded-lg bg-accent/10 border border-border p-3 text-sm space-y-1">
              <Row k="Net income → Retained Earnings" v={data?.net_income ?? '—'} />
              <Row k="Closing entry total (Dr=Cr)" v={data?.closing_total_debit ?? '—'} />
              <Row k="Periods sealed" v={String(data?.periods_to_close.length ?? 0)} />
            </div>
            <p className="text-xs text-muted-foreground">
              This cannot be undone from here. If you posted in error, reverse the closing journal
              entry from the Ledger. Confirm to proceed.
            </p>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setConfirmOpen(false)} disabled={closeMut.isPending}>
                Cancel
              </Button>
              <Button size="sm" variant="destructive" className="gap-2" onClick={confirmClose} disabled={closeMut.isPending}>
                {closeMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Confirm close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-accent/10'}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-mono font-semibold mt-0.5">{value}</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{k}</span>
      <span className="text-sm font-mono font-semibold">{v}</span>
    </div>
  );
}

function ClosingTable({ lines, debit, credit }: { lines: FYProposedLine[]; debit: string; credit: string }) {
  if (!lines || lines.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No revenue or expense activity to close for this year.
      </p>
    );
  }
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-accent/20 text-muted-foreground">
          <tr>
            <th className="text-left font-semibold px-3 py-2">Account</th>
            <th className="text-right font-semibold px-3 py-2">Debit</th>
            <th className="text-right font-semibold px-3 py-2">Credit</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={`${l.account_id}-${i}`} className="border-t border-border/50">
              <td className="px-3 py-1.5">
                <span className="font-mono text-muted-foreground">{l.account_code}</span> {l.account_name}
              </td>
              <td className="px-3 py-1.5 text-right font-mono">{l.debit !== '0.00' ? l.debit : ''}</td>
              <td className="px-3 py-1.5 text-right font-mono">{l.credit !== '0.00' ? l.credit : ''}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-accent/10 font-semibold">
          <tr className="border-t border-border">
            <td className="px-3 py-2 text-right">Totals</td>
            <td className="px-3 py-2 text-right font-mono">{debit}</td>
            <td className="px-3 py-2 text-right font-mono">{credit}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
