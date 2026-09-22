'use client';

// KRA eTIMS OSCU certification wizard — steps a tenant admin through all 23 scored test cases
// in the runbook's state-machine order (steps.ts), one case at a time: pick a step on the left,
// press Run, see the real KRA response on the right. Every step calls a REAL business endpoint
// (the same ones the rest of Tax & Compliance already uses) — this page never duplicates a form
// that exists elsewhere; steps needing real business data (a real sale, a real stock movement)
// link to that existing feature and verify against a read endpoint where one exists, per
// kra-etims-status-and-history.md §8b.
//
// 2026-09-22 redesign: removed the separate "API-triggered batch run" card that duplicated this
// same 23-case list in a second place with its own device/credential inputs and history — one
// unified list+console now covers both the walkthrough and the response inspection. Also wired
// real inline Run forms (using mutation hooks that already existed but were previously only
// reachable from the KRA Branch Tools tab) for the 5 steps that used to be deep-link-only:
// branch customer/user/insurance registration, item composition, and imported-item approval.

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { FormField } from '@/components/ui/form-field';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useAssignEtimsDeviceOutlet, useEtimsDevices, useInitEtimsDevice, useRefreshCodeLists } from '@/hooks/use-tax';
import {
  useEtimsBranchList,
  useEtimsNoticeList,
  useEtimsTaxpayerInfo,
  useRegisterEtimsBranchCustomer,
  useRegisterEtimsBranchInsurance,
  useRegisterEtimsBranchUser,
  useRegisterEtimsItemComposition,
  useUpdateEtimsImportedItem,
} from '@/hooks/use-tax-etims-branch';
import {
  useEtimsCustomerPinInfo,
  useEtimsItemClassList,
  useEtimsItemInfo,
  useEtimsSalesTransactionsCheck,
  useEtimsStockMoveList,
} from '@/hooks/use-tax-etims-wizard';
import { useAuthStore } from '@/store/auth';
import * as taxApi from '@/lib/api/tax';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  ExternalLink,
  Loader2,
  MinusCircle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { WIZARD_STEPS } from './steps';

interface OutletOption {
  id: string;
  code: string;
  name: string;
}

const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL || process.env.NEXT_PUBLIC_SSO_URL || 'https://sso.codevertexafrica.com';

async function fetchOutletOptions(accessToken: string, tenantSlug: string): Promise<OutletOption[]> {
  const res = await fetch(`${AUTH_API_URL}/api/v1/tenants/${tenantSlug}/outlets`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data.outlets ?? data.data ?? []);
  return list.filter((o: any) => o.status !== 'archived');
}

// Mirrors the backend's own EtimsCertRunStep status vocabulary (certification_runner.go /
// etimscertrunstep) so a step here always reads the same way it would from an API-triggered run
// — 'skipped' (a prerequisite step never passed) and 'unresolvable' (a confirmed KRA-side dead
// end, not a bug) are real, distinct outcomes, not just "failed".
type StepStatus = 'idle' | 'running' | 'pass' | 'fail' | 'skipped' | 'unresolvable';

function isPassResultCd(code: string | undefined): boolean {
  return code === '000' || code === '0000' || code === '001';
}

const inputClass = 'w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm';
const consoleClass =
  'max-h-72 overflow-auto rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs leading-relaxed';

