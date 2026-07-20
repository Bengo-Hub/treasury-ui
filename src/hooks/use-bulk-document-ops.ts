'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  bulkArchiveInvoices,
  bulkArchiveQuotations,
  bulkDeleteInvoices,
  bulkDeleteQuotations,
  type BulkOpResult,
} from '@/lib/api/invoices';

export type DocFamily = 'invoice' | 'quotation';

/** "3 archived, 1 skipped: already archived" — human summary of a bulk op response. */
function bulkSummary(verbPast: string, res: BulkOpResult): string {
  const skipped = res.skipped ?? [];
  const head = `${res.processed} ${verbPast}`;
  if (skipped.length === 0) return head;
  const reasons = [...new Set(skipped.map((s) => s.reason).filter(Boolean))].join('; ');
  return `${head}, ${skipped.length} skipped${reasons ? `: ${reasons}` : ''}`;
}

/**
 * TanStack mutations for the bulk document endpoints (POST /{tenant}/invoices/bulk-archive|
 * bulk-delete and the quotation twins). Mirrors useDocRowAction's conventions: shared
 * apiClient calls, sonner toast on settle, and invalidation of every document query family
 * so tenant and platform lists refresh. Archive = the existing void/cancel transition
 * (paid invoices are skipped server-side); both endpoints are idempotent.
 */
export function useBulkDocumentOps(family: DocFamily, tenant: string) {
  const qc = useQueryClient();

  const invalidateLists = () => {
    qc.invalidateQueries({ queryKey: ['invoices'] });
    qc.invalidateQueries({ queryKey: ['quotations'] });
    qc.invalidateQueries({ queryKey: ['platform-invoices'] });
    qc.invalidateQueries({ queryKey: ['platform-quotations'] });
  };

  const archive = useMutation({
    mutationFn: (ids: string[]) =>
      family === 'quotation' ? bulkArchiveQuotations(tenant, ids) : bulkArchiveInvoices(tenant, ids),
    onSuccess: (res) => {
      invalidateLists();
      toast.success(bulkSummary('archived', res));
    },
    onError: (err: unknown) =>
      toast.error(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Bulk archive failed',
      ),
  });

  const remove = useMutation({
    mutationFn: (ids: string[]) =>
      family === 'quotation' ? bulkDeleteQuotations(tenant, ids) : bulkDeleteInvoices(tenant, ids),
    onSuccess: (res) => {
      invalidateLists();
      toast.success(bulkSummary('deleted', res));
    },
    onError: (err: unknown) =>
      toast.error(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Bulk delete failed',
      ),
  });

  return { archive, remove, isPending: archive.isPending || remove.isPending };
}
