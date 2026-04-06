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

export function useSubmitJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, entryID }: { tenantSlug: string; entryID: string }) =>
      ledgerApi.submitJournalEntry(tenantSlug, entryID),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['journal-entries', vars.tenantSlug] });
      toast.success('Journal entry submitted');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to submit'),
  });
}

export function useApproveJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, entryID }: { tenantSlug: string; entryID: string }) =>
      ledgerApi.approveJournalEntry(tenantSlug, entryID),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['journal-entries', vars.tenantSlug] });
      toast.success('Journal entry approved');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to approve'),
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
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to post'),
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
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to reverse'),
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

export function useClosePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, periodID }: { tenantSlug: string; periodID: string }) =>
      ledgerApi.closePeriod(tenantSlug, periodID),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['accounting-periods', vars.tenantSlug] });
      toast.success('Period closed');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to close period'),
  });
}