const STATUS_META: Record<StepStatus, { label: string; badge: 'success' | 'error' | 'warning' | 'outline' | 'secondary'; icon: React.ReactNode }> = {
  idle: { label: 'Idle', badge: 'secondary', icon: <span className="block h-3.5 w-3.5 rounded-full border-2 border-border" /> },
  running: { label: 'Running', badge: 'warning', icon: <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" /> },
  pass: { label: 'Pass', badge: 'success', icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> },
  fail: { label: 'Fail', badge: 'error', icon: <XCircle className="h-3.5 w-3.5 text-destructive" /> },
  skipped: { label: 'Skipped', badge: 'outline', icon: <MinusCircle className="h-3.5 w-3.5 text-muted-foreground" /> },
  unresolvable: { label: 'Unresolvable', badge: 'error', icon: <CircleSlash className="h-3.5 w-3.5 text-destructive" /> },
};

function StatusIcon({ status }: { status: StepStatus }) {
  return STATUS_META[status].icon;
}

function StatusBadge({ status }: { status: StepStatus }) {
  const meta = STATUS_META[status];
  return <Badge variant={meta.badge}>{meta.label}</Badge>;
}

// A step whose result is a plain KraOscuLookupResult — shared body for every 'lookup' /
// 'lookupInput' step so the pass/fail wiring (resultCd -> status callback) lives in one place.
function LookupStepBody({
  description,
  query,
  onResult,
  inputLabel,
  inputValue,
  onInputChange,
  inputPlaceholder,
}: {
  description: string;
  query: { data: any; isFetching: boolean; refetch: () => Promise<{ data?: any; isError: boolean }> };
  onResult: (status: StepStatus) => void;
  inputLabel?: string;
  inputValue?: string;
  onInputChange?: (v: string) => void;
  inputPlaceholder?: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{description}</p>
      {inputLabel && (
        <FormField label={inputLabel}>
          <input
            type="text"
            value={inputValue ?? ''}
            onChange={(e) => onInputChange?.(e.target.value)}
            placeholder={inputPlaceholder}
            className={inputClass}
          />
        </FormField>
      )}
      <Button
        onClick={async () => {
          onResult('running');
          const r = await query.refetch();
          const code = (r.data as any)?.resultCd ?? (r.data as any)?.result_cd;
          onResult(r.isError ? 'fail' : isPassResultCd(code) ? 'pass' : 'fail');
        }}
        disabled={query.isFetching || (inputLabel != null && !inputValue)}
      >
        {query.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Run
      </Button>
      {query.data != null && <pre className={consoleClass}>{JSON.stringify(query.data, null, 2)}</pre>}
    </div>
  );
}

// A step that fires a real POST mutation with a small pre-filled form — used for the 5 branch
// registration / composition / imported-item cases that already have a working mutation hook
// (previously only reachable from the KRA Branch Tools tab, deep-link-only here). Sensible
// certification-test defaults are pre-filled (matching certification_runner.go's own
// CERT-TEST-* convention) so a real click "just works" without hunting for values, but every
// field stays editable.
function ActionStepBody({
  description,
  fields,
  values,
  onChange,
  onRun,
  isPending,
  result,
  runLabel = 'Run',
}: {
  description: string;
  fields: { key: string; label: string; placeholder?: string; type?: string }[];
  values: Record<string, string>;
  onChange: (key: string, v: string) => void;
  onRun: () => void;
  isPending: boolean;
  result?: any;
  runLabel?: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <FormField key={f.key} label={f.label}>
            <input
              type={f.type ?? 'text'}
              value={values[f.key] ?? ''}
              onChange={(e) => onChange(f.key, e.target.value)}
              placeholder={f.placeholder}
              className={inputClass}
            />
          </FormField>
        ))}
      </div>
      <Button onClick={onRun} disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {runLabel}
      </Button>
      {result != null && <pre className={consoleClass}>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}

function ManualStepBody({
  hint,
  deepLinkHref,
  deepLinkLabel,
  orgSlug,
  unverifiable,
  onCheck,
  checkLabel,
  checkResult,
}: {
  hint: string;
  deepLinkHref?: string;
  deepLinkLabel?: string;
  orgSlug: string;
  unverifiable?: boolean;
  onCheck?: () => void;
  checkLabel?: string;
  checkResult?: { status: StepStatus; data?: any };
}) {
  const href = deepLinkHref?.startsWith('?') ? `/${orgSlug}/tax${deepLinkHref}` : deepLinkHref ? `/${orgSlug}${deepLinkHref}` : undefined;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{hint}</p>
      <div className="flex flex-wrap items-center gap-2">
        {href && (
          <Link href={href} target="_blank">
            <Button variant="outline">
              <ExternalLink className="h-4 w-4" />
              {deepLinkLabel ?? 'Open'}
            </Button>
          </Link>
        )}
        {onCheck && (
          <Button onClick={onCheck} disabled={checkResult?.status === 'running'}>
            {checkResult?.status === 'running' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {checkLabel ?? 'Check'}
          </Button>
        )}
      </div>
      {unverifiable && (
        <p className="text-xs text-muted-foreground">
          No KRA read endpoint exists to verify this one automatically — mark it done yourself once
          you&apos;ve completed it on the linked page.
        </p>
      )}
      {checkResult?.data != null && <pre className={consoleClass}>{JSON.stringify(checkResult.data, null, 2)}</pre>}
    </div>
  );
}

export default function EtimsCertificationPage() {
  const { tenantPathId, isPlatformOwner, tenantQueryParam, orgSlug } = useResolvedTenant();
  const tenantSlug = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  const [current, setCurrent] = useState(0);
  const [statuses, setStatuses] = useState<Record<string, StepStatus>>({});
  const [results, setResults] = useState<Record<string, any>>({});
  const [testPin, setTestPin] = useState('');
  const [custPinInput, setCustPinInput] = useState('');
  const [invcNoInput, setInvcNoInput] = useState('');

  const step = WIZARD_STEPS[current];
  const setStatus = (id: string, status: StepStatus, data?: any) => {
    setStatuses((s) => ({ ...s, [id]: status }));
    if (data !== undefined) setResults((r) => ({ ...r, [id]: data }));
    if (status === 'pass' && current < WIZARD_STEPS.length - 1) {
      setTimeout(() => setCurrent((c) => (WIZARD_STEPS[c].id === id ? c + 1 : c)), 500);
    }
  };

  const devicesQuery = useEtimsDevices(tenantSlug);
  const devices = devicesQuery.data?.devices ?? [];
  const activeDevice = devices.find((d) => d.status === 'active') ?? devices[0];

  // Multi-branch outlet mapping (2026-09-16): each KRA branch/device can be tied to one
  // POS/inventory outlet, scoping eTIMS catalog sync to that outlet's own warehouse. Fetches
  // the tenant's outlet list the same way the header's OutletFilter does (auth-api owns
  // outlets; treasury-api has no local mirror to query instead).
  const session = useAuthStore((s) => s.session);
  const outletOptionsQuery = useQuery({
    queryKey: ['outlet_options_cert_wizard', tenantSlug],
    queryFn: () => fetchOutletOptions(session?.accessToken ?? '', tenantSlug),
    enabled: !!session?.accessToken && !!tenantSlug,
    staleTime: 5 * 60_000,
  });
  const assignOutlet = useAssignEtimsDeviceOutlet();

  const initDevice = useInitEtimsDevice();
  const refreshCodeLists = useRefreshCodeLists();
  const itemClassList = useEtimsItemClassList(tenantSlug);
  const branchList = useEtimsBranchList(tenantSlug, false);
  const noticeList = useEtimsNoticeList(tenantSlug, false);
  const taxpayerInfo = useEtimsTaxpayerInfo(tenantSlug, false);
  const itemInfo = useEtimsItemInfo(tenantSlug);
  const stockMoveList = useEtimsStockMoveList(tenantSlug);
  const salesTransactions = useEtimsSalesTransactionsCheck(tenantSlug);
  const customerPinInfo = useEtimsCustomerPinInfo(tenantSlug, custPinInput);
  const importedItems = useQuery({
    queryKey: ['etims-imported-items-wizard', tenantSlug, testPin],
    queryFn: () => taxApi.getEtimsImportedItems(tenantSlug, testPin),
    enabled: false,
  });
  const invoiceDetail = useQuery({
    queryKey: ['etims-invoice-detail-wizard', tenantSlug, invcNoInput],
    queryFn: () => taxApi.getEtimsInvoiceDetail(tenantSlug, invcNoInput),
    enabled: false,
  });

  // Real inline Run forms for the 5 steps that already have a working mutation hook.
  const registerCustomer = useRegisterEtimsBranchCustomer();
  const registerUser = useRegisterEtimsBranchUser();
  const registerInsurance = useRegisterEtimsBranchInsurance();
  const registerComposition = useRegisterEtimsItemComposition();
  const updateImportedItem = useUpdateEtimsImportedItem();

  const [customerForm, setCustomerForm] = useState<Record<string, string>>({
    cust_no: 'CERT-TEST-001', cust_tin: '', cust_nm: 'Certification Test Customer',
    adrs: 'Nairobi', tel_no: '0700000000', email: 'cert-test@codevertexafrica.com',
  });
  const [userForm, setUserForm] = useState<Record<string, string>>({
    user_id: 'certtest01', user_nm: 'Certification Test User', pwd: 'CertTest@1234',
    adrs: 'Nairobi', cellphone: '0700000000', email: 'certtest@example.com',
  });
  const [insuranceForm, setInsuranceForm] = useState<Record<string, string>>({
    isrcc_cd: '12', isrcc_nm: 'Certification Test Insurance', isrc_rt: '5',
  });
  const [compositionForm, setCompositionForm] = useState<Record<string, string>>({
    item_cd: '', cpst_item_cd: '', cpst_qty: '1',
  });
  const [importForm, setImportForm] = useState<Record<string, string>>({
    task_cd: '', dcl_de: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
    item_seq: '1', hs_cd: '', item_cls_cd: '', item_cd: '',
  });

  const passCount = WIZARD_STEPS.filter((s) => statuses[s.id] === 'pass').length;
  const donePct = Math.round((passCount / WIZARD_STEPS.length) * 100);

  function renderStepBody() {
    switch (step.id) {
      case 'initialize':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Initializes {activeDevice ? <span className="font-mono">{activeDevice.device_serial}</span> : 'the active device'} against KRA. A
              <span className="font-mono"> 902</span> response (&quot;already installed&quot;) is healthy, not a failure.
            </p>
            <Button
              onClick={() => {
                if (!activeDevice) return;
                setStatus('initialize', 'running');
                initDevice.mutate(
                  { tenantSlug, deviceId: activeDevice.id },
                  {
                    onSuccess: (d) => setStatus('initialize', 'pass', d),
                    onError: (e: any) => setStatus('initialize', 'fail', e?.response?.data),
                  },
                );
              }}
              disabled={!activeDevice || initDevice.isPending}
            >
              {initDevice.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Run
            </Button>
            {!activeDevice && <p className="text-xs text-destructive">No eTIMS device found — register one on the eTIMS Devices tab first.</p>}
            {results.initialize != null && <pre className={consoleClass}>{JSON.stringify(results.initialize, null, 2)}</pre>}
          </div>
        );
      case 'selectCodeList':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Refreshes every KRA code list this tenant uses.</p>
            <Button
              onClick={() => {
                setStatus('selectCodeList', 'running');
                refreshCodeLists.mutate(
                  { tenantSlug },
                  {
                    onSuccess: (d) => setStatus('selectCodeList', 'pass', d),
                    onError: (e: any) => setStatus('selectCodeList', 'fail', e?.response?.data),
                  },
                );
              }}
              disabled={refreshCodeLists.isPending}
            >
              {refreshCodeLists.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Run
            </Button>
            {results.selectCodeList != null && <pre className={consoleClass}>{JSON.stringify(results.selectCodeList, null, 2)}</pre>}
          </div>
        );
      case 'selectItemClass':
        return <LookupStepBody description={step.hint} query={itemClassList} onResult={(s) => setStatus(step.id, s, itemClassList.data)} />;
      case 'branchList':
        return <LookupStepBody description={step.hint} query={branchList} onResult={(s) => setStatus(step.id, s, branchList.data)} />;
      case 'selectNoticeList':
        return <LookupStepBody description={step.hint} query={noticeList} onResult={(s) => setStatus(step.id, s, noticeList.data)} />;
      case 'selectTaxpayerInfo':
        return <LookupStepBody description={step.hint} query={taxpayerInfo} onResult={(s) => setStatus(step.id, s, taxpayerInfo.data)} />;
      case 'itemInfo':
        return <LookupStepBody description={step.hint} query={itemInfo} onResult={(s) => setStatus(step.id, s, itemInfo.data)} />;
      case 'selectStockMoveLists':
        return <LookupStepBody description={step.hint} query={stockMoveList} onResult={(s) => setStatus(step.id, s, stockMoveList.data)} />;
      case 'selectSalesTransactions':
        return <LookupStepBody description={step.hint} query={salesTransactions} onResult={(s) => setStatus(step.id, s, salesTransactions.data)} />;
      case 'customerPinInfo':
        return (
          <LookupStepBody
            description={step.hint}
            query={customerPinInfo}
            onResult={(s) => setStatus(step.id, s, customerPinInfo.data)}
            inputLabel="Customer KRA PIN"
            inputValue={custPinInput}
            onInputChange={setCustPinInput}
            inputPlaceholder="e.g. P051234567X"
          />
        );
      case 'selectInvoiceDetail':
        return (
          <LookupStepBody
            description={step.hint}
            query={invoiceDetail}
            onResult={(s) => setStatus(step.id, s, invoiceDetail.data)}
            inputLabel="eTIMS invoice number (invcNo)"
            inputValue={invcNoInput}
            onInputChange={setInvcNoInput}
            inputPlaceholder="e.g. 42"
          />
        );
      case 'importedItemInfo':
        return (
          <LookupStepBody
            description={step.hint}
            query={importedItems}
            onResult={(s) => setStatus(step.id, s, importedItems.data)}
            inputLabel="Application Test Pin (from the GavaConnect session, not your own TIN)"
            inputValue={testPin}
            onInputChange={setTestPin}
            inputPlaceholder="e.g. P052543168K"
          />
        );
      case 'branchSendCustomerInfo':
        return (
          <ActionStepBody
            description={step.hint}
            fields={[
              { key: 'cust_no', label: 'Customer no.' },
              { key: 'cust_tin', label: 'Customer TIN', placeholder: 'e.g. the session Application Test Pin' },
              { key: 'cust_nm', label: 'Customer name' },
              { key: 'adrs', label: 'Address' },
              { key: 'tel_no', label: 'Phone' },
              { key: 'email', label: 'Email' },
            ]}
            values={customerForm}
            onChange={(k, v) => setCustomerForm((f) => ({ ...f, [k]: v }))}
            isPending={registerCustomer.isPending}
            result={results.branchSendCustomerInfo}
            onRun={() => {
              setStatus('branchSendCustomerInfo', 'running');
              registerCustomer.mutate(
                { tenantSlug, body: customerForm as unknown as taxApi.RegisterBranchCustomerBody },
                {
                  onSuccess: (d) => setStatus('branchSendCustomerInfo', 'pass', d),
                  onError: (e: any) => setStatus('branchSendCustomerInfo', 'fail', e?.response?.data),
                },
              );
            }}
          />
        );
      case 'branchUserAccount':
        return (
          <ActionStepBody
            description={step.hint}
            fields={[
              { key: 'user_id', label: 'User ID' },
              { key: 'user_nm', label: 'User name' },
              { key: 'pwd', label: 'Password', type: 'password' },
              { key: 'adrs', label: 'Address' },
              { key: 'cellphone', label: 'Cellphone' },
              { key: 'email', label: 'Email' },
            ]}
            values={userForm}
            onChange={(k, v) => setUserForm((f) => ({ ...f, [k]: v }))}
            isPending={registerUser.isPending}
            result={results.branchUserAccount}
            onRun={() => {
              setStatus('branchUserAccount', 'running');
              registerUser.mutate(
                { tenantSlug, body: userForm as unknown as taxApi.RegisterBranchUserBody },
                {
                  onSuccess: (d) => setStatus('branchUserAccount', 'pass', d),
                  onError: (e: any) => setStatus('branchUserAccount', 'fail', e?.response?.data),
                },
              );
            }}
          />
        );
      case 'branchInsuranceInfo':
        return (
          <ActionStepBody
            description={step.hint}
            fields={[
              { key: 'isrcc_cd', label: 'Insurance company code' },
              { key: 'isrcc_nm', label: 'Insurance company name' },
              { key: 'isrc_rt', label: 'Insurance rate (%)', type: 'number' },
            ]}
            values={insuranceForm}
            onChange={(k, v) => setInsuranceForm((f) => ({ ...f, [k]: v }))}
            isPending={registerInsurance.isPending}
            result={results.branchInsuranceInfo}
            onRun={() => {
              setStatus('branchInsuranceInfo', 'running');
              registerInsurance.mutate(
                { tenantSlug, body: { ...insuranceForm, isrc_rt: Number(insuranceForm.isrc_rt) || 0 } as unknown as taxApi.RegisterBranchInsuranceBody },
                {
                  onSuccess: (d) => setStatus('branchInsuranceInfo', 'pass', d),
                  onError: (e: any) => setStatus('branchInsuranceInfo', 'fail', e?.response?.data),
                },
              );
            }}
          />
        );
      case 'saveItemComposition':
        return (
          <ActionStepBody
            description={step.hint}
            fields={[
              { key: 'item_cd', label: 'Finished-good itemCd', placeholder: 'e.g. KE2NTNO00000170' },
              { key: 'cpst_item_cd', label: 'Component itemCd (must already carry KRA stock)', placeholder: 'e.g. KE1NTNO00000171' },
              { key: 'cpst_qty', label: 'Component quantity', type: 'number' },
            ]}
            values={compositionForm}
            onChange={(k, v) => setCompositionForm((f) => ({ ...f, [k]: v }))}
            isPending={registerComposition.isPending}
            result={results.saveItemComposition}
            onRun={() => {
              setStatus('saveItemComposition', 'running');
              registerComposition.mutate(
                {
                  tenantSlug,
                  body: {
                    item_cd: compositionForm.item_cd,
                    cpst_item_cd: compositionForm.cpst_item_cd,
                    cpst_qty: Number(compositionForm.cpst_qty) || 0,
                  },
                },
                {
                  onSuccess: (d) => setStatus('saveItemComposition', 'pass', d),
                  onError: (e: any) => setStatus('saveItemComposition', 'fail', e?.response?.data),
                },
              );
            }}
          />
        );
      case 'importedItemConvertedInfo':
        return (
          <ActionStepBody
            description={step.hint}
            fields={[
              { key: 'task_cd', label: 'Task code', placeholder: 'from Get imported item information above' },
              { key: 'dcl_de', label: 'Declaration date (YYYYMMDD)' },
              { key: 'item_seq', label: 'Item seq', type: 'number' },
              { key: 'hs_cd', label: 'HS code', placeholder: 'e.g. 63079000' },
              { key: 'item_cls_cd', label: 'Item class code' },
              { key: 'item_cd', label: 'Your itemCd for this import' },
            ]}
            values={importForm}
            onChange={(k, v) => setImportForm((f) => ({ ...f, [k]: v }))}
            isPending={updateImportedItem.isPending}
            result={results.importedItemConvertedInfo}
            onRun={() => {
              setStatus('importedItemConvertedInfo', 'running');
              updateImportedItem.mutate(
                { tenantSlug, body: { ...importForm, item_seq: Number(importForm.item_seq) || 1 } as unknown as taxApi.UpdateImportedItemBody },
                {
                  onSuccess: (d) => setStatus('importedItemConvertedInfo', 'pass', d),
                  onError: (e: any) => setStatus('importedItemConvertedInfo', 'fail', e?.response?.data),
                },
              );
            }}
          />
        );
      case 'saveItem':
        return (
          <ManualStepBody
            hint={step.hint}
            deepLinkHref={step.deepLinkHref}
            deepLinkLabel={step.deepLinkLabel}
            orgSlug={orgSlug}
            onCheck={async () => {
              setStatus('saveItem', 'running');
              const r = await itemInfo.refetch();
              setStatus('saveItem', r.isError ? 'fail' : isPassResultCd((r.data as any)?.resultCd) ? 'pass' : 'fail', r.data);
            }}
            checkLabel="Check (Get Item Info)"
            checkResult={{ status: statuses.saveItem ?? 'idle', data: results.saveItem ?? itemInfo.data }}
          />
        );
      case 'sendSalesTransaction':
        return (
          <ManualStepBody
            hint={step.hint}
            deepLinkHref={step.deepLinkHref}
            deepLinkLabel={step.deepLinkLabel}
            orgSlug={orgSlug}
            onCheck={async () => {
              setStatus('sendSalesTransaction', 'running');
              const r = await salesTransactions.refetch();
              setStatus('sendSalesTransaction', r.isError ? 'fail' : isPassResultCd((r.data as any)?.resultCd) ? 'pass' : 'fail', r.data);
            }}
            checkLabel="Check (Select sales transaction)"
            checkResult={{ status: statuses.sendSalesTransaction ?? 'idle', data: results.sendSalesTransaction ?? salesTransactions.data }}
          />
        );
      default:
        return (
          <ManualStepBody
            hint={step.hint}
            deepLinkHref={step.deepLinkHref}
            deepLinkLabel={step.deepLinkLabel}
            orgSlug={orgSlug}
            unverifiable={step.unverifiable}
          />
        );
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:space-y-6 sm:p-6">
      <div className="space-y-3">
        <div>
          <h1 className="text-xl font-bold">KRA eTIMS Certification Wizard</h1>
          <p className="text-sm text-muted-foreground">
            Steps through all 23 scored OSCU test cases in KRA&apos;s required order, one at a time.
          </p>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span>{passCount}/{WIZARD_STEPS.length} passed</span>
            <span className="text-muted-foreground">{donePct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${donePct}%` }} />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Before you start</h2>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            1. On developer.go.ke, open <span className="font-medium text-foreground">My Apps → your OSCU app → Validation</span> and start a
            new Automated Testing session — note its <span className="font-medium text-foreground">Apigee App ID</span> and{' '}
            <span className="font-medium text-foreground">Application Test Pin</span>.
          </p>
          <p>
            2. Push the session&apos;s Apigee App ID into platform settings via{' '}
            <span className="font-medium text-foreground">Platform → Gateways &amp; Secrets</span> before running any step below — early
            calls won&apos;t attribute to the scored session otherwise.
          </p>
          <p>3. Enter the Application Test Pin where a step below asks for it (used for imported-item lookups, per KRA&apos;s own requirement).</p>
        </CardContent>
      </Card>

      {devices.length > 1 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Branches &amp; outlets</h2>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Each KRA branch can be tied to one POS/inventory outlet, so its eTIMS catalog only syncs items from that outlet&apos;s own warehouse.
            </p>
            <div className="space-y-2">
              {devices.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="font-mono text-xs">branch {d.branch_id ?? '00'}</span>
                  <span className="font-mono text-xs text-muted-foreground">{d.device_serial}</span>
                  <select
                    value={d.outlet_id ?? ''}
                    onChange={(e) => assignOutlet.mutate({ tenantSlug, deviceId: d.id, outletId: e.target.value || null })}
                    disabled={assignOutlet.isPending}
                    className={`${inputClass} ml-auto max-w-[220px]`}
                  >
                    <option value="">Tenant main/default (no outlet)</option>
                    {(outletOptionsQuery.data ?? []).map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr]">
          <div className="border-b border-border lg:border-b-0 lg:border-r">
            <div className="max-h-[60vh] space-y-0.5 overflow-y-auto p-2 lg:max-h-[75vh]">
              {WIZARD_STEPS.map((s, i) => {
                const st = statuses[s.id] ?? 'idle';
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCurrent(i)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                      i === current ? 'bg-primary/10 font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-background text-[10px] font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{s.title}</span>
                    <StatusIcon status={st} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4 sm:p-6">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">
                  {current + 1}. {step.title}
                </h2>
                <p className="font-mono text-xs text-muted-foreground">{step.kraEndpoint}</p>
              </div>
              <StatusBadge status={statuses[step.id] ?? 'idle'} />
            </div>
            <div className="flex-1 p-4 sm:p-6">{renderStepBody()}</div>
            <div className="flex items-center justify-between border-t border-border p-3 sm:p-4">
              <Button variant="outline" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button variant="outline" onClick={() => setCurrent((c) => Math.min(WIZARD_STEPS.length - 1, c + 1))} disabled={current === WIZARD_STEPS.length - 1}>
                Skip
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
