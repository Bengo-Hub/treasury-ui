'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  bulkUploadInvoices,
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
  getARSummary,
  getARAging,
  getCustomerBalances,
  recordCustomerPayment,
  getQuotation,
  getQuotationGraph,
  getQuotationStats,
  getQuotationSummary,
  listInvoices,
  listQuotations,
  recordPayment,
  markPaid,
  createCreditNote,
  createDebitNote,
  convertQuotationToProforma,
  convertQuotationToSalesOrder,
  convertProformaToInvoice,
  generateDeliveryChallan,
  generateDeliveryNote,
  generateReceiptFromInvoice,
  generateReceiptFromIntent,
  listPlatformInvoices,
  getPlatformInvoiceStats,
  listPlatformQuotations,
  type PlatformQuotationFilters,
  sendInvoice,
  sendQuotation,
  updateInvoice,
  updateQuotation,
  voidInvoice,
  submitInvoiceForApproval,
  approveInvoice,
  rejectInvoice,
  acceptQuotation,
  declineQuotation,
  type CreateInvoiceRequest,
  type CreateQuotationRequest,
  type UpdateQuotationRequest,
  type InvoiceFilters,
  type QuotationFilters,
  type UpdateInvoiceRequest,
  type PlatformInvoiceFilters,
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

export const platformInvoiceKeys = {
  all: ['platform-invoices'] as const,
  list: (filters?: PlatformInvoiceFilters) => ['platform-invoices', 'list', filters] as const,
  stats: (filters?: Pick<PlatformInvoiceFilters, 'scope' | 'tenant_ids' | 'types'>) =>
    ['platform-invoices', 'stats', filters] as const,
};

export const platformQuotationKeys = {
  all: ['platform-quotations'] as const,
  list: (filters?: PlatformQuotationFilters) => ['platform-quotations', 'list', filters] as const,
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

/**
 * Platform-owner cross-tenant invoice list. Used on the invoices Overview tab when a
 * platform owner has not narrowed to a single tenant — shows invoices across ALL tenants
 * (including platform-level subscription invoices). `scope`/`tenant_ids` filter the set.
 */
export function usePlatformInvoices(filters?: PlatformInvoiceFilters, enabled = true) {
  return useQuery({
    queryKey: platformInvoiceKeys.list(filters),
    queryFn: () => listPlatformInvoices(filters),
    enabled,
    staleTime: STALE_MS,
  });
}

export function usePlatformInvoiceStats(
  filters?: Pick<PlatformInvoiceFilters, 'scope' | 'tenant_ids' | 'types'>,
  enabled = true,
) {
  return useQuery({
    queryKey: platformInvoiceKeys.stats(filters),
    queryFn: () => getPlatformInvoiceStats(filters),
    enabled,
    staleTime: STALE_MS,
  });
}

/** Platform-owner cross-tenant quotation list (all tenants). */
export function usePlatformQuotations(filters?: PlatformQuotationFilters, enabled = true) {
  return useQuery({
    queryKey: platformQuotationKeys.list(filters),
    queryFn: () => listPlatformQuotations(filters),
    enabled,
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

export function useInvoiceStats(tenant: string, types?: string, enabled = true) {
  return useQuery({
    queryKey: [...invoiceKeys.stats(tenant), types ?? 'standard'],
    queryFn: () => getInvoiceStats(tenant, types),
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

export function useARSummary(tenant: string, enabled = true) {
  return useQuery({
    queryKey: ['ar-summary', tenant],
    queryFn: () => getARSummary(tenant),
    enabled: !!tenant && enabled,
    staleTime: STALE_MS,
    retry: false, // AR tracking is a paid feature — fail fast and let the UI fall back.
  });
}

export function useARAging(tenant: string, enabled = true) {
  return useQuery({
    queryKey: ['ar-aging', tenant],
    queryFn: () => getARAging(tenant),
    enabled: !!tenant && enabled,
    staleTime: STALE_MS,
    retry: false,
  });
}

// Per-customer running AR balances (operational ledger; includes POS credit sales).
export function useCustomerBalances(tenant: string, enabled = true) {
  return useQuery({
    queryKey: ['ar-customer-balances', tenant],
    queryFn: () => getCustomerBalances(tenant),
    enabled: !!tenant && enabled,
    staleTime: STALE_MS,
    retry: false,
  });
}

// Receive a customer's AR repayment; refreshes balances + AR summary/aging on success.
export function useRecordCustomerPayment(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, amount, paymentMethod, reference }: { contactId: string; amount: number; paymentMethod?: string; reference?: string }) =>
      recordCustomerPayment(tenant, contactId, { amount, payment_method: paymentMethod, reference }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ar-customer-balances', tenant] });
      queryClient.invalidateQueries({ queryKey: ['ar-summary', tenant] });
      queryClient.invalidateQueries({ queryKey: ['ar-aging', tenant] });
    },
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

export function useBulkUploadInvoices(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, file }: { type: string; file: File }) => bulkUploadInvoices(tenant, type, file),
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

// ---- Invoice approval hooks ----

export function useSubmitInvoiceForApproval(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => submitInvoiceForApproval(tenant, invoiceId),
    onSuccess: (_data, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(tenant, invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(tenant) });
      queryClient.invalidateQueries({ queryKey: platformInvoiceKeys.all });
    },
  });
}

export function useApproveInvoice(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, comment }: { invoiceId: string; comment?: string }) =>
      approveInvoice(tenant, invoiceId, comment),
    onSuccess: (_data, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(tenant, invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(tenant) });
      queryClient.invalidateQueries({ queryKey: platformInvoiceKeys.all });
    },
  });
}

