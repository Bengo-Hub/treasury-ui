'use client';

// DataTable column definitions + row model for the Manage Vendors list — split out
// of page.tsx to keep the page small. Accessors are shared with the page's host-side
// sort/funnel processing (controlled DataTable mode) so filtering and sorting run
// over the whole vendor set before client pagination.

import { Badge, Button } from '@/components/ui/base';
import type { DataTableColumn, FilterOption } from '@bengo-hub/shared-ui-lib/data-table';
import { formatCurrency } from '@/lib/utils/currency';
import { FileText, HandCoins, Undo2, Wallet } from 'lucide-react';

export interface VendorSummary {
  name: string;
  industry: string;
  phone: string;
  email: string;
  country: string;
  billCount: number;
  totalAmount: number;
  outstanding: number;
  currency: string;
  lastCommunication: string;
  /** A vendor is archived when every one of its bills is cancelled. */
  archived: boolean;
  /** AP ledger vendor UUID (from /ap/vendors), when this vendor has a balance row. */
  vendorId?: string;
  /** Running AP balance owed from the operational ledger (/ap/vendors), if known. */
  balanceOwed?: number;
}

const EMPTY = '—';

export const VENDOR_ACCESSORS: Record<string, (v: VendorSummary) => unknown> = {
  name: (v) => v.name,
  industry: (v) => v.industry || '',
  phone: (v) => v.phone || '',
  email: (v) => v.email || '',
  country: (v) => v.country || '',
  status: (v) => (v.archived ? 'Archived' : 'Active'),
  lastComm: (v) => v.lastCommunication || '',
};

export interface VendorColumnCallbacks {
  onPayoutCredit: (v: VendorSummary) => void;
  onOpeningBalance: (v: VendorSummary) => void;
  onRefund: (v: VendorSummary) => void;
  onStatement: (v: VendorSummary) => void;
}

export function buildVendorColumns(
  industryOptions: FilterOption[],
  cb: VendorColumnCallbacks,
): DataTableColumn<VendorSummary>[] {
  return [
    {
      key: 'logo',
      header: 'Logo',
      exportable: false,
      render: (v) => (
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 text-primary font-bold text-sm">
          {v.name.charAt(0).toUpperCase()}
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      accessor: VENDOR_ACCESSORS.name,
      render: (v) => (
        <div>
          <span className="font-bold hover:text-primary transition-colors">{v.name}</span>
          <span className="block text-[10px] text-muted-foreground mt-0.5">
            {v.billCount} bill{v.billCount !== 1 ? 's' : ''} · {formatCurrency(v.totalAmount, v.currency)}
            {v.balanceOwed !== undefined && v.balanceOwed > 0.0001 && (
              <span className="text-amber-600 font-semibold"> · {formatCurrency(v.balanceOwed, v.currency)} owed</span>
            )}
            {v.balanceOwed !== undefined && v.balanceOwed < -0.0001 && (
              <span className="text-emerald-600 font-semibold" title="Value this vendor holds against you (overpayment / return credit)">
                {' '}· {formatCurrency(-v.balanceOwed, v.currency)} credit
              </span>
            )}
          </span>
        </div>
      ),
    },
    {
      key: 'industry',
      header: 'Industry',
      sortable: true,
      filterable: true,
      filterOptions: industryOptions,
      accessor: VENDOR_ACCESSORS.industry,
      render: (v) => <span className="text-muted-foreground">{v.industry || EMPTY}</span>,
    },
    {
      key: 'phone',
      header: 'Phone',
      accessor: VENDOR_ACCESSORS.phone,
      render: (v) => <span className="text-muted-foreground">{v.phone || EMPTY}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      accessor: VENDOR_ACCESSORS.email,
      render: (v) => <span className="text-muted-foreground">{v.email || EMPTY}</span>,
    },
    {
      key: 'country',
      header: 'Country',
      sortable: true,
      accessor: VENDOR_ACCESSORS.country,
      render: (v) => <span className="text-muted-foreground">{v.country || EMPTY}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      filterable: true,
      filterOptions: [{ value: 'Active' }, { value: 'Archived' }],
      accessor: VENDOR_ACCESSORS.status,
      render: (v) => (
        <Badge variant={v.archived ? 'outline' : 'success'}>{v.archived ? 'Archived' : 'Active'}</Badge>
      ),
    },
    {
      key: 'lastComm',
      header: 'Last Communication Date',
      align: 'right',
      sortable: true,
      accessor: VENDOR_ACCESSORS.lastComm,
      render: (v) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {v.lastCommunication ? new Date(v.lastCommunication).toLocaleDateString() : EMPTY}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      exportable: false,
      render: (vendor) => (
        <div className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
          {vendor.balanceOwed !== undefined && vendor.balanceOwed < -0.0001 && (
            <Button
              variant="outline"
              size="sm"
              title="Pay out this vendor's stored credit (overpayment / return credit)"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                cb.onPayoutCredit(vendor);
              }}
            >
              <HandCoins className="h-3.5 w-3.5 mr-1" />
              Pay Out Credit
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            title="Set this vendor's opening / advance balance"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              cb.onOpeningBalance(vendor);
            }}
          >
            <Wallet className="h-3.5 w-3.5 mr-1" />
            Opening Balance
          </Button>
          <Button
            variant="outline"
            size="sm"
            title="Record cash received back from this vendor on a purchase return"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              cb.onRefund(vendor);
            }}
          >
            <Undo2 className="h-3.5 w-3.5 mr-1" />
            Record Refund Received
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!vendor.vendorId}
            title={vendor.vendorId ? 'View vendor statement' : 'No AP ledger balance for this vendor yet'}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              cb.onStatement(vendor);
            }}
          >
            <FileText className="h-3.5 w-3.5 mr-1" />
            Statement
          </Button>
        </div>
      ),
    },
  ];
}
