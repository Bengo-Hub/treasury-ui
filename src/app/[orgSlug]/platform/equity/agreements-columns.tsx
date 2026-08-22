'use client';

// DataTable column definitions for the Agreements tab's two lists (Holder Onboarding & Document
// Status, Equity Applications) — split out of page.tsx to mirror the holder-columns.tsx /
// referral-columns.tsx convention.

import { Badge, Button } from '@/components/ui/base';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { EquityHolder } from '@/lib/api/equity';
import type { EquityApplication } from '@/lib/api/equity-applications';
import { HolderDocumentStatusBadges } from '@/components/platform/equity-holder-documents';
import { ArrowRight } from 'lucide-react';

export function buildHolderDocumentColumns(
    treatmentLabel: (h: EquityHolder) => string,
    onOpenDocuments: (holder: EquityHolder) => void,
): DataTableColumn<EquityHolder>[] {
    return [
        {
            key: 'name',
            header: 'Holder',
            sortable: true,
            accessor: (h) => h.name,
            render: (h) => (
                <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{h.name}</p>
                    <p className="text-xs text-muted-foreground">{treatmentLabel(h)} · KRA withholding applied at payout</p>
                </div>
            ),
        },
        {
            key: 'documents',
            header: 'Document Status',
            render: (h) => (
                <div className="flex flex-wrap items-center gap-2">
                    <HolderDocumentStatusBadges holder={h} />
                </div>
            ),
        },
        {
            key: 'actions',
            header: '',
            align: 'right',
            render: (h) => (
                <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => onOpenDocuments(h)}>
                    Manage Documents
                </Button>
            ),
        },
    ];
}

export const APP_STATUS_FLOW: Record<string, { next?: string; label: string }> = {
    pending: { next: 'kyc_pending', label: 'Start KYC' },
    kyc_pending: { next: 'kyc_approved', label: 'Mark KYC approved' },
    kyc_approved: { next: 'epa_pending', label: 'Request EPA' },
    epa_pending: { next: 'approved', label: 'Approve' },
    approved: { label: 'Approved' },
    rejected: { label: 'Rejected' },
};

export function buildApplicationColumns(
    advance: (a: EquityApplication) => void,
    reject: (a: EquityApplication) => void,
    isPending: boolean,
): DataTableColumn<EquityApplication>[] {
    return [
        {
            key: 'tenant_id',
            header: 'Tenant',
            sortable: true,
            accessor: (a) => a.tenant_id,
            render: (a) => (
                <div className="min-w-0">
                    <p className="font-semibold text-sm font-mono truncate">{a.tenant_id.slice(0, 8)}…</p>
                    <p className="text-xs text-muted-foreground">
                        {a.kyc_reference ? `KYC ${a.kyc_reference.slice(0, 8)}` : '—'}
                    </p>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            filterable: true,
            filterOptions: Object.keys(APP_STATUS_FLOW).map((s) => ({ value: s, label: s.replace(/_/g, ' ') })),
            accessor: (a) => a.status,
            render: (a) => (
                <Badge variant={a.status === 'approved' ? 'success' : a.status === 'rejected' ? 'error' : 'outline'}>
                    {a.status.replace(/_/g, ' ')}
                </Badge>
            ),
        },
        {
            key: 'actions',
            header: '',
            align: 'right',
            render: (a) => (
                <div className="flex items-center justify-end gap-2">
                    {APP_STATUS_FLOW[a.status]?.next && (
                        <Button size="sm" variant="outline" className="h-8 text-[11px]" disabled={isPending} onClick={() => advance(a)}>
                            {APP_STATUS_FLOW[a.status]?.label} <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                    )}
                    {a.status !== 'approved' && a.status !== 'rejected' && (
                        <Button size="sm" variant="ghost" className="h-8 text-[11px] text-red-500" disabled={isPending} onClick={() => reject(a)}>
                            Reject
                        </Button>
                    )}
                </div>
            ),
        },
    ];
}
