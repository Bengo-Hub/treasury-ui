'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createInvoice,
  createQuotation,
  deleteInvoice,
  deleteQuotation,
  duplicateInvoice,
  duplicateQuotation,
  cancelQuotation,
  getInvoice,
  getInvoiceGraph,
  getInvoiceStats,
  getInvoiceSummary,
  getQuotation,
  getQuotationGraph,
  getQuotationStats,
  getQuotationSummary,
  listInvoices,
  listQuotations,
  recordPayment,
  sendInvoice,
  sendQuotation,
  updateInvoice,
  updateQuotation,
  voidInvoice,
  acceptQuotation,
  declineQuotation,
  type CreateInvoiceRequest,
  type CreateQuotationRequest,
  type UpdateQuotationRequest,
  type InvoiceFilters,
  type QuotationFilters,
  type UpdateInvoiceRequest,
} from '@/lib/api/invoices';

const STALE_MS = 2 * 60 * 1000;

export const invoiceKeys = {
  all: (tenant: string) => ['invoices', tenant] as const,
  list: (tenant: string, filters?: InvoiceFilters) => ['invoices', tenant, 'list', filters] as const,
  detail: (tenant: string, id: string) => ['invoices', tenant, id] as const,
  stats: (tenant: string) => ['invoices', tenant, 'stats'] as const,
  summary: (tenant: string) => ['invoices', tenant, 'summary'] as const,
  graph: (tenant: string) => ['invoices', tenant, 'graph'] as const,
};

export const quotationKeys = {
  all: (tenant: string) => ['quotations', tenant] as const,
  list: (tenant: string, filters?: QuotationFilters) => ['quotations', tenant, 'list', filters] as const,
  detail: (tenant: string, id: string) => ['quotations', tenant, id] as const,
  stats: (tenant: string) => ['quotations', tenant, 'stats'] as const,
  summary: (tenant: string) => ['quotations', tenant, 'summary'] as const,
  graph: (tenant: string) => ['quotations', tenant, 'graph'] as const,
};

// ---- Invoice Hooks ----

export function useInvoices(tenant: string, filters?: InvoiceFilters, enabled = true) {
  return useQuery({
    queryKey: invoiceKeys.list(tenant, filters),
    queryFn: () => listInvoices(tenant, filters),
    enabled: !!tenant && enabled,
    staleTime: STALE_MS,
  });
}

export function useInvoice(tenant: string, invoiceId: string, enabled = true) {
  return useQuery({
    queryKey: invoiceKeys.detail(tenant, invoiceId),
    queryFn: () => getInvoice(tenant, invoiceId),
    enabled: !!tenant && !!invoiceId && enabled,
    staleTime: STALE_MS,
  });
}

export function useInvoiceStats(tenant: string, enabled = true) {
  return useQuery({
    queryKey: invoiceKeys.stats(tenant),
    queryFn: () => getInvoiceStats(tenant),
    enabled: !!tenant && enabled,
    staleTime: STALE_MS,
  });
}

export function useInvoiceSummary(tenant: string, enabled = true) {
  return useQuery({
    queryKey: invoiceKeys.summary(tenant),
    queryFn: () => getInvoiceSummary(tenant),
    enabled: !!tenant && enabled,
    staleTime: STALE_MS,
  });
}

export function useInvoiceGraph(tenant: string, enabled = true) {
  return useQuery({
    queryKey: invoiceKeys.graph(tenant),
    queryFn: () => getInvoiceGraph(tenant),
    enabled: !!tenant && enabled,
    staleTime: STALE_MS,
  });
}

export function useCreateInvoice(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInvoiceRequest) => createInvoice(tenant, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(tenant) });
    },
  });
}

export function useUpdateInvoice(tenant: string, invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateInvoiceRequest) => updateInvoice(tenant, invoiceId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(tenant, invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(tenant) });
    },
  });
}

export function useDeleteInvoice(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => deleteInvoice(tenant, invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(tenant) });
    },
  });
}

export function useDuplicateInvoice(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => duplicateInvoice(tenant, invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(tenant) });
    },
  });
}

export function useSendInvoice(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => sendInvoice(tenant, invoiceId),
    onSuccess: (_data, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(tenant, invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(tenant) });
    },
  });
}

export function useVoidInvoice(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => voidInvoice(tenant, invoiceId),
    onSuccess: (_data, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(tenant, invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(tenant) });
    },
  });
}

export function useRecordPayment(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, amount }: { invoiceId: string; amount: number | string }) =>
      recordPayment(tenant, invoiceId, amount),
    onSuccess: (_data, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(tenant, invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(tenant) });
    },
  });
}

// ---- Quotation Hooks ----

export function useQuotations(tenant: string, filters?: QuotationFilters, enabled = true) {
  return useQuery({
    queryKey: quotationKeys.list(tenant, filters),
    queryFn: () => listQuotations(tenant, filters),
    enabled: !!tenant && enabled,
    staleTime: STALE_MS,
  });
}

export function useQuotation(tenant: string, quotationId: string, enabled = true) {
  return useQuery({
    queryKey: quotationKeys.detail(tenant, quotationId),
    queryFn: () => getQuotation(tenant, quotationId),
    enabled: !!tenant && !!quotationId && enabled,
    staleTime: STALE_MS,
  });
}

export function useQuotationStats(tenant: string, enabled = true) {
  return useQuery({
    queryKey: quotationKeys.stats(tenant),
    queryFn: () => getQuotationStats(tenant),
    enabled: !!tenant && enabled,
    staleTime: STALE_MS,
  });
}

export function useQuotationSummary(tenant: string, enabled = true) {
  return useQuery({
    queryKey: quotationKeys.summary(tenant),
    queryFn: () => getQuotationSummary(tenant),
    enabled: !!tenant && enabled,
    staleTime: STALE_MS,
  });
}

export function useQuotationGraph(tenant: string, enabled = true) {
  return useQuery({
    queryKey: quotationKeys.graph(tenant),
    queryFn: () => getQuotationGraph(tenant),
    enabled: !!tenant && enabled,
    staleTime: STALE_MS,
  });
}

export function useCreateQuotation(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateQuotationRequest) => createQuotation(tenant, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.all(tenant) });
    },
  });
}

export function useUpdateQuotation(tenant: string, quotationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateQuotationRequest) => updateQuotation(tenant, quotationId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(tenant, quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.all(tenant) });
    },
  });
}

export function useDeleteQuotation(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quotationId: string) => deleteQuotation(tenant, quotationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.all(tenant) });
    },
  });
}

export function useDuplicateQuotation(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quotationId: string) => duplicateQuotation(tenant, quotationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.all(tenant) });
    },
  });
}

export function useSendQuotation(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quotationId: string) => sendQuotation(tenant, quotationId),
    onSuccess: (_data, quotationId) => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(tenant, quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.all(tenant) });
    },
  });
}

export function useAcceptQuotation(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quotationId: string) => acceptQuotation(tenant, quotationId),
    onSuccess: (_data, quotationId) => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(tenant, quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.all(tenant) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(tenant) });
    },
  });
}

export function useDeclineQuotation(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quotationId: string) => declineQuotation(tenant, quotationId),
    onSuccess: (_data, quotationId) => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(tenant, quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.all(tenant) });
    },
  });
}

export function useCancelQuotation(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quotationId: string) => cancelQuotation(tenant, quotationId),
    onSuccess: (_data, quotationId) => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(tenant, quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.all(tenant) });
    },
  });
}
