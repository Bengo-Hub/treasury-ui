'use client';

import { useCallback, useMemo, useState } from 'react';
import { useResolvedTenant } from './use-resolved-tenant';
import {
  useInvoices,
  useInvoiceStats,
  usePlatformInvoices,
  usePlatformInvoiceStats,
  useQuotations,
  usePlatformQuotations,
} from './use-invoices';
import {
  invoiceToDocumentRow,
  quotationToDocumentRow,
  type DocumentRow,
} from '@/components/documents/SharedDocumentList';
import type { PlatformInvoiceScope } from '@/lib/api/invoices';

interface Options {
  /** 'invoice' covers the whole invoice family (filtered by invoiceType); 'quotation' is separate. */
  family: 'invoice' | 'quotation';
  /** invoice_type filter for sibling pages (credit_note, delivery_challan, …). Omit for the Invoices page. */
  invoiceType?: string;
  status: string; // 'all' or a specific status
  page: number;
  limit: number;
  /** Fetch aggregate stats (Invoices Overview only). */
  withStats?: boolean;
  /** Expose the platform scope filter (all/platform/business) — Invoices Overview only. */
  withScope?: boolean;
  /** Invoices Overview: the platform owner viewing their OWN treasury (no tenant selected,
   *  not the aggregate) sees subscription/platform invoices alongside standard sales — the
   *  backend is platform-owner-aware and returns the broader set when `types` is omitted. */
  ownerSelfOmitsTypes?: boolean;
}

/**
 * Shared data source for every document list page. Encapsulates the platform-owner
 * "all tenants" behaviour so each page consistently shows an aggregate (via /platform/*)
 * when no tenant is selected, or a tenant-scoped list otherwise — instead of an empty page.
 * Returns normalized rows + the per-row tenant resolver used to target row actions.
 */
export function useDocumentListSource(opts: Options) {
  const { tenantPathId, isPlatformOwner, isAllTenants, tenantQueryParam, orgSlug, routingSlug } = useResolvedTenant();
  // Default (no selection) resolves to the platform owner's OWN tenant — NOT the aggregate.
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;
  // Never-empty tenant for create/edit/sub-features (defaults to the platform owner's org).
  const docTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;
  // Aggregate only when the platform owner explicitly picks "All Tenants".
  const isAggregate = isPlatformOwner && isAllTenants;
  const [scope, setScope] = useState<PlatformInvoiceScope>('all');

  const status = opts.status !== 'all' ? opts.status : undefined;
  const isInvoice = opts.family === 'invoice';

  // `invoiceType` may be a single type or a comma list (e.g. "payment_receipt,pos_receipt"),
  // sent as `types` so one page can cover several invoice_types.
  const isOwnerSelfView = isPlatformOwner && !tenantQueryParam && !isAggregate;
  const tenantTypes = opts.ownerSelfOmitsTypes && isOwnerSelfView ? undefined : opts.invoiceType;
  const tenantFilters = {
    ...(tenantTypes ? { types: tenantTypes } : {}),
    ...(status ? { status } : {}),
    page: opts.page,
    limit: opts.limit,
  };
  // With the scope filter active, `scope` governs the type set server-side (all/platform/
  // business) — sending `types` too would fight it (e.g. types=standard excludes the
  // subscription invoices scope=platform selects).
  const platInvFilters = {
    ...(opts.withScope ? {} : opts.invoiceType ? { types: opts.invoiceType } : {}),
    ...(opts.withScope && scope !== 'all' ? { scope } : {}),
    ...(status ? { status } : {}),
    page: opts.page,
    limit: opts.limit,
  };
  const quoFilters = { ...(status ? { status } : {}), page: opts.page, limit: opts.limit };

  const tenantInvQ = useInvoices(effectiveTenant, tenantFilters, isInvoice && !isAggregate && !!effectiveTenant);
  const platInvQ = usePlatformInvoices(platInvFilters, isInvoice && isAggregate);
  const tenantQuoQ = useQuotations(effectiveTenant, quoFilters, !isInvoice && !isAggregate && !!effectiveTenant);
  const platQuoQ = usePlatformQuotations(quoFilters, !isInvoice && isAggregate);

  // Stats are scoped to this page's invoice_type so the summary cards match the list.
  const tenantStats = useInvoiceStats(effectiveTenant, tenantTypes, !!opts.withStats && isInvoice && !isAggregate && !!effectiveTenant);
  const platStats = usePlatformInvoiceStats(
    opts.withScope ? (scope !== 'all' ? { scope } : {}) : { types: opts.invoiceType },
    !!opts.withStats && isInvoice && isAggregate,
  );

  const q = isInvoice ? (isAggregate ? platInvQ : tenantInvQ) : (isAggregate ? platQuoQ : tenantQuoQ);
  const data = q.data as { invoices?: unknown[]; quotations?: unknown[]; total?: number } | undefined;

  const rows: DocumentRow[] = useMemo(() => {
    if (!data) return [];
    return isInvoice
      ? ((data.invoices ?? []) as any[]).map(invoiceToDocumentRow)
      : ((data.quotations ?? []) as any[]).map(quotationToDocumentRow);
  }, [data, isInvoice]);

  const rowTenant = useCallback(
    (r: DocumentRow) => (isAggregate ? r.tenant_slug ?? '' : effectiveTenant),
    [isAggregate, effectiveTenant],
  );
  // Non-aggregate MUST route through routingSlug (not the raw orgSlug) — on the owner's own
  // shell with a specific tenant drilled into via the TenantFilter dropdown, orgSlug is still
  // "codevertex" while the document actually belongs to the drilled-into tenant; using orgSlug
  // here would 404 the detail page (see [[treasury-tenant-resolution-consistency]]).
  const detailHrefTenant = useCallback(
    (r: DocumentRow) => (isAggregate ? r.tenant_slug ?? orgSlug : routingSlug),
    [isAggregate, orgSlug, routingSlug],
  );

  return {
    orgSlug,
    isPlatformOwner,
    isAggregate,
    effectiveTenant,
    docTenant,
    rows,
    total: data?.total ?? 0,
    isLoading: q.isLoading,
    error: q.error,
    rowTenant,
    detailHrefTenant,
    showTenant: isAggregate,
    scope,
    setScope,
    statsData: isAggregate ? platStats.data : tenantStats.data,
  };
}
