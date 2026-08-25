'use client';

import { CodeListSelect } from '@/components/tax/code-list-select';
import { CodeListsModal } from '@/components/tax/code-lists-modal';
import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { CapsuleTabs, CapsuleTabsContent, CapsuleTabsList, CapsuleTabsTrigger } from '@/components/ui/capsule-tabs';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { buildEtimsDeviceColumns, buildTaxCodeColumns, buildTaxPeriodColumns, CmcKeyReveal } from './tax-page-columns';
import {
  useTaxCodes,
  useCreateTaxCode,
  useTaxPeriods,
  useCalculateTaxLiability,
  useEtimsDevices,
  useRegisterEtimsDevice,
  useInitEtimsDevice,
  useSyncDeviceInvoiceCounter,
  useSetDeviceScuDetails,
  useRefreshCodeLists,
  useKraStatus,
} from '@/hooks/use-tax';
import type { EtimsDevice } from '@/lib/api/tax';
import { useOutletFilterStore } from '@/store/outlet-filter';
import { TaxProfileTab } from './tax-profile-tab';
import { DeductionsTab } from './deductions-tab';
import { CapitalAllowancesTab } from './capital-allowances-tab';
import { StructuringTab } from './structuring-tab';
import { WHTPaymentRefTab } from './wht-prn-tab';
import { TaxReturnsTab } from './tax-returns-tab';
import { TransmissionHistoryTab } from './transmission-history-tab';
import { BadDebtReliefTab } from './bad-debt-relief-tab';
import { VATReturnTab } from './vat-return-tab';
import { EtimsSyncTab } from './etims-sync-tab';
import { RatesCalendarTab } from './rates-calendar-tab';
import { EtimsItemsTab } from './etims-items-tab';
import { KraBranchToolsTab } from './kra-branch-tools-tab';
import { WHVATTab } from './whvat-tab';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useSubscription } from '@/hooks/use-subscription';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Calculator,
  CalendarDays,
  CheckCircle2,
  Coins,
  Cpu,
  FileSpreadsheet,
  FileText,
  HandCoins,
  Landmark,
  Loader2,
  Lock,
  Package,
  PiggyBank,
  Plus,
  Receipt,
  RefreshCw,
  Scale,
  Send,
  Shield,
  ShieldCheck,
  Tag,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const SUBSCRIBE_URL = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_UI_URL || 'https://pricing.codevertexafrica.com';

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
  const { tenantPathId, isPlatformOwner, tenantQueryParam, orgSlug } = useResolvedTenant();
  // Default to the platform owner's own tenant (codevertex); drill-down overrides.
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;
  // Reads ?tab=... once on load so other pages (e.g. the eTIMS certification wizard) can deep
  // link straight to a specific tab ("Go to eTIMS Items") instead of leaving the tenant to find
  // it manually — tab switches after that stay pure client state, same as before.
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'profile');
  const { hasFeature, isLoading: subLoading } = useSubscription();

  // Platform owners can always see eTIMS for any tenant; tenants need the feature
  const canUseEtims = isPlatformOwner || (!subLoading && hasFeature('etims_integration'));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Shield className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tax &amp; Compliance</h1>
          <p className="mt-1 text-sm text-muted-foreground">KRA-aware compliance — eligibility, deductions, capital allowances, VAT bad-debt relief, eTIMS &amp; returns.</p>
        </div>
      </div>

      {isPlatformOwner && !tenantQueryParam && (
        <div className="rounded-lg border border-border bg-accent/5 px-4 py-2.5 text-center text-xs text-muted-foreground">
          Showing your own organization&apos;s tax &amp; compliance data. Drill into a tenant via the filter above to view theirs.
        </div>
      )}
      {(
        <CapsuleTabs value={tab} onValueChange={setTab}>
          <CapsuleTabsList wrap>
            <CapsuleTabsTrigger value="profile"><ShieldCheck className="h-4 w-4" />Compliance</CapsuleTabsTrigger>
            <CapsuleTabsTrigger value="deductions"><PiggyBank className="h-4 w-4" />Deductions</CapsuleTabsTrigger>
            <CapsuleTabsTrigger value="capital-allowances"><Landmark className="h-4 w-4" />Capital Allowances</CapsuleTabsTrigger>
            <CapsuleTabsTrigger value="structuring"><Scale className="h-4 w-4" />Structuring</CapsuleTabsTrigger>
            <CapsuleTabsTrigger value="rates-calendar"><CalendarDays className="h-4 w-4" />Rates &amp; Calendar</CapsuleTabsTrigger>
            <CapsuleTabsTrigger value="bad-debt" badge={<span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary">New</span>}><HandCoins className="h-4 w-4" />Bad-Debt Relief</CapsuleTabsTrigger>
            <CapsuleTabsTrigger value="codes"><Tag className="h-4 w-4" />Tax Codes</CapsuleTabsTrigger>
            <CapsuleTabsTrigger value="vat-return" badge={<span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary">New</span>}><FileSpreadsheet className="h-4 w-4" />VAT Return</CapsuleTabsTrigger>
            <CapsuleTabsTrigger value="periods"><CalendarDays className="h-4 w-4" />Tax Periods</CapsuleTabsTrigger>
            <CapsuleTabsTrigger value="etims" badge={!subLoading && !canUseEtims ? <Lock className="size-3 text-muted-foreground" /> : undefined}><Cpu className="h-4 w-4" />eTIMS Devices</CapsuleTabsTrigger>
            <CapsuleTabsTrigger value="etims-sync" badge={<span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary">New</span>}><RefreshCw className="h-4 w-4" />eTIMS Sync</CapsuleTabsTrigger>
            <CapsuleTabsTrigger value="etims-items"><Package className="h-4 w-4" />eTIMS Items</CapsuleTabsTrigger>
            <CapsuleTabsTrigger value="etims-branch-tools" badge={<span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary">New</span>}><Landmark className="h-4 w-4" />KRA Branch Tools</CapsuleTabsTrigger>
            <CapsuleTabsTrigger value="wht-prn"><Coins className="h-4 w-4" />WHT PRN</CapsuleTabsTrigger>
            <CapsuleTabsTrigger value="whvat"><ShieldCheck className="h-4 w-4" />WHVAT</CapsuleTabsTrigger>
            <CapsuleTabsTrigger value="tax-returns"><FileText className="h-4 w-4" />Tax Returns</CapsuleTabsTrigger>
            <CapsuleTabsTrigger value="transmissions"><Send className="h-4 w-4" />Transmissions</CapsuleTabsTrigger>
          </CapsuleTabsList>

          <CapsuleTabsContent value="profile" className="mt-6">
            <TaxProfileTab tenantSlug={effectiveTenant} />
          </CapsuleTabsContent>
          <CapsuleTabsContent value="deductions" className="mt-6">
            <DeductionsTab tenantSlug={effectiveTenant} />
          </CapsuleTabsContent>
          <CapsuleTabsContent value="capital-allowances" className="mt-6">
            <CapitalAllowancesTab tenantSlug={effectiveTenant} />
          </CapsuleTabsContent>
          <CapsuleTabsContent value="structuring" className="mt-6">
            <StructuringTab tenantSlug={effectiveTenant} />
          </CapsuleTabsContent>
          <CapsuleTabsContent value="rates-calendar" className="mt-6">
            <RatesCalendarTab tenantSlug={effectiveTenant} />
          </CapsuleTabsContent>
          <CapsuleTabsContent value="bad-debt" className="mt-6">
            <BadDebtReliefTab tenantSlug={effectiveTenant} />
          </CapsuleTabsContent>
          <CapsuleTabsContent value="codes" className="mt-6">
            <TaxCodesTab tenantSlug={effectiveTenant} />
          </CapsuleTabsContent>
          <CapsuleTabsContent value="vat-return" className="mt-6">
            <VATReturnTab tenantSlug={effectiveTenant} />
          </CapsuleTabsContent>
          <CapsuleTabsContent value="periods" className="mt-6">
            <TaxPeriodsTab tenantSlug={effectiveTenant} />
          </CapsuleTabsContent>
          <CapsuleTabsContent value="etims" className="mt-6">
            {canUseEtims ? <EtimsTab tenantSlug={effectiveTenant} /> : <EtimsUpgradePrompt />}
          </CapsuleTabsContent>
          <CapsuleTabsContent value="etims-sync" className="mt-6">
            {canUseEtims ? <EtimsSyncTab tenantSlug={effectiveTenant} /> : <EtimsUpgradePrompt />}
          </CapsuleTabsContent>
          <CapsuleTabsContent value="etims-branch-tools" className="mt-6">
            {canUseEtims ? <KraBranchToolsTab tenantSlug={effectiveTenant} /> : <EtimsUpgradePrompt />}
          </CapsuleTabsContent>

          <CapsuleTabsContent value="etims-items" className="mt-6">
            {canUseEtims ? <EtimsItemsTab tenantSlug={effectiveTenant} /> : <EtimsUpgradePrompt />}
          </CapsuleTabsContent>
          <CapsuleTabsContent value="wht-prn" className="mt-6">
            <WHTPaymentRefTab tenantSlug={effectiveTenant} />
          </CapsuleTabsContent>
          <CapsuleTabsContent value="whvat" className="mt-6">
            <WHVATTab tenantSlug={effectiveTenant} />
          </CapsuleTabsContent>
          <CapsuleTabsContent value="tax-returns" className="mt-6">
            <TaxReturnsTab tenantSlug={effectiveTenant} />
          </CapsuleTabsContent>
          <CapsuleTabsContent value="transmissions" className="mt-6">
            <TransmissionHistoryTab tenantSlug={effectiveTenant} />
          </CapsuleTabsContent>
        </CapsuleTabs>
      )}
    </div>
  );
}

// ---- Tax Codes Tab ----

function TaxCodesTab({ tenantSlug }: { tenantSlug: string }) {
  const { data, isLoading, isError } = useTaxCodes(tenantSlug);
  const codes = data?.tax_codes ?? [];
  const [createOpen, setCreateOpen] = useState(false);
  const columns = useMemo(() => buildTaxCodeColumns(), []);

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
          <div className="px-2 pb-2">
            <DataTable
              columns={columns}
              rows={codes}
              rowKey={(c) => c.id}
              loading={isLoading}
              loadingRows={8}
              error={isError}
              storageKey="tax-codes-table"
              emptyText="No tax codes configured."
            />
          </div>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <CodeListSelect
              tenantSlug={tenantSlug}
              codeType="TAX_TY"
              value={kraCode}
              onChange={setKraCode}
              allowEmpty
              placeholder="No KRA band (optional)"
              fallbackOptions={[
                { value: 'B', label: 'B — VAT 16%' },
                { value: 'A', label: 'A — Exempt' },
                { value: 'C', label: 'C — Zero-rated' },
                { value: 'D', label: 'D — Non-VAT' },
                { value: 'E', label: 'E — VAT 8%' },
              ]}
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
  const columns = useMemo(
    () =>
      buildTaxPeriodColumns({
        onCalculate: (period) => calculateMutation.mutate({ tenantSlug, periodID: period.id }),
        calculatePending: calculateMutation.isPending,
      }),
    [tenantSlug, calculateMutation],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm uppercase tracking-tight">Tax Periods</h3>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-2 pb-2">
          <DataTable
            columns={columns}
            rows={periods}
            rowKey={(p) => p.id}
            loading={isLoading}
            loadingRows={8}
            error={isError}
            storageKey="tax-periods-table"
            emptyText="No tax periods found."
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ---- eTIMS Devices Tab ----

// One "KRA eTIMS Integration" checklist — platform credentials + the tenant's activation
// steps rendered as a single integration (never as separate "eTIMS" and "GavaConnect"
// integrations; they share one KRA OAuth app under the hood).
function KraActivationCard({ tenantSlug }: { tenantSlug: string }) {
  const { data } = useKraStatus(tenantSlug);
  if (!data) return null;
  const t = data.tenant ?? ({} as NonNullable<typeof data.tenant>);
  const p = data.platform ?? ({} as NonNullable<typeof data.platform>);
  const steps = [
    { label: 'KRA PIN on tax profile', ok: !!t.kra_pin_set },
    { label: 'Device registered', ok: !!t.device_registered },
    { label: 'Device initialized (CMC key)', ok: !!t.device_initialized },
    { label: 'Subscription feature', ok: !!t.feature_entitled },
  ];
  return (
    <Card className="mb-4">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-tight">KRA eTIMS Integration</h3>
          </div>
          <Badge variant={t.activated ? 'success' : 'secondary'}>
            {t.activated ? 'Activated' : 'Not activated'}
          </Badge>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.label} className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs">
              {s.ok
                ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                : <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              <span className={s.ok ? 'text-foreground' : 'text-muted-foreground'}>{s.label}</span>
            </div>
          ))}
        </div>
        {!t.activated && t.reason && (
          <p className="text-xs text-muted-foreground">{t.reason}</p>
        )}
        <p className="text-[11px] text-muted-foreground/70">
          Platform KRA credentials: {p.oscu_configured && p.gavaconnect_configured ? 'configured' : 'incomplete'}
          {p.environment ? ` (${p.environment})` : ''} — PIN checks, TCC and filings need only these;
          invoice fiscalisation additionally needs the steps above.
        </p>
      </CardContent>
    </Card>
  );
}

function EtimsTab({ tenantSlug }: { tenantSlug: string }) {
  const { orgSlug } = useResolvedTenant();
  const wizardSearchParams = useSearchParams();
  const wizardTenantParam = wizardSearchParams.get('tenant');
  // Absolute path, not relative — a relative "etims-certification" href resolves against the
  // current path by REPLACING its last segment (no trailing slash on /tax), landing on
  // /{orgSlug}/etims-certification instead of /{orgSlug}/tax/etims-certification (404, proven
  // live 2026-08-25).
  const wizardHref = wizardTenantParam
    ? `/${orgSlug}/tax/etims-certification?tenant=${encodeURIComponent(wizardTenantParam)}`
    : `/${orgSlug}/tax/etims-certification`;
  const { data, isLoading, isError } = useEtimsDevices(tenantSlug);
  const devices = data?.devices ?? [];
  const [registerOpen, setRegisterOpen] = useState(false);
  const [cmcDevice, setCmcDevice] = useState<{ id: string; serial: string; tin: string } | null>(null);
  const [scuDevice, setScuDevice] = useState<EtimsDevice | null>(null);
  const [codeListsOpen, setCodeListsOpen] = useState(false);
  const initDevice = useInitEtimsDevice();
  const syncInvoiceCounter = useSyncDeviceInvoiceCounter();
  const refreshCodes = useRefreshCodeLists();
  const outlets = useOutletFilterStore((s) => s.outlets);
  const outletNameById = useMemo(
    () => Object.fromEntries(outlets.map((o) => [o.id, o.name])),
    [outlets],
  );
  const etimsDeviceColumns = useMemo(
    () =>
      buildEtimsDeviceColumns({
        onInit: (device) => initDevice.mutate({ tenantSlug, deviceId: device.id }),
        onActivateWithCmc: (device) => setCmcDevice({ id: device.id, serial: device.device_serial, tin: device.tin || '' }),
        onSetScuDetails: (device) => setScuDevice(device),
        onSyncInvoiceCounter: (device) => syncInvoiceCounter.mutate({ tenantSlug, deviceId: device.id }),
        initPending: initDevice.isPending,
        syncPending: syncInvoiceCounter.isPending,
        outletNameById,
      }),
    [tenantSlug, initDevice, syncInvoiceCounter, outletNameById],
  );

  return (
    <>
      <KraActivationCard tenantSlug={tenantSlug} />
      <CodeListsModal tenantSlug={tenantSlug} open={codeListsOpen} onClose={() => setCodeListsOpen(false)} />
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
              onClick={() => setCodeListsOpen(true)}
              title="View / print the synced KRA code lists"
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="ml-1">View Code Lists</span>
            </Button>
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
            <Link href={wizardHref}>
              <Button size="sm" variant="outline" title="Step through all 23 KRA-scored OSCU test cases">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="ml-1">Certification Wizard</span>
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-2 pb-2">
            <DataTable
              columns={etimsDeviceColumns}
              rows={devices}
              rowKey={(d) => d.id}
              loading={isLoading}
              loadingRows={8}
              error={isError}
              storageKey="etims-devices-table"
              emptyText="No eTIMS devices registered."
            />
          </div>
        </CardContent>
      </Card>

      <RegisterDeviceDialog open={registerOpen} onOpenChange={setRegisterOpen} tenantSlug={tenantSlug} />
      <CmcKeyDialog
        device={cmcDevice}
        onClose={() => setCmcDevice(null)}
        tenantSlug={tenantSlug}
      />
      <ScuDetailsDialog
        device={scuDevice}
        onClose={() => setScuDevice(null)}
        tenantSlug={tenantSlug}
      />
    </>
  );
}

// CmcKeyDialog activates a device that is ALREADY installed at KRA (init returns 902
// "already installed") using the CMC key from its original initialization. Proper modal
// replacing the old window.prompt: masked paste-friendly input + context + pending state.
function CmcKeyDialog({
  device,
  onClose,
  tenantSlug,
}: {
  device: { id: string; serial: string; tin: string } | null;
  onClose: () => void;
  tenantSlug: string;
}) {
  const initDevice = useInitEtimsDevice();
  const [key, setKey] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  function handleActivate() {
    if (!device || !key.trim()) return;
    setError('');
    initDevice.mutate(
      { tenantSlug, deviceId: device.id, cmcKey: key.trim() },
      {
        onSuccess: () => { setKey(''); onClose(); },
        onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Activation failed — check the CMC key and try again.'),
      },
    );
  }

  return (
    <Dialog open={!!device} onOpenChange={(o) => { if (!o) { setKey(''); setError(''); onClose(); } }}>
      <DialogContent title="Activate device with CMC key" onClose={() => { setKey(''); setError(''); onClose(); }}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The CMC key was issued by KRA when this device was first initialized; it binds the
            device serial to the KRA PIN. Use this when KRA reports the device as already
            installed (a fresh Init returns error 902).
          </p>
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-border/60 bg-muted/40 p-3 text-xs sm:grid-cols-2">
            <div><span className="text-muted-foreground">Device serial:</span> <span className="font-mono font-medium">{device?.serial}</span></div>
            <div><span className="text-muted-foreground">KRA PIN:</span> <span className="font-mono font-medium">{device?.tin || '—'}</span></div>
          </div>
          <FormField label="CMC key" required>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Paste the CMC key from the original KRA initialization"
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 pr-16 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground underline hover:text-foreground"
              >
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
          </FormField>
          {error && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setKey(''); setError(''); onClose(); }}>Cancel</Button>
            <Button onClick={handleActivate} disabled={!key.trim() || initDevice.isPending}>
              {initDevice.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Activate
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ScuDetailsDialog records/edits a device's KRA-issued SCU identity (sdc_id/mrc_no/dvc_id) — the
// recovery path for a device already installed at KRA whose [902] "already installed" response
// didn't include them (a real, confirmed case with no other API-side recovery). Prefills from the
// device's currently-recorded values when present (editable — a wrong value can be corrected),
// and starts empty when none have been captured yet.
function ScuDetailsDialog({
  device,
  onClose,
  tenantSlug,
}: {
  device: EtimsDevice | null;
  onClose: () => void;
  tenantSlug: string;
}) {
  const setScuDetails = useSetDeviceScuDetails();
  const [sdcId, setSdcId] = useState('');
  const [mrcNo, setMrcNo] = useState('');
  const [dvcId, setDvcId] = useState('');
  const [error, setError] = useState('');

  // Re-sync the form to whichever device the row action opened, prefilling its current values
  // (or blank fields when none have been captured yet) each time a different device is targeted.
  useEffect(() => {
    setSdcId(device?.sdc_id ?? '');
    setMrcNo(device?.mrc_no ?? '');
    setDvcId(device?.dvc_id ?? '');
    setError('');
  }, [device?.id]);

  function handleSave() {
    if (!device) return;
    if (!sdcId.trim() && !mrcNo.trim() && !dvcId.trim()) {
      setError('Enter at least one of SCU ID, MRC No, or Device ID.');
      return;
    }
    setError('');
    setScuDetails.mutate(
      {
        tenantSlug,
        deviceId: device.id,
        body: { sdc_id: sdcId.trim(), mrc_no: mrcNo.trim(), dvc_id: dvcId.trim() },
      },
      {
        onSuccess: () => onClose(),
        onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Failed to save SCU details.'),
      },
    );
  }

  return (
    <Dialog open={!!device} onOpenChange={(o) => { if (!o) { setError(''); onClose(); } }}>
      <DialogContent title="Device SCU details" onClose={() => { setError(''); onClose(); }}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            KRA assigns the SCU ID (e.g. <span className="font-mono">KRACU0400001154</span>), MRC
            number, and device ID once, at the device&apos;s original initialization. If KRA&apos;s
            response didn&apos;t include them (common for a device already installed at KRA), enter
            the values here — from KRA support, a portal export, or a record kept at the time of
            initialization. This is what ETR receipts print as &quot;SCU ID&quot; instead of the
            device serial.
          </p>
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-border/60 bg-muted/40 p-3 text-xs sm:grid-cols-2">
            <div><span className="text-muted-foreground">Device serial:</span> <span className="font-mono font-medium">{device?.device_serial}</span></div>
            <div><span className="text-muted-foreground">KRA PIN:</span> <span className="font-mono font-medium">{device?.tin || '—'}</span></div>
            {device?.id && (
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">CMC key:</span>{' '}
                <CmcKeyReveal deviceId={device.id} />
              </div>
            )}
          </div>
          <FormField label="SCU ID (sdcId)">
            <input
              type="text"
              value={sdcId}
              onChange={(e) => setSdcId(e.target.value)}
              placeholder="e.g. KRACU0400001154"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-sm"
            />
          </FormField>
          <FormField label="MRC No (mrcNo)">
            <input
              type="text"
              value={mrcNo}
              onChange={(e) => setMrcNo(e.target.value)}
              placeholder="e.g. KRA00379537"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-sm"
            />
          </FormField>
          <FormField label="Device ID (dvcId)">
            <input
              type="text"
              value={dvcId}
              onChange={(e) => setDvcId(e.target.value)}
              placeholder="e.g. 450049"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-sm"
            />
          </FormField>
          {error && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setError(''); onClose(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={setScuDetails.isPending}>
              {setScuDetails.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
  const [integrationType, setIntegrationType] = useState('OSCU');
  const [vscuUrl, setVscuUrl] = useState('');

  function handleSubmit() {
    registerMutation.mutate(
      {
        tenantSlug,
        data: {
          device_serial: serial,
          branch_id: branchId || '00',
          tin,
          environment,
          integration_type: integrationType,
          // Only meaningful for VSCU; omit otherwise so we don't send a stray URL for OSCU.
          vscu_url: integrationType === 'VSCU' && vscuUrl.trim() ? vscuUrl.trim() : undefined,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSerial(''); setBranchId('00'); setTin(''); setEnvironment('sandbox'); setIntegrationType('OSCU'); setVscuUrl('');
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
          <FormField label="Sales Control Unit">
            <select
              value={integrationType}
              onChange={(e) => setIntegrationType(e.target.value)}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
            >
              <option value="OSCU">OSCU — Online (real-time KRA signing, instant receipt)</option>
              <option value="VSCU">VSCU — Virtual/offline (local signing + batch sync; high-volume)</option>
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              VSCU offline signing activates once the KRA VSCU device/SDK is provisioned; until then a VSCU device transmits online like OSCU.
            </p>
          </FormField>
          {integrationType === 'VSCU' && (
            <FormField label="VSCU Server URL">
              <input
                type="url"
                value={vscuUrl}
                onChange={(e) => setVscuUrl(e.target.value)}
                placeholder="http://localhost:8088"
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                The local KRA VSCU unit on your network that signs offline. Leave blank to fall back to online OSCU until provisioned.
              </p>
            </FormField>
          )}
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
