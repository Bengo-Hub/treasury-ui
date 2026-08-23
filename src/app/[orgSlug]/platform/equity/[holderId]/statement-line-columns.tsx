'use client';

// DataTable column definitions for a holder's account statement lines — split
// out of page.tsx to mirror the holder-columns.tsx/ledger-line-columns.tsx
// convention. Read-only running-balance report: intentionally NOT
// sortable/filterable-by-drag so the display order always matches the
// backend's own running-balance computation (chronological).

import { Badge } from '@/components/ui/base';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { EquityStatementLine } from '@/lib/api/equity-statements';

/** A statement line plus a stable synthetic row key (the API gives no line id). */
export type StatementLineRow = EquityStatementLine & { _key: string };

const SOURCE_TYPE_LABELS: Record<EquityStatementLine['source_type'], string> = {
    equity_payout: 'Equity Payout',
    dividend_declaration: 'Dividend Declaration',
};

/**
 * Both source types carry a `status`, but from disjoint enums (equity_payout:
 * pending|processing|completed|failed|cancelled; dividend_declaration:
 * draft|approved|paid|cancelled). One badge-color map covers every value that
 * matters — "good" (paid/completed), "bad" (failed/cancelled), everything
 * else falls back to outline.
 */
const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary'> = {
    completed: 'success',
    paid: 'success',
    processing: 'warning',
    approved: 'warning',
    pending: 'outline',
    draft: 'outline',
    failed: 'error',
    cancelled: 'error',
};

function money(v: string | undefined, currency: string): string {
    return `${currency} ${Number(v ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildStatementLineColumns(currency: string): DataTableColumn<StatementLineRow>[] {
    return [
        {
            key: 'date',
            header: 'Date',
            primary: true,
            accessor: (l) => l.date,
            render: (l) => new Date(l.date).toLocaleDateString(),
        },
        {
            key: 'source_type',
            header: 'Type',
            filterable: true,
            filterOptions: (Object.keys(SOURCE_TYPE_LABELS) as EquityStatementLine['source_type'][]).map((value) => ({
                value,
                label: SOURCE_TYPE_LABELS[value],
            })),
            accessor: (l) => SOURCE_TYPE_LABELS[l.source_type] ?? l.source_type,
            render: (l) => <span className="text-xs font-medium">{SOURCE_TYPE_LABELS[l.source_type] ?? l.source_type}</span>,
        },
        {
            key: 'reference',
            header: 'Reference',
            cellClassName: 'font-mono text-xs',
            accessor: (l) => l.reference,
        },
        {
            key: 'period',
            header: 'Period',
            mobileHidden: true,
            cellClassName: 'text-xs text-muted-foreground',
            accessor: (l) => `${l.period_start} → ${l.period_end}`,
        },
        {
            key: 'gross',
            header: 'Gross',
            align: 'right',
            cellClassName: 'tabular-nums text-xs',
            accessor: (l) => Number(l.gross),
            render: (l) => money(l.gross, currency),
        },
        {
            key: 'tax_withheld',
            header: 'Tax Withheld',
            align: 'right',
            mobileHidden: true,
            cellClassName: 'tabular-nums text-xs text-muted-foreground',
            accessor: (l) => Number(l.tax_withheld),
            render: (l) => money(l.tax_withheld, currency),
        },
        {
            key: 'net',
            header: 'Net',
            align: 'right',
            cellClassName: 'tabular-nums text-xs font-bold',
            accessor: (l) => Number(l.net),
            render: (l) => money(l.net, currency),
        },
        {
            key: 'status',
            header: 'Status',
            mobileAction: true,
            filterable: true,
            accessor: (l) => l.status,
            render: (l) => (
                <div className="flex flex-col items-end gap-0.5">
                    <Badge variant={STATUS_VARIANT[l.status] ?? 'outline'}>{l.status}</Badge>
                    {!l.settled && <span className="text-[10px] text-muted-foreground">unsettled</span>}
                </div>
            ),
        },
        {
            key: 'running_balance',
            header: 'Running Balance',
            align: 'right',
            mobileHidden: true,
            cellClassName: 'tabular-nums text-xs font-semibold',
            accessor: (l) => Number(l.running_balance),
            render: (l) => money(l.running_balance, currency),
        },
    ];
}
