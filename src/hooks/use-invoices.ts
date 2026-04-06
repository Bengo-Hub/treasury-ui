'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createInvoice,
  createQuotation,
  getInvoice,
  getQuotation,
  listInvoices,
  listQuotations,
  recordPayment,
  sendInvoice,
  sendQuotation,
  voidInvoice,
  acceptQuotation,
  declineQuotation,
  type CreateInvoiceRequest,
  type CreateQuotationRequest,
  type InvoiceFilters,
  type QuotationFilters,
} from '@/lib/api/invoices';

const STALE_MS = 2 * 60 * 1000;

export const invoiceKeys = {
  all: (tenant: string) => ['invoices', tenant] as const,
  list: (tenant: string, filters?: InvoiceFilters) => ['invoices', tenant, 'list', filters] as const,
  detail: (tenant: string, id: string) => ['invoices', tenant, id] as const,
};

export const quotationKeys = {
  all: (tenant: string) => ['quotations', tenant] as const,
  list: (tenant: string, filters?: QuotationFilters) => ['quotations', tenant, 'list', filters] as const,
  detail: (tenant: string, id: string) => ['quotations', tenant, id] as const,
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

export function useCreateInvoice(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInvoiceRequest) => createInvoice(tenant, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(tenant) });
    },
  });
}

export function useSendInvoice(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => sendInvoice(tenant, invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(tenant) });
    },
  });
}

export function useVoidInvoice(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => voidInvoice(tenant, invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(tenant) });
    },
  });
}

export function useRecordPayment(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, amount }: { invoiceId: string; amount: number | string }) =>
      recordPayment(tenant, invoiceId, amount),
    onSuccess: () => {
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

export function useCreateQuotation(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateQuotationRequest) => createQuotation(tenant, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.all(tenant) });
    },
  });
}

export function useSendQuotation(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quotationId: string) => sendQuotation(tenant, quotationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.all(tenant) });
    },
  });
}

export function useAcceptQuotation(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quotationId: string) => acceptQuotation(tenant, quotationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.all(tenant) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(tenant) });
    },
  });
}

export function useDeclineQuotation(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quotationId: string) => declineQuotation(tenant, quotationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.all(tenant) });
    },
  });
}
