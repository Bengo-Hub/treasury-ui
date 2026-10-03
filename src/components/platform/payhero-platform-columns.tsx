'use client';

// DataTable column definitions for the platform PayHero panel: every tenant's PayHero setup, and
// the escrow position per tenant. Same conventions as platform/analytics/*-columns.tsx.

import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Badge } from '@/components/ui/base';
import type { EscrowTotals } from '@/lib/api/escrow';
import type { PayHeroTeamRow } from '@/lib/api/payhero';
import { formatCurrency } from '@/lib/utils/currency';
import type { ReactNode } from 'react';

const MODE_LABEL: Record<string, string> = {
  platform_team: 'Own Team',
  platform_root: 'Platform account',
  own_account: 'Own PayHero keys',
};

/** A tenant has a working PayHero account when it has an account id (Team, root or own keys). */
export const hasPayHeroAccount = (t: PayHeroTeamRow) => (t.vendor_id ?? 0) > 0;

export function accountLabel(t: PayHeroTeamRow): string {
  if (t.mode === 'platform_root') return t.vendor_id ? `Root account #${t.vendor_id}` : 'Platform root account';
  if (t.team_name) return t.team_name;
  if (t.vendor_id) return `${t.mode === 'own_account' ? 'Account' : 'Team'} #${t.vendor_id}`;
  return 'No Team on PayHero yet';
}

export function buildTenantSetupColumns(
  tenantName: (id: string) => string,
  teamActions: (t: PayHeroTeamRow) => ReactNode,
  balancesLoaded: boolean,
): DataTableColumn<PayHeroTeamRow>[] {
  return [
    {
      key: 'tenant',
      header: 'Tenant',
      primary: true,
      sortable: true,
      accessor: (t) => tenantName(t.tenant_id),
      render: (t) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{tenantName(t.tenant_id)}</p>
          <p className="truncate text-xs text-muted-foreground">{accountLabel(t)}</p>
          {!hasPayHeroAccount(t) && t.mode === 'platform_team' && <div className="mt-2">{teamActions(t)}</div>}
        </div>
      ),
    },
    {
      key: 'mode',
      header: 'Mode',
      sortable: true,
      mobileHidden: true,
      accessor: (t) => MODE_LABEL[t.mode] ?? t.mode,
      render: (t) => <Badge variant="outline">{MODE_LABEL[t.mode] ?? t.mode}</Badge>,
    },
    {
      key: 'channels',
      header: 'Channels',
      align: 'right',
      sortable: true,
      accessor: (t) => t.channels,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (t) => (!t.enabled ? 'off' : hasPayHeroAccount(t) ? 'live' : 'pending'),
      render: (t) =>
        !t.enabled ? <Badge variant="secondary">Off</Badge>
          : hasPayHeroAccount(t) ? <Badge variant="success">Live</Badge>
            : <Badge variant="warning">Needs a Team</Badge>,
    },
    {
      key: 'wallet',
      header: 'Payments wallet',
      align: 'right',
      sortable: true,
      mobileAction: true,
      accessor: (t) => Number(t.balance ?? 0),
      render: (t) =>
        t.balance !== undefined && t.balance !== '' ? (
          <div className="tabular-nums">
            <p className="font-semibold">{formatCurrency(Number(t.balance), t.currency || 'KES')}</p>
            <p className="text-xs text-muted-foreground">Service {formatCurrency(Number(t.service_balance ?? 0), t.currency || 'KES')}</p>
          </div>
        ) : t.balance_error ? (
          <span className="text-xs text-destructive">{t.balance_error}</span>
        ) : (
          <span className="text-xs text-muted-foreground">{!hasPayHeroAccount(t) ? 'No wallet' : balancesLoaded ? 'Unavailable' : 'Not loaded'}</span>
        ),
    },
  ];
}

export interface EscrowTenantRow {
  totals: EscrowTotals;
  reconciliation?: Record<string, unknown>;
}

export function buildEscrowColumns(tenantName: (id: string) => string): DataTableColumn<EscrowTenantRow>[] {
  const money = (v?: string) => formatCurrency(Number(v ?? 0), 'KES');
  return [
    {
      key: 'tenant',
      header: 'Tenant',
      primary: true,
      sortable: true,
      cellClassName: 'font-medium',
      accessor: (r) => tenantName(r.totals.tenant_id),
    },
    {
      key: 'pots',
      header: 'Pots',
      align: 'right',
      sortable: true,
      mobileHidden: true,
      accessor: (r) => r.totals.pots,
      render: (r) => <span className="tabular-nums">{r.totals.open_pots} open of {r.totals.pots}</span>,
    },
    {
      key: 'held',
      header: 'Held',
      align: 'right',
      sortable: true,
      mobileAction: true,
      cellClassName: 'font-semibold tabular-nums',
      accessor: (r) => Number(r.totals.held),
      render: (r) => money(r.totals.held),
    },
    {
      key: 'in_flight',
      header: 'Releasing',
      align: 'right',
      sortable: true,
      mobileHidden: true,
      cellClassName: 'tabular-nums text-muted-foreground',
      accessor: (r) => Number(r.totals.in_flight),
      render: (r) => money(r.totals.in_flight),
    },
    {
      key: 'released',
      header: 'Released (gross)',
      align: 'right',
      sortable: true,
      mobileHidden: true,
      cellClassName: 'tabular-nums',
      accessor: (r) => Number(r.totals.released_gross),
      render: (r) => money(r.totals.released_gross),
    },
    {
      key: 'commission',
      header: 'Commission',
      align: 'right',
      sortable: true,
      mobileHidden: true,
      cellClassName: 'tabular-nums text-green-600',
      accessor: (r) => Number(r.totals.commission),
      render: (r) => money(r.totals.commission),
    },
    {
      key: 'check',
      header: 'Wallet check',
      accessor: (r) => (!r.reconciliation ? '' : r.reconciliation.shortfall ? 'short' : r.reconciliation.error ? 'unchecked' : 'ok'),
      render: (r) =>
        !r.reconciliation ? <span className="text-xs text-muted-foreground">Not checked yet</span>
          : r.reconciliation.shortfall ? <Badge variant="error">Short {String(r.reconciliation.surplus ?? '')}</Badge>
            : r.reconciliation.error ? <Badge variant="warning">Not checked</Badge>
              : <Badge variant="success">Matches wallet</Badge>,
    },
  ];
}
