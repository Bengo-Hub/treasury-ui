import * as ledgerApi from '@/lib/api/ledger';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useJournalEntries(tenantSlug: string, params?: ledgerApi.ListJournalEntriesParams) {
  return useQuery({
    queryKey: ['journal-entries', tenantSlug, params],
    queryFn: () => ledgerApi.listJournalEntries(tenantSlug, params),
    enabled: !!tenantSlug,
  });
}

/**
 * useDocumentJournal — the GL entries posted FOR a source document (invoice/bill/etc.), keyed by
 * its id via reference_id. Powers the Refrens-style "View Journal" panel on a document page.
 */
export function useDocumentJournal(tenantSlug: string, referenceID?: string, enabled = true) {
  return useQuery({
    queryKey: ['document-journal', tenantSlug, referenceID],
    // A document has a handful of entries; the server page cap (100) covers them all.
    queryFn: () => ledgerApi.listJournalEntries(tenantSlug, { reference_id: referenceID, limit: 100 }),
    enabled: !!tenantSlug && !!referenceID && enabled,
  });
}

export function useJournalEntry(tenantSlug: string, entryID: string) {
  return useQuery({
    queryKey: ['journal-entry', tenantSlug, entryID],
    queryFn: () => ledgerApi.getJournalEntry(tenantSlug, entryID),
    enabled: !!tenantSlug && !!entryID,
  });
}

export function useCreateJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, data }: { tenantSlug: string; data: ledgerApi.CreateJournalEntryRequest }) =>
      ledgerApi.createJournalEntry(tenantSlug, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['journal-entries', vars.tenantSlug] });
      toast.success('Journal entry created');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || err.message || 'Failed to create journal entry'),
  });
}

/** Error text for a ledger workflow call. A 409 approval_required means the decision belongs to
 *  the Approvals queue (rules, step roles and OTP apply there). */
export function ledgerWorkflowError(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (data?.error === 'approval_required') {
    return data.state === 'rejected'
      ? 'Its approval request was rejected. Correct it and submit again.'
      : 'This entry is waiting in the Approvals queue. Approve or reject it there.';
  }
  return data?.error || data?.message || err?.message || fallback;
}

function submitToast(res: ledgerApi.WorkflowResult | undefined, noun: string) {
  if (res?.status === 'pending_approval') toast.success(`${noun} submitted. It is now in the Approvals queue.`);
  else if (res?.status === 'approved') toast.success(`${noun} submitted and approved (no approval rule applies). You can post it now.`);
  else toast.success(`${noun} submitted`);
}

export function useSubmitJournalEntry(noun = 'Journal entry') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, entryID }: { tenantSlug: string; entryID: string }) =>
      ledgerApi.submitJournalEntry(tenantSlug, entryID),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ['journal-entries', vars.tenantSlug] });
      qc.invalidateQueries({ queryKey: ['approval-requests'] });
      submitToast(res, noun);
    },
    onError: (err: any) => toast.error(ledgerWorkflowError(err, 'Failed to submit')),
  });
}

export function useApproveJournalEntry(noun = 'Journal entry') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, entryID }: { tenantSlug: string; entryID: string }) =>
      ledgerApi.approveJournalEntry(tenantSlug, entryID),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['journal-entries', vars.tenantSlug] });
      toast.success(`${noun} approved`);
    },
    onError: (err: any) => toast.error(ledgerWorkflowError(err, 'Failed to approve')),
  });
}

export function useRejectJournalEntry(noun = 'Journal entry') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, entryID }: { tenantSlug: string; entryID: string }) =>
      ledgerApi.rejectJournalEntry(tenantSlug, entryID),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['journal-entries', vars.tenantSlug] });
      toast.success(`${noun} sent back to draft`);
    },
    onError: (err: any) => toast.error(ledgerWorkflowError(err, 'Failed to reject')),
  });
}

