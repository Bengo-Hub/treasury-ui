'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useTaxCodes,
  useCreateTaxCode,
  useTaxPeriods,
  useCalculateTaxLiability,
  useEtimsDevices,
  useRegisterEtimsDevice,
  useInitEtimsDevice,
  useRefreshCodeLists,
} from '@/hooks/use-tax';
import { TaxProfileTab } from './tax-profile-tab';
import { DeductionsTab } from './deductions-tab';
import { CapitalAllowancesTab } from './capital-allowances-tab';
import { WHTPaymentRefTab } from './wht-prn-tab';
import { TaxReturnsTab } from './tax-returns-tab';
import { TransmissionHistoryTab } from './transmission-history-tab';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useSubscription } from '@/hooks/use-subscription';
import type { TaxCode, TaxPeriod, EtimsDevice } from '@/lib/api/tax';
import { cn } from '@/lib/utils';
import {
  Calculator,
  Cpu,
  FileText,
  Loader2,
  Lock,
  Plus,
  Receipt,
  Shield,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const SUBSCRIBE_URL = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_UI_URL || 'https://pricing.codevertexitsolutions.com';

const periodStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'secondary'> = {
  open: 'warning',
  filed: 'success',
  calculated: 'default',
  closed: 'secondary',
};

const deviceStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'secondary'> = {
  pending: 'warning',
  initialized: 'success',
  active: 'success',
  error: 'error',
};

function EtimsUpgradePrompt() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
        <Lock className="size-6 text-primary" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <p className="font-semibold text-foreground">KRA eTIMS Integration requires a Growth plan or above</p>
        <p className="text-sm text-muted-foreground">
          Automatically transmit POS sales and invoices to the Kenya Revenue Authority via eTIMS. Manage your OSCU
          devices and view real-time transmission status.
        </p>
      </div>
      <Link
        href={`${SUBSCRIBE_URL}/plans?service=complete`}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Zap className="size-4" />
        Upgrade to Growth
      </Link>
    </div>
  );
}

