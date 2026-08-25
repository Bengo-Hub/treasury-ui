'use client';

// DataTable column definitions for the three tables inline in tax/page.tsx
// (Tax Codes, Tax Periods, eTIMS Devices) — split out to mirror the
// vendors/expenses/budgets list convention.

import { Badge, Button } from '@/components/ui/base';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { EtimsDevice, TaxCode, TaxPeriod } from '@/lib/api/tax';
import { revealEtimsDeviceCmcKey } from '@/lib/api/tax';
import { Calculator, Eye, EyeOff, Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'next/navigation';

// Password-style masked field with a reveal-eye toggle, matching the platform Gateways &
// Secrets page's existing pattern for GavaConnect app secrets (platform/page.tsx). Fetches
// the decrypted value on demand — never on row render — so viewing the list never decrypts
// a device's real CMC key unless an operator explicitly asks.
function CmcKeyCell({ device }: { device: EtimsDevice }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [value, setValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  if (!device.status || device.status === 'pending') return <span className="text-muted-foreground text-xs">—</span>;

  const toggle = async () => {
    if (visible) {
      setVisible(false);
      return;
    }
    if (value === null) {
      setLoading(true);
      try {
        const resp = await revealEtimsDeviceCmcKey(orgSlug, device.id);
        setValue(resp.cmc_key || '');
      } catch {
        setValue('');
      } finally {
        setLoading(false);
      }
    }
    setVisible(true);
  };

  return (
    <div className="flex items-center gap-1.5 font-mono text-xs">
      <span className="max-w-35 truncate">
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : visible ? value || '(empty)' : '••••••••••'}
      </span>
      <button type="button" onClick={toggle} className="text-muted-foreground hover:text-foreground" tabIndex={-1}>
        {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

export const periodStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'secondary'> = {
  open: 'warning',
  filed: 'success',
  calculated: 'default',
  closed: 'secondary',
};

export const deviceStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'secondary'> = {
  pending: 'warning',
  initialized: 'success',
  active: 'success',
  error: 'error',
};

// ---- Tax Codes ----

export function buildTaxCodeColumns(): DataTableColumn<TaxCode>[] {
  return [
    { key: 'code', header: 'Code', primary: true, sortable: true, accessor: (c) => c.code, cellClassName: 'font-mono text-xs font-bold' },
    { key: 'name', header: 'Name', sortable: true, accessor: (c) => c.name },
    { key: 'rate', header: 'Rate', align: 'right', sortable: true, cellClassName: 'font-bold', accessor: (c) => Number(c.rate), render: (c) => `${Number(c.rate)}%` },
    { key: 'tax_type', header: 'Type', cellClassName: 'capitalize', accessor: (c) => c.tax_type },
    { key: 'kra_code', header: 'KRA Code', mobileHidden: true, cellClassName: 'text-muted-foreground', accessor: (c) => c.kra_code ?? '', render: (c) => c.kra_code || '---' },
    {
      key: 'is_default', header: 'Default', align: 'center', mobileAction: true,
      accessor: (c) => c.is_default, render: (c) => (c.is_default ? <Badge variant="success">Default</Badge> : null),
    },
  ];
}

// ---- Tax Periods ----

export interface TaxPeriodColumnCallbacks {
  onCalculate: (period: TaxPeriod) => void;
  calculatePending: boolean;
}

export function buildTaxPeriodColumns(cb: TaxPeriodColumnCallbacks): DataTableColumn<TaxPeriod>[] {
  return [
    { key: 'period_type', header: 'Type', primary: true, cellClassName: 'capitalize', accessor: (p) => p.period_type },
    {
      key: 'period', header: 'Period', accessor: (p) => p.start_date,
      render: (p) => `${new Date(p.start_date).toLocaleDateString()} - ${new Date(p.end_date).toLocaleDateString()}`,
    },
    {
      key: 'total_collected', header: 'Collected', align: 'right', sortable: true, cellClassName: 'font-bold',
      accessor: (p) => Number(p.total_collected), render: (p) => Number(p.total_collected).toLocaleString('en-KE', { minimumFractionDigits: 2 }),
    },
    {
      key: 'total_payable', header: 'Payable', align: 'right', sortable: true, mobileAction: true, cellClassName: 'font-bold',
      accessor: (p) => Number(p.total_payable), render: (p) => Number(p.total_payable).toLocaleString('en-KE', { minimumFractionDigits: 2 }),
    },
    {
      key: 'status', header: 'Status', align: 'center', filterable: true,
      filterOptions: Object.keys(periodStatusVariant).map((value) => ({ value })),
      accessor: (p) => p.status, render: (p) => <Badge variant={periodStatusVariant[p.status] ?? 'outline'}>{p.status}</Badge>,
    },
    {
      key: 'sync_status', header: 'Sync', align: 'center', mobileHidden: true,
      accessor: (p) => p.sync_status, render: (p) => <Badge variant={p.sync_status === 'synced' ? 'success' : 'secondary'}>{p.sync_status}</Badge>,
    },
    {
      key: 'actions', header: 'Actions', align: 'right', exportable: false,
      render: (period) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => cb.onCalculate(period)} disabled={cb.calculatePending} title="Calculate tax liability">
            <Calculator className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
}

// ---- eTIMS Devices ----

export interface EtimsDeviceColumnCallbacks {
  onInit: (device: EtimsDevice) => void;
  onActivateWithCmc: (device: EtimsDevice) => void;
  onSetScuDetails: (device: EtimsDevice) => void;
  onSyncInvoiceCounter: (device: EtimsDevice) => void;
  initPending: boolean;
  syncPending: boolean;
  /** outlet_id -> display name, for resolving the Outlet column. Missing id falls back to the raw id. */
  outletNameById: Record<string, string>;
}

function IntegrationBadgeCell({ device }: { device: EtimsDevice }) {
  const configured = device.integration_type || 'OSCU';
  const effective = device.effective_integration || configured;
  if (configured !== effective) {
    return (
      <span title={`Configured ${configured} but no local VSCU URL yet — signing online via ${effective} until provisioned.`}>
        <Badge variant="warning">{configured} (using {effective} — no local URL)</Badge>
      </span>
    );
  }
  return <Badge variant="secondary">{configured}</Badge>;
}

export function buildEtimsDeviceColumns(cb: EtimsDeviceColumnCallbacks): DataTableColumn<EtimsDevice>[] {
  return [
    { key: 'device_serial', header: 'Serial', primary: true, sortable: true, accessor: (d) => d.device_serial, cellClassName: 'font-mono text-xs font-bold' },
    { key: 'tin', header: 'TIN (KRA PIN)', cellClassName: 'font-mono text-xs', accessor: (d) => d.tin ?? '', render: (d) => d.tin || '—' },
    { key: 'branch_id', header: 'Branch', mobileHidden: true, accessor: (d) => d.branch_id ?? '', render: (d) => d.branch_id || '00' },
    { key: 'cmc_key_reveal', header: 'CMC Key', mobileHidden: true, accessor: () => '', render: (d) => <CmcKeyCell device={d} /> },
    {
      key: 'outlet_id', header: 'Outlet', mobileHidden: true,
      accessor: (d) => (d.outlet_id ? (cb.outletNameById[d.outlet_id] ?? d.outlet_id) : 'All Outlets'),
      render: (d) =>
        d.outlet_id ? (
          <span className="text-xs">{cb.outletNameById[d.outlet_id] ?? <span className="font-mono text-muted-foreground">{d.outlet_id}</span>}</span>
        ) : (
          <span title="Tenant-wide device — fiscalises sales for every outlet">
            <Badge variant="secondary">All Outlets</Badge>
          </span>
        ),
    },
    {
      key: 'environment', header: 'Env', accessor: (d) => d.environment,
      render: (d) => (
        <div className="flex items-center gap-1">
          <Badge variant={d.environment === 'production' ? 'success' : 'secondary'}>{d.environment}</Badge>
          <IntegrationBadgeCell device={d} />
        </div>
      ),
    },
    {
      key: 'last_invoice_no', header: 'Invoice #', align: 'right', mobileHidden: true, cellClassName: 'font-mono',
      accessor: (d) => d.last_invoice_no,
      render: (d) => (
        <div className="flex items-center justify-end gap-1.5">
          <span>{d.last_invoice_no}</span>
          <button
            type="button"
            title="Sync from KRA (the real source of truth) if the local count has drifted"
            disabled={cb.syncPending}
            onClick={() => cb.onSyncInvoiceCounter(d)}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {cb.syncPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </button>
        </div>
      ),
    },
    {
      key: 'sdc_id', header: 'SCU ID', accessor: (d) => d.sdc_id ?? '',
      render: (d) => (
        <button
          type="button"
          className="group flex items-center gap-1.5 text-left"
          title={d.sdc_id ? 'Edit the recorded SCU details' : 'Not captured — the value ETR receipts must print instead of the device serial. Click to set it.'}
          onClick={(e) => { e.stopPropagation(); cb.onSetScuDetails(d); }}
        >
          {d.sdc_id ? (
            <div className="leading-tight">
              <div className="font-mono text-xs font-medium group-hover:underline">{d.sdc_id}</div>
              {d.mrc_no && <div className="font-mono text-[10px] text-muted-foreground">MRC {d.mrc_no}</div>}
            </div>
          ) : (
            <Badge variant="warning" className="group-hover:underline">Not captured — set</Badge>
          )}
        </button>
      ),
    },
    {
      key: 'status', header: 'Status', align: 'center', filterable: true,
      filterOptions: Object.keys(deviceStatusVariant).map((value) => ({ value })),
      accessor: (d) => d.status, render: (d) => <Badge variant={deviceStatusVariant[d.status] ?? 'outline'}>{d.status}</Badge>,
    },
    {
      key: 'actions', header: 'Actions', align: 'right', exportable: false, mobileAction: true,
      render: (device) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          {device.status !== 'active' && (
            <>
              <Button size="sm" variant="outline" disabled={cb.initPending} onClick={() => cb.onInit(device)}>
                {cb.initPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Init'}
              </Button>
              <button
                type="button"
                className="text-[11px] text-muted-foreground underline hover:text-foreground"
                title="Activate a device already installed at KRA using its known CMC key"
                onClick={() => cb.onActivateWithCmc(device)}
              >
                Activate with CMC key
              </button>
            </>
          )}
          <button
            type="button"
            className="text-[11px] text-muted-foreground underline hover:text-foreground"
            title="Manually set/edit this device's KRA SCU ID, MRC No, and device ID"
            onClick={() => cb.onSetScuDetails(device)}
          >
            SCU details
          </button>
        </div>
      ),
    },
  ];
}