export function useCreateVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, data }: { tenantSlug: string; data: ledgerApi.CreateVoucherRequest }) =>
      ledgerApi.createVoucher(tenantSlug, data),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ['journal-entries', vars.tenantSlug] });
      qc.invalidateQueries({ queryKey: ['approval-requests'] });
      const num = String(res?.entry?.metadata?.voucher_number ?? 'Voucher');
      if (res?.submit_error) toast.warning(`${num} saved as a draft, but it was not submitted: ${res.submit_error}`);
      else if (vars.data.submit) submitToast(res, num);
      else toast.success(`${num} saved as a draft`);
    },
    onError: (err: any) => toast.error(ledgerWorkflowError(err, 'Failed to save voucher')),
  });
}

export function usePostJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, entryID }: { tenantSlug: string; entryID: string }) =>
      ledgerApi.postJournalEntry(tenantSlug, entryID),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['journal-entries', vars.tenantSlug] });
      toast.success('Journal entry posted');
    },
    onError: (err: any) => toast.error(ledgerWorkflowError(err, 'Failed to post')),
  });
}

export function useReverseJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, entryID }: { tenantSlug: string; entryID: string }) =>
      ledgerApi.reverseJournalEntry(tenantSlug, entryID),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['journal-entries', vars.tenantSlug] });
      toast.success('Journal entry reversed');
    },
    onError: (err: any) => toast.error(ledgerWorkflowError(err, 'Failed to reverse')),
  });
}

export function useTrialBalance(tenantSlug: string, asOf?: string) {
  return useQuery({
    queryKey: ['trial-balance', tenantSlug, asOf],
    queryFn: () => ledgerApi.getTrialBalance(tenantSlug, asOf),
    enabled: !!tenantSlug,
  });
}

export function useAccountingPeriods(tenantSlug: string) {
  return useQuery({
    queryKey: ['accounting-periods', tenantSlug],
    queryFn: () => ledgerApi.listPeriods(tenantSlug),
    enabled: !!tenantSlug,
  });
}

/**
 * Period summaries for one fiscal year (current when omitted) plus the list of fiscal years with
 * periods. Keyed under 'accounting-periods' so every period mutation refreshes it.
 */
export function usePeriodSummary(tenantSlug: string, fiscalYear?: string) {
  return useQuery({
    queryKey: ['accounting-periods', tenantSlug, 'summary', fiscalYear ?? 'current'],
    queryFn: () => ledgerApi.getPeriodSummary(tenantSlug, fiscalYear),
    enabled: !!tenantSlug,
  });
}

/**
 * Ended-but-open periods (the close reminder behind the sidebar badge and dashboard banner).
 * Quiet on failure: a plan without the ledger feature just shows no reminder.
 */
export function usePendingClosePeriods(tenantSlug: string, enabled = true) {
  return useQuery({
    queryKey: ['accounting-periods', tenantSlug, 'pending-close'],
    queryFn: () => ledgerApi.getPendingClosePeriods(tenantSlug),
    enabled: !!tenantSlug && enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useCreatePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, data }: { tenantSlug: string; data: ledgerApi.CreatePeriodRequest }) =>
      ledgerApi.createPeriod(tenantSlug, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['accounting-periods', vars.tenantSlug] });
      toast.success('Accounting period created');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to create period'),
  });
}

export function useAccountLedger(
  tenantSlug: string,
  accountID: string,
  params?: ledgerApi.AccountLedgerParams,
) {
  return useQuery({
    queryKey: ['account-ledger', tenantSlug, accountID, params],
    queryFn: () => ledgerApi.getAccountLedger(tenantSlug, accountID, params),
    enabled: !!tenantSlug && !!accountID,
  });
}

export function useClosePeriod() {
  const qc = useQueryClient();
  return useMutation({
    // through: close this period and every earlier ended one in a single action.
    mutationFn: async ({ tenantSlug, periodID, through }: { tenantSlug: string; periodID: string; through?: boolean }) =>
      through
        ? (await ledgerApi.closePeriodsThrough(tenantSlug, periodID)).closed
        : (await ledgerApi.closePeriod(tenantSlug, periodID), 1),
    onSuccess: (closed, vars) => {
      qc.invalidateQueries({ queryKey: ['accounting-periods', vars.tenantSlug] });
      toast.success(closed > 1 ? `${closed} periods closed` : 'Period closed');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to close period'),
  });
}