export default function TaxPage() {
  const { tenantPathId, isPlatformOwner, tenantQueryParam } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;
  const [tab, setTab] = useState('codes');
  const { hasFeature, isLoading: subLoading } = useSubscription();

  // Platform owners can always see eTIMS for any tenant; tenants need the feature
  const canUseEtims = isPlatformOwner || (!subLoading && hasFeature('etims_integration'));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tax & Compliance</h1>
        <p className="text-muted-foreground mt-1">Manage tax codes, filing periods, and KRA eTIMS devices.</p>
      </div>

      {isPlatformOwner && !tenantQueryParam ? (
        <div className="rounded-lg border border-border bg-accent/5 px-4 py-10 text-center text-sm text-muted-foreground">
          Select a tenant from the filter above to view their tax & compliance data.
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="profile">Compliance</TabsTrigger>
            <TabsTrigger value="deductions">Deductions</TabsTrigger>
            <TabsTrigger value="capital-allowances">Capital Allowances</TabsTrigger>
            <TabsTrigger value="codes">Tax Codes</TabsTrigger>
            <TabsTrigger value="periods">Tax Periods</TabsTrigger>
            <TabsTrigger value="etims" className="flex items-center gap-1.5">
              eTIMS Devices
              {!subLoading && !canUseEtims && <Lock className="size-3 text-muted-foreground" />}
            </TabsTrigger>
            <TabsTrigger value="wht-prn">WHT PRN</TabsTrigger>
            <TabsTrigger value="tax-returns">Tax Returns</TabsTrigger>
            <TabsTrigger value="transmissions">Transmissions</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <TaxProfileTab tenantSlug={effectiveTenant} />
          </TabsContent>
          <TabsContent value="deductions" className="mt-6">
            <DeductionsTab tenantSlug={effectiveTenant} />
          </TabsContent>
          <TabsContent value="capital-allowances" className="mt-6">
            <CapitalAllowancesTab tenantSlug={effectiveTenant} />
          </TabsContent>
          <TabsContent value="codes" className="mt-6">
            <TaxCodesTab tenantSlug={effectiveTenant} />
          </TabsContent>
          <TabsContent value="periods" className="mt-6">
            <TaxPeriodsTab tenantSlug={effectiveTenant} />
          </TabsContent>
          <TabsContent value="etims" className="mt-6">
            {canUseEtims ? <EtimsTab tenantSlug={effectiveTenant} /> : <EtimsUpgradePrompt />}
          </TabsContent>
          <TabsContent value="wht-prn" className="mt-6">
            <WHTPaymentRefTab tenantSlug={effectiveTenant} />
          </TabsContent>
          <TabsContent value="tax-returns" className="mt-6">
            <TaxReturnsTab tenantSlug={effectiveTenant} />
          </TabsContent>
          <TabsContent value="transmissions" className="mt-6">
            <TransmissionHistoryTab tenantSlug={effectiveTenant} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ---- Tax Codes Tab ----

function TaxCodesTab({ tenantSlug }: { tenantSlug: string }) {
  const { data, isLoading, isError } = useTaxCodes(tenantSlug);
  const codes = data?.tax_codes ?? [];
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-tight">Tax Codes</h3>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Add Code
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading tax codes...
            </div>
          )}
          {!isLoading && isError && (
            <div className="m-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Failed to load tax codes. Check your connection and try again.
            </div>
          )}
          {!isLoading && !isError && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/5">
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Code</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Name</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Rate</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Type</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">KRA Code</th>
                    <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Default</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {codes.map((code) => (
                    <tr key={code.id} className="hover:bg-accent/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold">{code.code}</td>
                      <td className="px-6 py-4 text-xs">{code.name}</td>
                      <td className="px-6 py-4 text-right text-xs font-bold">{Number(code.rate)}%</td>
                      <td className="px-6 py-4 text-xs capitalize">{code.tax_type}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">{code.kra_code || '---'}</td>
                      <td className="px-6 py-4 text-center">
                        {code.is_default && <Badge variant="success">Default</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!isLoading && !isError && codes.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">No tax codes configured.</div>
          )}
        </CardContent>
      </Card>

      <CreateTaxCodeDialog open={createOpen} onOpenChange={setCreateOpen} tenantSlug={tenantSlug} />
    </>
  );
}

function CreateTaxCodeDialog({
  open,
  onOpenChange,
  tenantSlug,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
}) {
  const createMutation = useCreateTaxCode();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [taxType, setTaxType] = useState('vat');
  const [kraCode, setKraCode] = useState('');

  function handleSubmit() {
    createMutation.mutate(
      { tenantSlug, data: { code, name, rate: parseFloat(rate), tax_type: taxType, kra_code: kraCode || undefined } },
      {
        onSuccess: () => {
          onOpenChange(false);
          setCode('');
          setName('');
          setRate('');
          setKraCode('');
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="New Tax Code" onClose={() => onOpenChange(false)}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Code" required>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. VAT16"
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="Name" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. VAT 16%"
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Rate (%)" required>
              <input
                type="number"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="16"
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="Type" required>
              <select
                value={taxType}
                onChange={(e) => setTaxType(e.target.value)}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              >
                <option value="vat">VAT</option>
                <option value="excise">Excise</option>
                <option value="withholding">Withholding</option>
                <option value="income">Income Tax</option>
              </select>
            </FormField>
          </div>
          <FormField label="KRA Code">
            <input
              type="text"
              value={kraCode}
              onChange={(e) => setKraCode(e.target.value)}
              placeholder="e.g. A (optional)"
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!code || !name || !rate || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Tax Periods Tab ----

function TaxPeriodsTab({ tenantSlug }: { tenantSlug: string }) {
  const { data, isLoading, isError } = useTaxPeriods(tenantSlug);
  const periods = data?.periods ?? [];
  const calculateMutation = useCalculateTaxLiability();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm uppercase tracking-tight">Tax Periods</h3>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading tax periods...
          </div>
        )}
        {!isLoading && isError && (
          <div className="m-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Failed to load tax periods. Check your connection and try again.
          </div>
        )}
        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/5">
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Period</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Collected</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Payable</th>
                  <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Sync</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {periods.map((period) => (
                  <tr key={period.id} className="hover:bg-accent/5 transition-colors">
                    <td className="px-6 py-4 text-xs capitalize">{period.period_type}</td>
                    <td className="px-6 py-4 text-xs">
                      {new Date(period.start_date).toLocaleDateString()} - {new Date(period.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right text-xs font-bold">
                      {Number(period.total_collected).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right text-xs font-bold">
                      {Number(period.total_payable).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={periodStatusVariant[period.status] ?? 'outline'}>{period.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={period.sync_status === 'synced' ? 'success' : 'secondary'}>{period.sync_status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => calculateMutation.mutate({ tenantSlug, periodID: period.id })}
                        disabled={calculateMutation.isPending}
                        title="Calculate tax liability"
                      >
                        <Calculator className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && !isError && periods.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">No tax periods found.</div>
        )}
      </CardContent>
    </Card>
  );
}

// ---- eTIMS Devices Tab ----

function EtimsTab({ tenantSlug }: { tenantSlug: string }) {
  const { data, isLoading, isError } = useEtimsDevices(tenantSlug);
  const devices = data?.devices ?? [];
  const [registerOpen, setRegisterOpen] = useState(false);
  const initDevice = useInitEtimsDevice();
  const refreshCodes = useRefreshCodeLists();

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-tight">eTIMS Devices</h3>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={refreshCodes.isPending}
              onClick={() => refreshCodes.mutate({ tenantSlug })}
              title="Sync KRA code lists (item classes, payment types, tax types)"
            >
              {refreshCodes.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
              <span className="ml-1">Refresh Code Lists</span>
            </Button>
            <Button size="sm" onClick={() => setRegisterOpen(true)} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Register Device
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading devices...
            </div>
          )}
          {!isLoading && isError && (
            <div className="m-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Failed to load eTIMS devices. Check your connection and try again.
            </div>
          )}
          {!isLoading && !isError && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/5">
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Serial</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">TIN (KRA PIN)</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Branch</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Env</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Invoice #</th>
                    <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {devices.map((device) => (
                    <tr key={device.id} className="hover:bg-accent/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold">{device.device_serial}</td>
                      <td className="px-6 py-4 text-xs font-mono">{device.tin || '—'}</td>
                      <td className="px-6 py-4 text-xs">{device.branch_id || '00'}</td>
                      <td className="px-6 py-4 text-xs">
                        <Badge variant={device.environment === 'production' ? 'success' : 'secondary'}>{device.environment}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right text-xs font-mono">{device.last_invoice_no ?? 0}</td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={deviceStatusVariant[device.status] ?? 'outline'}>{device.status}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {device.status === 'pending' && (
                          <Button
                            size="sm" variant="outline"
                            disabled={initDevice.isPending}
                            onClick={() => initDevice.mutate({ tenantSlug, deviceId: device.id })}
                          >
                            {initDevice.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Init'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!isLoading && !isError && devices.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">No eTIMS devices registered.</div>
          )}
        </CardContent>
      </Card>

      <RegisterDeviceDialog open={registerOpen} onOpenChange={setRegisterOpen} tenantSlug={tenantSlug} />
    </>
  );
}

function RegisterDeviceDialog({
  open,
  onOpenChange,
  tenantSlug,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
}) {
  const registerMutation = useRegisterEtimsDevice();
  const [serial, setSerial] = useState('');
  const [branchId, setBranchId] = useState('00');
  const [tin, setTin] = useState('');
  const [environment, setEnvironment] = useState('sandbox');

  function handleSubmit() {
    registerMutation.mutate(
      { tenantSlug, data: { device_serial: serial, branch_id: branchId || '00', tin, environment } },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSerial(''); setBranchId('00'); setTin(''); setEnvironment('sandbox');
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Register eTIMS Device" onClose={() => onOpenChange(false)}>
        <div className="space-y-4">
          <FormField label="Device Serial" required>
            <input
              type="text"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              placeholder="e.g. ETIMS-001"
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
            />
          </FormField>
          <FormField label="KRA PIN (TIN)" required>
            <input
              type="text"
              value={tin}
              onChange={(e) => setTin(e.target.value)}
              placeholder="e.g. P000111222A"
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
            />
          </FormField>
          <FormField label="Branch ID">
            <input
              type="text"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              placeholder="00 (main branch)"
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
            />
          </FormField>
          <FormField label="Environment">
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
            >
              <option value="sandbox">Sandbox (testing)</option>
              <option value="production">Production</option>
            </select>
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!serial || registerMutation.isPending}>
              {registerMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Register
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