export function useRejectInvoice(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, reason }: { invoiceId: string; reason?: string }) =>
      rejectInvoice(tenant, invoiceId, reason),
    onSuccess: (_data, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(tenant, invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(tenant) });
      queryClient.invalidateQueries({ queryKey: platformInvoiceKeys.all });
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

export function useMarkPaid(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => markPaid(tenant, invoiceId),
    onSuccess: (_data, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(tenant, invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(tenant) });
    },
  });
}

export function useCreateCreditNote(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => createCreditNote(tenant, invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(tenant) });
    },
  });
}

export function useCreateDebitNote(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => createDebitNote(tenant, invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(tenant) });
    },
  });
}

export function useConvertToProforma(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quotationId: string) => convertQuotationToProforma(tenant, quotationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.all(tenant) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(tenant) });
    },
  });
}

export function useConvertToSalesOrder(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quotationId: string) => convertQuotationToSalesOrder(tenant, quotationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.all(tenant) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(tenant) });
    },
  });
}

export function useGenerateDeliveryChallan(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quotationId: string) => generateDeliveryChallan(tenant, quotationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.all(tenant) });
    },
  });
}

// Generate a delivery note (DC-prefixed delivery challan) document from an invoice.
// Invalidates the invoice list so the new delivery_challan appears on the Delivery
// Challans surface immediately.
export function useGenerateDeliveryNote(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => generateDeliveryNote(tenant, invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(tenant) });
      queryClient.invalidateQueries({ queryKey: platformInvoiceKeys.all });
    },
  });
}

export function useConvertProformaToInvoice(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => convertProformaToInvoice(tenant, invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(tenant) });
    },
  });
}

// Generate a payment receipt (RCP-YYMMDD-NNNNNN) from a paid invoice.
// Invalidates payment-receipts list so the new record appears immediately.
export function useGenerateReceiptFromInvoice(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => generateReceiptFromInvoice(tenant, invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(tenant) });
    },
  });
}

// Generate a payment receipt from a payment intent.
// tenantId (UUID) is forwarded as ?tenantId= query param so the backend correctly
// resolves the tenant when a platform admin is calling on behalf of another tenant.
export function useGenerateReceiptFromIntent(tenant: string, tenantId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (intentId: string) => generateReceiptFromIntent(tenant, intentId, tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(tenant) });
    },
  });
}
